require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('./auth'); // Import our Passport config
const { clusterSchema, preflightSchema, HARD_CONSTRAINTS } = require('./validator');
const db = require('./database');
const { dbGet, dbAll, dbRun, markPreflightAsUsed, validatePeerReview } = require('./dbUtils');

const app = express();


app.use(express.json());

app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true 
}));


app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: '.' }), 
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));


app.use(passport.initialize());
app.use(passport.session());


const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Unauthorized. Please login." });
};

const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'super_user') return next();
    res.status(403).json({ error: "Access Denied. Super user only." });
};

// Admin client - for triggering builds (keep existing functionality)
const jenkinsClient = axios.create({
    baseURL: process.env.JENKINS_URL,
    auth: { username: process.env.JENKINS_USER, password: process.env.JENKINS_TOKEN }
});

// Viewer client - for read-only access to logs
const jenkinsViewerClient = axios.create({
    baseURL: process.env.JENKINS_URL,
    auth: { username: process.env.JENKINS_VIEWER_USER, password: process.env.JENKINS_VIEWER_TOKEN }
});


const monitorBuild = (queueId) => {
    console.log(`Started monitoring Queue ID: ${queueId}`);
    const intervalId = setInterval(async () => {
        try {
            db.get("SELECT jenkins_build_id, status FROM history WHERE jenkins_queue_id = ?", [queueId], async (err, row) => {
                if (err || !row || ['SUCCESS', 'FAILURE', 'CANCELLED', 'ABORTED', 'NOT_BUILT'].includes(row.status)) {
                    console.log(`Stopping monitor for queue ${queueId}: ${err ? 'Error' : row ? row.status : 'No row found'}`);
                    return clearInterval(intervalId);
                }

                if (!row.jenkins_build_id) {
                    try {
                        const qRes = await jenkinsClient.get(`/queue/item/${queueId}/api/json`);
                        if (qRes.data.executable) {
                            const buildId = qRes.data.executable.number;
                            console.log(`Build started for queue ${queueId}: Build ID ${buildId}`);
                            db.run("UPDATE history SET status = 'RUNNING', jenkins_build_id = ? WHERE jenkins_queue_id = ?", [buildId, queueId]);
                        } else if (qRes.data.cancelled) {
                            console.log(`Queue ${queueId} was cancelled before starting`);
                            db.run("UPDATE history SET status = 'CANCELLED' WHERE jenkins_queue_id = ?", [queueId]);
                            clearInterval(intervalId);
                        }
                    } catch (e) {
                        console.error(`Failed to check queue status for ${queueId}:`, e.message);
                        // Don't stop monitoring on temporary network errors
                    }
                } else {
                    try {
                        const bRes = await jenkinsClient.get(`/job/${process.env.JENKINS_JOB}/${row.jenkins_build_id}/api/json`);
                        if (!bRes.data.building) {
                            const finalStatus = bRes.data.result || 'FAILURE'; // Default to FAILURE if result is null
                            console.log(`Build ${row.jenkins_build_id} completed with status: ${finalStatus}`);
                            db.run("UPDATE history SET status = ? WHERE jenkins_queue_id = ?", [finalStatus, queueId]);
                            clearInterval(intervalId);
                        } else {
                            console.log(`Build ${row.jenkins_build_id} still running...`);
                        }
                    } catch (e) {
                        console.error(`Failed to check build status for ${row.jenkins_build_id}:`, e.message);
                        // Check if it's a 404 (build was deleted/aborted externally)
                        if (e.response && e.response.status === 404) {
                            console.log(`Build ${row.jenkins_build_id} not found, marking as ABORTED`);
                            db.run("UPDATE history SET status = 'ABORTED' WHERE jenkins_queue_id = ?", [queueId]);
                            clearInterval(intervalId);
                        }
                        // Don't stop monitoring on temporary network errors
                    }
                }
            });
        } catch (error) { 
            console.error(`Polling Error for queue ${queueId}:`, error.message); 
        }
    }, 5000);
};




app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:3001/login' }),
    (req, res) => {
        // Login Successful -> Go back to Frontend
        res.redirect('http://localhost:3001');
    }
);

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) res.json(req.user);
    else res.status(401).json({ user: null });
});

app.post('/api/logout', (req, res) => {
    req.logout(() => res.json({ message: "Logged out" }));
});

// E. Dev Mode User Switcher (routes always registered, check NODE_ENV inside handlers)
// Get list of all users for dropdown
app.get('/api/dev/users', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: "Development mode only" });
    }
    
    try {
        const users = await dbAll("SELECT email, name, role FROM users ORDER BY role DESC, email", []);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Switch to a different user (for testing peer review)
app.post('/api/dev/switch-user', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: "Development mode only" });
    }
    
    const { email } = req.body;
    
    if (!email) return res.status(400).json({ error: "Email required" });
    
    try {
        const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
        
        if (!user) return res.status(404).json({ error: "User not found" });
        
        // Manually log in as this user (simulating OAuth)
        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: "Failed to switch user" });
            console.log(`[DEV MODE] Switched to user: ${user.email} (${user.role})`);
            res.json({ message: "User switched", user });
        });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});


app.post('/api/deploy', ensureAuthenticated, async (req, res) => {
    try {

        const value = await clusterSchema.validateAsync(req.body);
        
        const preflightCheck = await dbGet("SELECT * FROM preflight_results WHERE id = ?", [value.preflight_id]);

        if (!preflightCheck) {
            return res.status(400).json({ 
                error: "Invalid preflight_id. Please run connectivity test first." 
            });
        }

        if (preflightCheck.status !== 'SUCCESS') {
            return res.status(400).json({ 
                error: `Preflight check ${preflightCheck.status}. Cannot deploy until preflight passes.` 
            });
        }

        if (preflightCheck.used_by_deployment_id) {
            return res.status(400).json({ 
                error: "This preflight check has already been used for another deployment." 
            });
        }

        const preflightHosts = preflightCheck.target_hosts.split(',').map(h => h.trim()).sort().join(',');
        const requestHosts = value.hosts.map(h => h.trim()).sort().join(',');
        const preflightAsync = preflightCheck.async_node.trim();
        const requestAsync = value.async_node_ip.trim();
        if (preflightHosts !== requestHosts || preflightAsync !== requestAsync) {
            return res.status(400).json({ 
                error: "Target hosts do not match preflight check. Please run preflight again." 
            });
        }
        
        const preflightResults = JSON.parse(preflightCheck.results_json);
        
        const minVgSize = Math.min(
            ...preflightResults.map(node => parseFloat(node.expected_vg_gb || 0))
        );
        
        if (minVgSize < 7) {
            return res.status(400).json({ 
                error: `Insufficient disk space. Minimum VG size across nodes is ${minVgSize.toFixed(2)}GB (minimum 7GB required)` 
            });
        }
        
        const templateId = req.body.template_id || null;
        const templateName = req.body.template_name || null;
        let templateLogsGb = null;
        let templateTmpGb = null;
        let templateGcacheGb = null;
        
        if (templateId) {
            // Fetch template to get disk allocations
            const template = await dbGet('SELECT logs_gb, tmp_gb, gcache_gb FROM templates WHERE id = ?', [templateId]);
            if (template) {
                templateLogsGb = parseFloat(template.logs_gb) || 3.0;
                templateTmpGb = parseFloat(template.tmp_gb) || 3.0;
                templateGcacheGb = parseFloat(template.gcache_gb) || 3.0;
                
                const templateMinDisk = templateLogsGb + templateTmpGb + templateGcacheGb;
                
                if (minVgSize < templateMinDisk) {
                    return res.status(400).json({ 
                        error: `Template "${templateName}" requires minimum ${templateMinDisk.toFixed(1)}GB disk space (logs: ${templateLogsGb}GB + tmp: ${templateTmpGb}GB + gcache: ${templateGcacheGb}GB), but only ${minVgSize.toFixed(1)}GB available` 
                    });
                }
            }
        }
        
        const hasExistingInstallation = preflightResults.some(
            node => node.has_existing_mysql === true
        );
        
        let logsGb, tmpGb, gcacheGb;
        
        if (templateLogsGb !== null && templateTmpGb !== null && templateGcacheGb !== null) {
            logsGb = templateLogsGb.toFixed(1);
            tmpGb = templateTmpGb.toFixed(1);
            gcacheGb = templateGcacheGb.toFixed(1);
            console.log('Using template disk allocations (fixed GB values)');
        } else {
            const diskPct = value.disk_allocation_pct || { logs: 20, tmp: 10, gcache: 5 };
            logsGb = (minVgSize * diskPct.logs / 100).toFixed(1);
            tmpGb = (minVgSize * diskPct.tmp / 100).toFixed(1);
            gcacheGb = (minVgSize * diskPct.gcache / 100).toFixed(1);
            console.log('Using percentage-based disk allocations');
        }
        
        const totalAllocated = parseFloat(logsGb) + parseFloat(tmpGb) + parseFloat(gcacheGb);
        
        // Handle user-specified data partition size
        let dataGb = null;
        let lvDataSize = '100%FREE';  // Default to 100%FREE
        
        if (value.data_gb && value.data_gb > 0) {
            dataGb = parseFloat(value.data_gb);
            const totalWithData = totalAllocated + dataGb;
            
            if (totalWithData > minVgSize) {
                return res.status(400).json({ 
                    error: `Total disk allocation (${totalWithData.toFixed(1)}GB) exceeds available VG space (${minVgSize.toFixed(1)}GB)` 
                });
            }
            
            lvDataSize = `${dataGb.toFixed(1)}g`;
        } else {
            // Calculate available space when using 100%FREE
            if (totalAllocated > minVgSize) {
                return res.status(400).json({ 
                    error: `Disk allocation (${totalAllocated.toFixed(1)}GB) exceeds available VG space (${minVgSize.toFixed(1)}GB)` 
                });
            }
        }

        console.log(`Disk Allocation for ${value.cluster_name}:`);
        console.log(`  Min VG Size: ${minVgSize.toFixed(2)}GB`);
        console.log(`  Logs: ${logsGb}GB`);
        console.log(`  Tmp: ${tmpGb}GB`);
        console.log(`  GCache: ${gcacheGb}GB`);
        if (dataGb) {
            console.log(`  Data: ${dataGb.toFixed(1)}GB (user-specified)`);
        } else {
            console.log(`  Data: 100%FREE (~${(minVgSize - totalAllocated).toFixed(1)}GB)`);
        }
        console.log(`  Force Wipe: ${hasExistingInstallation} (auto-determined from preflight)`);
        
        const gcacheSizeMb = Math.floor(parseFloat(gcacheGb) * 1024 * 0.8);
        
        const jenkinsParams = {
            TARGET_HOSTS: value.hosts.join(','),
            ASYNC_HOST: value.async_node_ip,
            DB_ROOT_PASS: value.db_root_pass,
            APP_USER: value.app_user,
            APP_PASS: value.app_pass,
            FORCE_WIPE: hasExistingInstallation,  
            LV_LOGS_SIZE: `${logsGb}g`,
            LV_TMP_SIZE: `${tmpGb}g`,
            LV_GCACHE_SIZE: `${gcacheGb}g`,
            LV_DATA_SIZE: lvDataSize,  // Either specific size or '100%FREE'
            MIN_VG_SIZE_GB: minVgSize.toFixed(2),
            GCACHE_SIZE: `${gcacheSizeMb}M`,  
            SQL_CONFIG_JSON: JSON.stringify({
                port: "3306", user: "mysql", 
                innodb_buffer_pool_size: value.buffer_pool, 
                max_connections: String(value.max_connections)
            }, null, 2),
            GALERA_CONFIG_JSON: JSON.stringify({
                wsrep_cluster_name: value.cluster_name, 
                wsrep_sst_method: "rsync", 
                ...value.custom_params, ...HARD_CONSTRAINTS
            }, null, 2)
        };

        if (req.user.role === 'super_user') {
            console.log(`✨ Super user ${req.user.email} triggering deploy...`);
            
            const response = await jenkinsClient.post(`/job/${process.env.JENKINS_JOB}/buildWithParameters`, null, { params: jenkinsParams });
            const queueId = response.headers.location.match(/\/item\/(\d+)\//)[1];

            const result = await dbRun(
                `INSERT INTO history 
                (cluster_name, target_hosts, async_node, jenkins_queue_id, status, requester_email, deployment_config, template_id, template_name, logs_size, tmp_size, gcache_size, min_vg_size_gb, disk_allocation_pct) 
                VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [value.cluster_name, value.hosts.join(','), value.async_node_ip, queueId, req.user.email, JSON.stringify(jenkinsParams), templateId, templateName, `${logsGb}g`, `${tmpGb}g`, `${gcacheGb}g`, minVgSize, JSON.stringify({ logs: parseFloat(logsGb), tmp: parseFloat(tmpGb), gcache: parseFloat(gcacheGb) })]
            );

            const deploymentId = result.lastID;
            monitorBuild(queueId);
            
            await markPreflightAsUsed(value.preflight_id, deploymentId);

            return res.json({ message: "Deployment Started!", status: "QUEUED" });

        } else {
            console.log(`📝 User ${req.user.email} requesting peer approval...`);

            const result = await dbRun(
                `INSERT INTO history 
                (cluster_name, target_hosts, async_node, status, requester_email, deployment_config, template_id, template_name, logs_size, tmp_size, gcache_size, min_vg_size_gb, disk_allocation_pct) 
                VALUES (?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [value.cluster_name, value.hosts.join(','), value.async_node_ip, req.user.email, JSON.stringify(jenkinsParams), templateId, templateName, `${logsGb}g`, `${tmpGb}g`, `${gcacheGb}g`, minVgSize, JSON.stringify({ logs: parseFloat(logsGb), tmp: parseFloat(tmpGb), gcache: parseFloat(gcacheGb) })]
            );

            const deploymentId = result.lastID;
            
            await markPreflightAsUsed(value.preflight_id, deploymentId);

            return res.json({ message: "Request sent for peer approval.", status: "PENDING_APPROVAL" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


// --- PREFLIGHT ROUTES ---

app.post('/api/preflight', ensureAuthenticated, async (req, res) => {
    try {
        const value = await preflightSchema.validateAsync(req.body);
        
        const targetHosts = value.hosts.join(',');
        const asyncNode = value.async_node_ip;

        // Create preflight record
        const result = await dbRun(
            `INSERT INTO preflight_results 
            (target_hosts, async_node, status, requester_email) 
            VALUES (?, ?, 'RUNNING', ?)`,
            [targetHosts, asyncNode, req.user.email]
        );

        const preflightId = result.lastID;

        try {
            // Trigger Jenkins preflight job
            const jenkinsParams = {
                TARGET_HOSTS: targetHosts,
                ASYNC_HOST: asyncNode,
                PREFLIGHT_ID: String(preflightId)
            };

            const response = await jenkinsClient.post(
                `/job/galera-preflight/buildWithParameters`,
                null,
                { params: jenkinsParams }
            );

            const queueId = response.headers.location.match(/\/item\/(\d+)\//)[1];

            // Update with Jenkins queue ID
            await dbRun(
                `UPDATE preflight_results SET jenkins_queue_id = ? WHERE id = ?`,
                [queueId, preflightId]
            );

            res.json({ 
                message: "Preflight check started",
                preflight_id: preflightId,
                status: "RUNNING"
            });

        } catch (jenkinsError) {
            console.error('Jenkins preflight trigger failed:', jenkinsError);
            await dbRun(
                `UPDATE preflight_results SET status = 'FAILED', error_message = ? WHERE id = ?`,
                ['Failed to trigger Jenkins: ' + jenkinsError.message, preflightId]
            );
            res.status(500).json({ error: 'Failed to trigger preflight check' });
        }

    } catch (error) {
        console.error('Preflight validation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// 2. Get Preflight Status (Polling endpoint)
app.get('/api/preflight/:id', ensureAuthenticated, async (req, res) => {
    try {
        const preflightId = req.params.id;
        const row = await dbGet("SELECT * FROM preflight_results WHERE id = ?", [preflightId]);
        
        if (!row) {
            return res.status(404).json({ error: 'Preflight check not found' });
        }

        // Parse results_json if it exists
        let results = null;
        if (row.results_json) {
            try {
                results = JSON.parse(row.results_json);
            } catch (e) {
                results = row.results_json;
            }
        }

        res.json({
            id: row.id,
            target_hosts: row.target_hosts,
            async_node: row.async_node,
            status: row.status,
            results: results,
            error_message: row.error_message,
            requester_email: row.requester_email,
            created_at: row.created_at,
            completed_at: row.completed_at
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Webhook endpoint for Jenkins to POST results
app.post('/api/preflight/:id/complete', express.json(), async (req, res) => {
    try {
        const preflightId = req.params.id;
        const { status, results, error_message } = req.body;

        console.log(`Preflight ${preflightId} webhook received:`, { status, results });

        if (!status || !['SUCCESS', 'FAILED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be SUCCESS or FAILED' });
        }

        const resultsJson = typeof results === 'string' ? results : JSON.stringify(results);

        const result = await dbRun(
            `UPDATE preflight_results 
            SET status = ?, results_json = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
            [status, resultsJson, error_message || null, preflightId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Preflight not found' });
        }
        
        res.json({ message: 'Preflight results saved successfully' });
    } catch (err) {
        console.error('Failed to update preflight:', err);
        res.status(500).json({ error: 'Failed to update preflight' });
    }
});


// --- APPROVAL ENDPOINT (Peer Review) ---
app.post('/api/approve/:id', ensureAuthenticated, async (req, res) => {
    const dbId = req.params.id;

    try {
        // 1. Fetch the Pending Request
        const row = await dbGet("SELECT * FROM history WHERE id = ?", [dbId]);
        
        // 2. Validate peer review
        const validation = validatePeerReview(row, req.user.email, 'requester_email');
        if (!validation.valid) {
            return res.status(validation.status).json({ error: validation.error });
        }

        // 3. Trigger Jenkins using the Saved Config
        const params = JSON.parse(row.deployment_config);
        const response = await jenkinsClient.post(`/job/${process.env.JENKINS_JOB}/buildWithParameters`, null, { params });
        const queueId = response.headers.location.match(/\/item\/(\d+)\//)[1];

        // 4. Update DB
        await dbRun("UPDATE history SET status = 'QUEUED', jenkins_queue_id = ?, approver_email = ? WHERE id = ?", 
            [queueId, req.user.email, dbId]);
        
        monitorBuild(queueId); // Start Monitoring!
        res.json({ message: "Approved & Deployed!", queueId });
    } catch (e) {
        console.error('Approval error:', e);
        res.status(500).json({ error: "Failed to trigger Jenkins" });
    }
});

// Reject a Request (Peer Review: any user except requester)
app.post('/api/reject/:id', ensureAuthenticated, async (req, res) => {
    const dbId = req.params.id;
    
    try {
        // 1. Get the request details
        const row = await dbGet("SELECT * FROM history WHERE id = ?", [dbId]);
        
        // 2. Validate peer review
        const validation = validatePeerReview(row, req.user.email, 'requester_email');
        if (!validation.valid) {
            return res.status(validation.status).json({ error: validation.error });
        }

        // 3. Update to rejected
        await dbRun("UPDATE history SET status = 'REJECTED', approver_email = ? WHERE id = ?", 
            [req.user.email, dbId]);
        
        res.json({ message: "Request Rejected" });
    } catch (err) {
        console.error('Rejection error:', err);
        res.status(500).json({ error: "Failed to reject request" });
    }
});

// Cancel a Deployment (Admin only)
app.post('/api/cancel/:id', ensureAdmin, async (req, res) => {
    const dbId = req.params.id;

    console.log(`Admin ${req.user.email}  ncel deployment #${dbId}`);

    try {
        // 1. Fetch the deployment
        const row = await dbGet("SELECT * FROM history WHERE id = ?", [dbId]);
        
        if (!row) {
            console.log('Deployment not found:', dbId);
            return res.status(404).json({ error: "Deployment not found" });
        }
        
        console.log('Deployment found:', { id: row.id, status: row.status, jenkins_build_id: row.jenkins_build_id });
        
        // Only allow cancelling QUEUED or RUNNING deployments
        if (!['QUEUED', 'RUNNING'].includes(row.status)) {
            console.log('Cannot cancel deployment with status:', row.status);
            return res.status(400).json({ error: `Cannot cancel deployment with status: ${row.status}. Only QUEUED or RUNNING deployments can be cancelled.` });
        }

        // 2. Try to stop the Jenkins build if it exists
        if (row.jenkins_build_id) {
            try {
                console.log(`Stopping Jenkins build #${row.jenkins_build_id}`);
                await jenkinsClient.post(`/job/${process.env.JENKINS_JOB}/${row.jenkins_build_id}/stop`);
                console.log('Jenkins build stopped successfully');
            } catch (jenkinsErr) {
                console.error('Failed to stop Jenkins build:', jenkinsErr.message);
                // Continue anyway to update DB status
            }
        } else {
            console.log('No Jenkins build ID found, skipping Jenkins stop');
        }

        // 3. Update database status
        await dbRun("UPDATE history SET status = 'CANCELLED', approver_email = ? WHERE id = ?", 
            [req.user.email, dbId]);
        
        console.log(`Deployment #${dbId} cancelled successfully`);
        res.json({ message: "Deployment cancelled successfully" });
    } catch (e) {
        console.error('Unexpected error:', e);
        res.status(500).json({ error: `Failed to cancel deployment: ${e.message}` });
    }
});

// Get History (Now includes Auth info)
app.get('/api/history', ensureAuthenticated, async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM history ORDER BY id DESC LIMIT 50", []);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get Jenkins Console Logs (proxied through backend using viewer credentials)
app.get('/api/deployments/:id/console-logs', ensureAuthenticated, async (req, res) => {
    try {
        const deployment = await dbGet(
            "SELECT jenkins_build_id FROM history WHERE id = ?", 
            [req.params.id]
        );
        
        if (!deployment || !deployment.jenkins_build_id) {
            return res.status(404).json({ error: "Build not found" });
        }

        // Fetch console logs from Jenkins using viewer credentials
        const response = await jenkinsViewerClient.get(
            `/job/${process.env.JENKINS_JOB}/${deployment.jenkins_build_id}/consoleText`
        );
        
        res.json({ 
            logs: response.data,
            buildId: deployment.jenkins_build_id
        });
    } catch (err) {
        console.error('Failed to fetch console logs:', err.message);
        res.status(500).json({ error: 'Failed to fetch console logs' });
    }
});


// TEMPLATE ROUTES

// GET all templates (All authenticated users)
app.get('/api/templates', ensureAuthenticated, async (req, res) => {
    try {
        const query = req.user.role === 'super_user' 
            ? "SELECT * FROM templates ORDER BY created_at DESC"
            : "SELECT * FROM templates WHERE status IN ('ACTIVE', 'PENDING_APPROVAL') ORDER BY created_at DESC";
        
        const rows = await dbAll(query, []);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single template by ID (All authenticated users)
app.get('/api/templates/:id', ensureAuthenticated, async (req, res) => {
    try {
        const row = await dbGet("SELECT * FROM templates WHERE id = ?", [req.params.id]);
        
        if (!row) return res.status(404).json({ error: "Template not found" });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE template (All authenticated users)
app.post('/api/templates', ensureAuthenticated, (req, res) => {
    const { name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Template name is required" });
    }

    const customParamsJson = typeof custom_params === 'string' 
        ? custom_params 
        : JSON.stringify(custom_params || {});

    // Default disk allocations to 3GB each if not provided
    const logsGb = logs_gb !== undefined ? parseFloat(logs_gb) : 3.0;
    const tmpGb = tmp_gb !== undefined ? parseFloat(tmp_gb) : 3.0;
    const gcacheGb = gcache_gb !== undefined ? parseFloat(gcache_gb) : 3.0;

    // Super user creates ACTIVE templates, regular users create PENDING_APPROVAL
    const status = req.user.role === 'super_user' ? 'ACTIVE' : 'PENDING_APPROVAL';
    
    db.run(`INSERT INTO templates (name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb, created_by, status, approved_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name.trim(), description || '', buffer_pool || '1G', max_connections || 100, customParamsJson, force_wipe ? 1 : 0, logsGb, tmpGb, gcacheGb, req.user.email, status, status === 'ACTIVE' ? req.user.email : null],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Template with this name already exists" });
                }
                return res.status(500).json({ error: err.message });
            }
            const message = status === 'ACTIVE' 
                ? "Template created and activated successfully" 
                : "Template created. Awaiting peer approval.";
            res.json({ message, id: this.lastID, status });
        }
    );
});

// UPDATE template (All authenticated users - creates pending version for approval)
app.put('/api/templates/:id', ensureAuthenticated, (req, res) => {
    const { name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Template name is required" });
    }

    const customParamsJson = typeof custom_params === 'string' 
        ? custom_params 
        : JSON.stringify(custom_params || {});

    // Default disk allocations to 3GB each if not provided
    const logsGb = logs_gb !== undefined ? parseFloat(logs_gb) : 3.0;
    const tmpGb = tmp_gb !== undefined ? parseFloat(tmp_gb) : 3.0;
    const gcacheGb = gcache_gb !== undefined ? parseFloat(gcache_gb) : 3.0;

    // ADMIN: Direct update, keep ACTIVE
    if (req.user.role === 'super_user') {
        db.run(`UPDATE templates SET 
                name = ?, description = ?, buffer_pool = ?, max_connections = ?, 
                custom_params = ?, force_wipe = ?, logs_gb = ?, tmp_gb = ?, gcache_gb = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
            [name.trim(), description || '', buffer_pool || '1G', max_connections || 100, customParamsJson, force_wipe ? 1 : 0, logsGb, tmpGb, gcacheGb, req.params.id],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: "Template with this name already exists" });
                    }
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) return res.status(404).json({ error: "Template not found" });
                res.json({ message: "Template updated successfully" });
            }
        );
    } else {
        // 1. Get original template
        db.get("SELECT * FROM templates WHERE id = ?", [req.params.id], (err, original) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (!original) return res.status(404).json({ error: "Template not found" });
            
            // 2. Create new template with "(Pending Edit)" suffix
            const newName = `${name.trim()} (Pending Edit)`;
            
            db.run(`INSERT INTO templates (name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb, created_by, status, parent_template_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)`,
                [newName, description || '', buffer_pool || '1G', max_connections || 100, customParamsJson, force_wipe ? 1 : 0, logsGb, tmpGb, gcacheGb, req.user.email, req.params.id],
                function(err) {
                    if (err) {
                        // If name conflict, add timestamp
                        const uniqueName = `${name.trim()} (Pending Edit ${Date.now()})`;
                        db.run(`INSERT INTO templates (name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb, created_by, status, parent_template_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)`,
                            [uniqueName, description || '', buffer_pool || '1G', max_connections || 100, customParamsJson, force_wipe ? 1 : 0, logsGb, tmpGb, gcacheGb, req.user.email, req.params.id],
                            function(err2) {
                                if (err2) return res.status(500).json({ error: err2.message });
                                res.json({ 
                                    message: "Edit submitted for approval. Original template remains active.", 
                                    id: this.lastID,
                                    status: 'PENDING_APPROVAL'
                                });
                            }
                        );
                    } else {
                        res.json({ 
                            message: "Edit submitted for approval. Original template remains active.", 
                            id: this.lastID,
                            status: 'PENDING_APPROVAL'
                        });
                    }
                }
            );
        });
    }
});

// DELETE template (Admin only)
app.delete('/api/templates/:id', ensureAdmin, (req, res) => {
    db.run("DELETE FROM templates WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Template not found" });
        res.json({ message: "Template deleted successfully" });
    });
});

// DUPLICATE template (All authenticated users)
app.post('/api/templates/:id/duplicate', ensureAuthenticated, (req, res) => {
    db.get("SELECT * FROM templates WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Template not found" });

        // Find a unique name for the duplicate
        const baseName = row.name + " (Copy)";
        
        const status = req.user.role === 'super_user' ? 'ACTIVE' : 'PENDING_APPROVAL';
        
        db.run(`INSERT INTO templates (name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb, created_by, status, approved_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [baseName, row.description, row.buffer_pool, row.max_connections, row.custom_params, row.force_wipe, row.logs_gb || 3.0, row.tmp_gb || 3.0, row.gcache_gb || 3.0, req.user.email, status, status === 'ACTIVE' ? req.user.email : null],
            function(err) {
                if (err) {
                    // If name exists, try with timestamp
                    const uniqueName = row.name + " (Copy " + Date.now() + ")";
                    const status = req.user.role === 'super_user' ? 'ACTIVE' : 'PENDING_APPROVAL';
                    
                    db.run(`INSERT INTO templates (name, description, buffer_pool, max_connections, custom_params, force_wipe, logs_gb, tmp_gb, gcache_gb, created_by, status, approved_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [uniqueName, row.description, row.buffer_pool, row.max_connections, row.custom_params, row.force_wipe, row.logs_gb || 3.0, row.tmp_gb || 3.0, row.gcache_gb || 3.0, req.user.email, status, status === 'ACTIVE' ? req.user.email : null],
                        function(err2) {
                            if (err2) return res.status(500).json({ error: err2.message });
                            res.json({ message: "Template duplicated successfully", id: this.lastID });
                        }
                    );
                } else {
                    res.json({ message: "Template duplicated successfully", id: this.lastID });
                }
            }
        );
    });
});

// APPROVE template 
app.post('/api/templates/approve/:id', ensureAuthenticated, (req, res) => {
    const templateId = req.params.id;
    
    // 1. Get the template details
    db.get("SELECT * FROM templates WHERE id = ?", [templateId], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!row) return res.status(404).json({ error: "Template not found" });
        if (row.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: "Template is not pending approval" });
        }
        
        // 2. PEER REVIEW: User cannot approve their own template
        if (row.created_by === req.user.email) {
            return res.status(403).json({ error: "You cannot approve your own template" });
        }
        
        // 3. Check if this is an EDIT (has parent_template_id)
        if (row.parent_template_id) {
            // This is an edit - copy changes to parent and delete this pending version
            db.get("SELECT * FROM templates WHERE id = ?", [row.parent_template_id], (err, parent) => {
                if (err) return res.status(500).json({ error: "Parent template not found" });
                if (!parent) return res.status(404).json({ error: "Original template not found" });
                
                // Update parent template with new values
                db.run(`UPDATE templates SET 
                        name = ?, description = ?, buffer_pool = ?, max_connections = ?, 
                        custom_params = ?, force_wipe = ?, logs_gb = ?, tmp_gb = ?, gcache_gb = ?,
                        approved_by = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`,
                    [row.name.replace(' (Pending Edit)', '').replace(/ \(Pending Edit \d+\)/, ''), 
                     row.description, row.buffer_pool, row.max_connections, row.custom_params, 
                     row.force_wipe, row.logs_gb, row.tmp_gb, row.gcache_gb, 
                     req.user.email, row.parent_template_id],
                    function(err) {
                        if (err) return res.status(500).json({ error: "Failed to update template" });
                        
                        // Delete the pending version
                        db.run("DELETE FROM templates WHERE id = ?", [templateId], function(err) {
                            if (err) console.error("Failed to delete pending template:", err);
                            res.json({ message: "Template edit approved and applied!" });
                        });
                    }
                );
            });
        } else {
            // This is a NEW template - just activate it
            db.run("UPDATE templates SET status = 'ACTIVE', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [req.user.email, templateId],
                function(err) {
                    if (err) return res.status(500).json({ error: "Failed to approve template" });
                    res.json({ message: "Template approved and activated!" });
                }
            );
        }
    });
});

// REJECT template (Peer Review - any user except creator)
app.post('/api/templates/reject/:id', ensureAuthenticated, (req, res) => {
    const templateId = req.params.id;
    
    // 1. Get the template details
    db.get("SELECT * FROM templates WHERE id = ?", [templateId], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!row) return res.status(404).json({ error: "Template not found" });
        if (row.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: "Template is not pending approval" });
        }
        
        // 2. PEER REVIEW: User cannot reject their own template
        if (row.created_by === req.user.email) {
            return res.status(403).json({ error: "You cannot reject your own template" });
        }
        
        // 3. If this is an edit (has parent), just delete it. Otherwise mark as REJECTED
        if (row.parent_template_id) {
            // This is a pending edit - just delete it, parent stays active
            db.run("DELETE FROM templates WHERE id = ?", [templateId], function(err) {
                if (err) return res.status(500).json({ error: "Failed to reject template edit" });
                res.json({ message: "Template edit rejected. Original remains active." });
            });
        } else {
            // This is a new template - mark as REJECTED
            db.run("UPDATE templates SET status = 'REJECTED', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [req.user.email, templateId],
                function(err) {
                    if (err) return res.status(500).json({ error: "Failed to reject template" });
                    res.json({ message: "Template rejected" });
                }
            );
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🌍 Backend listening on port ${PORT}`);
});