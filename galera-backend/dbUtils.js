const db = require('./database');

/**
 * Promisified database utilities for cleaner async/await code
 */

// Wrapper for db.get - returns a single row
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Wrapper for db.all - returns all rows
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Wrapper for db.run - returns { lastID, changes }
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

/**
 * Mark a preflight check as used by a deployment
 * @param {number} preflightId 
 * @param {number} deploymentId 
 * @returns {Promise<{success: boolean, alreadyUsed: boolean}>}
 */
const markPreflightAsUsed = async (preflightId, deploymentId) => {
    try {
        const result = await dbRun(
            `UPDATE preflight_results SET used_by_deployment_id = ? 
             WHERE id = ? AND used_by_deployment_id IS NULL`,
            [deploymentId, preflightId]
        );
        
        if (result.changes === 0) {
            console.warn(`Preflight ${preflightId} was already used by another deployment`);
            return { success: false, alreadyUsed: true };
        }
        
        return { success: true, alreadyUsed: false };
    } catch (err) {
        console.error('Failed to mark preflight as used:', err);
        throw err;
    }
};

/**
 * Validate peer review - ensure requester cannot approve/reject their own item
 * @param {Object} item - The item being reviewed (deployment or template)
 * @param {string} currentUserEmail - Email of user performing the action
 * @param {string} requesterField - Field name containing requester email (e.g., 'requester_email', 'created_by')
 * @returns {Object} - {valid: boolean, status: number, error: string|null}
 */
const validatePeerReview = (item, currentUserEmail, requesterField = 'requester_email') => {
    if (!item) {
        return { valid: false, status: 404, error: 'Item not found' };
    }
    
    if (item.status !== 'PENDING_APPROVAL') {
        return { valid: false, status: 400, error: 'Item is not pending approval' };
    }
    
    if (item[requesterField] === currentUserEmail) {
        return { valid: false, status: 403, error: 'You cannot approve/reject your own request' };
    }
    
    return { valid: true, status: null, error: null };
};

module.exports = {
    dbGet,
    dbAll,
    dbRun,
    markPreflightAsUsed,
    validatePeerReview
};
