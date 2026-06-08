const db = require('../lib/db');
const path = require('path');
const fs = require('fs');

// Get all distributions with pagination & search
const getAllDistributions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (a.name LIKE ? OR a.code LIKE ? OR u_rec.name LIKE ? OR u_rec.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT ad.id, ad.distribution_date, ad.status, ad.notes, ad.bast_file_path, ad.return_date, ad.return_notes,
             a.id as asset_id, a.name as asset_name, a.code as asset_code,
             u_rec.name as recipient_name, u_rec.username as recipient_username,
             u_alloc.name as allocator_name, u_alloc.username as allocator_username
      FROM asset_distributions ad
      JOIN assets a ON ad.asset_id = a.id
      JOIN users u_rec ON ad.recipient_id = u_rec.id
      JOIN users u_alloc ON ad.allocated_by = u_alloc.id
      ${whereClause}
      ORDER BY ad.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [distributions] = await db.query(query, [...params, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM asset_distributions ad
      JOIN assets a ON ad.asset_id = a.id
      JOIN users u_rec ON ad.recipient_id = u_rec.id
      ${whereClause}
    `;
    const [[{ total }]] = await db.query(countQuery, params);

    res.render('distribution-list', {
      title: 'Daftar Distribusi Aset',
      user: req.session.username,
      activeTab: 'distributions',
      distributions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      search
    });
  } catch (err) {
    next(err);
  }
};

// Get list of recipients with asset counts
const getRecipients = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Query all users and count active distributions
    const query = `
      SELECT u.id, u.name, u.username, u.email,
             COUNT(CASE WHEN ad.status = 'active' THEN 1 END) as active_assets_count
      FROM users u
      LEFT JOIN asset_distributions ad ON u.id = ad.recipient_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY active_assets_count DESC, u.name ASC
    `;

    const [recipients] = await db.query(query, params);

    res.render('recipients-list', {
      title: 'Daftar Penerima Aset',
      user: req.session.username,
      activeTab: 'recipients',
      recipients,
      search
    });
  } catch (err) {
    next(err);
  }
};

// Step 1: Handle asset allocation (sets distribution to 'pending', asset status remains 'available')
const allocateAsset = async (req, res, next) => {
  try {
    const assetId = req.params.id;
    const { recipient_id, distribution_date, notes } = req.body;
    const allocatedBy = req.session.userId;

    if (!recipient_id || !distribution_date) {
      return res.status(400).send('Penerima dan Tanggal Distribusi harus diisi.');
    }

    // Check if asset exists and is available
    const [assets] = await db.query('SELECT * FROM assets WHERE id = ?', [assetId]);
    if (assets.length === 0) {
      return res.status(404).send('Aset tidak ditemukan.');
    }

    const asset = assets[0];
    if (asset.status !== 'available') {
      return res.status(400).send('Aset tidak tersedia untuk dialokasikan.');
    }

    // Insert distribution record as 'pending'
    await db.query(
      `INSERT INTO asset_distributions 
       (asset_id, recipient_id, allocated_by, distribution_date, status, notes, bast_file_path)
       VALUES (?, ?, ?, ?, 'pending', ?, NULL)`,
      [assetId, recipient_id, allocatedBy, distribution_date, notes || null]
    );

    res.redirect(`/assets/detail/${assetId}`);
  } catch (err) {
    next(err);
  }
};

// Step 2: Handle uploading signed BAST (sets distribution to 'active', asset status to 'in_use')
const uploadSignedBAST = async (req, res, next) => {
  try {
    const assetId = req.params.id;

    if (!req.file) {
      return res.status(400).send('Harap pilih file dokumen BAST yang sudah ditandatangani.');
    }

    // Check if there is a pending distribution for this asset
    const [distributions] = await db.query(
      `SELECT * FROM asset_distributions WHERE asset_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [assetId]
    );

    if (distributions.length === 0) {
      return res.status(400).send('Tidak ditemukan proses alokasi pending untuk aset ini.');
    }

    const distributionId = distributions[0].id;
    const bastFilePath = `/uploads/bast/${req.file.filename}`;

    // Start a transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update distribution status to active & save BAST file path
      await connection.query(
        `UPDATE asset_distributions SET status = 'active', bast_file_path = ? WHERE id = ?`,
        [bastFilePath, distributionId]
      );

      // 2. Update asset status to 'in_use' (terdistribusi)
      await connection.query(
        `UPDATE assets SET status = 'in_use' WHERE id = ?`,
        [assetId]
      );

      await connection.commit();
    } catch (transactionErr) {
      await connection.rollback();
      throw transactionErr;
    } finally {
      connection.release();
    }

    res.redirect(`/assets/detail/${assetId}`);
  } catch (err) {
    next(err);
  }
};

// Handle asset return (sets distribution to 'returned', asset status to 'available')
const returnAsset = async (req, res, next) => {
  try {
    const distributionId = req.params.id;
    const { return_date, return_notes } = req.body;

    if (!return_date) {
      return res.status(400).send('Tanggal pengembalian harus diisi.');
    }

    // Check for active distribution by ID
    const [distributions] = await db.query(
      `SELECT * FROM asset_distributions WHERE id = ? AND status = 'active'`,
      [distributionId]
    );

    if (distributions.length === 0) {
      return res.status(400).send('Data distribusi aktif tidak ditemukan.');
    }

    const distribution = distributions[0];
    const assetId = distribution.asset_id;

    // Start a transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update distribution status to returned, set return date and notes
      await connection.query(
        `UPDATE asset_distributions 
         SET status = 'returned', return_date = ?, return_notes = ? 
         WHERE id = ?`,
        [return_date, return_notes || null, distributionId]
      );

      // 2. Update asset status to available
      await connection.query(
        `UPDATE assets SET status = 'available' WHERE id = ?`,
        [assetId]
      );

      await connection.commit();
    } catch (transactionErr) {
      await connection.rollback();
      throw transactionErr;
    } finally {
      connection.release();
    }

    res.redirect('/assets/distributions');
  } catch (err) {
    next(err);
  }
};

// Handle canceling pending allocation
const cancelAllocation = async (req, res, next) => {
  try {
    const distributionId = req.params.id;

    // Check if distribution exists and is pending
    const [distributions] = await db.query(
      `SELECT * FROM asset_distributions WHERE id = ? AND status = 'pending'`,
      [distributionId]
    );

    if (distributions.length === 0) {
      return res.status(400).send('Data alokasi pending tidak ditemukan.');
    }

    const dist = distributions[0];
    const assetId = dist.asset_id;

    // Delete the pending distribution record
    await db.query('DELETE FROM asset_distributions WHERE id = ?', [distributionId]);

    res.redirect(`/assets/detail/${assetId}`);
  } catch (err) {
    next(err);
  }
};

// Render BAST print page
const printBAST = async (req, res, next) => {
  try {
    const distributionId = req.params.id;

    const query = `
      SELECT ad.id, ad.distribution_date, ad.notes, ad.bast_file_path,
             a.name as asset_name, a.code as asset_code, a.condition as asset_condition,
             e.brand, e.model, e.serial_number, e.specification,
             u_rec.name as recipient_name, u_rec.username as recipient_username, u_rec.email as recipient_email,
             u_alloc.name as allocator_name, u_alloc.username as allocator_username, u_alloc.email as allocator_email
      FROM asset_distributions ad
      JOIN assets a ON ad.asset_id = a.id
      LEFT JOIN equipments e ON a.id = e.asset_id
      JOIN users u_rec ON ad.recipient_id = u_rec.id
      JOIN users u_alloc ON ad.allocated_by = u_alloc.id
      WHERE ad.id = ?
    `;

    const [rows] = await db.query(query, [distributionId]);
    if (rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Data BAST tidak ditemukan',
        error: { status: 404, stack: '' }
      });
    }

    res.render('bast-print', {
      title: 'Cetak Form BAST',
      distribution: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// REST API for distributions
const getDistributionsAPI = async (req, res, next) => {
  try {
    const query = `
      SELECT ad.id, ad.distribution_date, ad.status, ad.notes, ad.bast_file_path, ad.return_date, ad.return_notes,
             a.id as asset_id, a.name as asset_name, a.code as asset_code,
             u_rec.name as recipient_name, u_rec.username as recipient_username,
             u_alloc.name as allocator_name, u_alloc.username as allocator_username
      FROM asset_distributions ad
      JOIN assets a ON ad.asset_id = a.id
      JOIN users u_rec ON ad.recipient_id = u_rec.id
      JOIN users u_alloc ON ad.allocated_by = u_alloc.id
      ORDER BY ad.created_at DESC
    `;

    const [distributions] = await db.query(query);
    res.json({
      success: true,
      total: distributions.length,
      data: distributions
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllDistributions,
  getRecipients,
  allocateAsset,
  uploadSignedBAST,
  cancelAllocation,
  returnAsset,
  printBAST,
  getDistributionsAPI
};
