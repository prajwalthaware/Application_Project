const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./deployments.db');

console.log('🔧 Adding template versioning support...\n');

db.serialize(() => {
    // Add parent_template_id to track edit relationships
    db.run(`ALTER TABLE templates ADD COLUMN parent_template_id INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate')) {
            console.error('❌ Error adding parent_template_id column:', err.message);
        } else {
            console.log('✅ Added parent_template_id column for tracking edits');
        }
    });

    // Add foreign key reference (optional, for data integrity)
    sontTimeout(() => {
        db.all("SELECT id, name, status, parent_template_id FROM templates", [], (err, rows) => {
            if (err) {
                console.error('❌ Error querying templates:', err.message);
            } else {
                console.log('\n📋 Current Templates:');
                rows.forEach(row => {
                    const parent = row.parent_template_id ? ` (edit of ID: ${row.parent_template_id})` : '';
                    console.log(`   ID ${row.id}: ${row.name} - ${row.status}${parent}`);
                });
            }
            
            console.log('\n✅ Migration complete!');
            console.log('Templates can now track edit relationships via parent_template_id');
            db.close();
        });
    }, 500);
});
