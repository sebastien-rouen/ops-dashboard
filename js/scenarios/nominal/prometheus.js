// Scénario NOMINAL — données simulées Prometheus
const DEMO_PROMETHEUS_NOMINAL = () => ({
    ok: true,
    targetsTotal: 14,
    targetsUp: 14,
    targetsDown: 0,
    alertsFiring: 0,
    alerts: [],
    testedAt: Date.now() - 60000
});
