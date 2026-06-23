const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = new Document({
      name: req.body.name || req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id
    });

    await doc.save();
    res.status(201).json({ message: 'Document uploaded', document: doc });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const docs = await Document.find({
      $or: [{ uploadedBy: userId }, { sharedWith: userId }]
    }).populate('uploadedBy', 'name email').sort({ createdAt: -1 });

    res.json(docs);
  } catch (error) {
    console.error('Fetch Docs Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const filePath = path.join(__dirname, '../uploads', path.basename(doc.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.shareDocument = async (req, res) => {
  try {
    const { userIds } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.sharedWith = [...new Set([...doc.sharedWith.map(id => id.toString()), ...userIds])];
    await doc.save();
    res.json({ message: 'Document shared', document: doc });
  } catch (error) {
    console.error('Share Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.signDocument = async (req, res) => {
  try {
    const { signatureUrl } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.signatureUrl = signatureUrl;
    doc.status = 'signed';
    await doc.save();
    res.json({ message: 'Document signed', document: doc });
  } catch (error) {
    console.error('Sign Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
