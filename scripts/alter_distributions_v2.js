const db = require('../lib/db');

async function alter() {
  try {
    console.log('Altering asset_distributions table...');
    
    // Check current columns of asset_distributions table
    const [columns] = await db.query('DESCRIBE asset_distributions');
    const hasReturnDate = columns.some(c => c.Field === 'return_date');
    const hasReturnNotes = columns.some(c => c.Field === 'return_notes');
    
    // 1. Modify status column enum to support 'pending'
    await db.query(`
      ALTER TABLE asset_distributions 
      MODIFY COLUMN status ENUM('pending', 'active', 'returned') DEFAULT 'pending'
    `);
    console.log('- Column "status" enum updated to (pending, active, returned).');

    // 2. Add return_date column if not exists
    if (!hasReturnDate) {
      await db.query('ALTER TABLE asset_distributions ADD COLUMN return_date DATE NULL');
      console.log('- Column "return_date" added.');
    } else {
      console.log('- Column "return_date" already exists.');
    }

    // 3. Add return_notes column if not exists
    if (!hasReturnNotes) {
      await db.query('ALTER TABLE asset_distributions ADD COLUMN return_notes TEXT NULL');
      console.log('- Column "return_notes" added.');
    } else {
      console.log('- Column "return_notes" already exists.');
    }

    console.log('Database altered successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Alteration failed:', err);
    process.exit(1);
  }
}

alter();
