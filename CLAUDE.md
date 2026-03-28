# CLAUDE.md — OPS Command Center Dashboard

## Projet

Dashboard OPS mono-page (vanilla HTML/CSS/JS, pas de framework). Données persistées en `localStorage` sous la clé `ops_dashboard_v2`. Graphiques via Chart.js 4.4.7 (CDN).

**Langue de l'interface** : Français. Les messages, labels, toasts doivent rester en français.

## Architecture fichiers

Pas de build, pas de bundler, pas de dépendances npm. Ouvrir `index.html` dans un navigateur suffit.

Points d'entrée centralisés :
- `css/main.css` → `@import` de tous les fichiers CSS
- `js/main.js` → loader séquentiel de tous les fichiers JS

Organisation en 3 couches :
- **`core/`** — Fondations : utilitaires, état, thème, layout, reset
- **`components/`** — Logique métier : kanban, infra, impacts, metrics, charts, export…
- **`integrations/`** — Services externes : GitLab, GitHub, Consul, Ansible, OpenStack

### HTML

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure HTML, modals, sidebar settings (~1070 lignes) |

### CSS (`css/`)

| Fichier | Rôle |
|---------|------|
| `main.css` | Point d'entrée — `@import` de tous les fichiers ci-dessous |
| **`core/`** | |
| `core/variables.css` | CSS custom properties (dark/light themes) |
| `core/base.css` | Reset, layout, body, boutons, badges, loader, toast, scrollbar, log |
| `core/compact.css` | Compact mode overrides |
| `core/responsive.css` | Media queries (@media) + toolbar |
| **`components/`** | |
| `components/header.css` | Header, env indicators, privacy banner, prod alert, impacts ticker |
| `components/metrics.css` | Cartes métriques + modal détail métrique |
| `components/impacts.css` | Chips impacts, ticker, historique impacts |
| `components/tasks.css` | Kanban board, task cards, autocomplete, env chips |
| `components/infra.css` | Infra grid/rows, filtres infra, paste preview |
| `components/charts.css` | Charts grid, containers, légendes, pricing controls |
| `components/modals.css` | Modals génériques + export tabs + channels/communication |
| `components/traffic-light.css` | Widget Traffic Light + modal settings TL |
| `components/sidebar.css` | Sidebar settings + hide buttons + shortcuts overlay + channels |
| **`integrations/`** | |
| `integrations/integrations.css` | GitLab/GitHub metric/config/detail + API config modal |

### JS (`js/`)

| Fichier | Rôle | Fonctions clés |
|---------|------|----------------|
| `main.js` | Loader séquentiel — charge tous les modules dans l'ordre | — |
| **`core/`** | | |
| `core/config.js` | **Constantes globales non persistées** — tous les paramètres tunables (seuils, tailles, durées) | `DASHBOARD_CONFIG` |
| `core/utils.js` | Utilitaires purs + toast + modal helpers | `uid()`, `esc()`, `toast()`, `timeAgo()`, `openModal()`, `closeModal()` |
| `core/state.js` | Constantes, état global, persistance | `STORAGE_KEY`, `DEFAULT_STATE`, `DASHBOARD_ELEMENTS`, `loadState()`, `saveState()` |
| `core/core.js` | Thème, compact, log, notifications, raccourcis, layout charts | `toggleTheme()`, `addLog()`, `toggleCompactMode()`, `applyChartsLayout()` |
| `core/init.js` | Initialisation + renderAll | `initApp()`, `renderAll()` |
| **`components/`** | | |
| `components/global-status.js` | Banner, statut global, env indicators, prod alert | `updateGlobalStatus()`, `renderEnvIndicators()`, `renderProdAlert()` |
| `components/impacts.js` | Impacts CRUD + ticker + historique | `saveImpact()`, `resolveImpact()`, `renderImpacts()`, `renderHistory()` |
| `components/tasks.js` | Tasks CRUD + kanban + autocomplete | `saveTask()`, `moveTask()`, `renderTasks()`, `renderKanbanByStatus/Env()` |
| `components/infra.js` | Infra CRUD + paste import | `saveInfra()`, `cycleInfraStatus()`, `renderInfra()`, `previewPaste()` |
| `components/metrics.js` | Cartes métriques + modal détail | `renderMetrics()`, `animateValue()`, `openMetricDetail()` |
| `components/charts.js` | Chart helpers + 4 charts principaux | `getChartColors()`, `chartEmptyState()`, `updateActivityChart()`, `updateInfraStatusChart()`, `updatePriorityChart()`, `updateImpactsTimelineChart()` |
| `components/traffic-light.js` | Engine TL + settings + widget + chart | `computeTrafficLight()`, `updateTrafficLight()`, `updateTrafficLightChart()`, `openTrafficLightSettings()` |
| `components/pricing.js` | Données et chart pricing | `PRICING_DATA`, `updatePricingChart()`, `renderPricingLegend()` |
| `components/sre.js` | Indicateurs SRE (MTTR, Deploy Freq, Change Failure Rate) | `computeMTTR()`, `renderMTTRMetric()`, `computeDeployFrequency()`, `renderDeployFrequencyMetric()`, `computeChangeFailureRate()`, `renderChangeFailureRateMetric()` |
| `components/rate-limit.js` | Rate limiting — saisie manuelle d'événements, analyse d'attaque, alertes, chart | `computeRateLimitStats()`, `detectAttackPattern()`, `renderRateLimitMetric()`, `addRateLimitEvent()`, `openRateLimitDetail()`, `updateRateLimitChart()` |
| `components/export.js` | Export/rédiger + channels + mdToHtml | `generateMarkdown()`, `generateSlack()`, `generateMattermost()`, `mdToHtml()`, `renderChannels()` |
| `components/filters-views.js` | Filtres, vues, import sources, dashboard settings, sidebar channels | `getActiveFilters()`, `applyAdvancedFilters()`, `switchView()`, `openDashboardSettings()`, `initDsHideButtons()`, `dsSaveChannels()` |
| `components/navigation.js` | Quick-nav flottant + scroll-to-top | `initQuickNav()` |
| `components/demo.js` | Données de démo | `loadDemoIncident()`, `loadDemoGreen()`, `resetBoard()` |
| **`integrations/`** | | |
| `integrations/gitlab.js` | Intégration GitLab (MR + Pipelines + Commits) | `fetchGitlabMRs()`, `renderGitlabMetric()`, `openGitlabDetail()`, `fetchGitlabPipelines()`, `renderGitlabPipelinesMetric()`, `fetchGitlabCommits()`, `renderGitlabCommitsMetric()` |
| `integrations/github.js` | Intégration GitHub (PR + Actions + Commits) | `fetchGithubPRs()`, `renderGithubPRMetric()`, `openGithubPRDetail()`, `fetchGithubActions()`, `renderGithubActionsMetric()`, `fetchGithubCommits()`, `renderGithubCommitsMetric()` |
| `integrations/integrations.js` | Consul + Ansible + OpenStack + API config unifié | `fetchConsul()`, `fetchAnsible()`, `fetchOpenstack()`, `openApiConfig()`, `updateAnsibleCharts()`, `updateOpenstackCharts()` |

### Ordre de chargement JS (géré par `main.js`)

1. `core/config.js` — constantes globales, aucune dépendance (**toujours en premier**)
2. `core/utils.js` — fonctions pures, aucune dépendance
3. `core/state.js` — état global, doit être chargé avant tout composant
3. `core/core.js` — dépend de utils + state
4. `components/*` + `integrations/*` — composants métier (ordre libre entre eux)
5. `core/init.js` — **toujours en dernier**, lance `renderAll()`

## Patterns importants

### State & persistance
```js
state = { impacts, tasks, infra, log, chartData, channels, trafficLight, dashboardSettings, gitlabRepos, gitlabMRCache, gitlabPipelinesCache, gitlabCommitsCache, githubRepos, githubPRCache, githubActionsCache, githubCommitsCache, ... }
saveState()   // stringify vers localStorage (core/state.js)
loadState()   // parse avec spread DEFAULT_STATE (core/state.js)
```

### Modals
```js
openModal('modalId')   // ajoute .show sur .modal-overlay (core/utils.js)
closeModal('modalId')  // retire .show (core/utils.js)
// HTML: <div class="modal-overlay" id="modalXxx"><div class="modal">...</div></div>
```

### Sidebar settings
```js
openDashboardSettings()   // ajoute .open sur #dsSidebar + #dsSidebarBackdrop (components/filters-views.js)
closeDashboardSettings()  // retire .open (components/filters-views.js)
// Éléments masqués via data-settings-id + class .ds-hidden
```

### Charts (Chart.js)
- Instances globales déclarées dans `core/state.js` : `activityChart`, `infraStatusChartInstance`, `priorityChartInstance`, `impactsTimelineChartInstance`, `pricingChartInstance`
- Toujours `.destroy()` avant de recréer
- `chartEmptyState(canvasId, message, hide)` pour gérer les états vides (`components/charts.js`)
- Couleurs via `getChartColors()` qui lit les CSS vars du thème courant (`components/charts.js`)

### Filtres
```js
getActiveFilters()      // retourne { search, type, status, env, tags } (components/filters-views.js)
filterInfraItems(f)     // filtre state.infra (components/filters-views.js)
filterTaskItems(f)      // filtre state.tasks (components/filters-views.js)
filterImpactItems(f)    // filtre state.impacts (components/filters-views.js)
applyAdvancedFilters()  // appelle tous les renders + charts (components/filters-views.js)
```
Les filtres impactent : metrics (`renderMetrics`), charts, et listes.

### Vues (data-views)
Les éléments HTML portent `data-views="ops reseau apps"`. `switchView(view)` toggle `display` selon la vue active (`components/filters-views.js`).

### Visibilité des éléments (dashboard settings)
Les éléments portent `data-settings-id="xxx"`. `applyDashboardSettings()` ajoute/retire `.ds-hidden` (`display: none !important`). L'override `!important` est nécessaire car `switchView` utilise des styles inline.

### Quick-nav & scroll-to-top (`components/navigation.js`)
- Nav flottant à gauche avec dots par section (`#quickNav`), apparaît après 200px de scroll
- IntersectionObserver pour highlight la section visible (rootMargin `-30% 0px -60% 0px`)
- Masque les dots des sections non visibles (via `data-views` ou `.ds-hidden`)
- Scroll-to-top (`#scrollTopBtn`), visible après 400px
- Les sections ont des IDs : `sectionMetrics`, `chartsGrid`, `sectionInfra`, `sectionKanban`, `sectionHistory`, `sectionLog`

### Section dividers
Balises `<div class="section-divider">` entre les sections principales, avec un label central (`<span class="section-divider-label">`). Portent `data-views` pour suivre la visibilité des vues.

### Toasts
```js
toast('message')  // notification éphémère en bas de l'écran (core/utils.js)
```

### Log
```js
addLog('emoji', 'message')  // ajoute au journal + sauvegarde (core/core.js)
```

## CSS — Conventions

- Thème via CSS custom properties dans `core/variables.css` : `--bg`, `--bg-card`, `--text`, `--accent`, `--green`, `--yellow`, `--red`, `--border`, etc.
- Dark par défaut, light via `[data-theme="light"]`
- Mode compact via `.compact-mode` sur `<body>` (styles dans `core/compact.css`)
- Toggle switch réutilisable : `.tl-switch` + `.tl-switch-slider` (doit avoir `display: inline-block`)
- Badges : `.badge-critical`, `.badge-major`, `.badge-warning`, `.badge-high`, `.badge-medium`, `.badge-low`
- Sections CSS commentées `/* ========== NOM ========== */`

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `?` | Aide raccourcis |
| `1/2/3` | Vue Ops/Réseau/Apps |
| `/` | Focus recherche |
| `i` | Déclarer impact |
| `t` | Nouvelle tâche |
| `e` | Exporter |
| `s` | Paramètres d'affichage |
| `c` | Mode compact |
| `Esc` | Fermer modal/sidebar |

## Modèles de données

### Task
```js
{ id, title, desc, priority: 'critical|high|medium|low', status: 'todo|wip|done', assignee, tags: [], envs: [] }
```

### Infra
```js
{ id, name, type: 'vm|lxc|stack|logger|other', status: 'up|degraded|down', ip, details, env: 'dev|preprod|prod' }
```

### Impact
```js
{ id, title, desc, severity: 'critical|major|warning', origin: 'internal|external', active: bool, time, resolvedAt }
```

## Conventions de code

- Pas de framework, pas de modules ES — tout est global, chargé via `<script>` tags
- Fonctions de render préfixées `render*` (ex: `renderTasks`, `renderInfra`)
- Fonctions de mise à jour chart préfixées `update*Chart` (ex: `updateActivityChart`)
- IDs HTML en camelCase (ex: `metricTodo`, `infraGrid`)
- Toujours lire un fichier avant de l'éditer (contrainte de l'outil Edit)

## Monitoring SRE — Principes & indicateurs implémentés

Ce dashboard s'inscrit dans une démarche SRE (Site Reliability Engineering).

### Cadres de référence

| Cadre | Axes | Application dashboard |
|-------|------|----------------------|
| **Golden Signals** (Google SRE) | Latency, Traffic, Errors, Saturation | Errors via pipelines/actions failed, Saturation via infra status |
| **Méthode USE** (Brendan Gregg) | Utilization, Saturation, Errors | Infra up/degraded/down, taux de complétion kanban |
| **Méthode RED** | Rate, Errors, Duration | Change Failure Rate, MTTR |
| **SLI / SLO** | Métriques mesurables + objectifs cibles | Traffic Light = SLO composite (seuils configurables) |

### Indicateurs SRE implémentés (`components/sre.js`)

| Indicateur | Source de données | Calcul | Fichier |
|-----------|-------------------|--------|---------|
| **MTTR** (Mean Time To Recover) | Impacts résolus (`resolvedAt - time`) | Moyenne des durées de résolution | `components/sre.js` |
| **Deployment Frequency** | Commits GitLab + GitHub (7j) | Total commits / 7 jours | `components/sre.js` |
| **Change Failure Rate** | Pipelines GitLab + GitHub Actions | Runs failed / total runs (%) | `components/sre.js` |

Ces 3 indicateurs correspondent aux métriques DORA (DevOps Research and Assessment). Ils affichent `—` quand aucun flux n'est configuré, et un message explicatif dans la modal détail invitant à configurer via 🔌 API Config.

### Classification SRE des indicateurs existants

| Indicateur | Catégorie | Signal doré | Fichier |
|-----------|-----------|-------------|---------|
| Infra up/degraded/down | USE (Errors) | Saturation | `components/infra.js` |
| Uptime % | SLI | Saturation | `components/metrics.js` |
| Impacts actifs/résolus | Incident management | Errors | `components/impacts.js` |
| Traffic Light score | SLO composite | — | `components/traffic-light.js` |
| MTTR | DORA / Incident | Duration | `components/sre.js` |
| Deployment Frequency | DORA / CI-CD | Rate | `components/sre.js` |
| Change Failure Rate | DORA / CI-CD | Errors | `components/sre.js` |
| Pipelines GitLab/GitHub | CI/CD health | Errors | `integrations/gitlab.js`, `integrations/github.js` |
| Consul services | Service discovery | Saturation | `integrations/integrations.js` |
| Ansible runs | Configuration drift | Errors | `integrations/integrations.js` |
| OpenStack instances/volumes | Cloud resources | Saturation | `integrations/integrations.js` |

| Rate Limit | Sécurité / Golden Signals (Traffic) | Traffic | `components/rate-limit.js` |

### Alerting — Niveaux de sévérité

Alignés sur l'impact utilisateur (implémenté dans le Traffic Light + prod alert) :
- **Critical** → Impact utilisateur immédiat, intervention requise (prod-border pulse + background rouge)
- **Warning** → Dégradation, risque d'escalade
- **Info** → À surveiller, pas d'action immédiate

## Config centralisée (`core/config.js`)

**Règle** : toute valeur magique (seuil, durée, taille de buffer, nombre de buckets…) doit être déclarée dans `DASHBOARD_CONFIG` et **jamais** hardcodée dans la logique métier.

| Clé | Valeur par défaut | Description |
|-----|-------------------|-------------|
| `rateLimitMaxEvents` | `500` | Nb max d'événements conservés en localStorage |
| `rateLimitStatsWindowMs` | `86400000` (24h) | Fenêtre de calcul des stats rate-limit |
| `rateLimitChartBuckets` | `12` | Nombre de fenêtres sur le chart |
| `rateLimitChartBucketMs` | `600000` (10 min) | Durée d'une fenêtre sur le chart |
| `rateLimitDefaultWarning` | `50` | Seuil warning req/min (défaut, écrasable par l'utilisateur) |
| `rateLimitDefaultCritical` | `200` | Seuil critique req/min (défaut, écrasable par l'utilisateur) |
| `rateLimitDefaultWindowSec` | `60` | Fenêtre par défaut du formulaire (secondes) |
