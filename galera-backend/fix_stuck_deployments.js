const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const db = new sqlite3.Database('./deployments.db');

// Jenkins credentials from environment
const JENKINS_URL = process.env.JENKINS_URL || 'http://192.168.56.1:8080';
const JENKINS_USER = process.env.JENKINS_USER || 'admin';
const JENKINS_TOKEN = process.env.JENKINS_API_TOKEN;
const JENKINS_JOB = process.env.JENKINS_JOB || 'GALERA-DEPLOY';

const jenkinsClient = axios.create({
    baseURL: JENKINS_URL,
    auth: { username: JENKINS_USER, password: JENKINS_TOKEN }
});

async function fixStuckDeployments() {
    console.log('🔍 Scanning for stuck RUNNING deployments...\n');

    db.all("SELECT * FROM history WHERE status = 'RUNNING' ORDER BY id DESC", async (err, rows) => {
        if (err) {
            console.error('❌ Database error:', err);
            process.exit(1);
        }

        if (rows.length === 0) {
            console.log('✅ No stuck deployments found!');
            db.close();
            return;
        }

        console.log(`Found ${rows.length} deployment(s) stuck in RUNNING state:\n`);

        for (const row of rows) {
            console.log(`📋 Deployment #${row.id} - ${row.cluster_name}`);
            console.log(`   Queue ID: ${row.jenkins_queue_id}`);
            console.log(`   Build ID: ${row.jenkins_build_id || 'Not started'}`);
            console.log(`   Started: ${row.timestamp}`);

            if (!row.jenkins_build_id) {
                // Build never started
                console.log(`   ⚠️  Build never started - marking as ABORTED\n`);
                db.run("UPDATE history SET status = 'ABORTED' WHERE id = ?", [row.id]);
                continue;
            }

            // Check actual Jenkins status
            try {
                const response = await jenkinsClient.get(`/job/${JENKINS_JOB}/${row.jenkins_build_id}/api/json`);
                const buildData = response.data;

                if (!buildData.building) {
                    const actualStatus = buildData.result || 'FAILURE';
                    console.log(`   ✅ Jenkins says: ${actualStatus} - Updating database\n`);
                    db.run("UPDATE history SET status = ? WHERE id = ?", [actualStatus, row.id]);
                } else {
                    console.log(`   ⏳ Build is actually still running in Jenkins\n`);
                }
            } catch (e) {
                if (e.response && e.response.status === 404) {
                    console.log(`   ❌ Build not found in Jenkins - marking as ABORTED\n`);
                    db.run("UPDATE history SET status = 'ABORTED' WHERE id = ?", [row.id]);
                } else {
                    console.error(`   ❌ Failed to check Jenkins: ${e.message}\n`);
                }
            }
        }

        setTimeout(() => {
            console.log('✅ Cleanup complete!');
            db.close();
        }, 1000);
    });
}

// Run the fix
fixStuckDeployments();
