const db = require('../lib/db');

const getAllAssets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (a.name LIKE ? OR a.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }

    const [assets] = await db.query(
      `SELECT a.id, a.name, a.code, a.type, a.condition, a.status,
              e.brand, e.model
       FROM assets a
       LEFT JOIN equipments e ON a.id = e.asset_id
       ${whereClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM assets a ${whereClause}`,
      params
    );

    res.render('assets', {
      title: 'Data Aset',
      user: req.session.username,
      activeTab: 'assets',
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      search,
      status
    });
  } catch (err) {
    next(err);
  }
};

const getAssetDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT a.*, e.brand, e.model, e.serial_number, e.specification
       FROM assets a
       LEFT JOIN equipments e ON a.id = e.asset_id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Aset tidak ditemukan',
        error: { status: 404, stack: '' }
      });
    }

    // Fetch active/pending distribution
    const [currentDistRows] = await db.query(
      `SELECT ad.*, u.name as recipient_name, u.username as recipient_username
       FROM asset_distributions ad
       JOIN users u ON ad.recipient_id = u.id
       WHERE ad.asset_id = ? AND ad.status IN ('pending', 'active')
       ORDER BY ad.created_at DESC
       LIMIT 1`,
      [id]
    );

    // Fetch distribution history
    const [historyRows] = await db.query(
      `SELECT ad.*, u_rec.name as recipient_name, u_rec.username as recipient_username,
              u_alloc.name as allocator_name, u_alloc.username as allocator_username
       FROM asset_distributions ad
       JOIN users u_rec ON ad.recipient_id = u_rec.id
       JOIN users u_alloc ON ad.allocated_by = u_alloc.id
       WHERE ad.asset_id = ?
       ORDER BY ad.created_at DESC`,
      [id]
    );

    // Fetch potential recipients (all users)
    const [recipientRows] = await db.query(
      `SELECT id, name, username FROM users ORDER BY name ASC`
    );

    res.render('asset-detail', {
      title: 'Detail Aset',
      user: req.session.username,
      activeTab: 'assets',
      asset: rows[0],
      currentDistribution: currentDistRows[0] || null,
      distributionHistory: historyRows,
      recipients: recipientRows
    });
  } catch (err) {
    next(err);
  }
};

const getAssetsAPI = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || '';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (a.name LIKE ? OR a.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }

    const [assets] = await db.query(
      `SELECT a.id, a.name, a.code, a.type, a.condition, a.status,
              e.brand, e.model, e.serial_number
       FROM assets a
       LEFT JOIN equipments e ON a.id = e.asset_id
       ${whereClause}`,
      params
    );

    res.json({ success: true, total: assets.length, data: assets });
  } catch (err) {
    next(err);
  }
};

const generateExcel = async (req, res, next) => {
  try {
    const ExcelJS = require('exceljs');
    const [assets] = await db.query(
      `SELECT a.id, a.name, a.code, a.type, a.condition, a.status,
              e.brand, e.model, e.serial_number
       FROM assets a
       LEFT JOIN equipments e ON a.id = e.asset_id`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Aset');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Aset', key: 'name', width: 30 },
      { header: 'Kode', key: 'code', width: 15 },
      { header: 'Tipe', key: 'type', width: 15 },
      { header: 'Kondisi', key: 'condition', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 15 },
      { header: 'Serial Number', key: 'serial_number', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e3a5f' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    assets.forEach(asset => sheet.addRow(asset));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data-aset.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

const generatePDF = async (req, res, next) => {
  try {
    const PDFDocument = require('pdfkit');
    const [assets] = await db.query(
      `SELECT a.id, a.name, a.code, a.type, a.condition, a.status,
              e.brand, e.model, e.serial_number
       FROM assets a
       LEFT JOIN equipments e ON a.id = e.asset_id`
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=data-aset.pdf');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Data Aset', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [30, 150, 70, 70, 70, 80, 70, 80, 100];
    const headers = ['No', 'Nama Aset', 'Kode', 'Tipe', 'Kondisi', 'Status', 'Brand', 'Model', 'Serial Number'];
    const startX = 40;

    doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), 20).fill('#1e3a5f');

    doc.font('Helvetica-Bold').fontSize(9).fillColor('white');
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 4, tableTop + 6, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });

    doc.font('Helvetica').fontSize(8).fillColor('black');
    let y = tableTop + 20;

    assets.forEach((asset, index) => {
      const tipe = asset.type === 'equipment' ? 'Peralatan' : asset.type === 'room' ? 'Ruangan' : '-';
      const kondisi = asset.condition === 'good' ? 'Baik' : asset.condition === 'minor_damage' ? 'Rusak Ringan' : asset.condition === 'major_damage' ? 'Rusak Berat' : '-';
      const status = asset.status === 'available' ? 'Tersedia' : asset.status === 'in_use' ? 'Digunakan' : asset.status === 'maintenance' ? 'Dalam Perawatan' : 'Tidak Aktif';

      const rowData = [
        index + 1,
        asset.name || '-',
        asset.code || '-',
        tipe,
        kondisi,
        status,
        asset.brand || '-',
        asset.model || '-',
        asset.serial_number || '-'
      ];

      if (index % 2 === 0) {
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 18).fill('#f5f5f5');
      }

      doc.fillColor('black');
      x = startX;
      rowData.forEach((val, i) => {
        doc.text(String(val), x + 4, y + 5, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });

      doc.moveTo(startX, y + 18).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + 18).strokeColor('#cccccc').stroke();

      y += 18;
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllAssets, getAssetDetail, getAssetsAPI, generateExcel, generatePDF };