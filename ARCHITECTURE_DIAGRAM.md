# Preflight System Architecture

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S MAC (192.168.56.1)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐         ┌───────────────────────┐      │
│  │  React Frontend    │         │   Node.js Backend     │      │
│  │  (Port 3001)       │◄───────►│   (Port 3000)         │      │
│  │                    │         │                       │      │
│  │ - PreflightStep    │         │ - /api/preflight      │      │
│  │ - PreflightPage    │         │ - /api/preflight/:id  │      │
│  │ - Stepper          │         │ - Webhook endpoint    │      │
│  └────────────────────┘         │ - SQLite DB           │      │
│                                  └───────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP POST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  JENKINS VM (192.168.56.23)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Jenkins Job: galera-preflight                │      │
│  │                                                       │      │
│  │  1. Receives: TARGET_HOSTS, ASYNC_HOST, PREFLIGHT_ID │      │
│  │  2. Generates Ansible inventory                      │      │
│  │  3. Runs: ansible-playbook preflight.yml             │      │
│  │  4. Sends results back to backend webhook            │      │
│  └──────────────────────────────────────────────────────┘      │
│                               │                                 │
│                               │ SSH                             │
│                               ▼                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Ansible Playbook
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              TARGET NODES (192.168.56.24-27)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Node 1    │  │  Node 2    │  │  Node 3    │  │  Async   │ │
│  │            │  │            │  │            │  │  Node    │ │
│  │ Checked:   │  │ Checked:   │  │ Checked:   │  │          │ │
│  │ • SSH      │  │ • SSH      │  │ • SSH      │  │ Checked: │ │
│  │ • RAM      │  │ • RAM      │  │ • RAM      │  │ • SSH    │ │
│  │ • Disks    │  │ • Disks    │  │ • Disks    │  │ • RAM    │ │
│  └────────────┘  └────────────┘  └────────────┘  │ • Disks  │ │
│                                                    └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

```
┌──────────┐
│  USER    │
└────┬─────┘
     │ 1. Enters 4 IPs
     ▼
┌──────────────────┐
│  Frontend UI     │
│  PreflightStep   │
└────┬─────────────┘
     │ 2. POST /api/preflight
     │    { hosts: [...], async_node_ip: "..." }
     ▼
┌────────────────────────────┐
│  Backend                   │
│  server.js                 │
├────────────────────────────┤
│  A. Validate input         │
│  B. INSERT INTO            │
│     preflight_results      │
│  C. Trigger Jenkins job    │
│  D. Return preflight_id    │
└────┬───────────────────────┘
     │ 3. Trigger Jenkins Build
     │    POST /job/galera-preflight/buildWithParameters
     ▼
┌──────────────────────────────┐
│  Jenkins                     │
│  galera-preflight job        │
├──────────────────────────────┤
│  A. Generate inventory.ini   │
│  B. Run Ansible playbook     │
└────┬─────────────────────────┘
     │ 4. SSH to each node
     ▼
┌──────────────────────────────┐
│  Ansible Playbook            │
│  preflight.yml               │
├──────────────────────────────┤
│  Play 1: Check Each Node     │
│   • ping (SSH test)          │
│   • Check RAM                │
│   • Find disks               │
│   • Calculate space          │
│   • Save node report         │
│                              │
│  Play 2: Aggregate Results   │
│   • Collect all reports      │
│   • Determine status         │
│   • POST to backend webhook  │
└────┬─────────────────────────┘
     │ 5. POST Results
     │    POST /api/preflight/:id/complete
     │    { status: "SUCCESS", results: [...] }
     ▼
┌────────────────────────────┐
│  Backend Webhook           │
│  /api/preflight/:id/       │
│  complete                  │
├────────────────────────────┤
│  UPDATE preflight_results  │
│  SET status = 'SUCCESS',   │
│      results_json = ...,   │
│      completed_at = NOW()  │
└────┬───────────────────────┘
     │
     │ 6. Frontend polls GET /api/preflight/:id
     │    every 3 seconds
     ▼
┌──────────────────────┐
│  Frontend UI         │
│  Shows Results       │
├──────────────────────┤
│  ✅ Node 1: 50GB    │
│  ✅ Node 2: 50GB    │
│  ✅ Node 3: 50GB    │
│  ✅ Async: 50GB     │
│                      │
│  [Proceed to Deploy] │
└──────────────────────┘
```

---

## Database Schema & Relationships

```
┌─────────────────────────────┐
│  preflight_results          │
├─────────────────────────────┤
│  id (PK)                    │◄──┐
│  target_hosts               │   │
│  async_node                 │   │
│  jenkins_queue_id           │   │
│  status                     │   │ Foreign Key
│  results_json               │   │
│  error_message              │   │
│  requester_email            │   │
│  created_at                 │   │
│  completed_at               │   │
│  used_by_deployment_id  ────┼───┘
└─────────────────────────────┘
                               │
                               │ References
                               ▼
┌─────────────────────────────┐
│  history                    │
├─────────────────────────────┤
│  id (PK)                    │
│  cluster_name               │
│  target_hosts               │
│  async_node                 │
│  jenkins_queue_id           │
│  jenkins_build_id           │
│  status                     │
│  timestamp                  │
│  requester_email            │
│  approver_email             │
│  deployment_config          │
│  template_id                │
│  template_name              │
└─────────────────────────────┘
```

**Relationship:**
- `preflight_results.used_by_deployment_id` → `history.id`
- Prevents preflight reuse
- Creates audit trail

---

## State Transitions

### Preflight Status States

```
    ┌─────────┐
    │ CREATED │ (Record inserted)
    └────┬────┘
         │
         │ Jenkins triggered
         ▼
    ┌─────────┐
    │ RUNNING │ (Playbook executing)
    └────┬────┘
         │
         ├────────┬────────┐
         │        │        │
         ▼        ▼        ▼
    ┌─────────┐ ┌────────┐ ┌─────────┐
    │ SUCCESS │ │ FAILED │ │ TIMEOUT │
    └─────────┘ └────────┘ └─────────┘
         │
         │ User proceeds
         ▼
    ┌─────────┐
    │  USED   │ (linked to deployment)
    └─────────┘
```

### UI Flow States

```
┌───────────────────┐
│  IP Input Form    │
└────────┬──────────┘
         │ User clicks "Run Connectivity Test"
         ▼
┌───────────────────┐
│  Loading Spinner  │ ◄──┐ Poll every 3s
│  "Running..."     │ ───┘
└────────┬──────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐
│  ✅ Success │  │  ❌ Failure  │  │ Timeout  │
│  Show Stats │  │  Show Errors │  │ Retry    │
└──────┬──────┘  └──────┬───────┘  └────┬─────┘
       │                │               │
       │                │               │
       ▼                ▼               ▼
  [Proceed]       [Run Again]     [Run Again]
```

---

## Network Communication

```
Frontend (3001)  ──┐
                   │
Backend (3000)   ──┼── All on Mac (192.168.56.1)
                   │
Database (SQLite)──┘
        │
        │ HTTP POST (trigger)
        │
        ▼
┌────────────────────────────────┐
│ Jenkins (8080)                 │  VM: 192.168.56.23
│ - Receives build trigger       │
│ - Runs Ansible                 │
└────────┬───────────────────────┘
         │
         │ SSH (port 22)
         │
         ▼
┌────────────────────────────────┐
│ Target Nodes                   │  VMs: .24, .25, .26, .27
│ - Respond to ping              │
│ - Provide system info          │
└────────────────────────────────┘
         │
         │ Results
         ▼
┌────────────────────────────────┐
│ Ansible localhost              │  Runs on Jenkins VM
│ - Collects results             │
│ - POSTs to webhook             │
└────────┬───────────────────────┘
         │
         │ HTTP POST (webhook)
         │ http://192.168.56.1:3000/api/preflight/:id/complete
         ▼
┌────────────────────────────────┐
│ Backend Webhook                │  Mac: 192.168.56.1
│ - Saves results                │
│ - Updates database             │
└────────────────────────────────┘
```

**Critical Path:**
- VM → Mac communication requires `192.168.56.1:3000` to be accessible
- Firewall must allow incoming on port 3000
- Test: `curl http://192.168.56.1:3000/api/user` from Jenkins VM

---

## Timing Diagram

```
Time  │ Frontend       │ Backend        │ Jenkins        │ Ansible
──────┼────────────────┼────────────────┼────────────────┼─────────────
0s    │ User clicks    │                │                │
      │ "Run Test"     │                │                │
      │       │        │                │                │
      │       └───────►│ POST /preflight│                │
1s    │                │ Create record  │                │
      │                │ preflight_id=1 │                │
      │                │       │        │                │
      │                │       └───────►│ Trigger build  │
2s    │ Start polling  │                │ Queue job      │
      │ every 3s       │                │       │        │
      │                │                │       └───────►│ Start playbook
5s    │ Poll #1        │ Status:        │ Building       │ SSH node 1
      │ (RUNNING)      │ RUNNING        │                │ SSH node 2
8s    │ Poll #2        │ Status:        │ Running        │ Check RAM
      │ (RUNNING)      │ RUNNING        │                │ Check disks
11s   │ Poll #3        │ Status:        │ Running        │ Calculate
      │ (RUNNING)      │ RUNNING        │                │ Build report
30s   │                │                │                │ POST webhook
      │                │                │                │       │
      │                │       ◄────────┼────────────────┼───────┘
      │                │ Update status  │                │
      │                │ to SUCCESS     │                │
32s   │ Poll #11       │ Status:        │ Complete       │ Done
      │ (SUCCESS)      │ SUCCESS        │                │
      │       │        │                │                │
      │ Show results   │                │                │
      │ ✅✅✅        │                │                │
```

**Total time:** ~30-60 seconds depending on node count and network latency

---

## Error Handling Flow

```
┌─────────────────────┐
│  Preflight Starts   │
└──────────┬──────────┘
           │
    ┌──────▼────────┐
    │  Validate IPs │
    └──────┬────────┘
           │
      Invalid IP?
           ├─── YES ──► ❌ Show validation error
           │             (Frontend)
           NO
           │
    ┌──────▼──────────┐
    │ Trigger Jenkins │
    └──────┬──────────┘
           │
    Jenkins down?
           ├─── YES ──► ❌ Show "Cannot reach Jenkins"
           │             (Backend 500 error)
           NO
           │
    ┌──────▼─────────┐
    │ Run Playbook   │
    └──────┬─────────┘
           │
    SSH fails?
           ├─── YES ──► ❌ Node marked FAILED
           │             "SSH connection refused"
           NO
           │
    ┌──────▼──────────┐
    │ Check Resources │
    └──────┬──────────┘
           │
    RAM < 2GB?
           ├─── YES ──► ❌ Node marked FAILED
           │             "Insufficient RAM"
           NO
           │
    Disk < 10GB?
           ├─── YES ──► ❌ Node marked FAILED
           │             "Insufficient disk"
           NO
           │
    ┌──────▼────────┐
    │ All checks OK │
    └──────┬────────┘
           │
           ▼
      ✅ SUCCESS
```

---

## Security Considerations

```
┌────────────────────────────────────────────────┐
│  Authentication & Authorization                │
├────────────────────────────────────────────────┤
│  • Google OAuth required for all API access   │
│  • Session cookies with 24h expiration         │
│  • preflight_results.requester_email tracked   │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Data Validation                               │
├────────────────────────────────────────────────┤
│  • Joi schema validates IP format              │
│  • Prevents SQL injection (parameterized)      │
│  • Prevents preflight reuse (one-time use)     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Network Security                              │
├────────────────────────────────────────────────┤
│  • CORS restricted to localhost:3001           │
│  • SSH key authentication to target nodes      │
│  • Webhook endpoint has no auth (TODO)         │
│    ⚠️  Production: Add shared secret          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Audit Trail                                   │
├────────────────────────────────────────────────┤
│  • All preflights logged with requester        │
│  • Timestamps for created/completed            │
│  • Results stored for debugging                │
│  • Links to deployment via foreign key         │
└────────────────────────────────────────────────┘
```

---

## Performance Characteristics

```
┌──────────────────┬───────────┬──────────────┐
│ Operation        │ Time      │ Notes        │
├──────────────────┼───────────┼──────────────┤
│ API validation   │ <10ms     │ Joi schema   │
│ DB insert        │ <5ms      │ SQLite write │
│ Jenkins trigger  │ 100-500ms │ HTTP request │
│ Ansible SSH      │ 1-2s/node │ Network RTT  │
│ Resource checks  │ 5-10s     │ Disk scan    │
│ Webhook POST     │ 50-200ms  │ HTTP request │
│ Total preflight  │ 30-60s    │ 4 nodes      │
└──────────────────┴───────────┴──────────────┘

Scaling:
• 4 nodes  = ~30s  (tested)
• 10 nodes = ~60s  (estimated)
• 50 nodes = ~180s (would need parallel execution)
```

---

This architecture is designed for:
- ✅ Simplicity (easy to understand & debug)
- ✅ Reliability (retryable, idempotent checks)
- ✅ Visibility (clear status at each step)
- ✅ Maintainability (separate concerns, clean interfaces)
