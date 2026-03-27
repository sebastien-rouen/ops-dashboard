# Changelog — OPS Command Center Dashboard

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
