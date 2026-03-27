// Scénario INCIDENT — données simulées Loki
const DEMO_LOKI_INCIDENT = () => ({
    ok: false,
    streamsActive: 8,
    errorCount: 4821,
    warnCount: 892,
    testedAt: Date.now() - 90000,
    recentErrors: [
        { level: 'error', service: 'payment-service',  msg: 'FATAL: db-primary connection pool exhausted — no available connections (pool: 50/50)', ts: new Date(Date.now() - 180000).toISOString() },
        { level: 'error', service: 'db-replica',       msg: 'CRITICAL: Replication lag > 30s — switching to read-only mode, writes rejected',       ts: new Date(Date.now() - 360000).toISOString() },
        { level: 'error', service: 'api-gateway',      msg: '502 Bad Gateway — payment-service upstream unreachable (3/3 instances down)',           ts: new Date(Date.now() - 540000).toISOString() },
        { level: 'error', service: 'payment-service',  msg: 'OOM error: Java heap space exceeded (limit: 4096MB) — JVM killed',                      ts: new Date(Date.now() - 720000).toISOString() },
        { level: 'error', service: 'notification-svc', msg: 'Queue overflow — 1523 messages dropped, consumer lag: 42min',                           ts: new Date(Date.now() - 900000).toISOString() },
        { level: 'error', service: 'log-collector',    msg: 'Loki write timeout: /loki/api/v1/push returned 503 after 10s',                          ts: new Date(Date.now() - 1080000).toISOString() },
    ],
    recentWarnings: [
        { level: 'warn', service: 'node-paris-03', msg: 'Memory usage at 87% — OOM kill imminent si pas d\'intervention',    ts: new Date(Date.now() - 450000).toISOString() },
        { level: 'warn', service: 'api-gateway',   msg: 'Response time P99 > 2s depuis 15 minutes — SLO à risque',          ts: new Date(Date.now() - 750000).toISOString() },
        { level: 'warn', service: 'db-primary',    msg: 'Disk usage 91% — tablespace ops-db presque plein (120 GB restants)', ts: new Date(Date.now() - 1200000).toISOString() },
    ],
});
