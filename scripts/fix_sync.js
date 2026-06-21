const db = require('../lib/db');

async function fix() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log('1. Synchronizing asset statuses with existing distributions...');
    
    // Sync query: Set status to 'available' for any 'in_use' asset that has no active/pending distributions
    const [syncResult] = await connection.query(`
      UPDATE assets a
      SET a.status = 'available'
      WHERE a.status = 'in_use'
        AND a.id NOT IN (
          SELECT DISTINCT asset_id 
          FROM asset_distributions 
          WHERE status IN ('active', 'pending')
        )
    `);
    
    console.log(`- Synced assets. Rows affected: ${syncResult.affectedRows}`);

    console.log('\n2. Creating AFTER DELETE trigger on asset_distributions...');
    
    // Drop trigger if exists
    await connection.query('DROP TRIGGER IF EXISTS after_distribution_delete');
    
    // Create AFTER DELETE trigger to auto-update asset status back to 'available'
    await connection.query(`
      CREATE TRIGGER after_distribution_delete
      AFTER DELETE ON asset_distributions
      FOR EACH ROW
      BEGIN
        IF OLD.status IN ('active', 'pending') THEN
          IF NOT EXISTS (
            SELECT 1 
            FROM asset_distributions 
            WHERE asset_id = OLD.asset_id 
              AND status IN ('active', 'pending')
          ) THEN
            UPDATE assets SET status = 'available' WHERE id = OLD.asset_id;
          END IF;
        END IF;
      END
    `);
    
    console.log('- Trigger "after_distribution_delete" created successfully.');

    await connection.commit();
    console.log('\nDatabase synchronization fixed successfully.');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('Failed to fix synchronization:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

fix();
