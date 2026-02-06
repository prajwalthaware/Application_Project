const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'deployments.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting template disk allocation migration...');

db.serialize(() => {
    // Add new columns to templates table
    db.run(`ALTER TABLE templates ADD COLUMN logs_gb REAL DEFAULT 3.0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding logs_gb column:', err.message);
        } else {
            console.log('✅ Added logs_gb column');
        }
    });

    db.run(`ALTER TABLE templates ADD COLUMN tmp_gb REAL DEFAULT 3.0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding tmp_gb column:', err.message);
        } else {
            console.log('✅ Added tmp_gb column');
        }
    });

    db.run(`ALTER TABLE templates ADD COLUMN gcache_gb REAL DEFAULT 3.0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding gcache_gb column:', err.message);
        } else {
            console.log('✅ Added gcache_gb column');
        }
    });

    // Update existing templates to have default values (in case they were NULL)
    db.run(`UPDATE templates SET logs_gb = 3.0 WHERE logs_gb IS NULL`, (err) => {
        if (err) {
            console.error('Error updating logs_gb defaults:', err.message);
        } else {
            console.log('✅ Set default logs_gb values for existing templates');
        }
    });

    db.run(`UPDATE templates SET tmp_gb = 3.0 WHERE tmp_gb IS NULL`, (err) => {
        if (err) {
            console.error('Error updating tmp_gb defaults:', err.message);
        } else {
            console.log('✅ Set default tmp_gb values for existing templates');
        }
    });

    db.run(`UPDATE templates SET gcache_gb = 3.0 WHERE gcache_gb IS NULL`, function(err) {
        if (err) {
            console.error('Error updating gcache_gb defaults:', err.message);
        } else {
            console.log('✅ Set default gcache_gb values for existing templates');
            console.log(`   Updated ${this.changes} templates`);
        }

        // Verify migration
        db.all('SELECT id, name, logs_gb, tmp_gb, gcache_gb FROM templates', (err, rows) => {
            if (err) {
                console.error('Error verifying migration:', err.message);
            } else {
                console.log('\nCurrent templates after migration:');
                if (rows.length === 0) {
                    console.log('   No templates found');
                } else {
                    rows.forEach(row => {
                        const minDisk = (row.logs_gb + row.tmp_gb + row.gcache_gb).toFixed(1);
                        console.log(`   - ${row.name}: logs=${row.logs_gb}GB, tmp=${row.tmp_gb}GB, gcache=${row.gcache_gb}GB (min ${minDisk}GB)`);
                    });
                }
            }
            
            console.log('\n✅ Migration completed successfully!');
            db.close();
        });
    });
});
