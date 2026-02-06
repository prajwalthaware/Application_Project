# DATABASE TABLES REFERENCE

## 📍 WHERE TABLES ARE CREATED

### Primary Location: [database.js](galera-backend/database.js)
**File:** `/galera-backend/database.js`
**Purpose:** Creates all 4 main tables when backend starts

---

## 🗄️ DATABASE: deployments.db (92KB)

### Table 1: `history` (Deployment Records)
**Created in:** [database.js](galera-backend/database.js#L14-L38)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_name TEXT,
    target_hosts TEXT,               -- e.g., "10.0.0.1,10.0.0.2,10.0.0.3"
    async_node TEXT,
    jenkins_queue_id INTEGER,        -- Queue ID before build starts
    jenkins_build_id INTEGER,        -- Actual build number
    status TEXT,                     -- QUEUED → RUNNING → SUCCESS/FAILURE
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- AUTH & APPROVAL
    requester_email TEXT,            -- Who requested this deployment
    approver_email TEXT,             -- Who approved it (NULL for super_user)
    deployment_config TEXT,          -- Full JSON of deployment params
    template_id INTEGER,             -- Which template was used
    template_name TEXT,              -- Template name for reference
    
    -- DISK ALLOCATION
    logs_size TEXT,                  -- e.g., "10.0g"
    tmp_size TEXT,                   -- e.g., "5.0g"
    gcache_size TEXT,                -- e.g., "2.5g"
    min_vg_size_gb REAL,             -- Available disk space
    disk_allocation_pct TEXT         -- JSON allocation percentages
)
```

**Modified by migrations:**
- [migrate_disk_allocation.js](galera-backend/migrate_disk_allocation.js) - Added disk columns
- Built-in columns for auth/approval in original schema

**Sample Data:**
```
id | cluster_name | status   | requester_email                | template_name
1  | Production   | FAILURE  | prajwal5.intern@phonepe.com   | NULL
2  | Production   | FAILURE  | prajwal5.intern@phonepe.com   | NULL
3  | Production   | CANCELLED| prajwal5.intern@phonepe.com   | NULL
```

---

### Table 2: `users` (User Authentication & Roles)
**Created in:** [database.js](galera-backend/database.js#L42-L47)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,          -- Google OAuth email
    name TEXT,                       -- Display name
    role TEXT DEFAULT 'user'         -- 'super_user' or 'user'
)
```

**Modified by migrations:**
- [migrate_peer_review.js](galera-backend/migrate_peer_review.js) - Updates roles, adds test users

**Current Data:**
```
email                          | name      | role
prajwal5.intern@phonepe.com   | Admin     | super_user
developer1@phonepe.com         | Developer | user
developer2@phonepe.com         | Developer | user
reviewer1@phonepe.com          | Reviewer  | user
```

**NOTE:** Schema comment says `'admin' or 'developer'` but actual roles are `'super_user' or 'user'` - this is outdated!

---

### Table 3: `templates` (Configuration Templates)
**Created in:** [database.js](galera-backend/database.js#L51-L69)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    buffer_pool TEXT DEFAULT '1G',
    max_connections INTEGER DEFAULT 100,
    custom_params TEXT,              -- JSON string of custom config
    force_wipe INTEGER DEFAULT 0,    -- DEPRECATED (auto-detected now)
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- DISK ALLOCATION (added by migration)
    logs_gb REAL DEFAULT 3.0,
    tmp_gb REAL DEFAULT 3.0,
    gcache_gb REAL DEFAULT 3.0,
    
    -- APPROVAL WORKFLOW (added by migration)
    status TEXT DEFAULT 'ACTIVE',    -- 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED'
    approved_by TEXT,
    
    -- VERSIONING (added by migration)
    parent_template_id INTEGER       -- Links to original when editing
)
```

**Modified by migrations:**
- [migrate_template_disk_allocation.js](galera-backend/migrate_template_disk_allocation.js) - Added logs_gb, tmp_gb, gcache_gb
- [migrate_template_approval.js](galera-backend/migrate_template_approval.js) - Added status, approved_by
- [migrate_template_versioning.js](galera-backend/migrate_template_versioning.js) - Added parent_template_id

**Sample Data:**
```
id | name                    | status | created_by                  | logs_gb | tmp_gb | gcache_gb
3  | SSL_Enabled            | ACTIVE | prajwal5.intern@phonepe.com | 3.0     | 3.0    | 3.0
4  | Deploy-Galera-Cluster  | ACTIVE | prajwal5.intern@phonepe.com | 3.0     | 3.0    | 3.0
5  | Test                   | ACTIVE | prajwal5.intern@phonepe.com | 3.0     | 3.0    | 3.0
```

---

### Table 4: `preflight_results` (Pre-deployment Checks)
**Created in:** [database.js](galera-backend/database.js#L73-L84)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS preflight_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_hosts TEXT NOT NULL,
    async_node TEXT NOT NULL,
    jenkins_queue_id INTEGER,
    status TEXT DEFAULT 'RUNNING',   -- 'RUNNING' | 'SUCCESS' | 'FAILED'
    results_json TEXT,               -- Disk/RAM info per node
    error_message TEXT,
    requester_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    used_by_deployment_id INTEGER    -- Links to history.id
)
```

**Modified by migrations:** None (original schema)

**Purpose:** Stores results from preflight checks before deployment

---

## 🗄️ DATABASE: sessions.db (12KB)

### Table: `sessions`
**Created by:** `express-session` with `better-sqlite3-session-store`
**Created in:** [server.js](galera-backend/server.js) when Express Session middleware initializes

**Schema:**
```sql
CREATE TABLE sessions (
    sid PRIMARY KEY,           -- Session ID
    expired,                   -- Expiration timestamp
    sess                       -- Session data (JSON)
)
```

**Configuration in server.js:**
```javascript
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');

app.use(session({
    store: new SqliteStore({
        client: new Database('./sessions.db'),
        expired: {
            clear: true,
            intervalMs: 900000
        }
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
```

**Purpose:** Stores Express session data for logged-in users

---

## 🗄️ DATABASE: galera.db (0KB - EMPTY)

**Status:** UNUSED - No tables
**Purpose:** Unknown - possibly leftover from development
**Recommendation:** Can be safely deleted

---

## 📋 MIGRATION FILES

These files MODIFY existing tables (run once to add new columns):

1. **[migrate_disk_allocation.js](galera-backend/migrate_disk_allocation.js)**
   - Adds: `logs_size`, `tmp_size`, `gcache_size`, `min_vg_size_gb`, `disk_allocation_pct` to `history`
   - Purpose: Track disk allocation for each deployment

2. **[migrate_peer_review.js](galera-backend/migrate_peer_review.js)**
   - Updates: User roles from 'admin'/'developer' to 'super_user'/'user'
   - Adds: Test users for development mode
   - Purpose: Implement peer review system

3. **[migrate_template_disk_allocation.js](galera-backend/migrate_template_disk_allocation.js)**
   - Adds: `logs_gb`, `tmp_gb`, `gcache_gb` to `templates`
   - Purpose: Fixed disk allocation in templates

4. **[migrate_template_approval.js](galera-backend/migrate_template_approval.js)**
   - Adds: `status`, `approved_by` to `templates`
   - Purpose: Template approval workflow

5. **[migrate_template_versioning.js](galera-backend/migrate_template_versioning.js)**
   - Adds: `parent_template_id` to `templates`
   - Purpose: Track template edit versions

---

## 🔍 HOW TO VIEW TABLES

### View All Tables in a Database:
```bash
cd /Users/prajwal5.intern/Documents/Project/galera-backend
sqlite3 deployments.db ".tables"
```

### View Table Schema:
```bash
sqlite3 deployments.db ".schema history"
sqlite3 deployments.db ".schema users"
sqlite3 deployments.db ".schema templates"
sqlite3 deployments.db ".schema preflight_results"
```

### View Table Data:
```bash
# All columns
sqlite3 deployments.db "SELECT * FROM users"

# Specific columns
sqlite3 deployments.db "SELECT id, name, status FROM templates"

# With formatting
sqlite3 deployments.db "SELECT * FROM users" -header -column

# Count records
sqlite3 deployments.db "SELECT COUNT(*) FROM history"
```

### Interactive SQLite Shell:
```bash
sqlite3 deployments.db

# Inside sqlite shell:
.tables                    # List all tables
.schema users             # Show schema
SELECT * FROM users;      # Query data
.quit                     # Exit
```

---

## SUMMARY

| Database       | Size  | Tables               | Created By                | Purpose                    |
|----------------|-------|----------------------|---------------------------|----------------------------|
| deployments.db | 92KB  | 4 tables             | database.js               | Main application data      |
| sessions.db    | 12KB  | 1 table              | express-session           | User session storage       |
| galera.db      | 0KB   | 0 tables (empty)     | Unknown                   | Unused/leftover file       |

**Total Tables:** 5 active tables across 2 databases
