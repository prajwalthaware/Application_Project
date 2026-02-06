const Joi = require('joi');


const HARD_CONSTRAINTS = {
    binlog_format: "ROW",
    default_storage_engine: "InnoDB",
    wsrep_on: "ON",
    innodb_autoinc_lock_mode: "2"
};

const noDuplicateIPs = (value, helpers) => {
    const uniqueHosts = [...new Set(value)];
    if (uniqueHosts.length !== value.length) {
        return helpers.error('any.invalid', { message: 'Duplicate IPs not allowed in cluster nodes' });
    }
    return value;
};

const preflightSchema = Joi.object({
    hosts: Joi.array().items(Joi.string().ip()).min(3).max(3).required()
        .custom(noDuplicateIPs)
        .label("Galera Cluster Nodes"),
    async_node_ip: Joi.string().ip().required().label("Async Node IP")
});

const clusterSchema = Joi.object({

    hosts: Joi.array().items(Joi.string().ip()).min(3).required()
        .custom(noDuplicateIPs),
    async_node_ip: Joi.string().ip().required().label("Async Node IP"),
    db_root_pass: Joi.string().required(),
    app_user: Joi.string().default('app_user'),
    app_pass: Joi.string().required(),

    
    cluster_name: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required(),

    buffer_pool: Joi.string().pattern(/^\d+[MG]$/).default("1G"), 
    max_connections: Joi.number().min(10).max(5000).default(100),

    // Force wipe option (destructive - destroys all data)
    force_wipe: Joi.boolean().default(false),

    disk_allocation_pct: Joi.object({
        data: Joi.number().min(0).max(100).default(65),
        logs: Joi.number().min(0).max(100).default(20),
        tmp: Joi.number().min(0).max(100).default(10),
        gcache: Joi.number().min(0).max(100).default(5)
    }).default({ data: 65, logs: 20, tmp: 10, gcache: 5 })
      .custom((value, helpers) => {
          const total = value.data + value.logs + value.tmp + value.gcache;
          if (Math.abs(total - 100) > 0.01) { 
              return helpers.error('any.invalid', { 
                  message: `Disk allocation percentages must sum to 100% (current: ${total}%)` 
              });
          }
          return value;
      }),
    
    logs_gb: Joi.number().min(0.5).optional(),
    tmp_gb: Joi.number().min(0.5).optional(),
    gcache_gb: Joi.number().min(0.5).optional(),
    data_gb: Joi.number().min(0).optional(),  // User-specified data partition size

    // Preflight reference (REQUIRED)
    preflight_id: Joi.number().integer().required()
        .label("Preflight Check ID"),

    // Template reference (optional - for tracking which template was used)
    template_id: Joi.number().integer().allow(null).optional(),
    template_name: Joi.string().allow('', null).optional(),

    custom_params: Joi.object().pattern(
        Joi.string().pattern(/^[a-zA-Z0-9_]+$/), 
        Joi.string().pattern(/^[^;]+$/) 
    ).optional()
});

module.exports = { clusterSchema, preflightSchema, HARD_CONSTRAINTS };