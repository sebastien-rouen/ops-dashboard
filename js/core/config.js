// ==================== DASHBOARD CONFIG ====================
// Constantes globales non persistées.
// Modifier ici pour ajuster les comportements du dashboard sans toucher à la logique métier.

const DASHBOARD_CONFIG = {

    // ---- Rate Limiting ----

    // Nombre maximum d'événements conservés dans le localStorage
    rateLimitMaxEvents: 500,

    // Fenêtre temporelle pour le calcul des stats (ms) — par défaut 24h
    rateLimitStatsWindowMs: 24 * 60 * 60 * 1000,

    // Nombre de fenêtres affichées sur le chart
    rateLimitChartBuckets: 12,

    // Durée de chaque fenêtre sur le chart (ms) — par défaut 10 min
    // Chart = rateLimitChartBuckets × rateLimitChartBucketMs = 2h par défaut
    rateLimitChartBucketMs: 10 * 60 * 1000,

    // Seuils par défaut (req/min) — écrasés par state.rateLimitSettings si sauvegardés
    rateLimitDefaultWarning: 50,
    rateLimitDefaultCritical: 200,

    // Fenêtre par défaut proposée dans le formulaire (secondes)
    rateLimitDefaultWindowSec: 60,

};
