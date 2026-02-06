const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./deployments.db');

console.log('🔧 Adding template approval system columns...\n');

db.serialize(() => {
    // Add new columns for approval workflow
    db.run(`ALTER TABLE templates ADD COLUMN status TEXT DEFAULT 'ACTIVE'`, (err) => {
        if (err && !err.message.includes('duplicate')) {
            console.error('❌ Error adding status column:', err.message);
        } else {
            console.log('✅ Added status column');
        }
    });

    db.run(`ALTER TABLE templates ADD COLUMN approved_by TEXT`, (err) => {
        if (err && !err.message.includes('duplicate')) {
            console.error('❌ Error adding approved_by column:', err.message);
        } else {
            console.log('✅ Added approved_by column');
        }
    });

    // Set all existing templates to ACTIVE (backward compatibility)
    db.run(`UPDATE templates SET status = 'ACTIVE' WHERE status IS NULL`, function(err) {
        if (err) {
            console.error('❌ Error updating existing templates:', err.message);
        } else {
            console.log(`✅ Set ${this.changes} existing templates to ACTIVE status`);
        }
    });

    db.all("SELECT id, name, status FROM templates", [], (err, rows) => {
        if (err) {
            console.error('❌ Error querying templates:', err.message);
        } else {
            console.log('\n📋 Current Templates:');
            rows.forEach(row => {
                console.log(`   ID ${row.id}: ${row.name} - Status: ${row.status || 'NULL'}`);
            });
        }
        
        console.log('\n✅ Migration complete!');
        console.log('Templates can now have status: ACTIVE, PENDING_APPROVAL, REJECTED');
        db.close();
    });
});
