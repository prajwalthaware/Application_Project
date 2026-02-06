const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'deployments.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding disk allocation columns to history table...');

db.serialize(() => {
    // Add new columns if they don't exist
    db.run(`ALTER TABLE history ADD COLUMN logs_size TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding logs_size:', err.message);
        } else {
            console.log('✓ logs_size column added');
        }
    });

    db.run(`ALTER TABLE history ADD COLUMN tmp_size TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding tmp_size:', err.message);
        } else {
            console.log('✓ tmp_size column added');
        }
    });

    db.run(`ALTER TABLE history ADD COLUMN gcache_size TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding gcache_size:', err.message);
        } else {
            console.log('✓ gcache_size column added');
        }
    });

    db.run(`ALTER TABLE history ADD COLUMN min_vg_size_gb REAL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding min_vg_size_gb:', err.message);
        } else {
            console.log('✓ min_vg_size_gb column added');
        }
    });

    db.run(`ALTER TABLE history ADD COLUMN disk_allocation_pct TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding disk_allocation_pct:', err.message);
        } else {
            console.log('✓ disk_allocation_pct column added');
        }
    });

    setTimeout(() => {
        db.close(() => {
            console.log('\n Migration complete!');
            process.exit(0);
        });
    }, 500);
});
