const db = require('../lib/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log('Seeding 10 dummy recipients (users)...');
    
    // Default password hash for dummy users
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const dummyRecipients = [
      { name: 'Laboratorium Komputer Terpadu', username: 'labor_terpadu', email: 'labor.terpadu@fti.unand.ac.id' },
      { name: 'Laboratorium Jaringan & Keamanan', username: 'labor_jaringan', email: 'labor.jaringan@fti.unand.ac.id' },
      { name: 'Laboratorium Sistem Informasi', username: 'labor_si', email: 'labor.si@fti.unand.ac.id' },
      { name: 'Dekanat FTI', username: 'dekanat', email: 'dekanat@fti.unand.ac.id' },
      { name: 'Tata Usaha FTI', username: 'tu_fti', email: 'tu@fti.unand.ac.id' },
      { name: 'Dr. Jamilah (Dosen)', username: 'dosen_jamilah', email: 'jamilah@fti.unand.ac.id' },
      { name: 'Prof. Heru (Dosen)', username: 'dosen_heru', email: 'heru@fti.unand.ac.id' },
      { name: 'Laboratorium Rekayasa Perangkat Lunak', username: 'labor_rpl', email: 'labor.rpl@fti.unand.ac.id' },
      { name: 'Ruang Seminar Utama', username: 'ruang_seminar', email: 'seminar@fti.unand.ac.id' },
      { name: 'Perpustakaan FTI', username: 'perpustakaan', email: 'perpus@fti.unand.ac.id' }
    ];

    // Find the 'staff' role ID or default to a safe one
    const [roles] = await connection.query('SELECT id FROM roles WHERE name = ?', ['staff']);
    const staffRoleId = roles.length > 0 ? roles[0].id : null;

    for (const r of dummyRecipients) {
      // Check if username already exists
      const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', [r.username]);
      if (existing.length === 0) {
        const [result] = await connection.query(
          'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)',
          [r.name, r.username, r.email, hashedPassword]
        );
        const newUserId = result.insertId;
        console.log(`- User "${r.name}" created.`);
        
        // Map user to 'staff' role if it exists
        if (staffRoleId) {
          await connection.query('INSERT IGNORE INTO user_has_roles (user_id, role_id) VALUES (?, ?)', [
            newUserId,
            staffRoleId
          ]);
        }
      } else {
        console.log(`- User "${r.name}" already exists.`);
      }
    }

    console.log('\nSeeding 10 dummy assets & equipments...');

    const dummyAssets = [
      {
        name: 'PC Laboratorium A',
        code: 'AST-004',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2024-01-15',
        acquisition_cost: 15000000.00,
        condition: 'good',
        status: 'available',
        brand: 'ASUS',
        model: 'ExpertCenter D7',
        serial_number: 'SN-AS-004',
        specification: 'Intel Core i7, 16GB RAM, 512GB SSD, Windows 11 Home'
      },
      {
        name: 'PC Laboratorium B',
        code: 'AST-005',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2024-01-15',
        acquisition_cost: 15000000.00,
        condition: 'good',
        status: 'available',
        brand: 'ASUS',
        model: 'ExpertCenter D7',
        serial_number: 'SN-AS-005',
        specification: 'Intel Core i7, 16GB RAM, 512GB SSD, Windows 11 Home'
      },
      {
        name: 'Router Cisco',
        code: 'AST-006',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-11-20',
        acquisition_cost: 35000000.00,
        condition: 'good',
        status: 'available',
        brand: 'Cisco',
        model: 'ISR 4331',
        serial_number: 'SN-CS-006',
        specification: '3 GE ports, 2 NIM slots, 1 ISC slot, 4GB Flash, 4GB DRAM'
      },
      {
        name: 'Switch Catalyst',
        code: 'AST-007',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-11-20',
        acquisition_cost: 12000000.00,
        condition: 'good',
        status: 'available',
        brand: 'Cisco',
        model: 'Catalyst 2960-L',
        serial_number: 'SN-CS-007',
        specification: '24 Port GigE, 4 x 1G SFP, LAN Lite'
      },
      {
        name: 'Smart TV Samsung 55"',
        code: 'AST-008',
        type: 'equipment',
        acquisition_type: 'grant',
        acquisition_date: '2024-03-05',
        acquisition_cost: 7500000.00,
        condition: 'good',
        status: 'available',
        brand: 'Samsung',
        model: 'UA55AU7000',
        serial_number: 'SN-SM-008',
        specification: '55 Inch Crystal UHD 4K Smart TV, HDR10+'
      },
      {
        name: 'Server Dell PowerEdge',
        code: 'AST-009',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-08-10',
        acquisition_cost: 85000000.00,
        condition: 'good',
        status: 'available',
        brand: 'Dell',
        model: 'PowerEdge R750',
        serial_number: 'SN-DL-009',
        specification: 'Intel Xeon Gold, 64GB DDR4 RDIMM, 2x 1.2TB SAS HDD'
      },
      {
        name: 'Printer HP LaserJet',
        code: 'AST-010',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-05-14',
        acquisition_cost: 4500000.00,
        condition: 'minor_damage',
        status: 'available',
        brand: 'HP',
        model: 'LaserJet Pro M404dn',
        serial_number: 'SN-HP-010',
        specification: 'Duplex printing, Mono laser, 40 ppm'
      },
      {
        name: 'Access Point Aruba',
        code: 'AST-011',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-09-18',
        acquisition_cost: 3200000.00,
        condition: 'good',
        status: 'available',
        brand: 'Aruba',
        model: 'AP-303',
        serial_number: 'SN-AR-011',
        specification: 'Dual Radio 2x2 802.11ac Access Point'
      },
      {
        name: 'AC Daikin 2 PK',
        code: 'AST-012',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2022-12-05',
        acquisition_cost: 6500000.00,
        condition: 'good',
        status: 'available',
        brand: 'Daikin',
        model: 'FTNE50MV14',
        serial_number: 'SN-DK-012',
        specification: '2 PK Standard Split AC, R410A'
      },
      {
        name: 'UPS APC 1500VA',
        code: 'AST-013',
        type: 'equipment',
        acquisition_type: 'procurement',
        acquisition_date: '2023-10-22',
        acquisition_cost: 5800000.00,
        condition: 'good',
        status: 'available',
        brand: 'APC',
        model: 'Smart-UPS 1500',
        serial_number: 'SN-AP-013',
        specification: '1500VA/1000W Line Interactive, LCD Interface'
      }
    ];

    for (const a of dummyAssets) {
      // Check if asset already exists
      const [existing] = await connection.query('SELECT id FROM assets WHERE code = ?', [a.code]);
      if (existing.length === 0) {
        const [assetResult] = await connection.query(
          `INSERT INTO assets 
           (name, code, type, acquisition_type, acquisition_date, acquisition_cost, \`condition\`, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.name, a.code, a.type, a.acquisition_type, a.acquisition_date, a.acquisition_cost, a.condition, a.status]
        );
        const assetId = assetResult.insertId;

        await connection.query(
          `INSERT INTO equipments 
           (asset_id, brand, model, serial_number, specification) 
           VALUES (?, ?, ?, ?, ?)`,
          [assetId, a.brand, a.model, a.serial_number, a.specification]
        );
        console.log(`- Asset "${a.name}" (${a.code}) created.`);
      } else {
        console.log(`- Asset "${a.name}" (${a.code}) already exists.`);
      }
    }

    await connection.commit();
    console.log('\nSeeding completed successfully.');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

seed();
