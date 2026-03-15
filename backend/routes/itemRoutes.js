const express = require('express');
const router = express.Router();
const { 
    getItems, 
    getAllItemsAdmin,
    getMyItems, 
    createItem, 
    updateItemStatus, 
    deleteItem,
    sendManualEmail,
    checkDuplicate,
    verifyClaim
} = require('../controllers/itemController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const duplicateMiddleware = require('../middleware/duplicateMiddleware');

router.get('/', getItems);
router.get('/admin', protect, admin, getAllItemsAdmin);
router.get('/myitems', protect, getMyItems);
router.post('/check-duplicate', protect, checkDuplicate);
router.post('/:id/claim', protect, verifyClaim);
router.post('/', protect, upload.single('image'), duplicateMiddleware, createItem);
router.post('/email', protect, admin, sendManualEmail);
router.put('/:id', protect, admin, updateItemStatus);
router.delete('/:id', protect, deleteItem);

module.exports = router;
