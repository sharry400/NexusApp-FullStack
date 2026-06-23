const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  shareDocument,
  signDocument
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', protect, getUserDocuments);
router.post('/upload', protect, upload.single('file'), uploadDocument);
router.delete('/:id', protect, deleteDocument);
router.put('/:id/share', protect, shareDocument);
router.put('/:id/sign', protect, signDocument);

module.exports = router;
