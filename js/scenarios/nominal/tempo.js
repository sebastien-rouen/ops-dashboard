// Scénario NOMINAL — données simulées Tempo
const DEMO_TEMPO_NOMINAL = () => ({
    ok: true,
    tracesTotal: 1432,
    tracesError: 87,
    errorRate: 6.1,
    p95LatencyMs: 245,
    testedAt: Date.now() - 60000,
    recentErrors: [
        { service: 'auth-service',   operation: 'POST /auth/token',  durationMs: 1240, error: 'upstream connect error: connection refused',      ts: new Date(Date.now() - 2400000).toISOString() },
        { service: 'search-service', operation: 'GET /api/search',   durationMs: 3800, error: 'context deadline exceeded (timeout 3s)',          ts: new Date(Date.now() - 5400000).toISOString() },
        { service: 'user-service',   operation: 'GET /api/users/42', durationMs: 980,  error: 'sql: no rows in result set',                      ts: new Date(Date.now() - 9000000).toISOString() },
    ],
});
