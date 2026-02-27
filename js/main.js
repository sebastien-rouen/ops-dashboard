// ==================== MAIN LOADER ====================
// Charge séquentiellement tous les modules JS du dashboard
(async function loadDashboardModules() {
    const modules = [
        // Core (ordre strict)
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

        // Integrations
        'js/integrations/gitlab.js',
        'js/integrations/github.js',
        'js/integrations/integrations.js',

        // Components (suite — dépendent d'intégrations ou sont transversaux)
        'js/components/export.js',
        'js/components/filters-views.js',
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
