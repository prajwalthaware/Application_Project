# GALERA DEPLOYMENT SYSTEM - COMPLETE ARCHITECTURE EXPLANATION

## DATABASE ARCHITECTURE

### Three Databases in the System:

#### 1. **deployments.db** (92KB - MAIN DATABASE)
**Location:** `/galera-backend/deployments.db`

**Purpose:** Core application data for deployments, users, templates, and preflight checks

**Tables:**

##### `history` - Deployment Records
```sql
- id: Unique deployment ID
- cluster_name: Name of Galera cluster
- target_hosts: Comma-separated IPs (e.g., "10.0.0.1,10.0.0.2,10.0.0.3")
- async_node: Async replication node IP
- jenkins_queue_id: Jenkins queue ID (before build starts)
- jenkins_build_id: Actual Jenkins build number (after build starts)
- status: QUEUED → RUNNING → SUCCESS/FAILURE/CANCELLED
- timestamp: When deployment was created
- requester_email: Who requested the deployment
- approver_email: Who approved it (for regular users)
- deployment_config: JSON of all deployment parameters
- template_id: Which template was used
- template_name: Template name (kept even if template deleted)
- logs_size: e.g., "10.0g"
- tmp_size: e.g., "5.0g"
- gcache_size: e.g., "2.5g"
- min_vg_size_gb: Minimum disk space available
- disk_allocation_pct: JSON tracking allocation
```

##### `users` - User Authentication & Roles
```sql
- email: PRIMARY KEY (e.g., "prajwal5.intern@phonepe.com")
- name: Display name (e.g., "Admin", "Developer", "Reviewer")
- role: Either 'super_user' or 'user'
```

**Current Users:**
```
prajwal5.intern@phonepe.com  | Admin     | super_user (can bypass approvals, delete)
developer1@phonepe.com       | Developer | user (peer review required)
developer2@phonepe.com       | Developer | user (peer review required)
reviewer1@phonepe.com        | Reviewer  | user (peer review required)
```

##### `templates` - Configuration Templates
```sql
- id: Unique template ID
- name: Template name (UNIQUE)
- description: What this template is for
- buffer_pool: InnoDB buffer pool size (e.g., "1G")
- max_connections: Max MySQL connections
- custom_params: JSON of custom MySQL/Galera parameters
- force_wipe: REMOVED (now auto-detected from preflight)
- created_by: Email of creator
- created_at/updated_at: Timestamps
- logs_gb: Fixed disk allocation for logs (default 3.0)
- tmp_gb: Fixed disk allocation for tmp (default 3.0)
- gcache_gb: Fixed disk allocation for gcache (default 3.0)
- status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED'
- approved_by: Who approved this template
- parent_template_id: For versioned edits (points to original template)
```

##### `preflight_results` - Pre-deployment Checks
```sql
- id: Unique preflight check ID
- target_hosts: Hosts being checked
- async_node: Async node being checked
- jenkins_queue_id: Jenkins queue ID
- status: 'RUNNING' | 'SUCCESS' | 'FAILED'
- results_json: Disk/RAM info per node
- error_message: Error details if failed
- requester_email: Who requested it
- created_at/completed_at: Timestamps
```

---

#### 2. **sessions.db** (12KB - SESSION STORAGE)
**Location:** `/galera-backend/sessions.db`

**Purpose:** Express-session storage for user authentication sessions

**Table:**
```sql
sessions:
- sid: Session ID (PRIMARY KEY)
- sess: Session data (JSON)
- expired: Expiration timestamp
```

**Why separate?** Keeps session management isolated from business logic. Automatically managed by `express-session` with SQLite store.

---

#### 3. **galera.db** (0KB - EMPTY/UNUSED)
**Location:** `/galera-backend/galera.db`

**Purpose:** Appears to be a leftover from earlier development. **NOT USED** in current system.

**Status:** Empty file, can be safely deleted.

---

## 🔐 THE ROLE INCONSISTENCY ISSUE

### ⚠️ CRITICAL BUG DETECTED:

**File:** [auth.js](galera-backend/auth.js#L20-L21)

```javascript
// WRONG! Uses 'developer' role
db.run("INSERT INTO users (email, name, role) VALUES (?, ?, 'developer')", [email, name], (err) => {
    const newUser = { email, name, role: 'developer' };
    return done(null, newUser);
});
```

**Problem:**
- Database schema expects: `'super_user'` or `'user'`
- Auth.js creates users with: `'developer'`
- This will cause permission check failures!

**Impact:**
- New users logging in via Google OAuth get role='developer'
- Permission checks looking for role='user' will FAIL
- These users won't be able to do anything

**Why It Exists:**
- Leftover from old role system (before peer review migration)
- Migration script (`migrate_peer_review.js`) updates OLD users from 'developer' → 'user'
- But doesn't fix NEW user creation

**Solution Needed:**
Change [auth.js](galera-backend/auth.js#L20) line 20 from:
```javascript
// BEFORE (WRONG)
db.run("INSERT INTO users (email, name, role) VALUES (?, ?, 'developer')", [email, name], (err) => {

// AFTER (CORRECT)
db.run("INSERT INTO users (email, name, role) VALUES (?, ?, 'user')", [email, name], (err) => {
```

---

## 🔄 BACKEND ↔️ JENKINS COMMUNICATION

### How It Works:

#### 1. **Two Jenkins Credentials**

```javascript
// ADMIN CREDENTIALS - Can trigger builds, cancel builds
const jenkinsClient = axios.create({
    baseURL: process.env.JENKINS_URL,          // e.g., "http://192.168.56.23:8080"
    auth: { 
        username: process.env.JENKINS_USER,     // e.g., "galera-admin"
        password: process.env.JENKINS_TOKEN     // API token
    }
});

// VIEWER CREDENTIALS - Read-only, can only fetch logs
const jenkinsViewerClient = axios.create({
    baseURL: process.env.JENKINS_URL,
    auth: { 
        username: process.env.JENKINS_VIEWER_USER,  // e.g., "galera-viewer"
        password: process.env.JENKINS_VIEWER_TOKEN
    }
});
```

**Why two?** Security principle of least privilege:
- Regular users should only see logs, not trigger/cancel builds
- Admin operations use admin credentials
- Log viewing uses viewer credentials

---

### 2. **Deployment Flow: How Build ID Is Obtained**

#### Step 1: Trigger Jenkins Build
```javascript
// POST request to Jenkins with parameters
const response = await jenkinsClient.post(
    `/job/${process.env.JENKINS_JOB}/buildWithParameters`, 
    null, 
    { params: jenkinsParams }
);

// Jenkins returns Location header: /queue/item/12345/
const queueId = response.headers.location.match(/\/item\/(\d+)\//)[1];
// queueId = "12345"
```

**What happens:**
- Jenkins receives build request
- Jenkins puts it in a QUEUE (not started yet!)
- Returns **queue ID** (not build ID)
- Build will start when an executor is available

#### Step 2: Save to Database
```javascript
await dbRun(
    `INSERT INTO history (..., jenkins_queue_id, status, ...) 
     VALUES (?, ?, ?, ..., ?, 'QUEUED', ...)`,
    [..., queueId, ...]
);
```

**Database State:**
```
id: 42
jenkins_queue_id: 12345
jenkins_build_id: NULL          ← Not assigned yet!
status: QUEUED
```

#### Step 3: Start Monitoring (`monitorBuild` function)
```javascript
monitorBuild(queueId);  // Starts background polling

const monitorBuild = (queueId) => {
    console.log(`Started monitoring Queue ID: ${queueId}`);
    
    // Poll every 5 seconds
    const intervalId = setInterval(async () => {
        // Check database for current status
        db.get("SELECT jenkins_build_id, status FROM history WHERE jenkins_queue_id = ?", 
            [queueId], async (err, row) => {
            
            // If already finished, stop polling
            if (['SUCCESS', 'FAILURE', 'CANCELLED'].includes(row.status)) {
                return clearInterval(intervalId);
            }

            // STEP 3A: If no build_id yet, check queue
            if (!row.jenkins_build_id) {
                const qRes = await jenkinsClient.get(`/queue/item/${queueId}/api/json`);
                
                if (qRes.data.executable) {
                    // Build started! Get build number
                    const buildId = qRes.data.executable.number;
                    
                    // Update database
                    db.run(
                        "UPDATE history SET status = 'RUNNING', jenkins_build_id = ? WHERE jenkins_queue_id = ?", 
                        [buildId, queueId]
                    );
                }
            } 
            // STEP 3B: If build_id exists, check build status
            else {
                const bRes = await jenkinsClient.get(
                    `/job/${process.env.JENKINS_JOB}/${row.jenkins_build_id}/api/json`
                );
                
                // Check if build finished
                if (!bRes.data.building) {
                    db.run(
                        "UPDATE history SET status = ? WHERE jenkins_queue_id = ?", 
                        [bRes.data.result, queueId]  // SUCCESS or FAILURE
                    );
                    clearInterval(intervalId);  // Stop polling
                }
            }
        });
    }, 5000);  // Every 5 seconds
};
```

**Timeline Example:**
```
T+0s:   Backend triggers build → Queue ID: 12345
        Database: { queue_id: 12345, build_id: NULL, status: 'QUEUED' }

T+5s:   Poll #1 → Queue still waiting for executor
        Database: No change

T+10s:  Poll #2 → Build started! Build ID: 789
        Database: { queue_id: 12345, build_id: 789, status: 'RUNNING' }

T+15s:  Poll #3 → Build still running (building: true)
        Database: No change

T+120s: Poll #24 → Build finished! (building: false, result: 'SUCCESS')
        Database: { queue_id: 12345, build_id: 789, status: 'SUCCESS' }
        Polling stops
```

---

### 3. **Getting Console Logs**

**Endpoint:** `GET /api/console-logs/:id`

```javascript
app.get('/api/console-logs/:id', ensureAuthenticated, async (req, res) => {
    // Get deployment from database
    const deployment = await dbGet(
        "SELECT jenkins_build_id FROM history WHERE id = ?", 
        [req.params.id]
    );
    
    if (!deployment || !deployment.jenkins_build_id) {
        return res.status(404).json({ error: "Build not found" });
    }

    // Fetch console logs from Jenkins using VIEWER credentials
    const response = await jenkinsViewerClient.get(
        `/job/${process.env.JENKINS_JOB}/${deployment.jenkins_build_id}/consoleText`
    );
    
    res.json({ 
        logs: response.data,
        buildId: deployment.jenkins_build_id
    });
});
```

**Flow:**
1. Frontend requests logs for deployment ID 42
2. Backend looks up `jenkins_build_id` (e.g., 789) from database
3. Backend requests `/job/GALERA-DEPLOY/789/consoleText` from Jenkins
4. Jenkins returns plain text console output
5. Backend sends it to frontend

**Security:**
- Uses `jenkinsViewerClient` (read-only credentials)
- Requires authentication (`ensureAuthenticated`)
- No write/trigger permissions needed

---

### 4. **Preflight Check Communication**

Similar pattern, but with a **webhook**:

**Step 1:** Backend triggers preflight
```javascript
const response = await jenkinsClient.post(
    `/job/GALERA-PREFLIGHT/buildWithParameters`,
    null,
    { params: { PREFLIGHT_ID: preflightId, TARGET_HOSTS: hosts, ... } }
);
```

**Step 2:** Jenkins runs preflight job, which:
1. Checks disk space
2. Checks RAM
3. Checks for existing MySQL installations
4. POSTs results back to backend webhook

**Step 3:** Backend webhook receives results
```javascript
app.post('/api/preflight/:id/complete', express.json(), async (req, res) => {
    const { status, results, error_message } = req.body;
    
    // Update database with results
    await dbRun(
        `UPDATE preflight_results 
         SET status = ?, results_json = ?, error_message = ? 
         WHERE id = ?`,
        [status, JSON.stringify(results), error_message, req.params.id]
    );
    
    res.json({ message: 'Received' });
});
```

**Why webhook?** Preflight checks can be long-running. Instead of polling, Jenkins calls back when done.

---

## 👥 WHY 3 TEST USERS IN migrate_peer_review.js?

### The Code:
```javascript
if (process.env.NODE_ENV === 'development') {
    const testUsers = [
        { email: 'developer1@phonepe.com', name: 'Developer 1', role: 'user' },
        { email: 'developer2@phonepe.com', name: 'Developer 2', role: 'user' },
        { email: 'reviewer1@phonepe.com', name: 'Reviewer 1', role: 'user' }
    ];
}
```

### Why We Need This:

**You currently have 4 users total:**
1. `prajwal5.intern@phonepe.com` → Admin (super_user)
2. `developer1@phonepe.com` → Developer (user)
3. `developer2@phonepe.com` → Developer (user)
4. `reviewer1@phonepe.com` → Reviewer (user)

**Purpose of Multiple Test Users:**

1. **Testing Peer Review Workflow**
   - Developer creates deployment → needs ANOTHER user to approve
   - Developer creates template → needs ANOTHER user to approve
   - Can't approve your own work!

2. **Testing Different Scenarios**
   - Developer 1 creates → Developer 2 approves ✓
   - Developer 1 creates → Reviewer approves ✓
   - Developer 1 creates → Developer 1 tries to approve ✗ (blocked)

3. **Dev Mode User Switcher**
   - Without multiple Google accounts, you can't test peer review
   - User switcher lets you switch between these 3 test users
   - Simulates different users logging in

**Why Not Just 2 Users?**
- Flexibility: Test different approval paths
- Edge cases: What if approver also becomes requester?
- More realistic: Real systems have >2 users

**The Names ("Developer", "Reviewer"):**
- Just labels for testing
- ALL THREE have role='user' (equal peers!)
- Names help you remember who's who during testing
- In production, would be real employee names

---

## 🔧 SUMMARY OF ISSUES FOUND

### 1. **CRITICAL BUG: [auth.js](galera-backend/auth.js#L20) uses 'developer' role**
**Fix:** Change `'developer'` to `'user'`

### 2. **UNUSED DATABASE: galera.db**
**Fix:** Can be safely deleted

### 3. **Misleading File: [toggle_role.js](galera-backend/toggle_role.js)**
**Status:** Still references old roles ('admin', 'developer')
**Fix:** Update to use 'super_user' and 'user', or delete if unused

---

## 📝 COMPLETE SYSTEM FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                     GALERA DEPLOYMENT SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

USER AUTHENTICATION:
┌──────────┐
│  User    │
│ (Browser)│
└────┬─────┘
     │ 1. Clicks "Login with Google"
     ▼
┌────────────┐      2. OAuth Flow      ┌──────────────┐
│  Backend   │ ◄──────────────────────►│ Google OAuth │
│  (3000)    │                         └──────────────┘
└─────┬──────┘
      │ 3. auth.js checks/creates user
      ▼
┌──────────────┐
│deployments.db│  ← Stores user with role='developer' ❌ BUG!
│ users table  │     Should be 'user' ✓
└──────────────┘

---

DEPLOYMENT FLOW:
┌──────────┐
│ Frontend │ 1. User fills deployment form
│ (React)  │
└────┬─────┘
     │ POST /api/deploy
     ▼
┌────────────┐
│  Backend   │ 2. Check user role
└─────┬──────┘
      │
      ├─→ If super_user:
      │   ┌─────────────────────────────────────┐
      │   │ A. Trigger Jenkins immediately      │
      │   │ B. Save to DB with status='QUEUED'  │
      │   │ C. Start monitorBuild()             │
      │   └─────────────────────────────────────┘
      │
      └─→ If user (regular):
          ┌─────────────────────────────────────┐
          │ A. Save to DB with                  │
          │    status='PENDING_APPROVAL'        │
          │ B. Wait for peer approval           │
          └─────────────────────────────────────┘
                          │
          ┌───────────────┴──────────────┐
          │ Peer clicks "Approve"        │
          │ POST /api/approve/:id        │
          └───────────────┬──────────────┘
                          │
          ┌───────────────▼──────────────┐
          │ A. Validate peer review      │
          │ B. Trigger Jenkins           │
          │ C. Update status='QUEUED'    │
          │ D. Start monitorBuild()      │
          └──────────────────────────────┘

JENKINS MONITORING:
┌──────────────┐
│monitorBuild()│ ← Polls every 5 seconds
└──────┬───────┘
       │
       ▼
┌──────────────┐     GET /queue/item/12345/api/json
│   Jenkins    │ ◄───────────────────────────────────
│              │     Returns: { executable: { number: 789 } }
└──────┬───────┘
       │
       │ Update DB: jenkins_build_id=789, status='RUNNING'
       ▼
┌──────────────┐     GET /job/GALERA-DEPLOY/789/api/json
│   Jenkins    │ ◄───────────────────────────────────
│              │     Returns: { building: false, result: 'SUCCESS' }
└──────┬───────┘
       │
       │ Update DB: status='SUCCESS'
       ▼
┌──────────────┐
│deployments.db│
│ history table│
└──────────────┘

CONSOLE LOGS:
┌──────────┐     GET /api/console-logs/42
│ Frontend │ ───────────────────────────────────►
└──────────┘
                                    ┌────────────┐
                                    │  Backend   │
                                    └─────┬──────┘
                                          │ 1. Query DB for jenkins_build_id
                                          ▼
                                    ┌──────────────┐
                                    │deployments.db│ → build_id: 789
                                    └──────────────┘
                                          │ 2. Request logs from Jenkins
                                          ▼
                                    ┌──────────────┐
                                    │   Jenkins    │
                                    │GET /job/789/ │
                                    │ consoleText  │
                                    └──────┬───────┘
                                           │ 3. Return plain text logs
                                           ▼
┌──────────┐                        ┌────────────┐
│ Frontend │ ◄────────────────────  │  Backend   │
│ Displays │                        └────────────┘
│   Logs   │
└──────────┘
```

---

## 🎯 RECOMMENDATIONS

1. **FIX CRITICAL BUG:** Update [auth.js](galera-backend/auth.js#L20) role from 'developer' to 'user'
2. **CLEANUP:** Delete unused [galera.db](galera-backend/galera.db)
3. **UPDATE:** Fix [toggle_role.js](galera-backend/toggle_role.js) to use new role names
4. **KEEP:** The 3 test users are necessary for proper peer review testing
5. **DOCUMENT:** Add comments in migration files explaining why they exist
