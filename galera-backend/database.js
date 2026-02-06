const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to DB
const dbPath = path.resolve(__dirname, 'deployments.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Connection Error:", err.message);
    else console.log("Connected to SQLite database.");
});

db.serialize(() => {
    
    db.run(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cluster_name TEXT,
            target_hosts TEXT,
            async_node TEXT,
            jenkins_queue_id INTEGER,
            jenkins_build_id INTEGER,
            status TEXT, 
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            -- NEW COLUMNS FOR AUTH & APPROVAL
            requester_email TEXT,
            approver_email TEXT,
            deployment_config TEXT,  -- Saves the JSON IPs/passwords while waiting for approval
            template_id INTEGER,     -- Track which template was used (NULL if none)
            template_name TEXT,      -- Store template name for reference even if template is deleted
            
            -- DISK ALLOCATION TRACKING
            logs_size TEXT,          -- e.g., "10.0g"
            tmp_size TEXT,           -- e.g., "5.0g"
            gcache_size TEXT,        -- e.g., "2.5g"
            min_vg_size_gb REAL,     -- e.g., 49.75
            disk_allocation_pct TEXT -- JSON: '{"logs":20,"tmp":10,"gcache":5,"data":65}'
        )
    `);

    // 2. Users Table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            name TEXT,
            role TEXT DEFAULT 'user' -- 'super_user' or 'user'
        )
    `);

    // 3. Templates Table
    db.run(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            buffer_pool TEXT DEFAULT '1G',
            max_connections INTEGER DEFAULT 100,
            custom_params TEXT,      -- JSON string of key-value pairs
            force_wipe INTEGER DEFAULT 0,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            logs_gb REAL DEFAULT 3.0,
            tmp_gb REAL DEFAULT 3.0,
            gcache_gb REAL DEFAULT 3.0,
            status TEXT DEFAULT 'ACTIVE',  -- 'ACTIVE', 'PENDING_APPROVAL', 'REJECTED'
            approved_by TEXT,
            parent_template_id INTEGER     -- For tracking template edit versions
        )
    `);

    // 4. Preflight Results Table
    db.run(`
        CREATE TABLE IF NOT EXISTS preflight_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_hosts TEXT NOT NULL,
            async_node TEXT NOT NULL,
            jenkins_queue_id INTEGER,
            status TEXT DEFAULT 'RUNNING',  -- 'RUNNING', 'SUCCESS', 'FAILED'
            results_json TEXT,               -- Stores disk/RAM info per node
            error_message TEXT,              -- Error details if failed
            requester_email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            used_by_deployment_id INTEGER    -- Links to history.id when deployed
        )
    `);
    
    const myEmail = "prajwal5.intern@phonepe.com"; 
    
    db.run(`INSERT OR IGNORE INTO users (email, name, role) VALUES (?, 'Admin', 'super_user')`, [myEmail]);
});

module.exports = db;