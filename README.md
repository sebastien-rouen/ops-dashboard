# ⚡ OPS Command Center

Dashboard local pour opérationnels IT — suivi d'infrastructure, kanban, impacts et exports.

![HTML](https://img.shields.io/badge/HTML-CSS-JS-orange)
![Storage](https://img.shields.io/badge/storage-localStorage-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Aperçu

Un tableau de bord 100% local (navigateur uniquement, aucun serveur) pensé pour les OPS qui ont besoin de :

- **Suivre 8 métriques clés** en temps réel avec animations et barres de progression
- **Déclarer et suivre des impacts** (externes / internes) avec sévérité
- **Gérer un Kanban** rapide (todo / wip / done) avec tags et priorités
- **Inventorier l'infra** (VM, LXC, Stack, Logger) avec statuts up/degraded/down
- **Visualiser** via 4 graphiques dynamiques (activité, statuts, priorités, timeline impacts)
- **Exporter** un rapport propre en **Markdown** ou **Slack** avec canaux configurables

Aucune donnée ne quitte votre navigateur. Tout est stocké en `localStorage`.

## Démarrage

```bash
git clone https://github.com/sebastien-rouen/ops-command-center.git
cd ops-command-center
open index.html   # ou double-clic sur le fichier
```

Aucune dépendance locale. Seul **Chart.js** est chargé via CDN.

## Structure

```
ops-command-center/
├── index.html    ← point d'entrée
├── style.css     ← thème dark/light
├── app.js        ← logique complète
└── README.md
```

## 📊 Métriques en temps réel

8 indicateurs clés s'affichent en haut du dashboard avec animations fluides :

| Métrique | Description |
|----------|-------------|
| **🖥️ Machines actives** | Nombre de machines avec statut `up` / total |
| **📋 Tâches WIP** | Nombre de tâches en cours (Work In Progress) |
| **⏱️ Temps moyen** | Durée moyenne des tâches terminées (heures) |
| **🎯 Taux complétion** | Pourcentage de tâches marquées `done` |
| **🔴 Impacts actifs** | Nombre d'incidents en cours |
| **📈 Vélocité** | Tâches complétées sur les 7 derniers jours |
| **⚠️ Machines dégradées** | Nombre de machines avec statut `degraded` |
| **🔥 Priorités hautes** | Tâches kanban marquées `high` ou `critical` |

Chaque carte affiche une barre de progression, des effets de glow et s'anime au chargement.

## 📈 Graphiques

4 visualisations Chart.js pour un suivi visuel :

| Graphique | Type | Données |
|-----------|------|---------|
| **Activité Kanban (7j)** | Bar | Nombre de tâches complétées par jour |
| **Statut Infrastructure** | Doughnut | Répartition up / degraded / down |
| **Distribution Priorités** | Doughnut | Répartition low / medium / high / critical |
| **Timeline Impacts** | Line | Évolution des incidents sur 7 jours |

## Import rapide

### Via le formulaire

Boutons dédiés pour ajouter un impact, une tâche ou une machine.

### Via copier/coller en masse

Format par ligne (séparateur `|`) :

```
prod-web-01 | vm | up | 10.0.1.10 | nginx, node18, pm2
prod-db-01 | lxc | degraded | 10.0.2.10 | postgres15 — lag 8s
graylog-01 | logger | up | 10.0.3.1 | graylog 5.1, mongodb
```

**✨ Prévisualisation intelligente** : après avoir collé vos données, un aperçu s'affiche avec :
- Lignes valides en vert avec badges (type, statut, IP)
- Lignes invalides en rouge avec message d'erreur
- Compteur récapitulatif (X valides, Y invalides)
- Bouton d'import activé uniquement si au moins 1 ligne valide

### Via la démo

Bouton **🧪 Démo** en haut à droite — charge 14 machines, 9 tâches et 2 impacts d'exemple.

## Export

Bouton **📤 Exporter** génère un rapport complet :

| Format | Usage |
|--------|-------|
| **Markdown** | Wiki, Notion, README, e-mail |
| **Slack** | Message Slack avec emojis natifs |

Le rapport inclut : statut global, impacts actifs, inventaire infra (tableau), résumé kanban.

### 📢 Canaux de communication

Section dédiée dans le modal d'export avec rappel des canaux configurés :
- **Slack** : channels à notifier (ex: `#general`, `#ops-incidents`)
- **Email** : adresses destinataires
- **Teams** : channels Microsoft Teams

Bouton **✏️ Configurer les canaux** pour éditer — la modification rafraîchit automatiquement le contenu de l'export.

### 📋 Copie rapide

**Icône flottante** en haut à droite du textarea d'export :
- Clic → copie le contenu dans le presse-papier
- Animation de confirmation (✓ vert pendant 2s)
- Accessible même lors du scroll

## Fonctionnalités

| Fonction | Détail |
|----------|--------|
| 📊 Métriques | 8 cartes animées avec barres de progression et effets visuels |
| 🔴 Impacts | Sévérité (critical/major/warning), origine, résolution |
| 📋 Kanban | Drag conceptuel via boutons, tags, priorités, compteurs |
| 🖥️ Infra | VM, LXC, Stack, Logger, Other — filtres + statut cyclable |
| 📈 Graphiques | 4 charts dynamiques (activité, statuts, priorités, timeline) |
| 📤 Export | Markdown + Slack avec canaux configurables et copie rapide |
| 👁️ Prévisualisation | Validation import en masse avec compteurs vert/rouge |
| 🌓 Thème | Dark / Light, persisté |
| 📜 Journal | Log automatique de chaque action |
| 💾 Persistance | localStorage — survit au rechargement |
| 🔒 Privé | Rien n'est envoyé, tout reste local |

## Raccourcis

- **Échap** — ferme n'importe quel modal
- **Clic sur l'overlay** — ferme le modal
- **⟳** sur une machine — cycle le statut (up → degraded → down → up)

## Stack

- HTML5 / CSS3 (variables, grid, flexbox)
- JavaScript vanilla (ES6+)
- [Chart.js 4.x](https://www.chartjs.org/) (CDN)
- localStorage pour la persistance

## 🗺️ Roadmap

### Court terme (v2.0)
- [x] **Filtres avancés** — recherche full-text, filtres combinés (type + statut + tags)
- [x] **Historique impacts** — archiver les incidents résolus avec chronologie
- [x] **Notifications** — alertes navigateur pour impacts critiques ou machines down
- [x] **Raccourcis clavier** — navigation rapide (1/2/3, /, i, t, e, c, ?)
- [x] **Mode compact** — vue condensée pour petits écrans / dashboards muraux

### Moyen terme (v3.0)
- [x] **Multi-vues** — onglets personnalisables (vue ops, vue réseau, vue apps)
- [ ] **Templates d'export** — modèles pré-configurés pour différents destinataires
- [x] **Import depuis sources** — sync auto depuis monitoring (Prometheus, Zabbix, etc.)
- [ ] **Annotations** — commentaires sur graphiques et timeline
- [ ] **Mode collaboratif** — partage via URL ou fichier exporté
- [ ] **Rapports planifiés** — génération auto quotidienne/hebdomadaire

### 🚦 Traffic Light (v3.5)

Système de feux tricolores pour une lecture instantanée de la santé globale.

#### Indicateurs
| Feu | Condition | Signification |
|-----|-----------|---------------|
| 🟢 **Vert** | Toutes machines up, 0 impact actif, taux complétion > 80% | Situation nominale |
| 🟡 **Jaune** | ≥ 1 machine degraded OU ≥ 1 impact warning/major OU taux complétion 50–80% | Vigilance requise |
| 🔴 **Rouge** | ≥ 1 machine down OU ≥ 1 impact critical OU taux complétion < 50% | Intervention nécessaire |

#### Fonctionnalités
- [x] **Indicateur global** — feu tricolore agrégé visible en permanence dans le header
- [x] **Feux par machine** — pastille couleur sur chaque carte infra selon uptime et alertes
- [x] **Historique couleurs** — timeline des changements de couleur sur 7/30 jours (graphique)
- [x] **Alertes sur transition** — notification navigateur lors d'un passage jaune→rouge
- [x] **Widget résumé** — bannière compacte avec les 3 feux + score santé (0–100%)

#### Paramètres configurables
- [x] **Seuils personnalisables** — définir les % et compteurs déclenchant chaque couleur
- [x] **Poids par métrique** — pondération des indicateurs dans le calcul du score global
- [x] **Règles d'agrégation** — mode `worst` (pire feu gagne) ou `weighted` (moyenne pondérée)
- [x] **Exclusions** — ignorer certaines machines ou impacts dans le calcul
- [x] **Plages horaires** — seuils différents selon heures ouvrées / astreinte / week-end

### Long terme (v4.0+)
- [ ] **API REST optionnelle** — backend léger pour équipes (Node.js/Deno)
- [ ] **Auth & permissions** — accès en lecture seule vs admin
- [ ] **Intégrations** — webhooks Slack/Teams, tickets Jira/ServiceNow
- [ ] **Mobile PWA** — app installable avec notifs push
- [ ] **IA assistant** — suggestions auto (priorisation, impact prediction)
- [ ] **Thèmes custom** — éditeur de couleurs et export de thème

### Contributions bienvenues
Les PRs sont ouvertes pour toute amélioration ! Priorités actuelles :
1. Tests unitaires (Jest/Vitest)
2. Documentation inline JSDoc
3. Accessibilité (ARIA, navigation clavier)
4. i18n (anglais, espagnol)

## Licence

MIT — libre d'utilisation, modification et distribution.
