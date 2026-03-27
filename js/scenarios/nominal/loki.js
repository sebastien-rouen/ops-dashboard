// Scénario NOMINAL — données simulées Loki
const DEMO_LOKI_NOMINAL = () => ({
    ok: true,
    streamsActive: 24,
    errorCount: 47,
    warnCount: 312,
    testedAt: Date.now() - 60000,
    recentErrors: [
        { level: 'error', service: 'auth-service',     msg: 'Failed to connect to Redis: connection refused after 3 retries',   ts: new Date(Date.now() - 1800000).toISOString() },
        { level: 'error', service: 'api-gateway',      msg: 'Upstream timeout on /api/v2/data — circuit breaker opened',        ts: new Date(Date.now() - 3600000).toISOString() },
        { level: 'error', service: 'worker-batch',     msg: 'Job export-report failed: NullPointerException at line 342',       ts: new Date(Date.now() - 7200000).toISOString() },
    ],
    recentWarnings: [
        { level: 'warn', service: 'notification-svc', msg: 'Retry #3 sending email to user 12048 — SMTP latency elevated',     ts: new Date(Date.now() - 600000).toISOString() },
        { level: 'warn', service: 'db-postgres',      msg: 'Slow query detected: 850ms (seuil 500ms) — SELECT orders WHERE…',  ts: new Date(Date.now() - 2700000).toISOString() },
        { level: 'warn', service: 'cache-redis',      msg: 'Memory usage at 78% — eviction policy active (allkeys-lru)',       ts: new Date(Date.now() - 4500000).toISOString() },
        { level: 'warn', service: 'api-gateway',      msg: 'Rate limit approaching for client 10.0.0.45 (850/1000 req/min)',   ts: new Date(Date.now() - 5400000).toISOString() },
    ],
});
