const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'deployments.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting peer review system migration...');

db.serialize(() => {
    // 1. Update existing roles
    db.run(`UPDATE users SET role = 'super_user' WHERE role = 'admin'`, function(err) {
        if (err) {
            console.error('Error updating admin roles:', err.message);
        } else {
            console.log(`✅ Updated ${this.changes} admin users to super_user`);
        }
    });

    db.run(`UPDATE users SET role = 'user' WHERE role = 'developer'`, function(err) {
        if (err) {
            console.error('Error updating developer roles:', err.message);
        } else {
            console.log(`✅ Updated ${this.changes} developer users to user`);
        }
    });

    // 2. Add test users for development (only if NODE_ENV=development)
    if (process.env.NODE_ENV === 'development') {
        const testUsers = [
            { email: 'developer1@phonepe.com', name: 'Developer 1', role: 'user' },
            { email: 'developer2@phonepe.com', name: 'Developer 2', role: 'user' },
            { email: 'reviewer1@phonepe.com', name: 'Reviewer 1', role: 'user' }
        ];

        testUsers.forEach(user => {
            db.run(`INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)`,
                [user.email, user.name, user.role],
                function(err) {
                    if (err) {
                        console.error(`Error adding test user ${user.email}:`, err.message);
                    } else if (this.changes > 0) {
                        console.log(`✅ Added test user: ${user.email}`);
                    }
                }
            );
        });
    }

    // 3. Verify migration
    setTimeout(() => {
        db.all('SELECT email, name, role FROM users', (err, rows) => {
            if (err) {
                console.error('Error verifying migration:', err.message);
            } else {
                console.log('\nCurrent users after migration:');
                if (rows.length === 0) {
                    console.log('   No users found');
                } else {
                    rows.forEach(row => {
                        const badge = row.role === 'super_user' ? '👑' : '👤';
                        console.log(`   ${badge} ${row.name} (${row.email}) - ${row.role}`);
                    });
                }
            }
            
            console.log('\n✅ Migration completed successfully!');
            db.close();
        });
    }, 500);
});
