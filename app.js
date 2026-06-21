require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var assetsRouter = require('./routes/assets');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/assets', assetsRouter); 

// Database synchronization & trigger setup on boot
(async () => {
  const db = require('./lib/db');
  try {
    console.log('[Boot] Setting up database triggers...');
    await db.query('DROP TRIGGER IF EXISTS after_distribution_insert');
    await db.query('DROP TRIGGER IF EXISTS after_distribution_delete');
    await db.query('DROP TRIGGER IF EXISTS after_distribution_update');

    await db.query(`
      CREATE TRIGGER after_distribution_insert
      AFTER INSERT ON asset_distributions
      FOR EACH ROW
      BEGIN
        IF NEW.status = 'active' THEN
          UPDATE assets SET status = 'in_use' WHERE id = NEW.asset_id;
        END IF;
      END
    `);

    await db.query(`
      CREATE TRIGGER after_distribution_delete
      AFTER DELETE ON asset_distributions
      FOR EACH ROW
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM asset_distributions 
          WHERE asset_id = OLD.asset_id 
            AND status = 'active'
        ) THEN
          UPDATE assets SET status = 'available' WHERE id = OLD.asset_id AND status = 'in_use';
        END IF;
      END
    `);

    await db.query(`
      CREATE TRIGGER after_distribution_update
      AFTER UPDATE ON asset_distributions
      FOR EACH ROW
      BEGIN
        IF OLD.status <> NEW.status THEN
          IF NOT EXISTS (
            SELECT 1 
            FROM asset_distributions 
            WHERE asset_id = NEW.asset_id 
              AND status = 'active'
          ) THEN
            UPDATE assets SET status = 'available' WHERE id = NEW.asset_id AND status = 'in_use';
          ELSE
            UPDATE assets SET status = 'in_use' WHERE id = NEW.asset_id AND status = 'available';
          END IF;
        END IF;
      END
    `);
    console.log('[Boot] Database triggers ensured.');

    console.log('[Boot] Synchronizing asset statuses with active distributions...');
    const [syncResult1] = await db.query(`
      UPDATE assets a
      SET a.status = 'available'
      WHERE a.status = 'in_use'
        AND a.id NOT IN (
          SELECT DISTINCT asset_id 
          FROM asset_distributions 
          WHERE status = 'active'
        )
    `);
    
    const [syncResult2] = await db.query(`
      UPDATE assets a
      SET a.status = 'in_use'
      WHERE a.status = 'available'
        AND a.id IN (
          SELECT DISTINCT asset_id 
          FROM asset_distributions 
          WHERE status = 'active'
        )
    `);

    console.log(`[Boot] Asset statuses synced. Reset to available: ${syncResult1.affectedRows}, Set to in_use: ${syncResult2.affectedRows}`);

    // Self-healing ACL roles and permissions
    console.log('[Boot] Repairing ACL roles and permissions...');
    await db.query("INSERT IGNORE INTO roles (name) VALUES ('admin')");
    const [[adminRole]] = await db.query("SELECT id FROM roles WHERE name = 'admin'");
    if (adminRole) {
      const adminRoleId = adminRole.id;
      const permissions = [
        'view_assets',
        'view_asset_detail',
        'export_assets',
        'api_assets',
        'manage_distributions',
        'print_bast',
        'api_distributions'
      ];
      for (const perm of permissions) {
        await db.query("INSERT IGNORE INTO permissions (name) VALUES (?)", [perm]);
      }
      const [allPerms] = await db.query("SELECT id FROM permissions");
      for (const perm of allPerms) {
        await db.query(
          "INSERT IGNORE INTO role_has_permissions (role_id, permission_id) VALUES (?, ?)",
          [adminRoleId, perm.id]
        );
      }
      const [adminUsers] = await db.query("SELECT id FROM users WHERE username = 'admin'");
      if (adminUsers.length > 0) {
        await db.query(
          "INSERT IGNORE INTO user_has_roles (user_id, role_id) VALUES (?, ?)",
          [adminUsers[0].id, adminRoleId]
        );
      }
    }
    console.log('[Boot] ACL self-healing completed.');
  } catch (err) {
    console.warn('[Boot Warning] Database initialization deferred (tables might not exist yet):', err.message);
  }
})();

// catch 404 and forward to error handler
app.use(notFoundHandler);

// error handler
app.use(errorHandler);

module.exports = app;
