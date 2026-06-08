const db = require('../lib/db');

async function migrate() {
  try {
    console.log('Starting migration for asset distributions and ACL...');

    // 1. Create ACL tables if not exist (as specified in GEMINI.md)
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      )
    `);
    console.log('- Table "roles" checked/created.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      )
    `);
    console.log('- Table "permissions" checked/created.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS role_has_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    console.log('- Table "role_has_permissions" checked/created.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_has_roles (
        user_id INT,
        role_id INT,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);
    console.log('- Table "user_has_roles" checked/created.');

    // 2. Create assets and equipments tables if not exist (to ensure they are present)
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL UNIQUE,
        type ENUM('equipment', 'room') NOT NULL,
        \`condition\` ENUM('good', 'minor_damage', 'major_damage') NOT NULL,
        status ENUM('available', 'in_use', 'maintenance', 'retired') NOT NULL,
        acquisition_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Table "assets" checked/created.');

    await db.query(`
      CREATE TABLE IF NOT EXISTS equipments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        brand VARCHAR(255) NULL,
        model VARCHAR(255) NULL,
        serial_number VARCHAR(255) NULL,
        specification TEXT NULL,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      )
    `);
    console.log('- Table "equipments" checked/created.');

    // 3. Create asset_distributions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_distributions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id BIGINT UNSIGNED NOT NULL,
        recipient_id BIGINT UNSIGNED NOT NULL,
        allocated_by BIGINT UNSIGNED NOT NULL,
        distribution_date DATE NOT NULL,
        status ENUM('active', 'returned') DEFAULT 'active',
        notes TEXT NULL,
        bast_file_path VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('- Table "asset_distributions" checked/created.');

    // 4. Seed roles
    const rolesToSeed = ['admin', 'staff', 'student'];
    for (const roleName of rolesToSeed) {
      await db.query('INSERT IGNORE INTO roles (name) VALUES (?)', [roleName]);
    }
    console.log('- Default roles seeded.');

    // 5. Seed permissions
    const permissionsToSeed = [
      'view_assets',
      'view_asset_detail',
      'export_assets',
      'api_assets',
      'manage_distributions',
      'print_bast',
      'api_distributions'
    ];
    for (const permName of permissionsToSeed) {
      await db.query('INSERT IGNORE INTO permissions (name) VALUES (?)', [permName]);
    }
    console.log('- Default permissions seeded.');

    // 6. Map all permissions to admin role
    const [[adminRole]] = await db.query('SELECT id FROM roles WHERE name = ?', ['admin']);
    const [allPerms] = await db.query('SELECT id FROM permissions');
    for (const perm of allPerms) {
      await db.query('INSERT IGNORE INTO role_has_permissions (role_id, permission_id) VALUES (?, ?)', [
        adminRole.id,
        perm.id
      ]);
    }
    console.log('- All permissions assigned to "admin" role.');

    // 7. Map admin user to admin role
    const [adminUsers] = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminUsers.length > 0) {
      const adminUserId = adminUsers[0].id;
      await db.query('INSERT IGNORE INTO user_has_roles (user_id, role_id) VALUES (?, ?)', [
        adminUserId,
        adminRole.id
      ]);
      console.log('- User "admin" assigned to "admin" role.');
    } else {
      console.log('- Warning: User "admin" not found. Please run "node scripts/init_db.js" first.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
