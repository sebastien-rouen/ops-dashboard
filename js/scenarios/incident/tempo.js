// Scénario INCIDENT — données simulées Tempo
const DEMO_TEMPO_INCIDENT = () => ({
    ok: false,
    tracesTotal: 2841,
    tracesError: 743,
    errorRate: 26.2,
    p95LatencyMs: 1240,
    testedAt: Date.now() - 90000,
    recentErrors: [
        { service: 'payment-service',  operation: 'POST /checkout',          durationMs: 8240,  error: 'connection pool exhausted — no idle connections',         ts: new Date(Date.now() - 120000).toISOString() },
        { service: 'payment-service',  operation: 'GET /api/payment/status', durationMs: 5100,  error: 'db-primary: query timeout after 5000ms',                  ts: new Date(Date.now() - 300000).toISOString() },
        { service: 'api-gateway',      operation: 'POST /api/v1/order',      durationMs: 6380,  error: '502 upstream: payment-service all instances unhealthy',    ts: new Date(Date.now() - 480000).toISOString() },
        { service: 'db-replica',       operation: 'SELECT orders WHERE…',    durationMs: 12400, error: 'replication lag critical — query aborted to protect lag',  ts: new Date(Date.now() - 660000).toISOString() },
        { service: 'notification-svc', operation: 'sendEmail',               durationMs: 4200,  error: 'SMTP dial tcp: connection refused (host: mail.internal)', ts: new Date(Date.now() - 840000).toISOString() },
        { service: 'auth-service',     operation: 'POST /auth/refresh',      durationMs: 3100,  error: 'redis: dial tcp 10.0.0.12:6379: connect: timeout',        ts: new Date(Date.now() - 1020000).toISOString() },
    ],
});
