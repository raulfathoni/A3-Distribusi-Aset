const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const distributionController = require('../controllers/distributionController');
const { isAuthenticated } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/acl');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage for BAST file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/bast');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'bast-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Harap unggah PDF, Gambar, atau Word.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Asset routes
router.get('/', isAuthenticated, checkPermission('view_assets'), assetController.getAllAssets);
router.get('/detail/:id', isAuthenticated, checkPermission('view_asset_detail'), assetController.getAssetDetail);
router.get('/export/excel', isAuthenticated, checkPermission('export_assets'), assetController.generateExcel);
router.get('/export/pdf', isAuthenticated, checkPermission('export_assets'), assetController.generatePDF);
router.get('/api', isAuthenticated, checkPermission('api_assets'), assetController.getAssetsAPI);

// Distribution routes
router.get('/distributions', isAuthenticated, checkPermission('view_assets'), distributionController.getAllDistributions);
router.get('/distributions/recipients', isAuthenticated, checkPermission('view_assets'), distributionController.getRecipients);
router.post('/detail/:id/allocate', isAuthenticated, checkPermission('manage_distributions'), distributionController.allocateAsset);
router.post('/detail/:id/upload-bast', isAuthenticated, checkPermission('manage_distributions'), upload.single('bast_file'), distributionController.uploadSignedBAST);
router.post('/distributions/cancel/:id', isAuthenticated, checkPermission('manage_distributions'), distributionController.cancelAllocation);
router.post('/distributions/return/:id', isAuthenticated, checkPermission('manage_distributions'), distributionController.returnAsset);
router.get('/distributions/print/:id', isAuthenticated, checkPermission('view_assets'), distributionController.printBAST);
router.get('/distributions/api', isAuthenticated, checkPermission('api_assets'), distributionController.getDistributionsAPI);

module.exports = router;