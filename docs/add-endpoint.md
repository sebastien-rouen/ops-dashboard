# Ajouter un nouvel endpoint API

Guide pour integrer un nouveau type d'endpoint dans la modal "Endpoints API" du dashboard.

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| `index.html` | Ajouter une `<option>` dans le select `#apiType` |
| `js/integrations/integrations.js` | Logique complete (config, CRUD, test) |
| `css/integrations/integrations.css` | Styles si necessaire |

## Etapes

### 1. HTML — Ajouter l'option dans le select

Dans `index.html`, chercher `<select id="apiType">` et ajouter :

```html
<option value="montype">🔧 MonType</option>
```

### 2. JS — Declarer dans API_TYPES

Dans `js/integrations/integrations.js`, ajouter au dictionnaire `API_TYPES` :

```js
montype: { icon: '🔧', label: 'MonType', color: '#3366cc' }
```

### 3. JS — Champs dynamiques dans onApiTypeChange()

Definir quels champs extra afficher quand le type est selectionne :

```js
} else if (type === 'montype') {
    extra.style.display = 'flex';      // ou 'none' si pas de champs extra
    projId.style.display = '';          // '' pour afficher, 'none' pour masquer
    branch.style.display = 'none';
    projId.placeholder = 'Mon champ (optionnel)';
}
```

**Champs disponibles** : `apiProjectId` (texte libre) et `apiBranch` (texte libre). Ils sont reutilises selon le contexte du type.

### 4. JS — Ajouter dans addApiEndpoint()

Creer le tableau lazy dans le state et pousser l'endpoint :

```js
} else if (type === 'montype') {
    if (!state.montypeEndpoints) state.montypeEndpoints = [];
    const id = uid();
    const monChamp = document.getElementById('apiProjectId').value.trim();
    state.montypeEndpoints.push({ id, name, url, monChamp, token });
    saveState(); renderApiEndpointList();
    testApiEndpoint('montype', id);  // test auto a l'ajout
}
```

### 5. JS — Ajouter dans renderApiEndpointList()

Agreger les endpoints dans le tableau `all` :

```js
(state.montypeEndpoints || []).forEach(ep => {
    const c = (state.montypeCache || {})[ep.id];
    const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '...';
    all.push({
        type: 'montype', id: ep.id, name: ep.name, url: ep.url,
        detail: ep.monChamp || '', info, fetchedAt: c?.testedAt, testResult: c
    });
});
```

### 6. JS — Ajouter dans removeApiEndpoint()

```js
} else if (type === 'montype') {
    state.montypeEndpoints = (state.montypeEndpoints || []).filter(e => e.id !== id);
    if (state.montypeCache) delete state.montypeCache[id];
    saveState(); renderApiEndpointList();
}
```

### 7. JS — Ajouter dans refreshApiEndpoint()

Pour les types qui n'ont pas de fetch de donnees dedies, le refresh fait un test :

```js
else if (type === 'montype') testApiEndpoint('montype', id);
```

### 8. JS — Configurer le test de connexion

Ajouter l'URL de test dans `API_TEST_PATHS` :

```js
montype: { path: () => '/api/v1/health', authHeader: 'Authorization', authPrefix: 'Bearer ' }
```

**Options de configuration** :

| Propriete | Description |
|-----------|-------------|
| `path` | Fonction `(ep) => string` — chemin relatif a tester |
| `authHeader` | Nom du header HTTP pour l'authentification |
| `authPrefix` | Prefixe du token (ex: `'Bearer '`). Omis si le token est envoye tel quel |

## Convention de nommage state

- **Endpoints** : `state.{type}Endpoints` (tableau d'objets)
- **Cache** : `state.{type}Cache` (objet indexe par `id`)

Les deux sont initialises en lazy (`if (!state.xxx) state.xxx = []`).

## URLs de test de reference

| Type | Endpoint test | Header auth |
|------|--------------|-------------|
| GitLab | `/api/v4/projects/{projectId}` | `PRIVATE-TOKEN` |
| GitHub | `/repos/{owner}/{repo}` | `Authorization: Bearer` |
| Consul | `/v1/status/leader` | `X-Consul-Token` |
| Ansible | `/api/v2/ping/` | `Authorization: Bearer` |
| OpenStack | `/v3/` | `X-Auth-Token` |
| Prometheus | `/api/v1/status/buildinfo` | `Authorization: Bearer` |
| Grafana | `/api/health` | `Authorization: Bearer` |
| Loki | `/loki/api/v1/status/buildinfo` | `Authorization: Bearer` |
| Vault | `/v1/sys/health` | `X-Vault-Token` |
| Tempo | `/ready` | `Authorization: Bearer` |

## Exemple complet — Ajout de "Mimir"

```js
// 1. API_TYPES
mimir: { icon: '📐', label: 'Mimir', color: '#ff6633' }

// 2. API_TEST_PATHS
mimir: { path: () => '/api/v1/status/buildinfo', authHeader: 'Authorization', authPrefix: 'Bearer ' }

// 3. onApiTypeChange — pas de champs extra
} else if (type === 'mimir') {
    extra.style.display = 'none';
}

// 4. addApiEndpoint
} else if (type === 'mimir') {
    if (!state.mimirEndpoints) state.mimirEndpoints = [];
    const id = uid();
    state.mimirEndpoints.push({ id, name, url, token });
    saveState(); renderApiEndpointList();
    testApiEndpoint('mimir', id);
}

// 5. renderApiEndpointList
(state.mimirEndpoints || []).forEach(ep => {
    const c = (state.mimirCache || {})[ep.id];
    const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '...';
    all.push({ type: 'mimir', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.testedAt, testResult: c });
});

// 6. removeApiEndpoint
} else if (type === 'mimir') {
    state.mimirEndpoints = (state.mimirEndpoints || []).filter(e => e.id !== id);
    if (state.mimirCache) delete state.mimirCache[id];
    saveState(); renderApiEndpointList();
}

// 7. refreshApiEndpoint
else if (type === 'mimir') testApiEndpoint('mimir', id);
```

Et dans `index.html` :
```html
<option value="mimir">📐 Mimir</option>
```

## Exemple complet — Tempo (implémenté)

Tempo est le backend de tracing distribué de Grafana Labs. Pas de champs extra (URL + token suffisent).

```js
// 1. API_TYPES
tempo: { icon: '🔍', label: 'Tempo', color: '#f55353' }

// 2. API_TEST_PATHS
tempo: { path: () => '/ready', authHeader: 'Authorization', authPrefix: 'Bearer ' }

// 3. onApiTypeChange — pas de champs extra
} else if (type === 'tempo') {
    extra.style.display = 'none';
}

// 4. addApiEndpoint
} else if (type === 'tempo') {
    if (!state.tempoEndpoints) state.tempoEndpoints = [];
    const id = uid();
    state.tempoEndpoints.push({ id, name, url, token });
    saveState(); renderApiEndpointList();
    testApiEndpoint('tempo', id);
}

// 5. renderApiEndpointList
(state.tempoEndpoints || []).forEach(ep => {
    const c = (state.tempoCache || {})[ep.id];
    const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '…';
    all.push({ type: 'tempo', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.testedAt, testResult: c });
});

// 6. removeApiEndpoint
} else if (type === 'tempo') {
    state.tempoEndpoints = (state.tempoEndpoints || []).filter(e => e.id !== id);
    if (state.tempoCache) delete state.tempoCache[id];
    saveState(); renderApiEndpointList();
}

// 7. refreshApiEndpoint — inclus dans la ligne multi-types
else if (type === 'prometheus' || type === 'grafana' || type === 'loki' || type === 'vault' || type === 'tempo') testApiEndpoint(type, id);
```

Et dans `index.html` :
```html
<option value="tempo">🔍 Tempo</option>
```

## Scénarios de test — Tempo

### Connexion réussie

| Scénario | URL | Token | Résultat attendu |
|----------|-----|-------|-----------------|
| Instance ouverte | `http://tempo:3200` | _(vide)_ | `✓ 200` — texte `ready` |
| Instance sécurisée (Bearer) | `https://tempo.example.com` | token valide | `✓ 200` |
| URL avec slash final | `http://tempo:3200/` | _(vide)_ | `✓ 200` — le slash est normalisé |

### Erreurs attendues

| Scénario | Résultat attendu |
|----------|-----------------|
| Tempo non démarré / port fermé | `❌ CORS ou réseau injoignable` |
| URL incorrecte (mauvais port) | `❌ CORS ou réseau injoignable` |
| Token expiré / invalide (si auth activée) | `⚠️ 401` |
| Tempo en cours de démarrage | `⚠️ 503` — le `/ready` renvoie 503 tant que non prêt |
| Timeout réseau (> 10 s) | `❌ timeout (10s)` |

### Comportement du bouton ⚡ Test dans la liste

- Appelle `testApiEndpoint('tempo', id)` → frappe `{url}/ready`
- Met à jour `state.tempoCache[id]` avec `{ ok, status, testedAt }`
- Le statut s'affiche en vert (`✓ 200`) ou rouge (`✗ 503`)
- Le tooltip du sync (`⟳`) indique l'heure du dernier test

### Test manuel (curl)

```bash
# Instance sans auth
curl -v http://tempo:3200/ready

# Instance avec Bearer token
curl -v -H "Authorization: Bearer <token>" https://tempo.example.com/ready

# Réponse attendue : HTTP 200, body "ready"
```

### Particularité Tempo

Contrairement à Prometheus (`/api/v1/status/buildinfo`) ou Loki (`/loki/api/v1/status/buildinfo`), Tempo expose `/ready` comme endpoint de santé standard. Ce endpoint retourne :
- **200** + `ready` → instance opérationnelle
- **503** → instance en cours d'initialisation (ex: compaction en cours)

Il ne retourne pas de JSON — le test vérifie uniquement le code HTTP.
