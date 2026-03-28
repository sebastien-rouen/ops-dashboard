# Changelog — OPS Command Center Dashboard

## [Non publie] - 2026-03-28

### Navigation, ergonomie et UI — Command Center

- **Sticky toolbar** : fix z-index (99) + recalcul position au resize et fermeture banner
- **Quick-nav flottant** : navigation verticale fixe a gauche avec dots par section (Metriques, Graphiques, Infra, Kanban, Historique, Journal), apparait au scroll, highlight la section visible via IntersectionObserver, masque les sections inactives selon la vue courante
- **Scroll-to-top** : bouton flottant en bas a gauche, apparait apres 400px de scroll
- **Separateurs visuels** : dividers subtils entre chaque section principale avec label uppercase
- **Metriques non configurees** : les cartes `.no-source` (integrations sans API) sont visuellement attenuees (opacity, border dashed, grayscale icon)
- **Charts layout toggle** : bouton pill arrondi avec label explicite ("Disposition : 2/3 colonnes")
- **Empty states skeleton** : sections vides affichent un placeholder compact (bordure dashed, icone, texte d'action) au lieu d'un espace vide
- **Charts vides** : containers en dashed + opacity reduite pour indiquer visuellement l'absence de donnees
- **Section dividers intelligents** : masques automatiquement (CSS `:has()`) quand la section suivante est cachee
- **Badge API** : pastille compteur sur le bouton 🔌 API config affichant le nombre d'endpoints configures
- **Modale API redesignee** : formulaire agrandi (860px) avec grille, labels explicites, champs structures, boutons d'action clairs
- **Edition d'endpoints** : cliquer sur un endpoint existant remplit le formulaire en mode edition (titre, bouton, highlight), avec bouton Annuler
- **Detail environnement** : cliquer sur une env-pill (DEV/PREPROD/PROD) ouvre une modale avec resume et liste des machines triees par severite
- **Reset dashboard settings** : les scenarios demo (Incident, Nominal, Reset) remettent `dashboardSettings = {}` pour re-afficher tous les blocs
- **Champ environnement sur les endpoints** : select optionnel (DEV/PREPROD/PROD/Transverse) dans le formulaire API, badge env dans la liste, pris en compte dans l'edition
- **Modale env detail enrichie** : affiche aussi les endpoints API rattaches a l'environnement, avec titre de section
- **Exemples import sources** : chaque format (Prometheus, Zabbix, JSON) affiche un exemple JSON contextuel + bouton "Charger cet exemple"
- **Wizard assistant de configuration** : bouton 🧙 dans le header, choix entre Machines / Endpoints / Import, formulaire machine (single + batch), formulaire endpoint integre, feedback en temps reel des ajouts

### Fichiers modifies

- `index.html` — IDs sections, quick-nav HTML, scroll-to-top, section dividers, badge API, form API restructure
- `css/core/base.css` — Styles quick-nav, scroll-to-top, section-divider
- `css/components/header.css` — z-index sticky-bar, badge API
- `css/components/metrics.css` — Etat visuel `.no-source`
- `css/components/charts.css` — Charts layout toggle redesign
- `css/components/modals.css` — Classe `.modal-api-config` (860px)
- `css/integrations/integrations.css` — Form API grid layout, labels, actions
- `js/components/navigation.js` (nouveau) — Quick-nav + scroll-to-top logique
- `js/components/global-status.js` — updateViewTabsPosition apres dismiss banner
- `js/core/core.js` — Label explicite charts toggle
- `js/core/init.js` — initQuickNav + resize listener + updateApiBadge
- `js/core/core.js` — Empty state log ameliore
- `js/components/tasks.js` — Empty state kanban ameliore
- `js/integrations/integrations.js` — getApiEndpointCount, updateApiBadge, onApiTypeChange adapte grille
- `js/main.js` — Chargement navigation.js

---

## [Non publie] - 2026-03-27

### Stack observabilite : Prometheus, Loki, Tempo

- **Prometheus** : affichage targets up/down, alertes firing, criticite, modale detail
- **Loki** : compteurs erreurs/warnings, streams actifs, modale detail
- **Tempo** : traces totales/en erreur, p95 latence, modale detail
- **Scenarios demo** : donnees nominal et incident pour chaque outil (`js/scenarios/`)
- **Demo observabilite** : bouton dedie "Stack observabilite" dans le panel demo
- **CSS** : styles cartes et modales pour les 3 nouvelles integrations

### Fichiers modifies

- `js/integrations/integrations.js` (+469 lignes) - Render Prometheus, Loki, Tempo
- `js/scenarios/` (+6 fichiers) - Scenarios nominal/incident pour Prometheus, Loki, Tempo
- `index.html` (+79 lignes) - Bouton demo + modales detail Prometheus/Loki/Tempo
- `css/integrations/integrations.css` (+218 lignes) - Styles nouvelles integrations
- `js/components/demo.js` (+123 lignes) - Logique demo stack observabilite
- `js/core/init.js` (+3 lignes) - Initialisation nouvelles integrations
- `js/main.js` (+9 lignes) - Branchement modules observabilite

---

## [Commit initial] - 2025-02-20

### Dashboard OPS Command Center

- Structure initiale du dashboard de supervision
- Integrations Consul, Grafana, Loki, Vault, Prometheus, Tempo
- Module rate limiting avec analyse d'attaque
- Design dark theme, composants modulaires
