// ==================== DEMO DATA ====================
function toggleDemoMenu() {
    const dd = document.getElementById('demoDropdown');
    dd.classList.toggle('open');
    if (dd.classList.contains('open')) {
        setTimeout(() => document.addEventListener('click', closeDemoMenuOnClick, { once: true }), 0);
    }
}
function closeDemoMenuOnClick() {
    const dd = document.getElementById('demoDropdown');
    if (dd) dd.classList.remove('open');
}

function resetBoard() {
    closeDemoMenuOnClick();
    if (state.infra.length > 0 || state.tasks.length > 0 || state.impacts.length > 0) {
        if (!confirm('⚠️ Toutes les données seront supprimées.\nContinuer ?')) return;
    }
    state.impacts = [];
    state.tasks = [];
    state.infra = [];
    state.log = [];
    state.importSources = [];
    state.gitlabRepos = [];
    state.gitlabMRCache = {};
    state.gitlabPipelinesCache = {};
    state.gitlabCommitsCache = {};
    state.githubRepos = [];
    state.githubPRCache = {};
    state.githubActionsCache = {};
    state.githubCommitsCache = {};
    state.consulEndpoints = [];
    state.consulCache = {};
    state.ansibleEndpoints = [];
    state.ansibleCache = {};
    state.openstackEndpoints = [];
    state.openstackCache = {};
    state.rateLimitEvents = [];
    state.chartData = null;
    state.bannerDismissed = false;
    state.dashboardSettings = {};
    if (state.trafficLight) state.trafficLight.history = [];
    addLog('🗑️', 'Board remis à zéro');
    saveState();
    renderAll();
    applyDashboardSettings();
    toast('🗑️ Board remis à zéro');
}

function loadDemoIncident() {
    closeDemoMenuOnClick();
    if (state.infra.length > 0 || state.tasks.length > 0 || state.impacts.length > 0) {
        if (!confirm('⚠️ Cela remplacera toutes vos données actuelles.\nContinuer ?')) return;
    }

    // Reset
    state.impacts = [];
    state.tasks = [];
    state.infra = [];
    state.log = [];
    state.importSources = [];
    state.gitlabRepos = [];
    state.gitlabMRCache = {};
    state.gitlabPipelinesCache = {};
    state.gitlabCommitsCache = {};
    state.githubRepos = [];
    state.githubPRCache = {};
    state.githubActionsCache = {};
    state.githubCommitsCache = {};
    state.dashboardSettings = {};
    if (state.trafficLight) state.trafficLight.history = [];

    // ---- Démo 1 : Infrastructure variée (30 machines) ----
    const demoInfra = [
        // PROD (14 machines)
        { name: 'prod-web-01', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.10', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'prod-web-02', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.11', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'prod-web-03', type: 'vm', env: 'prod', status: 'down', ip: '10.0.1.12', details: 'nginx 1.24, node 18.x — KERNEL PANIC' },
        { name: 'prod-db-master', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.10', details: 'PostgreSQL 15, pgbouncer, barman' },
        { name: 'prod-db-replica', type: 'lxc', env: 'prod', status: 'degraded', ip: '10.0.2.11', details: 'PostgreSQL 15 replica — lag 12s' },
        { name: 'redis-cluster-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.20', details: 'Redis 7.2 cluster mode' },
        { name: 'redis-cluster-02', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.21', details: 'Redis 7.2 cluster mode' },
        { name: 'elk-stack', type: 'stack', env: 'prod', status: 'degraded', ip: '10.0.3.10', details: 'Elasticsearch 8.11, Logstash, Kibana — heap 92%' },
        { name: 'graylog-01', type: 'logger', env: 'prod', status: 'up', ip: '10.0.3.20', details: 'Graylog 5.1, MongoDB 6.0' },
        { name: 'haproxy-01', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.1', details: 'HAProxy 2.8, keepalived VIP' },
        { name: 'haproxy-02', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.2', details: 'HAProxy 2.8, keepalived backup' },
        { name: 'vault-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.6.10', details: 'HashiCorp Vault 1.15, auto-unseal' },
        { name: 'prod-mq-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.7.10', details: 'RabbitMQ 3.12, cluster 3 nœuds' },
        { name: 'prod-s3-gateway', type: 'vm', env: 'prod', status: 'up', ip: '10.0.8.10', details: 'MinIO, 12TB S3-compatible' },
        // PREPROD (6 machines)
        { name: 'preprod-web-01', type: 'vm', env: 'preprod', status: 'up', ip: '10.1.1.10', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'preprod-web-02', type: 'vm', env: 'preprod', status: 'up', ip: '10.1.1.11', details: 'nginx 1.24, node 20.x, pm2' },
        { name: 'preprod-db-01', type: 'lxc', env: 'preprod', status: 'up', ip: '10.1.2.10', details: 'PostgreSQL 15' },
        { name: 'preprod-redis-01', type: 'lxc', env: 'preprod', status: 'up', ip: '10.1.2.20', details: 'Redis 7.2 standalone' },
        { name: 'preprod-mq-01', type: 'lxc', env: 'preprod', status: 'degraded', ip: '10.1.7.10', details: 'RabbitMQ 3.12 — queue backlog 15k' },
        { name: 'preprod-elk-01', type: 'stack', env: 'preprod', status: 'up', ip: '10.1.3.10', details: 'Elasticsearch 8.12, Kibana' },
        // DEV (6 machines)
        { name: 'dev-api-01', type: 'vm', env: 'dev', status: 'up', ip: '10.2.1.10', details: 'Node 20.x, Express, hot-reload' },
        { name: 'dev-api-02', type: 'vm', env: 'dev', status: 'up', ip: '10.2.1.11', details: 'Python 3.12, FastAPI, uvicorn' },
        { name: 'dev-db-01', type: 'lxc', env: 'dev', status: 'up', ip: '10.2.2.10', details: 'PostgreSQL 15, seed data' },
        { name: 'dev-front-01', type: 'vm', env: 'dev', status: 'up', ip: '10.2.1.20', details: 'Vite dev server, React 18, HMR' },
        { name: 'ci-runner-01', type: 'vm', env: 'dev', status: 'down', ip: '10.0.4.10', details: 'GitLab Runner, Docker — DISK FULL 98%' },
        { name: 'ci-runner-02', type: 'vm', env: 'dev', status: 'up', ip: '10.0.4.11', details: 'GitLab Runner, Docker, Kaniko' },
        // TRANSVERSE (4 machines)
        { name: 'monitoring-01', type: 'stack', env: '', status: 'up', ip: '10.0.3.30', details: 'Prometheus, Grafana, Alertmanager' },
        { name: 'backup-nfs', type: 'vm', env: '', status: 'up', ip: '10.0.5.10', details: 'NFS v4, restic, 8TB, rétention 90j' },
        { name: 'dns-internal', type: 'vm', env: '', status: 'up', ip: '10.0.0.53', details: 'CoreDNS, zones internes *.internal' },
        { name: 'gitlab-01', type: 'vm', env: '', status: 'up', ip: '10.0.9.10', details: 'GitLab CE 16.8, Gitaly, Pages, Registry' }
    ];

    demoInfra.forEach(d => {
        state.infra.push({
            id: uid(),
            name: d.name,
            type: d.type,
            env: d.env || '',
            status: d.status,
            ip: d.ip,
            details: d.details,
            added: new Date().toISOString()
        });
    });

    // ---- Démo 2 : Tâches Kanban (20 tâches, 6 assignees) ----
    const demoTasks = [
        // TODO (7)
        { title: 'Migrer PostgreSQL 15 → 16', desc: 'Préparer le plan de migration avec fenêtre de maintenance samedi 03h-06h', tags: ['postgres', 'migration'], priority: 'high', status: 'todo', assignee: 'L. Martin', envs: ['prod'] },
        { title: 'Ajouter monitoring Redis Cluster', desc: 'Dashboard Grafana + alertes Slack sur latency > 5ms', tags: ['redis', 'monitoring'], priority: 'medium', status: 'todo', assignee: 'S. Durand', envs: ['prod'] },
        { title: 'Renouveler certificats TLS', desc: 'Expiration dans 15j — *.prod.internal + *.api.internal', tags: ['tls', 'urgent'], priority: 'critical', status: 'todo', assignee: 'A. Bernard', envs: ['prod', 'preprod'] },
        { title: 'Documenter procédure PRA', desc: 'Plan de reprise d\'activité — failover DB + LB + DNS', tags: ['doc', 'pra'], priority: 'low', status: 'todo' },
        { title: 'Upgrade RabbitMQ preprod', desc: 'preprod-mq-01 queue backlog, passer en 3.13', tags: ['rabbitmq', 'upgrade'], priority: 'medium', status: 'todo', assignee: 'M. Robert', envs: ['preprod'] },
        { title: 'Mettre en place Trivy sur CI', desc: 'Scanner les images Docker à chaque build, bloquer si CVE critique', tags: ['security', 'ci', 'docker'], priority: 'high', status: 'todo', assignee: 'P. Lefevre', envs: ['dev'] },
        { title: 'Configurer log rotation Graylog', desc: 'Rétention 30j prod, 7j dev, archivage S3 pour compliance', tags: ['graylog', 'logs'], priority: 'low', status: 'todo', assignee: 'S. Durand', envs: ['prod', 'dev'] },
        // WIP (6)
        { title: 'Nettoyer le disque ci-runner-01', desc: '/var/lib/docker plein à 98%, purge images > 30j', tags: ['ci', 'disk'], priority: 'high', status: 'wip', assignee: 'K. Petit', envs: ['dev'] },
        { title: 'Investiguer lag réplication DB', desc: 'prod-db-replica montre 12s de lag, suspicion I/O disque', tags: ['postgres', 'perf'], priority: 'high', status: 'wip', assignee: 'L. Martin', envs: ['prod'] },
        { title: 'Patcher ELK vers 8.12', desc: 'Fix CVE-2024-xxxx + heap tuning (actuellement 92%)', tags: ['elk', 'security'], priority: 'medium', status: 'wip', assignee: 'A. Bernard', envs: ['prod'] },
        { title: 'Automatiser rotation secrets Vault', desc: 'Cron + vault agent pour rotation JWT/DB creds toutes les 24h', tags: ['vault', 'security'], priority: 'high', status: 'wip', assignee: 'S. Durand', envs: ['prod', 'preprod'] },
        { title: 'Configurer alertes Grafana', desc: 'Seuils CPU >80%, RAM >90%, disk >85% sur toutes les machines prod', tags: ['monitoring', 'alerting'], priority: 'medium', status: 'wip', assignee: 'M. Robert', envs: ['prod'] },
        { title: 'Restaurer prod-web-03', desc: 'Kernel panic après mise à jour firmware. Rollback en cours via IPMI.', tags: ['incident', 'prod', 'urgent'], priority: 'critical', status: 'wip', assignee: 'P. Lefevre', envs: ['prod'] },
        // DONE (7)
        { title: 'Configurer backup Vault', desc: 'Snapshot auto quotidien vers NFS + vérification restore hebdo', tags: ['vault', 'backup'], priority: 'medium', status: 'done', assignee: 'S. Durand', envs: ['prod'] },
        { title: 'Déployer HAProxy config v2', desc: 'Ajout nouveaux backends API v3 + health checks améliorés', tags: ['haproxy', 'deploy'], priority: 'low', status: 'done', assignee: 'K. Petit', envs: ['prod'] },
        { title: 'Audit sécurité réseau Q4', desc: 'Scan Nessus + rapport pour RSSI, 3 vulns medium corrigées', tags: ['security', 'audit'], priority: 'medium', status: 'done', assignee: 'A. Bernard', envs: ['prod', 'preprod', 'dev'] },
        { title: 'Déployer MinIO cluster mode', desc: 'Passage de standalone à cluster 4 nœuds, migration données OK', tags: ['minio', 'storage'], priority: 'low', status: 'done', assignee: 'L. Martin', envs: ['prod'] },
        { title: 'Résoudre CVE-2024-32002 Git', desc: 'Patch Git 2.45.1 sur tous les runners CI + GitLab', tags: ['security', 'ci'], priority: 'critical', status: 'done', assignee: 'K. Petit', envs: ['dev'] },
        { title: 'Installer ci-runner-02', desc: 'Nouveau runner avec Kaniko pour builds rootless + cache S3', tags: ['ci', 'infra'], priority: 'medium', status: 'done', assignee: 'P. Lefevre', envs: ['dev'] },
        { title: 'Migrer DNS vers CoreDNS', desc: 'Remplacement bind9 par CoreDNS, zones internes *.internal migrées', tags: ['dns', 'migration'], priority: 'low', status: 'done', assignee: 'M. Robert' }
    ];

    demoTasks.forEach(d => {
        state.tasks.push({
            id: uid(),
            title: d.title,
            desc: d.desc,
            assignee: d.assignee || '',
            tags: d.tags,
            priority: d.priority,
            status: d.status,
            envs: d.envs || [],
            created: new Date().toISOString()
        });
    });

    // ---- Démo 3 : Impacts actifs (4) ----
    const demoImpacts = [
        {
            title: 'OVH — Incident réseau DC GRA',
            severity: 'major',
            origin: 'external',
            desc: 'Perte partielle de connectivité sur le DC Gravelines. Affecte nos liens de backup. ETA résolution 2h (source: OVH status).',
            active: true
        },
        {
            title: 'prod-web-03 — Kernel panic',
            severity: 'critical',
            origin: 'internal',
            desc: 'Kernel panic après mise à jour firmware BMC. Machine inaccessible. Rollback IPMI en cours. Trafic redirigé via HAProxy sur web-01/02.',
            active: true
        },
        {
            title: 'CI/CD pipeline bloqué',
            severity: 'warning',
            origin: 'internal',
            desc: 'Runner ci-runner-01 disque plein. Les déploiements sont en file d\'attente. Workaround: utiliser runner-02.',
            active: true
        },
        {
            title: 'RabbitMQ — queue backlog critique',
            severity: 'major',
            origin: 'internal',
            desc: 'preprod-mq-01 : 15k messages en attente, consumers bloqués. Risque de perte de messages si la queue atteint 50k. Restart planifié.',
            active: true
        }
    ];

    demoImpacts.forEach(d => {
        state.impacts.push({
            id: uid(),
            title: d.title,
            severity: d.severity,
            origin: d.origin,
            desc: d.desc,
            time: new Date(Date.now() - Math.random() * 7200000).toISOString(),
            active: d.active
        });
    });

    // ---- Démo 3b : Impacts résolus (historique — 8) ----
    const resolvedImpacts = [
        {
            title: 'ELK heap pressure — indexation ralentie',
            severity: 'warning',
            origin: 'internal',
            desc: 'Heap JVM à 95% sur elk-stack. Indexation Logstash ralentie, perte temporaire de logs (5min). GC tuning appliqué.',
            hoursAgo: 18,
            durationHours: 2
        },
        {
            title: 'Cloudflare — Dégradation CDN Europe',
            severity: 'major',
            origin: 'external',
            desc: 'Latence élevée sur les POP européens. Temps de réponse x3 sur les assets statiques.',
            hoursAgo: 72,
            durationHours: 4
        },
        {
            title: 'Pic de charge — Black Friday',
            severity: 'major',
            origin: 'internal',
            desc: 'Trafic x5, autoscale HAProxy + ajout prod-web-03. Redis cluster saturé à 85%. Stabilisé après scale-up.',
            hoursAgo: 96,
            durationHours: 8
        },
        {
            title: 'Fuite mémoire service auth',
            severity: 'critical',
            origin: 'internal',
            desc: 'OOM killer déclenché sur prod-web-01. Restart automatique pm2, RCA: fuite dans le middleware JWT.',
            hoursAgo: 120,
            durationHours: 1.5
        },
        {
            title: 'Maintenance planifiée — switch core',
            severity: 'warning',
            origin: 'internal',
            desc: 'Remplacement du switch core DC1. Bascule sur le lien secondaire, micro-coupures de 2s.',
            hoursAgo: 168,
            durationHours: 3
        },
        {
            title: 'AWS S3 — Erreurs 503 intermittentes',
            severity: 'major',
            origin: 'external',
            desc: 'Erreurs 503 sur le bucket de backups eu-west-1. Retry policy activée côté restic.',
            hoursAgo: 240,
            durationHours: 6
        },
        {
            title: 'Certificat expiré — API interne v2',
            severity: 'warning',
            origin: 'internal',
            desc: 'Certificat TLS expiré sur api-v2.internal. Renouvelé manuellement via certbot.',
            hoursAgo: 360,
            durationHours: 0.5
        },
        {
            title: 'DNS résolution lente — CoreDNS restart',
            severity: 'warning',
            origin: 'internal',
            desc: 'Latence DNS > 500ms suite à un cache overflow. Restart CoreDNS + augmentation cache size à 10k entrées.',
            hoursAgo: 480,
            durationHours: 0.3
        }
    ];

    resolvedImpacts.forEach(d => {
        const startTime = new Date(Date.now() - d.hoursAgo * 3600000);
        const resolvedTime = new Date(startTime.getTime() + d.durationHours * 3600000);
        state.impacts.push({
            id: uid(),
            title: d.title,
            severity: d.severity,
            origin: d.origin,
            desc: d.desc,
            time: startTime.toISOString(),
            active: false,
            resolvedAt: resolvedTime.toISOString()
        });
    });

    // ---- Démo 4 : Traffic Light historique (30 jours — 22 entrées) ----
    const tlHistory = [];
    const tlScenario = [
        // [daysAgo, color, score, trigger]
        [30, 'green', 95, 'Situation nominale — toute infra up'],
        [28, 'green', 92, 'Routine — 1 tâche complétée'],
        [27, 'yellow', 68, '1 machine degraded (elk-stack heap 90%)'],
        [26, 'green', 88, 'Retour à la normale — GC tuning'],
        [24, 'green', 90, 'Maintenance préventive OK'],
        [22, 'red', 35, 'Machine ci-runner-01 down + impact critical'],
        [21, 'yellow', 55, 'Impact résolu, machine toujours down'],
        [20, 'yellow', 62, 'ci-runner-02 provisionné, build OK'],
        [19, 'green', 85, 'Toutes machines fonctionnelles'],
        [17, 'green', 88, 'Déploiement v2.4 nominal'],
        [15, 'yellow', 60, 'Pic de charge — Black Friday x5 trafic'],
        [14, 'yellow', 52, 'Impact major — CDN Cloudflare + autoscale'],
        [13, 'yellow', 58, 'Taux complétion en baisse (55%)'],
        [12, 'green', 82, 'Retour nominal après résolution CDN'],
        [10, 'green', 86, 'Maintenance Vault backup OK'],
        [8, 'red', 28, 'Fuite mémoire critique + 2 machines degraded'],
        [7, 'yellow', 60, 'Hotfix déployé, surveillance active'],
        [6, 'green', 90, 'Situation stabilisée'],
        [4, 'green', 87, 'Audit sécurité Q4 validé'],
        [3, 'yellow', 65, '1 machine degraded + impact warning ELK heap'],
        [2, 'yellow', 58, 'ELK toujours degraded + réplica DB lag 12s'],
        [0, 'red', 32, 'prod-web-03 kernel panic + impact critical + OVH réseau'],
    ];

    tlScenario.forEach(([daysAgo, color, score, trigger]) => {
        const time = new Date(Date.now() - daysAgo * 86400000 + Math.random() * 28800000);
        tlHistory.push({ time: time.toISOString(), color, score, trigger });
    });

    if (!state.trafficLight) state.trafficLight = { ...DEFAULT_STATE.trafficLight };
    state.trafficLight.history = tlHistory;

    // ---- Démo 5 : Sources d'import configurées (3) ----
    state.importSources = [
        {
            id: uid(),
            name: 'Prometheus Prod',
            format: 'prometheus',
            url: 'http://monitoring-01:9090/api/v1/targets',
            lastSync: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: uid(),
            name: 'Zabbix DC1',
            format: 'zabbix',
            url: 'http://zabbix.internal/api_jsonrpc.php',
            lastSync: new Date(Date.now() - 7200000).toISOString()
        },
        {
            id: uid(),
            name: 'Inventory CMDB',
            format: 'json',
            url: 'http://cmdb.internal/api/v1/hosts?format=json',
            lastSync: new Date(Date.now() - 86400000).toISOString()
        }
    ];

    // ---- Démo 6 : GitLab Merge Requests (4 repos, 14 MR) ----
    const glRepoFront = uid();
    const glRepoBack = uid();
    const glRepoInfra = uid();
    const glRepoMobile = uid();
    state.gitlabRepos = [
        { id: glRepoFront, name: 'frontend', url: 'https://gitlab.example.com', projectId: '142', branch: 'main', token: '' },
        { id: glRepoBack, name: 'backend-api', url: 'https://gitlab.example.com', projectId: '143', branch: 'main', token: '' },
        { id: glRepoInfra, name: 'infra-as-code', url: 'https://gitlab.example.com', projectId: '201', branch: 'main', token: '' },
        { id: glRepoMobile, name: 'mobile-app', url: 'https://gitlab.example.com', projectId: '310', branch: 'develop', token: '' }
    ];
    state.gitlabMRCache = {};
    state.gitlabMRCache[glRepoFront] = {
        count: 5,
        fetchedAt: new Date(Date.now() - 900000).toISOString(),
        mrs: [
            { id: 312, title: 'feat: dark mode toggle component', author: 'S. Durand', url: '#', created: new Date(Date.now() - 3600000 * 2).toISOString(), labels: ['feature', 'ui'], draft: false },
            { id: 310, title: 'fix: responsive sidebar on mobile', author: 'K. Petit', url: '#', created: new Date(Date.now() - 3600000 * 8).toISOString(), labels: ['bugfix'], draft: false },
            { id: 309, title: 'feat: real-time WebSocket notifications', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 3600000 * 20).toISOString(), labels: ['feature', 'websocket'], draft: false },
            { id: 308, title: 'chore: upgrade React 18 → 19', author: 'L. Martin', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString(), labels: ['dependencies'], draft: true },
            { id: 305, title: 'feat: notification bell with unread count', author: 'M. Robert', url: '#', created: new Date(Date.now() - 86400000 * 3).toISOString(), labels: ['feature'], draft: false }
        ]
    };
    state.gitlabMRCache[glRepoBack] = {
        count: 4,
        fetchedAt: new Date(Date.now() - 1200000).toISOString(),
        mrs: [
            { id: 589, title: 'feat: GraphQL subscriptions for live updates', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 3600000 * 3).toISOString(), labels: ['feature', 'graphql'], draft: false },
            { id: 587, title: 'feat: add rate limiting middleware', author: 'A. Bernard', url: '#', created: new Date(Date.now() - 3600000 * 5).toISOString(), labels: ['security', 'api'], draft: false },
            { id: 584, title: 'fix: PostgreSQL connection pool leak', author: 'L. Martin', url: '#', created: new Date(Date.now() - 86400000).toISOString(), labels: ['bugfix', 'critical'], draft: false },
            { id: 580, title: 'refactor: extract auth service into microservice', author: 'S. Durand', url: '#', created: new Date(Date.now() - 86400000 * 4).toISOString(), labels: ['refactor'], draft: true }
        ]
    };
    state.gitlabMRCache[glRepoInfra] = {
        count: 3,
        fetchedAt: new Date(Date.now() - 600000).toISOString(),
        mrs: [
            { id: 91, title: 'feat: add PagerDuty integration for alerts', author: 'M. Robert', url: '#', created: new Date(Date.now() - 3600000 * 6).toISOString(), labels: ['terraform', 'alerting'], draft: false },
            { id: 89, title: 'feat: add Vault auto-unseal with KMS', author: 'A. Bernard', url: '#', created: new Date(Date.now() - 86400000 * 1).toISOString(), labels: ['terraform', 'vault'], draft: false },
            { id: 87, title: 'chore: upgrade k8s node pool to 1.29', author: 'K. Petit', url: '#', created: new Date(Date.now() - 86400000 * 5).toISOString(), labels: ['kubernetes'], draft: false }
        ]
    };
    state.gitlabMRCache[glRepoMobile] = {
        count: 2,
        fetchedAt: new Date(Date.now() - 1800000).toISOString(),
        mrs: [
            { id: 45, title: 'feat: push notifications with Firebase', author: 'K. Petit', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString(), labels: ['feature', 'mobile'], draft: false },
            { id: 43, title: 'fix: offline mode sync conflict resolution', author: 'M. Robert', url: '#', created: new Date(Date.now() - 86400000 * 6).toISOString(), labels: ['bugfix', 'offline'], draft: true }
        ]
    };

    // ---- Démo 6b : GitLab Pipelines (4 repos) ----
    state.gitlabPipelinesCache = {};
    state.gitlabPipelinesCache[glRepoFront] = {
        total: 12, success: 8, failed: 2, running: 1, other: 1,
        fetchedAt: new Date(Date.now() - 600000).toISOString(),
        pipelines: [
            { id: 4520, status: 'failed', ref: 'main', url: '#', created: new Date(Date.now() - 1800000).toISOString(), updated: new Date(Date.now() - 1200000).toISOString() },
            { id: 4519, status: 'running', ref: 'main', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 600000).toISOString() },
            { id: 4518, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 6000000).toISOString() },
            { id: 4517, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 14400000).toISOString(), updated: new Date(Date.now() - 14000000).toISOString() },
            { id: 4516, status: 'failed', ref: 'main', url: '#', created: new Date(Date.now() - 28800000).toISOString(), updated: new Date(Date.now() - 28000000).toISOString() },
            { id: 4515, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 43200000).toISOString(), updated: new Date(Date.now() - 42000000).toISOString() },
        ]
    };
    state.gitlabPipelinesCache[glRepoBack] = {
        total: 15, success: 11, failed: 3, running: 1, other: 0,
        fetchedAt: new Date(Date.now() - 500000).toISOString(),
        pipelines: [
            { id: 8901, status: 'failed', ref: 'main', url: '#', created: new Date(Date.now() - 900000).toISOString(), updated: new Date(Date.now() - 600000).toISOString() },
            { id: 8900, status: 'running', ref: 'main', url: '#', created: new Date(Date.now() - 2700000).toISOString(), updated: new Date(Date.now() - 900000).toISOString() },
            { id: 8899, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 5400000).toISOString(), updated: new Date(Date.now() - 5000000).toISOString() },
            { id: 8898, status: 'failed', ref: 'main', url: '#', created: new Date(Date.now() - 10800000).toISOString(), updated: new Date(Date.now() - 10000000).toISOString() },
            { id: 8897, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 21600000).toISOString(), updated: new Date(Date.now() - 21000000).toISOString() },
        ]
    };
    state.gitlabPipelinesCache[glRepoInfra] = {
        total: 8, success: 7, failed: 1, running: 0, other: 0,
        fetchedAt: new Date(Date.now() - 400000).toISOString(),
        pipelines: [
            { id: 230, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 3000000).toISOString() },
            { id: 229, status: 'failed', ref: 'main', url: '#', created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 85000000).toISOString() },
            { id: 228, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 172800000).toISOString(), updated: new Date(Date.now() - 172000000).toISOString() },
        ]
    };
    state.gitlabPipelinesCache[glRepoMobile] = {
        total: 5, success: 3, failed: 1, running: 1, other: 0,
        fetchedAt: new Date(Date.now() - 800000).toISOString(),
        pipelines: [
            { id: 112, status: 'running', ref: 'develop', url: '#', created: new Date(Date.now() - 1200000).toISOString(), updated: new Date(Date.now() - 600000).toISOString() },
            { id: 111, status: 'failed', ref: 'develop', url: '#', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 6800000).toISOString() },
            { id: 110, status: 'success', ref: 'develop', url: '#', created: new Date(Date.now() - 14400000).toISOString(), updated: new Date(Date.now() - 14000000).toISOString() },
        ]
    };

    // ---- Démo 6c : GitLab Commits (4 repos, 7j) ----
    state.gitlabCommitsCache = {};
    state.gitlabCommitsCache[glRepoFront] = {
        count: 18, fetchedAt: new Date(Date.now() - 600000).toISOString(),
        commits: [
            { id: 'a1b2c3d', title: 'feat: dark mode toggle component', author: 'S. Durand', url: '#', created: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: 'e4f5g6h', title: 'fix: sidebar responsive on mobile', author: 'K. Petit', url: '#', created: new Date(Date.now() - 3600000 * 5).toISOString() },
            { id: 'i7j8k9l', title: 'chore: update eslint config', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 3600000 * 12).toISOString() },
            { id: 'm0n1o2p', title: 'feat: notification bell unread count', author: 'M. Robert', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
            { id: 'q3r4s5t', title: 'fix: websocket reconnect logic', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
        ]
    };
    state.gitlabCommitsCache[glRepoBack] = {
        count: 24, fetchedAt: new Date(Date.now() - 500000).toISOString(),
        commits: [
            { id: 'u6v7w8x', title: 'feat: GraphQL subscriptions', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 3600000 * 3).toISOString() },
            { id: 'y9z0a1b', title: 'feat: rate limiting middleware', author: 'A. Bernard', url: '#', created: new Date(Date.now() - 3600000 * 6).toISOString() },
            { id: 'c2d3e4f', title: 'fix: connection pool leak PostgreSQL', author: 'L. Martin', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
            { id: 'g5h6i7j', title: 'refactor: auth service extraction', author: 'S. Durand', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: 'k8l9m0n', title: 'test: add integration tests for API v3', author: 'K. Petit', url: '#', created: new Date(Date.now() - 86400000 * 3).toISOString() },
        ]
    };
    state.gitlabCommitsCache[glRepoInfra] = {
        count: 8, fetchedAt: new Date(Date.now() - 400000).toISOString(),
        commits: [
            { id: 'o1p2q3r', title: 'feat: add PagerDuty terraform module', author: 'M. Robert', url: '#', created: new Date(Date.now() - 3600000 * 6).toISOString() },
            { id: 's4t5u6v', title: 'feat: Vault auto-unseal with KMS', author: 'A. Bernard', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
            { id: 'w7x8y9z', title: 'chore: upgrade k8s node pool to 1.29', author: 'K. Petit', url: '#', created: new Date(Date.now() - 86400000 * 3).toISOString() },
        ]
    };
    state.gitlabCommitsCache[glRepoMobile] = {
        count: 6, fetchedAt: new Date(Date.now() - 800000).toISOString(),
        commits: [
            { id: 'a0b1c2d', title: 'feat: push notifications Firebase', author: 'K. Petit', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: 'e3f4g5h', title: 'fix: offline sync conflict resolution', author: 'M. Robert', url: '#', created: new Date(Date.now() - 86400000 * 4).toISOString() },
        ]
    };

    // ---- Démo 6d : GitHub (3 repos, PR + Actions + Commits) ----
    const ghRepoWeb = uid();
    const ghRepoApi = uid();
    const ghRepoOps = uid();
    state.githubRepos = [
        { id: ghRepoWeb, name: 'web-platform', url: 'https://api.github.com', owner: 'acme-corp', repo: 'web-platform', branch: 'main', token: '' },
        { id: ghRepoApi, name: 'api-gateway', url: 'https://api.github.com', owner: 'acme-corp', repo: 'api-gateway', branch: 'main', token: '' },
        { id: ghRepoOps, name: 'devops-toolkit', url: 'https://api.github.com', owner: 'acme-corp', repo: 'devops-toolkit', branch: 'main', token: '' }
    ];
    state.githubPRCache = {};
    state.githubPRCache[ghRepoWeb] = {
        count: 4, fetchedAt: new Date(Date.now() - 600000).toISOString(),
        prs: [
            { number: 287, title: 'feat: implement SSR for landing page', author: 'j-dupont', url: '#', created: new Date(Date.now() - 3600000 * 4).toISOString(), labels: ['feature', 'performance'], draft: false },
            { number: 285, title: 'fix: hydration mismatch on dark mode', author: 's-martin', url: '#', created: new Date(Date.now() - 3600000 * 10).toISOString(), labels: ['bugfix'], draft: false },
            { number: 283, title: 'chore: migrate to Vite 6', author: 'c-blanc', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString(), labels: ['dependencies'], draft: true },
            { number: 280, title: 'feat: A/B testing framework integration', author: 'a-noir', url: '#', created: new Date(Date.now() - 86400000 * 4).toISOString(), labels: ['feature'], draft: false }
        ]
    };
    state.githubPRCache[ghRepoApi] = {
        count: 3, fetchedAt: new Date(Date.now() - 500000).toISOString(),
        prs: [
            { number: 156, title: 'feat: WebSocket gateway for real-time events', author: 'j-dupont', url: '#', created: new Date(Date.now() - 3600000 * 6).toISOString(), labels: ['feature', 'websocket'], draft: false },
            { number: 154, title: 'fix: race condition in cache invalidation', author: 's-martin', url: '#', created: new Date(Date.now() - 86400000).toISOString(), labels: ['bugfix', 'critical'], draft: false },
            { number: 151, title: 'refactor: switch to OpenTelemetry SDK', author: 'a-noir', url: '#', created: new Date(Date.now() - 86400000 * 3).toISOString(), labels: ['refactor', 'observability'], draft: true }
        ]
    };
    state.githubPRCache[ghRepoOps] = {
        count: 1, fetchedAt: new Date(Date.now() - 400000).toISOString(),
        prs: [
            { number: 78, title: 'feat: add Datadog integration for k8s monitoring', author: 'c-blanc', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString(), labels: ['terraform', 'monitoring'], draft: false }
        ]
    };
    state.githubActionsCache = {};
    state.githubActionsCache[ghRepoWeb] = {
        total: 14, success: 9, failed: 3, running: 2, other: 0,
        fetchedAt: new Date(Date.now() - 600000).toISOString(),
        runs: [
            { id: 9001, name: 'CI / Build & Test', status: 'in_progress', conclusion: null, url: '#', created: new Date(Date.now() - 900000).toISOString(), updated: new Date(Date.now() - 300000).toISOString() },
            { id: 9000, name: 'Deploy Preview', status: 'in_progress', conclusion: null, url: '#', created: new Date(Date.now() - 1200000).toISOString(), updated: new Date(Date.now() - 600000).toISOString() },
            { id: 8999, name: 'CI / Build & Test', status: 'completed', conclusion: 'failure', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 3000000).toISOString() },
            { id: 8998, name: 'CI / Build & Test', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 6600000).toISOString() },
            { id: 8997, name: 'Deploy Production', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 14400000).toISOString(), updated: new Date(Date.now() - 14000000).toISOString() },
            { id: 8996, name: 'CI / Lint', status: 'completed', conclusion: 'failure', url: '#', created: new Date(Date.now() - 21600000).toISOString(), updated: new Date(Date.now() - 21000000).toISOString() },
        ]
    };
    state.githubActionsCache[ghRepoApi] = {
        total: 10, success: 8, failed: 1, running: 1, other: 0,
        fetchedAt: new Date(Date.now() - 500000).toISOString(),
        runs: [
            { id: 5501, name: 'CI Pipeline', status: 'in_progress', conclusion: null, url: '#', created: new Date(Date.now() - 600000).toISOString(), updated: new Date(Date.now() - 300000).toISOString() },
            { id: 5500, name: 'CI Pipeline', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 5400000).toISOString(), updated: new Date(Date.now() - 5000000).toISOString() },
            { id: 5499, name: 'Deploy Staging', status: 'completed', conclusion: 'failure', url: '#', created: new Date(Date.now() - 10800000).toISOString(), updated: new Date(Date.now() - 10000000).toISOString() },
            { id: 5498, name: 'CI Pipeline', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 21600000).toISOString(), updated: new Date(Date.now() - 21000000).toISOString() },
        ]
    };
    state.githubActionsCache[ghRepoOps] = {
        total: 6, success: 6, failed: 0, running: 0, other: 0,
        fetchedAt: new Date(Date.now() - 400000).toISOString(),
        runs: [
            { id: 1201, name: 'Terraform Plan', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 3000000).toISOString() },
            { id: 1200, name: 'Terraform Apply', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 85000000).toISOString() },
        ]
    };
    state.githubCommitsCache = {};
    state.githubCommitsCache[ghRepoWeb] = {
        count: 22, fetchedAt: new Date(Date.now() - 600000).toISOString(),
        commits: [
            { sha: 'f3a92b1', title: 'feat: implement SSR for landing page', author: 'J. Dupont', url: '#', created: new Date(Date.now() - 3600000 * 4).toISOString() },
            { sha: 'b7c4d0e', title: 'fix: hydration mismatch on dark mode', author: 'S. Martin', url: '#', created: new Date(Date.now() - 3600000 * 10).toISOString() },
            { sha: '1a2b3c4', title: 'test: add e2e tests for checkout flow', author: 'A. Noir', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
            { sha: '5d6e7f8', title: 'chore: bump dependencies', author: 'C. Blanc', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
            { sha: '9g0h1i2', title: 'feat: lazy load images with IntersectionObserver', author: 'J. Dupont', url: '#', created: new Date(Date.now() - 86400000 * 3).toISOString() },
        ]
    };
    state.githubCommitsCache[ghRepoApi] = {
        count: 15, fetchedAt: new Date(Date.now() - 500000).toISOString(),
        commits: [
            { sha: 'c8d9e0f', title: 'feat: WebSocket gateway implementation', author: 'J. Dupont', url: '#', created: new Date(Date.now() - 3600000 * 6).toISOString() },
            { sha: '2a3b4c5', title: 'fix: race condition in cache invalidation', author: 'S. Martin', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
            { sha: '6d7e8f9', title: 'perf: optimize N+1 queries on /users', author: 'A. Noir', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
        ]
    };
    state.githubCommitsCache[ghRepoOps] = {
        count: 5, fetchedAt: new Date(Date.now() - 400000).toISOString(),
        commits: [
            { sha: 'g0h1i2j', title: 'feat: add Datadog integration module', author: 'C. Blanc', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
            { sha: 'k3l4m5n', title: 'fix: terraform state lock timeout', author: 'S. Martin', url: '#', created: new Date(Date.now() - 86400000 * 5).toISOString() },
        ]
    };

    // Chart data demo
    state.chartData = {
        labels: (() => {
            const l = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                l.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
            }
            return l;
        })(),
        created: [5, 8, 3, 10, 6, 9, 4],
        completed: [4, 6, 2, 7, 5, 7, 3]
    };

    // ---- Démo 7 : Journal d'événements pré-rempli ----
    const logEntries = [
        [0.1, '🔴', 'Impact déclaré : prod-web-03 — Kernel panic (critical)'],
        [0.3, '🔧', 'Tâche démarrée : Restaurer prod-web-03 (P. Lefevre)'],
        [0.5, '🔴', 'Impact déclaré : OVH — Incident réseau DC GRA (major)'],
        [1, '🦊', 'MR GitLab rafraîchies (4 repos, 14 MR ouvertes)'],
        [2, '⚠️', 'Impact déclaré : CI/CD pipeline bloqué (warning)'],
        [3, '🔧', 'Tâche démarrée : Nettoyer le disque ci-runner-01 (K. Petit)'],
        [4, '✅', 'Impact résolu : ELK heap pressure — indexation ralentie'],
        [5, '📡', 'Sync Prometheus Prod — 14 machines mises à jour'],
        [6, '✅', 'Tâche terminée : Installer ci-runner-02 (P. Lefevre)'],
        [8, '🔧', 'Tâche démarrée : Patcher ELK vers 8.12 (A. Bernard)'],
        [10, '✅', 'Tâche terminée : Migrer DNS vers CoreDNS (M. Robert)'],
        [12, '📡', 'Sync Zabbix DC1 — 30 hosts vérifiés'],
        [18, '✅', 'Impact résolu : Cloudflare — Dégradation CDN Europe'],
        [24, '✅', 'Tâche terminée : Déployer MinIO cluster mode (L. Martin)'],
        [30, '✅', 'Tâche terminée : Résoudre CVE-2024-32002 Git (K. Petit)'],
        [48, '✅', 'Tâche terminée : Audit sécurité réseau Q4 (A. Bernard)'],
    ];
    state.log = logEntries.map(([hoursAgo, icon, msg]) => ({
        time: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        icon,
        msg
    }));

    // ---- Démo 8 : Consul ----
    const csEpId = uid();
    state.consulEndpoints = [{ id: csEpId, name: 'DC Paris', url: 'https://consul.example.com', token: '' }];
    state.consulCache = {};
    state.consulCache[csEpId] = {
        servicesTotal: 12, servicesHealthy: 9, nodesTotal: 8,
        checksTotal: 36, checksPassing: 28, checksCritical: 5, checksWarning: 3,
        services: [
            { name: 'api-gateway', healthy: true, status: 'passing', checks: 3 },
            { name: 'auth-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'user-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'payment-service', healthy: false, status: 'critical', checks: 3 },
            { name: 'notification-service', healthy: false, status: 'warning', checks: 3 },
            { name: 'search-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'cache-redis', healthy: true, status: 'passing', checks: 3 },
            { name: 'db-postgres', healthy: false, status: 'critical', checks: 3 },
            { name: 'queue-rabbitmq', healthy: true, status: 'passing', checks: 3 },
            { name: 'monitoring-agent', healthy: true, status: 'passing', checks: 3 },
            { name: 'log-collector', healthy: true, status: 'passing', checks: 3 },
            { name: 'cdn-proxy', healthy: true, status: 'passing', checks: 3 }
        ],
        nodeDetails: [
            { name: 'node-paris-01', address: '10.0.1.10' },
            { name: 'node-paris-02', address: '10.0.1.11' },
            { name: 'node-paris-03', address: '10.0.1.12' },
            { name: 'node-paris-04', address: '10.0.1.13' },
            { name: 'node-paris-05', address: '10.0.2.10' },
            { name: 'node-paris-06', address: '10.0.2.11' },
            { name: 'node-paris-07', address: '10.0.2.12' },
            { name: 'node-paris-08', address: '10.0.3.10' }
        ],
        checkDetails: [
            { service: 'payment-service', name: 'HTTP check', status: 'critical', output: 'Connection refused', node: 'node-paris-03' },
            { service: 'payment-service', name: 'TCP check', status: 'critical', output: 'Port 8443 unreachable', node: 'node-paris-03' },
            { service: 'db-postgres', name: 'TCP check', status: 'critical', output: 'Connection timeout after 10s', node: 'node-paris-05' },
            { service: 'db-postgres', name: 'Script check', status: 'critical', output: 'Replication lag > 30s', node: 'node-paris-05' },
            { service: 'db-postgres', name: 'Memory check', status: 'critical', output: 'OOM risk: 96% used', node: 'node-paris-05' },
            { service: 'notification-service', name: 'HTTP check', status: 'warning', output: 'Response time > 2s', node: 'node-paris-04' },
            { service: 'notification-service', name: 'Queue depth', status: 'warning', output: '1523 messages pending', node: 'node-paris-04' },
            { service: 'notification-service', name: 'Memory check', status: 'warning', output: '82% memory used', node: 'node-paris-04' }
        ],
        fetchedAt: new Date(Date.now() - 300000).toISOString()
    };

    // ---- Démo 9 : Ansible ----
    const anEpId = uid();
    state.ansibleEndpoints = [{ id: anEpId, name: 'AWX Prod', url: 'https://awx.example.com', token: '' }];
    state.ansibleCache = {};
    state.ansibleCache[anEpId] = {
        totalJobs: 47, successful: 38, failed: 6, running: 3,
        recentJobs: [
            { id: 301, name: 'deploy-frontend-prod', status: 'failed', finished: new Date(Date.now() - 1800000).toISOString(), playbook: 'deploy.yml' },
            { id: 300, name: 'update-ssl-certs', status: 'successful', finished: new Date(Date.now() - 3600000).toISOString(), playbook: 'ssl.yml' },
            { id: 299, name: 'patch-security-updates', status: 'running', finished: null, playbook: 'patching.yml' },
            { id: 298, name: 'backup-databases', status: 'successful', finished: new Date(Date.now() - 7200000).toISOString(), playbook: 'backup.yml' },
            { id: 297, name: 'deploy-backend-prod', status: 'successful', finished: new Date(Date.now() - 10800000).toISOString(), playbook: 'deploy.yml' },
            { id: 296, name: 'rotate-logs', status: 'successful', finished: new Date(Date.now() - 14400000).toISOString(), playbook: 'maintenance.yml' },
            { id: 295, name: 'deploy-frontend-preprod', status: 'failed', finished: new Date(Date.now() - 18000000).toISOString(), playbook: 'deploy.yml' },
            { id: 294, name: 'healthcheck-all', status: 'successful', finished: new Date(Date.now() - 21600000).toISOString(), playbook: 'healthcheck.yml' },
        ],
        fetchedAt: new Date(Date.now() - 600000).toISOString()
    };

    // ---- Démo 10 : OpenStack ----
    const osEpId = uid();
    state.openstackEndpoints = [{ id: osEpId, name: 'Cloud Prod', url: 'https://openstack.example.com:5000', project: 'ops-team', token: '' }];
    state.openstackCache = {};
    state.openstackCache[osEpId] = {
        instances: 18, instancesActive: 14, instancesError: 2, instancesStopped: 2,
        volumes: 24, volumesInUse: 20, volumesAvailable: 4,
        recentServers: [
            { name: 'web-front-01', status: 'ACTIVE', id: 'a1' },
            { name: 'web-front-02', status: 'ACTIVE', id: 'a2' },
            { name: 'api-gateway-01', status: 'ACTIVE', id: 'a3' },
            { name: 'db-primary', status: 'ACTIVE', id: 'a4' },
            { name: 'db-replica', status: 'ACTIVE', id: 'a5' },
            { name: 'worker-batch-01', status: 'ERROR', id: 'a6' },
            { name: 'worker-batch-02', status: 'ERROR', id: 'a7' },
            { name: 'cache-redis', status: 'ACTIVE', id: 'a8' },
            { name: 'monitoring', status: 'ACTIVE', id: 'a9' },
            { name: 'staging-web', status: 'SHUTOFF', id: 'a10' },
        ],
        fetchedAt: new Date(Date.now() - 180000).toISOString()
    };

    // ---- Rate Limiting : scénario INCIDENT (brute force + DDoS) ----
    state.rateLimitEvents = [];
    const now = Date.now();
    const rlIncident = [
        // Brute force : une IP unique sur /api/auth, haute fréquence, bloquée
        { ip: '185.220.101.47', endpoint: '/api/auth/login',      reqCount: 450, windowSec: 60, blocked: true,  note: 'Tor exit node — WAF rule #12 déclenché' },
        { ip: '185.220.101.47', endpoint: '/api/auth/login',      reqCount: 390, windowSec: 60, blocked: true,  note: 'Même source, retry après blocage' },
        { ip: '185.220.101.47', endpoint: '/api/auth/password',   reqCount: 280, windowSec: 60, blocked: true,  note: 'Rotation endpoint' },
        { ip: '185.220.101.47', endpoint: '/api/auth/login',      reqCount: 210, windowSec: 60, blocked: true,  note: '' },
        { ip: '185.220.101.47', endpoint: '/api/auth/login',      reqCount: 175, windowSec: 60, blocked: false, note: 'Détecté avant blocage WAF' },
        // DDoS distribué : ~30 IPs sur /api/search
        { ip: '91.108.4.55',    endpoint: '/api/search',          reqCount: 340, windowSec: 60, blocked: true,  note: 'DDoS — vague 1' },
        { ip: '91.108.4.56',    endpoint: '/api/search',          reqCount: 320, windowSec: 60, blocked: true,  note: 'DDoS — vague 1' },
        { ip: '91.108.4.57',    endpoint: '/api/search',          reqCount: 290, windowSec: 60, blocked: true,  note: 'DDoS — vague 1' },
        { ip: '91.108.4.58',    endpoint: '/api/search',          reqCount: 310, windowSec: 60, blocked: true,  note: 'DDoS — vague 1' },
        { ip: '45.155.205.10',  endpoint: '/api/search',          reqCount: 260, windowSec: 60, blocked: true,  note: 'DDoS — vague 2' },
        { ip: '45.155.205.11',  endpoint: '/api/search',          reqCount: 245, windowSec: 60, blocked: true,  note: 'DDoS — vague 2' },
        { ip: '45.155.205.12',  endpoint: '/api/search',          reqCount: 280, windowSec: 60, blocked: true,  note: 'DDoS — vague 2' },
        { ip: '45.155.205.13',  endpoint: '/api/search',          reqCount: 190, windowSec: 60, blocked: false, note: 'Non bloqué — sous seuil auto' },
        { ip: '198.54.117.200', endpoint: '/api/search',          reqCount: 220, windowSec: 60, blocked: true,  note: '' },
        { ip: '198.54.117.201', endpoint: '/api/search',          reqCount: 200, windowSec: 60, blocked: true,  note: '' },
        { ip: '185.130.5.90',   endpoint: '/api/search',          reqCount: 230, windowSec: 60, blocked: true,  note: 'DDoS — vague 3' },
        { ip: '185.130.5.91',   endpoint: '/api/search',          reqCount: 210, windowSec: 60, blocked: true,  note: 'DDoS — vague 3' },
        { ip: '185.130.5.92',   endpoint: '/api/search',          reqCount: 180, windowSec: 60, blocked: false, note: '' },
        // Scan / énumération : une IP parcourant des endpoints
        { ip: '104.21.55.200',  endpoint: '/api/users/1',         reqCount: 80,  windowSec: 60, blocked: false, note: 'Scan OWASP ZAP détecté' },
        { ip: '104.21.55.200',  endpoint: '/api/users/2',         reqCount: 75,  windowSec: 60, blocked: false, note: '' },
        { ip: '104.21.55.200',  endpoint: '/api/admin',           reqCount: 70,  windowSec: 60, blocked: true,  note: 'Tentative accès admin' },
        { ip: '104.21.55.200',  endpoint: '/api/config',          reqCount: 65,  windowSec: 60, blocked: true,  note: '' },
        { ip: '104.21.55.200',  endpoint: '/.env',                reqCount: 55,  windowSec: 60, blocked: true,  note: 'Scan fichiers sensibles' },
        { ip: '104.21.55.200',  endpoint: '/api/debug',           reqCount: 60,  windowSec: 60, blocked: true,  note: '' },
        { ip: '104.21.55.200',  endpoint: '/metrics',             reqCount: 45,  windowSec: 60, blocked: true,  note: '' },
    ];
    // Timestamps étalés sur les 90 dernières minutes
    rlIncident.forEach((e, i) => {
        state.rateLimitEvents.push({
            id: uid(),
            ts: new Date(now - (rlIncident.length - i) * 210000 + Math.random() * 60000).toISOString(),
            ip: e.ip, endpoint: e.endpoint,
            reqCount: e.reqCount, windowSec: e.windowSec,
            blocked: e.blocked, note: e.note
        });
    });

    // ---- Prometheus : 4 targets down, 5 alertes ----
    const promEpIdI = uid();
    state.prometheusEndpoints = [{ id: promEpIdI, name: 'Prometheus Prod', url: 'https://prometheus.example.com', token: '' }];
    state.prometheusCache = { [promEpIdI]: DEMO_PROMETHEUS_INCIDENT() };

    // ---- Loki : down, spike d'erreurs ----
    const lokiEpIdI = uid();
    state.lokiEndpoints = [{ id: lokiEpIdI, name: 'Loki Prod', url: 'https://loki.example.com', token: '' }];
    state.lokiCache = { [lokiEpIdI]: DEMO_LOKI_INCIDENT() };

    // ---- Tempo : 26% erreur, P95 1240ms ----
    const tempoEpIdI = uid();
    state.tempoEndpoints = [{ id: tempoEpIdI, name: 'Tempo Prod', url: 'https://tempo.example.com', token: '' }];
    state.tempoCache = { [tempoEpIdI]: DEMO_TEMPO_INCIDENT() };

    addLog('🧪', 'Scénario INCIDENT chargé (30 machines, 20 tâches, 12 impacts, 4 repos GitLab, 3 repos GitHub, Consul, Ansible, OpenStack, Rate Limiting, Prometheus, Loki, Tempo)');
    saveState();
    renderAll();
    applyDashboardSettings();
    toast('🔴 Scénario incident chargé');
}

function loadDemoGreen() {
    closeDemoMenuOnClick();
    if (state.infra.length > 0 || state.tasks.length > 0 || state.impacts.length > 0) {
        if (!confirm('⚠️ Cela remplacera toutes vos données actuelles.\nContinuer ?')) return;
    }

    state.impacts = [];
    state.tasks = [];
    state.infra = [];
    state.log = [];
    state.importSources = [];
    state.gitlabRepos = [];
    state.gitlabMRCache = {};
    state.gitlabPipelinesCache = {};
    state.gitlabCommitsCache = {};
    state.githubRepos = [];
    state.githubPRCache = {};
    state.githubActionsCache = {};
    state.githubCommitsCache = {};
    state.dashboardSettings = {};
    if (state.trafficLight) state.trafficLight.history = [];

    // ---- Infra : tout UP ----
    const greenInfra = [
        { name: 'prod-web-01', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.10', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'prod-web-02', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.11', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'prod-web-03', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.12', details: 'nginx 1.24, node 18.x, pm2' },
        { name: 'prod-db-master', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.10', details: 'PostgreSQL 16, pgbouncer, barman' },
        { name: 'prod-db-replica', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.11', details: 'PostgreSQL 16 replica — lag 0.2s' },
        { name: 'redis-cluster-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.20', details: 'Redis 7.2 cluster mode' },
        { name: 'redis-cluster-02', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.2.21', details: 'Redis 7.2 cluster mode' },
        { name: 'elk-stack', type: 'stack', env: 'prod', status: 'up', ip: '10.0.3.10', details: 'Elasticsearch 8.12, Logstash, Kibana — heap 45%' },
        { name: 'haproxy-01', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.1', details: 'HAProxy 2.8, keepalived VIP' },
        { name: 'haproxy-02', type: 'vm', env: 'prod', status: 'up', ip: '10.0.1.2', details: 'HAProxy 2.8, keepalived backup' },
        { name: 'vault-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.6.10', details: 'HashiCorp Vault 1.15, auto-unseal' },
        { name: 'prod-mq-01', type: 'lxc', env: 'prod', status: 'up', ip: '10.0.7.10', details: 'RabbitMQ 3.13, cluster 3 nœuds' },
        { name: 'preprod-web-01', type: 'vm', env: 'preprod', status: 'up', ip: '10.1.1.10', details: 'nginx 1.24, node 20.x' },
        { name: 'preprod-db-01', type: 'lxc', env: 'preprod', status: 'up', ip: '10.1.2.10', details: 'PostgreSQL 16' },
        { name: 'preprod-redis-01', type: 'lxc', env: 'preprod', status: 'up', ip: '10.1.2.20', details: 'Redis 7.2 standalone' },
        { name: 'dev-api-01', type: 'vm', env: 'dev', status: 'up', ip: '10.2.1.10', details: 'Node 20.x, Express' },
        { name: 'dev-db-01', type: 'lxc', env: 'dev', status: 'up', ip: '10.2.2.10', details: 'PostgreSQL 16, seed data' },
        { name: 'ci-runner-01', type: 'vm', env: 'dev', status: 'up', ip: '10.0.4.10', details: 'GitLab Runner, Docker — disk 42%' },
        { name: 'ci-runner-02', type: 'vm', env: 'dev', status: 'up', ip: '10.0.4.11', details: 'GitLab Runner, Docker, Kaniko' },
        { name: 'monitoring-01', type: 'stack', env: '', status: 'up', ip: '10.0.3.30', details: 'Prometheus, Grafana, Alertmanager' },
    ];
    greenInfra.forEach(d => {
        state.infra.push({ id: uid(), ...d, added: new Date().toISOString() });
    });

    // ---- Tâches : majorité done, quelques wip, 1-2 todo low ----
    const greenTasks = [
        { title: 'Documenter procédure PRA', desc: 'Mise à jour annuelle du plan de reprise', tags: ['doc', 'pra'], priority: 'low', status: 'todo', assignee: 'L. Martin', envs: ['prod'] },
        { title: 'Planifier upgrade Redis 7.4', desc: 'Nouvelle version stable dispo, planifier pour Q2', tags: ['redis', 'upgrade'], priority: 'low', status: 'todo', assignee: 'S. Durand', envs: ['prod'] },
        { title: 'Optimiser requêtes API lentes', desc: 'P95 < 200ms, quelques endpoints à > 350ms', tags: ['perf', 'api'], priority: 'medium', status: 'wip', assignee: 'K. Petit', envs: ['prod', 'preprod'] },
        { title: 'Ajouter dashboard SLA client', desc: 'Nouveau panneau Grafana pour les SLA contractuels', tags: ['monitoring', 'grafana'], priority: 'medium', status: 'wip', assignee: 'M. Robert', envs: ['prod'] },
        { title: 'Migrer PostgreSQL 15 → 16', desc: 'Migration effectuée samedi 03h-06h sans incident', tags: ['postgres', 'migration'], priority: 'high', status: 'done', assignee: 'L. Martin', envs: ['prod'] },
        { title: 'Renouveler certificats TLS', desc: 'Certificats renouvelés et déployés sur tous les endpoints', tags: ['tls', 'security'], priority: 'critical', status: 'done', assignee: 'A. Bernard', envs: ['prod', 'preprod'] },
        { title: 'Patcher ELK vers 8.12', desc: 'CVE corrigée, heap optimisé à 45%', tags: ['elk', 'security'], priority: 'medium', status: 'done', assignee: 'A. Bernard', envs: ['prod'] },
        { title: 'Automatiser rotation secrets Vault', desc: 'Rotation JWT/DB creds toutes les 24h via vault agent', tags: ['vault', 'security'], priority: 'high', status: 'done', assignee: 'S. Durand', envs: ['prod', 'preprod'] },
        { title: 'Résoudre CVE-2024-32002 Git', desc: 'Git patché sur tous les runners CI', tags: ['security', 'ci'], priority: 'critical', status: 'done', assignee: 'K. Petit', envs: ['dev'] },
        { title: 'Déployer HAProxy config v2', desc: 'Backends API v3 + health checks OK', tags: ['haproxy', 'deploy'], priority: 'low', status: 'done', assignee: 'K. Petit', envs: ['prod'] },
        { title: 'Configurer alertes Grafana', desc: 'Seuils CPU/RAM/disk sur toutes les machines prod', tags: ['monitoring', 'alerting'], priority: 'medium', status: 'done', assignee: 'M. Robert', envs: ['prod'] },
        { title: 'Audit sécurité réseau Q4', desc: 'Scan Nessus OK, 0 vulnérabilités critiques', tags: ['security', 'audit'], priority: 'medium', status: 'done', assignee: 'A. Bernard', envs: ['prod', 'preprod', 'dev'] },
        { title: 'Mettre en place Trivy sur CI', desc: 'Scanner Docker actif, 0 CVE critique', tags: ['security', 'ci', 'docker'], priority: 'high', status: 'done', assignee: 'P. Lefevre', envs: ['dev'] },
        { title: 'Upgrade RabbitMQ 3.13', desc: 'Upgrade effectué, queues nominales', tags: ['rabbitmq', 'upgrade'], priority: 'medium', status: 'done', assignee: 'M. Robert', envs: ['preprod', 'prod'] },
    ];
    greenTasks.forEach(d => {
        state.tasks.push({ id: uid(), title: d.title, desc: d.desc, assignee: d.assignee || '', tags: d.tags, priority: d.priority, status: d.status, envs: d.envs || [], created: new Date().toISOString() });
    });

    // ---- Impacts : que des résolus ----
    const greenImpacts = [
        { title: 'Cloudflare — Dégradation CDN Europe', severity: 'major', origin: 'external', desc: 'Résolu par Cloudflare en 45min.', active: false, time: new Date(Date.now() - 86400000 * 3 - 2700000).toISOString(), resolvedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { title: 'ELK heap pressure — indexation ralentie', severity: 'warning', origin: 'internal', desc: 'Heap optimisé après patch 8.12.', active: false, time: new Date(Date.now() - 86400000 * 5 - 7200000).toISOString(), resolvedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
        { title: 'OVH — Maintenance réseau DC GRA', severity: 'warning', origin: 'external', desc: 'Maintenance planifiée terminée sans impact.', active: false, time: new Date(Date.now() - 86400000 * 8 - 5400000).toISOString(), resolvedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
    ];
    greenImpacts.forEach(d => {
        state.impacts.push({ id: uid(), ...d, created: new Date(Date.now() - 86400000 * 10).toISOString() });
    });

    // ---- Traffic Light : 30j stable, quasi tout vert ----
    const tlHistory = [];
    const tlGreenScenario = [
        [29, 'green',  91, 'Situation nominale'],
        [28, 'green',  93, 'Déploiement frontend OK'],
        [27, 'green',  90, 'Routine — backup quotidien'],
        [26, 'green',  94, 'Certificats TLS renouvelés'],
        [25, 'yellow', 72, '1 machine degraded (ELK heap 88%)'],
        [24, 'green',  89, 'Retour nominal — GC tuning appliqué'],
        [23, 'green',  92, 'Maintenance préventive Redis'],
        [22, 'green',  95, 'Toute infra nominale'],
        [21, 'green',  93, 'Rotation secrets Vault OK'],
        [20, 'green',  91, 'Déploiement backend v2.6'],
        [19, 'green',  90, 'Audit sécurité OK — 0 CVE'],
        [18, 'green',  94, 'Situation nominale'],
        [17, 'green',  92, 'Upgrade RabbitMQ 3.13'],
        [16, 'green',  93, 'Migration PostgreSQL 15→16 OK'],
        [15, 'green',  95, 'Situation nominale'],
        [14, 'yellow', 74, 'Impact warning Cloudflare — dégradation CDN'],
        [13, 'green',  88, 'CDN rétabli par Cloudflare'],
        [12, 'green',  91, 'Situation nominale'],
        [11, 'green',  93, 'Scan Trivy CI — 0 vulnérabilité'],
        [10, 'green',  94, 'Situation nominale'],
        [9,  'green',  92, 'Alertes Grafana configurées'],
        [8,  'green',  95, 'Situation nominale'],
        [7,  'green',  93, 'Déploiement HAProxy config v2'],
        [6,  'green',  91, 'Routine ops'],
        [5,  'green',  94, 'Situation nominale'],
        [4,  'green',  92, 'Optimisation requêtes API'],
        [3,  'green',  95, 'Toute infra nominale'],
        [2,  'green',  93, 'Situation nominale'],
        [1,  'green',  94, 'Routine — monitoring stable'],
        [0,  'green',  95, 'Situation nominale'],
    ];
    tlGreenScenario.forEach(([daysAgo, color, score, trigger]) => {
        const time = new Date(Date.now() - daysAgo * 86400000 + 36000000);
        tlHistory.push({ time: time.toISOString(), color, score, trigger });
    });
    if (!state.trafficLight) state.trafficLight = { ...DEFAULT_STATE.trafficLight };
    state.trafficLight.history = tlHistory;

    // ---- Import sources ----
    state.importSources = [
        { id: uid(), name: 'Prometheus Prod', format: 'prometheus', url: 'https://prometheus.internal/api/v1/targets', enabled: true, lastSync: new Date(Date.now() - 1800000).toISOString() },
        { id: uid(), name: 'Zabbix DC1', format: 'zabbix', url: 'https://zabbix.internal/api_jsonrpc.php', enabled: true, lastSync: new Date(Date.now() - 3600000).toISOString() },
    ];

    // ---- GitLab : 2 MR seulement (nominal) ----
    const glId1 = uid(), glId2 = uid();
    state.gitlabRepos = [
        { id: glId1, name: 'frontend', url: 'https://gitlab.example.com', projectId: '142', branch: 'main', token: '' },
        { id: glId2, name: 'backend-api', url: 'https://gitlab.example.com', projectId: '143', branch: 'main', token: '' },
    ];
    state.gitlabMRCache = {};
    state.gitlabMRCache[glId1] = {
        count: 1, fetchedAt: new Date().toISOString(),
        mrs: [{ id: 315, title: 'feat: add accessibility improvements', author: 'S. Durand', url: '#', created: new Date(Date.now() - 3600000).toISOString(), labels: ['feature', 'a11y'], draft: false }]
    };
    state.gitlabMRCache[glId2] = {
        count: 1, fetchedAt: new Date().toISOString(),
        mrs: [{ id: 592, title: 'feat: add OpenTelemetry tracing', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 7200000).toISOString(), labels: ['feature', 'observability'], draft: false }]
    };

    // ---- GitLab Pipelines : tout vert ----
    state.gitlabPipelinesCache = {};
    state.gitlabPipelinesCache[glId1] = {
        total: 8, success: 8, failed: 0, running: 0, other: 0,
        fetchedAt: new Date().toISOString(),
        pipelines: [
            { id: 4550, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 1800000).toISOString(), updated: new Date(Date.now() - 1200000).toISOString() },
            { id: 4549, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 6600000).toISOString() },
            { id: 4548, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 14400000).toISOString(), updated: new Date(Date.now() - 14000000).toISOString() },
        ]
    };
    state.gitlabPipelinesCache[glId2] = {
        total: 6, success: 6, failed: 0, running: 0, other: 0,
        fetchedAt: new Date().toISOString(),
        pipelines: [
            { id: 8920, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 3000000).toISOString() },
            { id: 8919, status: 'success', ref: 'main', url: '#', created: new Date(Date.now() - 10800000).toISOString(), updated: new Date(Date.now() - 10200000).toISOString() },
        ]
    };

    // ---- GitLab Commits : activité normale ----
    state.gitlabCommitsCache = {};
    state.gitlabCommitsCache[glId1] = {
        count: 8, fetchedAt: new Date().toISOString(),
        commits: [
            { id: 'f1e2d3c', title: 'feat: add accessibility improvements', author: 'S. Durand', url: '#', created: new Date(Date.now() - 3600000).toISOString() },
            { id: 'b4a5c6d', title: 'test: add unit tests for a11y utils', author: 'K. Petit', url: '#', created: new Date(Date.now() - 7200000).toISOString() },
            { id: '7e8f9g0', title: 'chore: update package-lock.json', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
        ]
    };
    state.gitlabCommitsCache[glId2] = {
        count: 5, fetchedAt: new Date().toISOString(),
        commits: [
            { id: 'h1i2j3k', title: 'feat: add OpenTelemetry tracing', author: 'P. Lefevre', url: '#', created: new Date(Date.now() - 7200000).toISOString() },
            { id: 'l4m5n6o', title: 'docs: update API documentation', author: 'L. Martin', url: '#', created: new Date(Date.now() - 86400000 * 2).toISOString() },
        ]
    };

    // ---- GitHub : 2 repos, tout vert ----
    const ghId1 = uid(), ghId2 = uid();
    state.githubRepos = [
        { id: ghId1, name: 'web-platform', url: 'https://api.github.com', owner: 'acme-corp', repo: 'web-platform', branch: 'main', token: '' },
        { id: ghId2, name: 'api-gateway', url: 'https://api.github.com', owner: 'acme-corp', repo: 'api-gateway', branch: 'main', token: '' },
    ];
    state.githubPRCache = {};
    state.githubPRCache[ghId1] = {
        count: 1, fetchedAt: new Date().toISOString(),
        prs: [{ number: 290, title: 'feat: performance monitoring dashboard', author: 'j-dupont', url: '#', created: new Date(Date.now() - 3600000).toISOString(), labels: ['feature'], draft: false }]
    };
    state.githubPRCache[ghId2] = {
        count: 1, fetchedAt: new Date().toISOString(),
        prs: [{ number: 160, title: 'feat: add health check endpoint /readyz', author: 'a-noir', url: '#', created: new Date(Date.now() - 7200000).toISOString(), labels: ['feature', 'observability'], draft: false }]
    };
    state.githubActionsCache = {};
    state.githubActionsCache[ghId1] = {
        total: 10, success: 10, failed: 0, running: 0, other: 0,
        fetchedAt: new Date().toISOString(),
        runs: [
            { id: 9020, name: 'CI / Build & Test', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 1800000).toISOString(), updated: new Date(Date.now() - 1200000).toISOString() },
            { id: 9019, name: 'Deploy Production', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 6600000).toISOString() },
            { id: 9018, name: 'CI / Build & Test', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 14400000).toISOString(), updated: new Date(Date.now() - 14000000).toISOString() },
        ]
    };
    state.githubActionsCache[ghId2] = {
        total: 8, success: 8, failed: 0, running: 0, other: 0,
        fetchedAt: new Date().toISOString(),
        runs: [
            { id: 5510, name: 'CI Pipeline', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 3000000).toISOString() },
            { id: 5509, name: 'Deploy Staging', status: 'completed', conclusion: 'success', url: '#', created: new Date(Date.now() - 10800000).toISOString(), updated: new Date(Date.now() - 10200000).toISOString() },
        ]
    };
    state.githubCommitsCache = {};
    state.githubCommitsCache[ghId1] = {
        count: 10, fetchedAt: new Date().toISOString(),
        commits: [
            { sha: 'abc1234', title: 'feat: performance monitoring dashboard', author: 'J. Dupont', url: '#', created: new Date(Date.now() - 3600000).toISOString() },
            { sha: 'def5678', title: 'test: add e2e tests for monitoring', author: 'S. Martin', url: '#', created: new Date(Date.now() - 7200000).toISOString() },
            { sha: 'ghi9012', title: 'chore: update CI config', author: 'C. Blanc', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
        ]
    };
    state.githubCommitsCache[ghId2] = {
        count: 6, fetchedAt: new Date().toISOString(),
        commits: [
            { sha: 'jkl3456', title: 'feat: add health check /readyz', author: 'A. Noir', url: '#', created: new Date(Date.now() - 7200000).toISOString() },
            { sha: 'mno7890', title: 'docs: update OpenAPI spec', author: 'J. Dupont', url: '#', created: new Date(Date.now() - 86400000).toISOString() },
        ]
    };

    // ---- Chart data : productif ----
    state.chartData = {
        labels: (() => {
            const l = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                l.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
            }
            return l;
        })(),
        created: [3, 4, 2, 5, 3, 4, 2],
        completed: [4, 5, 3, 6, 4, 5, 3]
    };

    // ---- Log ----
    state.log = [
        { time: new Date(Date.now() - 3600000 * 1).toISOString(), icon: '✅', msg: 'Tâche terminée : Upgrade RabbitMQ 3.13 (M. Robert)' },
        { time: new Date(Date.now() - 3600000 * 4).toISOString(), icon: '📡', msg: 'Sync Prometheus Prod — 20 machines, 100% up' },
        { time: new Date(Date.now() - 3600000 * 8).toISOString(), icon: '✅', msg: 'Tâche terminée : Audit sécurité réseau Q4 (A. Bernard)' },
        { time: new Date(Date.now() - 3600000 * 12).toISOString(), icon: '🦊', msg: 'MR GitLab rafraîchies (2 repos, 2 MR ouvertes)' },
        { time: new Date(Date.now() - 3600000 * 24).toISOString(), icon: '✅', msg: 'Tâche terminée : Migrer PostgreSQL 15 → 16 (L. Martin)' },
        { time: new Date(Date.now() - 3600000 * 36).toISOString(), icon: '🚦', msg: 'Traffic Light → VERT: Situation nominale' },
    ];

    // ---- Consul : tout healthy ----
    const csEpId = uid();
    state.consulEndpoints = [{ id: csEpId, name: 'DC Paris', url: 'https://consul.example.com', token: '' }];
    state.consulCache = {};
    state.consulCache[csEpId] = {
        servicesTotal: 12, servicesHealthy: 12, nodesTotal: 8,
        checksTotal: 36, checksPassing: 36, checksCritical: 0, checksWarning: 0,
        services: [
            { name: 'api-gateway', healthy: true, status: 'passing', checks: 3 },
            { name: 'auth-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'user-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'payment-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'notification-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'search-service', healthy: true, status: 'passing', checks: 3 },
            { name: 'cache-redis', healthy: true, status: 'passing', checks: 3 },
            { name: 'db-postgres', healthy: true, status: 'passing', checks: 3 },
            { name: 'queue-rabbitmq', healthy: true, status: 'passing', checks: 3 },
            { name: 'monitoring-agent', healthy: true, status: 'passing', checks: 3 },
            { name: 'log-collector', healthy: true, status: 'passing', checks: 3 },
            { name: 'cdn-proxy', healthy: true, status: 'passing', checks: 3 }
        ],
        nodeDetails: [
            { name: 'node-paris-01', address: '10.0.1.10' },
            { name: 'node-paris-02', address: '10.0.1.11' },
            { name: 'node-paris-03', address: '10.0.1.12' },
            { name: 'node-paris-04', address: '10.0.1.13' },
            { name: 'node-paris-05', address: '10.0.2.10' },
            { name: 'node-paris-06', address: '10.0.2.11' },
            { name: 'node-paris-07', address: '10.0.2.12' },
            { name: 'node-paris-08', address: '10.0.3.10' }
        ],
        checkDetails: [],
        fetchedAt: new Date(Date.now() - 300000).toISOString()
    };

    // ---- Ansible : tout ok ----
    const anEpId = uid();
    state.ansibleEndpoints = [{ id: anEpId, name: 'AWX Prod', url: 'https://awx.example.com', token: '' }];
    state.ansibleCache = {};
    state.ansibleCache[anEpId] = {
        totalJobs: 52, successful: 52, failed: 0, running: 0,
        recentJobs: [
            { id: 310, name: 'deploy-frontend-prod', status: 'successful', finished: new Date(Date.now() - 1800000).toISOString(), playbook: 'deploy.yml' },
            { id: 309, name: 'update-ssl-certs', status: 'successful', finished: new Date(Date.now() - 3600000).toISOString(), playbook: 'ssl.yml' },
            { id: 308, name: 'patch-security-updates', status: 'successful', finished: new Date(Date.now() - 7200000).toISOString(), playbook: 'patching.yml' },
            { id: 307, name: 'backup-databases', status: 'successful', finished: new Date(Date.now() - 10800000).toISOString(), playbook: 'backup.yml' },
            { id: 306, name: 'deploy-backend-prod', status: 'successful', finished: new Date(Date.now() - 14400000).toISOString(), playbook: 'deploy.yml' },
            { id: 305, name: 'rotate-logs', status: 'successful', finished: new Date(Date.now() - 18000000).toISOString(), playbook: 'maintenance.yml' },
        ],
        fetchedAt: new Date(Date.now() - 600000).toISOString()
    };

    // ---- OpenStack : tout actif ----
    const osEpId = uid();
    state.openstackEndpoints = [{ id: osEpId, name: 'Cloud Prod', url: 'https://openstack.example.com:5000', project: 'ops-team', token: '' }];
    state.openstackCache = {};
    state.openstackCache[osEpId] = {
        instances: 16, instancesActive: 16, instancesError: 0, instancesStopped: 0,
        volumes: 22, volumesInUse: 20, volumesAvailable: 2,
        recentServers: [
            { name: 'web-front-01', status: 'ACTIVE', id: 'a1' },
            { name: 'web-front-02', status: 'ACTIVE', id: 'a2' },
            { name: 'api-gateway-01', status: 'ACTIVE', id: 'a3' },
            { name: 'db-primary', status: 'ACTIVE', id: 'a4' },
            { name: 'db-replica', status: 'ACTIVE', id: 'a5' },
            { name: 'worker-batch-01', status: 'ACTIVE', id: 'a6' },
            { name: 'worker-batch-02', status: 'ACTIVE', id: 'a7' },
            { name: 'cache-redis', status: 'ACTIVE', id: 'a8' },
            { name: 'monitoring', status: 'ACTIVE', id: 'a9' },
            { name: 'ci-runner', status: 'ACTIVE', id: 'a10' },
        ],
        fetchedAt: new Date(Date.now() - 180000).toISOString()
    };

    // ---- Rate Limiting : scénario NOMINAL (bruit de fond faible) ----
    state.rateLimitEvents = [];
    const nowGreen = Date.now();
    const rlNominal = [
        { ip: '62.210.22.44',  endpoint: '/api/auth/login', reqCount: 65, windowSec: 60, blocked: true,  note: 'Tentative fail2ban déclenchée' },
        { ip: '51.159.50.100', endpoint: '/api/search',     reqCount: 55, windowSec: 60, blocked: false, note: 'Bot crawler — user-agent suspect' },
        { ip: '62.210.22.44',  endpoint: '/api/auth/login', reqCount: 48, windowSec: 60, blocked: true,  note: 'Retry après 10 min' },
        { ip: '176.31.5.150',  endpoint: '/api/data',       reqCount: 52, windowSec: 60, blocked: false, note: 'Monitoring externe — whitelist à envisager' },
    ];
    rlNominal.forEach((e, i) => {
        state.rateLimitEvents.push({
            id: uid(),
            ts: new Date(nowGreen - (rlNominal.length - i) * 900000).toISOString(),
            ip: e.ip, endpoint: e.endpoint,
            reqCount: e.reqCount, windowSec: e.windowSec,
            blocked: e.blocked, note: e.note
        });
    });

    // ---- Prometheus : 14/14 targets, 0 alerte ----
    const promEpIdG = uid();
    state.prometheusEndpoints = [{ id: promEpIdG, name: 'Prometheus Prod', url: 'https://prometheus.example.com', token: '' }];
    state.prometheusCache = { [promEpIdG]: DEMO_PROMETHEUS_NOMINAL() };

    // ---- Loki : 24 streams, 47 erreurs ----
    const lokiEpIdG = uid();
    state.lokiEndpoints = [{ id: lokiEpIdG, name: 'Loki Prod', url: 'https://loki.example.com', token: '' }];
    state.lokiCache = { [lokiEpIdG]: DEMO_LOKI_NOMINAL() };

    // ---- Tempo : 1 432 traces, 6.1% erreur ----
    const tempoEpIdG = uid();
    state.tempoEndpoints = [{ id: tempoEpIdG, name: 'Tempo Prod', url: 'https://tempo.example.com', token: '' }];
    state.tempoCache = { [tempoEpIdG]: DEMO_TEMPO_NOMINAL() };

    addLog('🧪', 'Scénario NOMINAL chargé (20 machines, 14 tâches, 0 impact actif, 2 repos GitLab, 2 repos GitHub, Consul, Ansible, OpenStack, Rate Limiting, Prometheus, Loki, Tempo)');
    saveState();
    renderAll();
    applyDashboardSettings();
    toast('🟢 Scénario nominal chargé — tout est vert !');
}

function loadDemoObservability() {
    closeDemoMenuOnClick();
    if (state.infra.length > 0 || state.tasks.length > 0 || state.impacts.length > 0) {
        if (!confirm('⚠️ Cela remplacera toutes vos données actuelles.\nContinuer ?')) return;
    }

    // Reset complet — seuls les 3 endpoints obs seront présents
    state.impacts = [];
    state.tasks = [];
    state.infra = [];
    state.importSources = [];
    state.gitlabRepos = [];
    state.gitlabMRCache = {};
    state.gitlabPipelinesCache = {};
    state.gitlabCommitsCache = {};
    state.githubRepos = [];
    state.githubPRCache = {};
    state.githubActionsCache = {};
    state.githubCommitsCache = {};
    state.consulEndpoints = [];
    state.consulCache = {};
    state.ansibleEndpoints = [];
    state.ansibleCache = {};
    state.openstackEndpoints = [];
    state.openstackCache = {};
    state.vaultEndpoints = [];
    state.vaultCache = {};
    state.grafanaEndpoints = [];
    state.grafanaCache = {};
    state.rateLimitEvents = [];
    state.chartData = null;

    // ---- Prometheus : 14/14 targets, 0 alerte ----
    const promEpId = uid();
    state.prometheusEndpoints = [{ id: promEpId, name: 'Prometheus Prod', url: 'https://prometheus.example.com', token: '' }];
    state.prometheusCache = { [promEpId]: DEMO_PROMETHEUS_NOMINAL() };

    // ---- Loki : 24 streams, 47 erreurs ----
    const lokiEpId = uid();
    state.lokiEndpoints = [{ id: lokiEpId, name: 'Loki Prod', url: 'https://loki.example.com', token: '' }];
    state.lokiCache = { [lokiEpId]: DEMO_LOKI_NOMINAL() };

    // ---- Tempo : 1 432 traces, 6.1% erreur ----
    const tempoEpId = uid();
    state.tempoEndpoints = [{ id: tempoEpId, name: 'Tempo Prod', url: 'https://tempo.example.com', token: '' }];
    state.tempoCache = { [tempoEpId]: DEMO_TEMPO_NOMINAL() };

    state.log = [
        { time: new Date(Date.now() - 60000).toISOString(),    icon: '📊', msg: 'Prometheus Prod — connexion OK (200)' },
        { time: new Date(Date.now() - 60000).toISOString(),    icon: '📋', msg: 'Loki Prod — connexion OK (200)' },
        { time: new Date(Date.now() - 60000).toISOString(),    icon: '🔍', msg: 'Tempo Prod — connexion OK (200)' },
    ];

    // Masquer tout ce qui n'est pas lié à la stack observabilité
    // metric-prometheus, metric-loki, metric-tempo restent visibles
    state.dashboardSettings = {
        // Kanban
        'metric-todo': false, 'metric-wip': false, 'metric-done': false, 'metric-completion': false,
        'section-kanban': false,
        // Infra
        'metric-infra': false, 'metric-uptime': false,
        'section-infra': false, 'chart-infrastatus': false,
        // Impacts
        'metric-impacts': false, 'metric-resolved': false, 'header-impacts': false,
        'section-history': false, 'chart-timeline': false,
        // GitLab / GitHub
        'metric-gitlab': false, 'metric-gitlab-pipelines': false, 'metric-gitlab-commits': false,
        'metric-github-pr': false, 'metric-github-actions': false, 'metric-github-commits': false,
        // SRE DORA
        'metric-mttr': false, 'metric-deploy-freq': false, 'metric-cfr': false,
        // Sécurité
        'metric-rate-limit': false, 'chart-rate-limit': false,
        // Consul / Ansible / OpenStack
        'metric-consul': false, 'metric-ansible': false, 'metric-openstack': false,
        'chart-ansible': false, 'chart-openstack': false,
        // Charts sans données
        'chart-activity': false, 'chart-priority': false,
        'chart-trafficlight': false, 'chart-pricing': false, 'chart-downtime': false,
        // metric-prometheus, metric-loki, metric-tempo : visibles (pas listés ici)
    };

    addLog('🧪', 'Scénario OBSERVABILITÉ chargé (Prometheus, Loki, Tempo)');
    saveState();
    renderAll();
    applyDashboardSettings();
    openApiConfig();
    toast('🔭 Stack observabilité chargée — 3 endpoints configurés');
}
