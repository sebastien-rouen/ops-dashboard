// ==================== MAIN LOADER ====================
// Charge séquentiellement tous les modules JS du dashboard
(async function loadDashboardModules() {
    const modules = [
        // Core (ordre strict)
        'js/core/config.js',
        'js/core/utils.js',
        'js/core/state.js',
        'js/core/core.js',
        'js/core/drag-drop.js',

        // Components
        'js/components/global-status.js',
        'js/components/impacts.js',
        'js/components/tasks.js',
        'js/components/infra.js',
        'js/components/metrics.js',
        'js/components/charts.js',
        'js/components/traffic-light.js',
        'js/components/pricing.js',
        'js/components/sre.js',
        'js/components/rate-limit.js',

        // Integrations
        'js/integrations/gitlab.js',
        'js/integrations/github.js',
        'js/integrations/integrations.js',

        // Components (suite — dépendent d'intégrations ou sont transversaux)
        'js/components/export.js',
        'js/components/filters-views.js',
        'js/components/navigation.js',
        'js/components/wizard.js',

        // Données simulées des scénarios (chargées avant demo.js)
        'js/scenarios/nominal/prometheus.js',
        'js/scenarios/nominal/loki.js',
        'js/scenarios/nominal/tempo.js',
        'js/scenarios/incident/prometheus.js',
        'js/scenarios/incident/loki.js',
        'js/scenarios/incident/tempo.js',

        'js/components/demo.js',

        // Init (toujours en dernier)
        'js/core/init.js'
    ];
    for (const src of modules) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { console.error('Failed to load ' + src); reject(); };
            document.head.appendChild(s);
        });
    }
})();
