const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { isAuthenticated } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/acl');

router.get('/', isAuthenticated, checkPermission('view_assets'), assetController.getAllAssets);
router.get('/detail/:id', isAuthenticated, checkPermission('view_asset_detail'), assetController.getAssetDetail);
router.get('/export/excel', isAuthenticated, checkPermission('export_assets'), assetController.generateExcel);
router.get('/export/pdf', isAuthenticated, checkPermission('export_assets'), assetController.generatePDF);
router.get('/api', isAuthenticated, checkPermission('api_assets'), assetController.getAssetsAPI);

module.exports = router;