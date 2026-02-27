// ==================== STATE ====================
const STORAGE_KEY = 'ops_dashboard_v2';

const DEFAULT_STATE = {
    impacts: [],
    tasks: [],
    infra: [],
    log: [],
    chartData: null,
    bannerDismissed: false,
    channels: {
        slack: '#general, #ops-alerts',
        email: 'ops@entreprise.com',
        teams: 'Équipe Ops',
        mattermost: '',
        discord: '',
        other: 'Wiki interne'
    },
    currentView: 'ops',
    trafficLight: {
        settings: {
            mode: 'worst',
            thresholds: { completionGreen: 80, completionYellow: 50 },
            weights: { infra: 40, impacts: 35, tasks: 25 },
            exclusions: [],
            timeRanges: { enabled: false, businessStart: 8, businessEnd: 18, weekendRelax: true }
        },
        history: []
    },
    importSources: [],
    gitlabRepos: [],
    gitlabMRCache: {},
    githubRepos: [],
    githubPRCache: {},
    githubActionsCache: {},
    githubCommitsCache: {},
    dashboardSettings: {},
    metricsOrder: {},
    chartsOrder: [],
    infraOrder: {}
};

const DASHBOARD_ELEMENTS = {
    kanban: {
        label: 'Kanban', icon: '📋',
        children: {
            'metric-todo':       { label: 'Tâches à faire',       desc: 'Nombre de tâches en attente',           type: 'metric' },
            'metric-wip':        { label: 'Tâches en cours',      desc: 'Nombre de tâches en progression',       type: 'metric' },
            'metric-done':       { label: 'Tâches terminées',     desc: 'Nombre de tâches complétées',           type: 'metric' },
            'metric-completion': { label: 'Complétion globale',   desc: 'Pourcentage done/total avec barre',     type: 'metric' },
            'section-kanban':    { label: 'Section Kanban',       desc: 'Colonnes todo/wip/done avec drag & drop', type: 'section' },
            'chart-activity':    { label: 'Activité Kanban 7j',   desc: 'Courbe des tâches complétées par jour', type: 'chart' },
            'chart-priority':    { label: 'Distribution priorités', desc: 'Répartition critical/high/medium/low', type: 'chart' }
        }
    },
    infra: {
        label: 'Infrastructure', icon: '🖥️',
        children: {
            'metric-infra':      { label: 'Infra items',          desc: 'Total machines avec résumé up/degraded/down', type: 'metric' },
            'metric-uptime':     { label: 'Disponibilité',        desc: 'Pourcentage de machines opérationnelles',     type: 'metric' },
            'section-infra':     { label: 'Section Infrastructure', desc: 'Liste des machines avec statuts et détails', type: 'section' },
            'chart-infrastatus': { label: 'Statut Infrastructure', desc: 'Donut répartition up/degraded/down',         type: 'chart' },
            'chart-pricing':     { label: 'Coût par requête',     desc: 'Estimation coûts infra avec projection durée', type: 'chart' }
        }
    },
    impacts: {
        label: 'Impacts', icon: '🔴',
        children: {
            'metric-impacts':    { label: 'Impacts actifs',       desc: 'Nombre d\'incidents en cours avec sévérité',   type: 'metric' },
            'metric-resolved':   { label: 'Impacts résolus',      desc: 'Nombre d\'incidents résolus',                  type: 'metric' },
            'header-impacts':    { label: 'Bandeau impacts',      desc: 'Ticker défilant des incidents actifs',          type: 'section' },
            'section-history':   { label: 'Historique impacts',   desc: 'Timeline des incidents résolus',                type: 'section' },
            'chart-timeline':    { label: 'Timeline impacts 7j',  desc: 'Courbe des impacts sur 7 jours',               type: 'chart' }
        }
    },
    monitoring: {
        label: 'Monitoring', icon: '🚦',
        children: {
            'chart-trafficlight': { label: 'Historique Traffic Light', desc: 'Score santé global (Rouge/Orange/Vert) sur 30 jours — combine infra, impacts et tâches', type: 'chart' },
            'metric-gitlab':      { label: 'MR GitLab',               desc: 'Merge requests GitLab en attente de review', type: 'metric' },
            'metric-gitlab-pipelines': { label: 'Pipelines GitLab',   desc: 'Pipelines GitLab CI/CD (success/failed/running)', type: 'metric' },
            'metric-gitlab-commits':   { label: 'Commits GitLab (7j)', desc: 'Commits récents GitLab sur les 7 derniers jours', type: 'metric' },
            'metric-github-pr':        { label: 'PR GitHub',           desc: 'Pull requests GitHub ouvertes', type: 'metric' },
            'metric-github-actions':   { label: 'GitHub Actions',      desc: 'Workflow runs GitHub Actions (success/failed/running)', type: 'metric' },
            'metric-github-commits':   { label: 'Commits GitHub (7j)', desc: 'Commits récents GitHub sur les 7 derniers jours', type: 'metric' },
            'metric-mttr':         { label: 'MTTR',                    desc: 'Mean Time To Recover — temps moyen de résolution des impacts', type: 'metric' },
            'metric-deploy-freq': { label: 'Déploiements/j',          desc: 'Fréquence de déploiement (commits/jour sur 7 jours)', type: 'metric' },
            'metric-cfr':         { label: 'Change Failure Rate',     desc: 'Taux d\'échec des changements (pipelines/actions failed)', type: 'metric' },
            'metric-consul':      { label: 'Consul services',         desc: 'Services healthy et nodes enregistrés via Consul', type: 'metric' },
            'metric-ansible':     { label: 'Ansible runs',            desc: 'Playbooks exécutés via AWX/Ansible Tower', type: 'metric' },
            'metric-openstack':   { label: 'OpenStack',               desc: 'Instances et volumes via OpenStack API', type: 'metric' },
            'chart-ansible':      { label: 'Charts Ansible',           desc: 'Donuts jobs par statut + taux de succès', type: 'chart' },
            'chart-openstack':    { label: 'Charts OpenStack',         desc: 'Donuts instances par statut + volumes', type: 'chart' },
            'chart-downtime':     { label: 'Coût d\'indisponibilité', desc: 'Estimation coût des incidents par sévérité sur 30 jours', type: 'chart' }
        }
    },
    journal: {
        label: 'Journal', icon: '📝',
        children: {
            'section-log':       { label: 'Journal d\'événements', desc: 'Fil chronologique de toutes les actions', type: 'section' }
        }
    }
};

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (e) { console.error('State load error', e); }
    return { ...DEFAULT_STATE };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let activityChart = null;
let infraStatusChartInstance = null;
let priorityChartInstance = null;
let impactsTimelineChartInstance = null;
let pricingChartInstance = null;
let pricingCurrentView = 'cumulative';
let pricingDurationDays = 1;
let ansibleJobsChartInstance = null;
let ansibleRateChartInstance = null;
let openstackInstancesChartInstance = null;
let openstackVolumesChartInstance = null;
let downtimeCostChartInstance = null;
