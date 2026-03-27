// Scénario INCIDENT — données simulées Prometheus
const DEMO_PROMETHEUS_INCIDENT = () => ({
    ok: true,
    targetsTotal: 18,
    targetsUp: 14,
    targetsDown: 4,
    alertsFiring: 5,
    alerts: [
        { name: 'InstanceDown',        severity: 'critical', instance: 'db-replica:9100',    since: new Date(Date.now() - 2700000).toISOString() },
        { name: 'DiskWillFillIn4h',    severity: 'critical', instance: 'node-paris-05:9100', since: new Date(Date.now() - 900000).toISOString() },
        { name: 'HighMemoryUsage',     severity: 'warning',  instance: 'node-paris-03:9100', since: new Date(Date.now() - 7200000).toISOString() },
        { name: 'HighCPUUsage',        severity: 'warning',  instance: 'api-gateway:9100',   since: new Date(Date.now() - 1800000).toISOString() },
        { name: 'SlowQueryDetected',   severity: 'warning',  instance: 'db-primary:9187',    since: new Date(Date.now() - 3600000).toISOString() },
    ],
    testedAt: Date.now() - 90000
});
