const Item = require('../models/Item');
const { normalizeText, removeStopwords, textSimilarity } = require('../utils/textUtils');
const { averageHashFromFile, hashSimilarity } = require('../utils/imageHash');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = async function(req, res, next) {
  try {
    const { title, description, type, location, date } = req.body;
    if (!title || !type || !location || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }
    const nTitle = removeStopwords(normalizeText(title));
    const start = new Date(parsedDate);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(parsedDate);
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);
    const locRegex = new RegExp(`^${escapeRegex(normalizeText(location))}$`, 'i');
    const exact = await Item.findOne({
      type,
      date: { $gte: start, $lte: end },
      location: locRegex,
      $or: [{ normalizedTitle: nTitle }, { title: new RegExp(`^${escapeRegex(title)}$`, 'i') }]
    });
    if (exact) {
      return res.status(409).json({ success: false, message: 'Duplicate report detected', duplicateReportId: exact._id });
    }
    const candStart = new Date(parsedDate);
    candStart.setDate(candStart.getDate() - 7);
    const candEnd = new Date(parsedDate);
    candEnd.setDate(candEnd.getDate() + 7);
    const candidates = await Item.find({
      type,
      date: { $gte: candStart, $lte: candEnd }
    }).select('title description');
    const textNorm = removeStopwords(normalizeText(`${title} ${description || ''}`));
    for (const c of candidates) {
      const cNorm = removeStopwords(normalizeText(`${c.title || ''} ${c.description || ''}`));
      const sim = textSimilarity(textNorm, cNorm);
      if (sim >= 0.8) {
        return res.status(409).json({ success: false, message: 'Similar report already exists', duplicateReportId: c._id });
      }
    }
    let imgHash = null;
    if (req.file && req.file.path) {
      try {
        imgHash = await averageHashFromFile(req.file.path, 8);
        const imgs = await Item.find({ imageHash: { $exists: true, $ne: null } }).select('imageHash');
        for (const r of imgs) {
          if (!r.imageHash) continue;
          const sim = hashSimilarity(imgHash, r.imageHash, 8);
          if (sim >= 0.9) {
            return res.status(409).json({ success: false, message: 'This image was already reported', duplicateReportId: r._id });
          }
        }
      } catch (e) {}
    }
    const spamWindowStart = new Date();
    spamWindowStart.setMinutes(spamWindowStart.getMinutes() - 10);
    const recent = await Item.find({ user: req.user.id, createdAt: { $gte: spamWindowStart } }).select('title');
    let similarCount = 0;
    for (const r of recent) {
      const sim = textSimilarity(removeStopwords(normalizeText(r.title || '')), nTitle);
      if (sim >= 0.75) similarCount++;
      if (similarCount >= 2) {
        return res.status(429).json({ success: false, message: 'Multiple similar reports detected' });
      }
    }
    req.dupMeta = { normalizedTitle: nTitle, imageHash: imgHash || null };
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

