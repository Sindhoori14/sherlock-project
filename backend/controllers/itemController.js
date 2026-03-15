const Item = require('../models/Item');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { findMatches } = require('../utils/matchService');
const { sendEmail } = require('../utils/emailService');

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const { isAIAvailable, buildErrorDetails } = require('../utils/aiService');
let aiEmbedErrorLogged = false;

// @desc    Get all verified items (Public) @route   GET /api/items
// @access  Public
exports.getItems = async (req, res) => {
    try {
        console.log('📋 GET /api/items - Fetching public items');
        const items = await Item.find({ status: { $in: ['verified', 'resolved'] } })
            .select('-contactInfo -studentName -rollNumber -studentEmail')
            .populate('user', 'name')
            .sort({ date: -1 });
        console.log(`📋 Found ${items.length} public items`);
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ getItems error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all items (Admin)
// @route   GET /api/items/admin
// @access  Private/Admin
exports.getAllItemsAdmin = async (req, res) => {
    try {
        console.log('🔐 GET /api/items/admin - Admin requesting all items');
        console.log('🔐 User:', req.user?.email, 'Role:', req.user?.role);
        const items = await Item.find()
            .populate('user', 'name email')
            .populate('potentialMatches', 'title type color location date')
            .populate('matchedWith', 'title type color location date')
            .sort({ createdAt: -1 });
        console.log(`🔐 Found ${items.length} total items for admin`);
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ getAllItemsAdmin error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's items
// @route   GET /api/items/myitems
// @access  Private
exports.getMyItems = async (req, res) => {
    try {
        const items = await Item.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify a claim on an item
// @route   POST /api/items/:id/claim
// @access  Private
exports.verifyClaim = async (req, res) => {
    try {
        const { answers } = req.body;
        const itemId = req.params.id;
        const userId = req.user.id;

        // Explicitly select verificationAnswers because they are hidden by default
        const item = await Item.findById(itemId).select('+verificationAnswers');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (item.user.toString() === userId) {
            return res.status(400).json({ message: 'You cannot claim your own item' });
        }

        if (!item.verificationQuestions || item.verificationQuestions.length === 0) {
            return res.status(400).json({ message: 'This item has no verification questions set' });
        }

        if (answers.length !== item.verificationQuestions.length) {
            return res.status(400).json({ message: 'Please answer all verification questions' });
        }

        // Check answers (Case-insensitive comparison)
        let correctCount = 0;
        item.verificationAnswers.forEach((ans, index) => {
            if (ans.toLowerCase().trim() === answers[index].toLowerCase().trim()) {
                correctCount++;
            }
        });

        // Determine status based on accuracy (currently requiring 100% match for 'verified' status system-wise)
        const isMatch = correctCount === item.verificationQuestions.length;
        const status = isMatch ? 'verified' : 'rejected';

        // Add to claims history
        // Check if user already claimed
        const existingClaimIndex = item.claims.findIndex(c => c.user.toString() === userId);
        
        const claimData = {
            user: userId,
            answers: answers,
            score: correctCount,
            status: status,
            timestamp: Date.now()
        };

        if (existingClaimIndex !== -1) {
            item.claims[existingClaimIndex] = claimData;
        } else {
            item.claims.push(claimData);
        }

        // SYSTEM VERIFICATION LOGIC:
        // If the claim is verified by the system (100% match), we mark the ITEM as 'verified'.
        // This pushes it to the Admin's "Verified" queue for final physical handover.
        if (isMatch) {
            item.status = 'verified';
            item.matchedWith = userId; // Tentatively link to the claimant (optional, but good for tracking)
        }

        await item.save();

        if (isMatch) {
            res.status(200).json({ 
                success: true, 
                message: 'Verification successful! Claim forwarded to admin.',
                status: 'verified'
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Verification failed. Answers do not match.',
                status: 'rejected'
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
    try {
        console.log('📝 POST /api/items - Creating new item');
        console.log('📝 User:', req.user?.id);
        console.log('📝 Body:', JSON.stringify(req.body, null, 2));
        console.log('📝 File:', req.file ? req.file.filename : 'No file');
        
        let imageUrl;
        
        if (req.file) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const itemData = {
            ...req.body,
            user: req.user.id
        };

        const parsedDate = new Date(itemData.date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date' });
        }
        if (parsedDate > new Date()) {
            return res.status(400).json({ message: 'Date cannot be in the future' });
        }
        itemData.date = parsedDate;

        // Parse verification fields if they come as strings (common in FormData)
        if (typeof itemData.verificationQuestions === 'string') {
            try {
                itemData.verificationQuestions = JSON.parse(itemData.verificationQuestions);
            } catch (e) {
                // If not JSON, maybe comma separated? Or just leave as single string (will be wrapped in array by mongoose if defined as array? No, string to array cast might fail or create 1 element)
                // Better to assume JSON or if it's just a single value
            }
        }
        if (typeof itemData.verificationAnswers === 'string') {
            try {
                itemData.verificationAnswers = JSON.parse(itemData.verificationAnswers);
            } catch (e) {}
        }

        // Validate Q&A length match
        if (itemData.verificationQuestions && itemData.verificationAnswers) {
            if (itemData.verificationQuestions.length !== itemData.verificationAnswers.length) {
                return res.status(400).json({ message: 'Number of verification questions and answers must match' });
            }
        }

        if (req.dupMeta && req.dupMeta.normalizedTitle) {
            itemData.normalizedTitle = req.dupMeta.normalizedTitle;
        }
        if (req.dupMeta && req.dupMeta.imageHash) {
            itemData.imageHash = req.dupMeta.imageHash;
        }

        if (imageUrl) {
            itemData.imageUrl = imageUrl;
            
            // AI Integration: Generate Image Embedding
            try {
                const form = new FormData();
                form.append('image', fs.createReadStream(req.file.path));
                
                const aiResponse = await axios.post(`${AI_SERVICE_URL}/embed`, form, {
                    headers: {
                        ...form.getHeaders()
                    },
                    timeout: 8000
                });
                
                if (aiResponse.data && aiResponse.data.embedding) {
                    itemData.imageEmbedding = aiResponse.data.embedding;
                    console.log('AI Embedding generated successfully');
                }
            } catch (aiError) {
                const details = buildErrorDetails(aiError);
                if (!aiEmbedErrorLogged) {
                    aiEmbedErrorLogged = true;
                    console.error('AI Service Error:', details);
                }
                // We continue without embedding if AI service fails
            }
        }

        let item;
        let usedSession = false;
        try {
            const session = await Item.startSession();
            usedSession = true;
            await session.withTransaction(async () => {
                const dStart = new Date(itemData.date);
                dStart.setDate(dStart.getDate() - 1);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = new Date(itemData.date);
                dEnd.setDate(dEnd.getDate() + 1);
                dEnd.setHours(23, 59, 59, 999);
                const base = {
                    type: itemData.type,
                    date: { $gte: dStart, $lte: dEnd },
                    $expr: { $eq: [ { $toLower: '$location' }, String(itemData.location).toLowerCase() ] }
                };
                let query = base;
                if (itemData.normalizedTitle) {
                    query = { ...base, normalizedTitle: itemData.normalizedTitle };
                } else {
                    query = { 
                        ...base, 
                        $expr: { 
                            $and: [
                                base.$expr, 
                                { $eq: [ { $toLower: '$title' }, String(itemData.title).toLowerCase() ] }
                            ] 
                        }
                    };
                }
                const dup = await Item.findOne(query).session(session);
                if (dup) {
                    throw { code: 'DUP', id: dup._id };
                }
                const created = await Item.create([itemData], { session });
                item = created[0];
            });
            session.endSession();
        } catch (e) {
            if (usedSession && e && e.code === 'DUP') {
                return res.status(409).json({ success: false, message: 'Duplicate report detected', duplicateReportId: e.id });
            }
            if (!usedSession && e && e.code === 'DUP') {
                return res.status(409).json({ success: false, message: 'Duplicate report detected', duplicateReportId: e.id });
            }
            if (!item) {
                item = await Item.create(itemData);
            }
        }

        // Run automatic matching
        const matches = await findMatches(item);
        
        if (matches.length > 0) {
            item.potentialMatches = matches.map(m => m._id);
            await item.save();

            // Also update the matched items to include this new item as potential match
            for (const match of matches) {
                match.potentialMatches.push(item._id);
                await match.save();
            }
        }

        console.log('✅ Item created successfully:', item._id);
        res.status(201).json(item);
    } catch (error) {
        console.error('❌ createItem error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check for duplicate items
// @route   POST /api/items/check-duplicate
// @access  Private
// REMOVED DUPLICATE FUNCTION checkDuplicate

// @desc    Check for duplicate items
// @route   POST /api/items/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
    const { type, category, date, location, title } = req.body;

    try {
        // Only check for duplicates within the same type (e.g., preventing multiple "Lost" reports for same item)
        // Or if user is reporting "Lost", check if "Found" exists? 
        // Requirement says: "Detect duplicate LOST reports... Warn users BEFORE submission to avoid redundancy."
        // This implies checking if *someone else* already reported this *same* lost item (maybe a friend?) 
        // OR checking if the item has already been found? 
        // "Duplicate report detection" usually means preventing double posting.
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const query = {
            type,
            category,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            // Simple case-insensitive partial match for location
            location: { $regex: location, $options: 'i' }
        };

        const duplicates = await Item.find(query);

        // Filter by title similarity if needed, or just return these candidates
        const similarItems = duplicates.filter(item => {
             // Simple keyword match
             if (!title || !item.title) return true;
             const t1 = title.toLowerCase();
             const t2 = item.title.toLowerCase();
             return t1.includes(t2) || t2.includes(t1);
        });

        if (similarItems.length > 0) {
             res.status(200).json({ 
                 found: true, 
                 message: '⚠️ Potential duplicate reports found! Please check if your item is already listed.',
                 items: similarItems 
             });
        } else {
            res.status(200).json({ found: false, message: 'No duplicates found.' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update item status
// @route   PUT /api/items/:id
// @access  Private/Admin
exports.updateItemStatus = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const { status, matchedWithId } = req.body;

        if (status) {
            item.status = status;
        }

        // If verifying a match
        if (matchedWithId) {
            item.matchedWith = matchedWithId;
            item.status = 'resolved'; // Or 'matched'
            
            // Update the other item too
            const matchedItem = await Item.findById(matchedWithId);
            if (matchedItem) {
                matchedItem.matchedWith = item._id;
                matchedItem.status = 'resolved';
                await matchedItem.save();

                const lostItem = item.type === 'lost' ? item : matchedItem;
                const foundItem = item.type === 'found' ? item : matchedItem;

                // Prepare attachments if image exists
                const attachments = [];
                // Only attach if it's a real file upload (starts with http)
                if (foundItem.imageUrl && foundItem.imageUrl.startsWith('http')) {
                    // Convert URL to local path for reliable sending
                    // imageUrl format: http://host/uploads/filename.jpg
                    const filename = foundItem.imageUrl.split('/').pop();
                    const localPath = path.join(__dirname, '../uploads', filename);

                    attachments.push({
                        filename: filename,
                        path: localPath 
                    });
                }

                if (lostItem.studentEmail) {
                    try {
                        await sendEmail({
                            email: lostItem.studentEmail,
                            subject: '🎉 Good News! Your Lost Item Found – SherLock',
                            templateData: {
                                title: `We have found a match for your lost item: "${lostItem.title}"`,
                                name: lostItem.studentName,
                                details: {
                                    'Found Item': foundItem.title,
                                    'Location Found': foundItem.location,
                                    'Date Found': new Date(foundItem.date).toLocaleDateString(),
                                    'Category': foundItem.category,
                                    'Match ID': `#${foundItem._id.toString().slice(-6).toUpperCase()}`
                                },
                                actionText: 'Visit Admin Office',
                                actionUrl: '#' // In real app, this could be a claim URL
                            },
                            type: 'match_notification',
                            triggeredBy: req.user.id,
                            attachments
                        });
                    } catch (err) {
                        console.error('❌ Match Email Notification Failed:', err.message);
                        // We don't rollback status update, but we log the failure loudly
                    }
                }
            }
        } 

        await item.save();

        res.status(200).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Make sure user owns item or is admin
        if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Item.deleteOne({ _id: req.params.id });
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send manual email
// @route   POST /api/items/email
// @access  Private/Admin
exports.sendManualEmail = async (req, res) => {
    const { to, subject, message } = req.body;
    
    console.log('📨 Processing Manual Email Request');
    console.log(`   To: ${to}, Subject: ${subject}`);
    
    try {
        const result = await sendEmail({
            email: to,
            subject,
            message, // Now supported by emailService
            type: 'admin_manual',
            triggeredBy: req.user.id
        });
        
        console.log('✅ Manual Email Sent Successfully');
        res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            messageId: result.messageId
        });
    } catch (error) {
        console.error('❌ Manual Email Failed:', error.message);
        res.status(500).json({ 
            success: false,
            message: 'Email delivery failed: ' + error.message 
        });
    }
};
