// ==================== FILTERS & VIEWS ====================

// ==================== VIEW TABS POSITION ====================
function updateViewTabsPosition() {
    const header = document.querySelector('header');
    const toolbar = document.querySelector('.toolbar');
    if (header && toolbar) {
        toolbar.style.top = header.offsetHeight + 'px';
    }
}

// ==================== VIEWS ====================
function switchView(view, btn) {
    state.currentView = view;
    saveState();

    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('[data-views]').forEach(el => {
        const views = el.dataset.views.split(' ');
        el.style.display = views.includes(view) ? '' : 'none';
    });

    updateMetricGroupVisibility();

    // Recalculate view-tabs position (header impacts may show/hide)
    requestAnimationFrame(updateViewTabsPosition);

    // Resize charts after view change + update dividers
    setTimeout(() => {
        if (activityChart) activityChart.resize();
        if (infraStatusChartInstance) infraStatusChartInstance.resize();
        if (priorityChartInstance) priorityChartInstance.resize();
        if (impactsTimelineChartInstance) impactsTimelineChartInstance.resize();
        if (window.trafficLightChartInstance) window.trafficLightChartInstance.resize();
        if (pricingChartInstance) pricingChartInstance.resize();
        updateSectionDividers();
    }, 50);
}

// ==================== ADVANCED FILTERS ====================
function getActiveFilters() {
    return {
        search: (document.getElementById('globalSearch')?.value || '').trim().toLowerCase(),
        type: (document.getElementById('filterType')?.value || ''),
        status: (document.getElementById('filterStatus')?.value || ''),
        env: (document.getElementById('filterEnv')?.value || ''),
        tags: (document.getElementById('filterTags')?.value || '').trim().toLowerCase()
    };
}

function applyAdvancedFilters() {
    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;

    const searchClear = document.getElementById('searchClear');
    const btnClear = document.getElementById('btnClearFilters');
    if (searchClear) searchClear.style.display = filters.search ? '' : 'none';
    if (btnClear) btnClear.style.display = hasFilters ? '' : 'none';

    renderInfra();
    renderTasks();
    renderImpacts();
    renderMetrics();
    updateInfraStatusChart();
    updatePriorityChart();
    updateImpactsTimelineChart();
    updatePricingChart();
    updateFilterResults();
    updateSectionDividers();
}

function clearGlobalSearch() {
    document.getElementById('globalSearch').value = '';
    applyAdvancedFilters();
}

function clearAllFilters() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterEnv').value = '';
    document.getElementById('filterTags').value = '';
    applyAdvancedFilters();
}

function updateFilterResults() {
    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const el = document.getElementById('filterResults');
    if (!el) return;

    if (!hasFilters) {
        el.textContent = '';
        return;
    }

    const infraCount = filterInfraItems(filters).length;
    const taskCount = filterTaskItems(filters).length;
    const impactCount = filterImpactItems(filters).length;

    el.textContent = `${infraCount} infra · ${taskCount} tâches · ${impactCount} impacts`;
}

function filterInfraItems(filters) {
    let items = state.infra;
    if (filters.type) items = items.filter(i => i.type === filters.type);
    if (filters.status && ['up', 'degraded', 'down'].includes(filters.status)) {
        items = items.filter(i => i.status === filters.status);
    }
    if (filters.env) items = items.filter(i => (i.env || '') === filters.env);
    if (filters.search) {
        items = items.filter(i => [i.name, i.type, i.status, i.ip, i.details].join(' ').toLowerCase().includes(filters.search));
    }
    if (filters.tags) {
        const terms = filters.tags.split(',').map(t => t.trim()).filter(Boolean);
        items = items.filter(i => {
            const s = [i.name, i.details, i.ip].join(' ').toLowerCase();
            return terms.some(t => s.includes(t));
        });
    }
    return items;
}

function filterTaskItems(filters) {
    let items = state.tasks;
    if (filters.status && ['todo', 'wip', 'done'].includes(filters.status)) {
        items = items.filter(t => t.status === filters.status);
    }
    if (filters.env) {
        items = items.filter(t => (t.envs || []).includes(filters.env));
    }
    if (filters.search) {
        items = items.filter(t => [t.title, t.desc, t.priority, ...(t.tags || [])].join(' ').toLowerCase().includes(filters.search));
    }
    if (filters.tags) {
        const terms = filters.tags.split(',').map(t => t.trim()).filter(Boolean);
        items = items.filter(t => {
            const tags = (t.tags || []).map(tag => tag.toLowerCase());
            const text = [t.title, t.desc].join(' ').toLowerCase();
            return terms.some(term => tags.some(tag => tag.includes(term)) || text.includes(term));
        });
    }
    return items;
}

function filterImpactItems(filters) {
    let items = state.impacts.filter(i => i.active);
    if (filters.search) {
        items = items.filter(i => [i.title, i.desc, i.severity, i.origin].join(' ').toLowerCase().includes(filters.search));
    }
    return items;
}

// ==================== IMPORT FROM SOURCES ====================
const IMPORT_EXAMPLES = {
    prometheus: {
        url: 'http://prometheus:9090/api/v1/targets',
        hint: 'Endpoint : <code>/api/v1/targets</code> ou <code>/api/v1/query?query=up</code>',
        json: {
            "data": {
                "activeTargets": [
                    { "labels": { "instance": "10.0.1.10:9100", "job": "node-exporter" }, "health": "up" },
                    { "labels": { "instance": "10.0.1.11:9100", "job": "node-exporter" }, "health": "up" },
                    { "labels": { "instance": "10.0.2.10:5432", "job": "postgres" }, "health": "down" }
                ]
            }
        }
    },
    zabbix: {
        url: 'http://zabbix/api_jsonrpc.php',
        hint: 'Methode : <code>host.get</code> avec <code>selectInterfaces</code>',
        json: {
            "result": [
                { "host": "web-server-01", "name": "Web Server 01", "available": "1", "interfaces": [{ "ip": "10.0.1.10" }], "description": "nginx reverse proxy" },
                { "host": "db-master", "name": "DB Master", "available": "1", "interfaces": [{ "ip": "10.0.2.10" }], "description": "PostgreSQL 15" },
                { "host": "cache-01", "name": "Cache Redis", "available": "2", "interfaces": [{ "ip": "10.0.2.20" }], "description": "Redis 7.2" }
            ]
        }
    },
    json: {
        url: '',
        hint: 'Tableau JSON avec les champs <code>name</code>, <code>type</code>, <code>status</code>, <code>ip</code>',
        json: [
            { "name": "prod-web-01", "type": "vm", "status": "up", "ip": "10.0.1.10", "details": "nginx 1.24, node 18" },
            { "name": "prod-db-master", "type": "lxc", "status": "up", "ip": "10.0.2.10", "details": "PostgreSQL 15" },
            { "name": "prod-cache-01", "type": "lxc", "status": "degraded", "ip": "10.0.2.20", "details": "Redis 7.2 — lag" }
        ]
    }
};

function onImportFormatChange() {
    const format = document.getElementById('importSourceFormat').value;
    const container = document.getElementById('importFormatExample');
    const ex = IMPORT_EXAMPLES[format];
    if (!ex) { container.innerHTML = ''; return; }

    const jsonStr = JSON.stringify(ex.json, null, 2);
    container.innerHTML = `
        <div class="import-example-hint">${ex.hint}</div>
        <pre class="import-example-json"><code>${esc(jsonStr)}</code></pre>
        <button class="btn btn-small btn-secondary" onclick="loadImportExample()">Charger cet exemple</button>
    `;
}

function loadImportExample() {
    const format = document.getElementById('importSourceFormat').value;
    const ex = IMPORT_EXAMPLES[format];
    if (!ex) return;
    document.getElementById('importSourceJson').value = JSON.stringify(ex.json, null, 2);
    if (ex.url) document.getElementById('importSourceUrl').value = ex.url;
    toast('Exemple chargé — cliquez Prévisualiser');
}

function openImportSourcesModal() {
    document.getElementById('importSourceUrl').value = '';
    document.getElementById('importSourceFormat').value = 'prometheus';
    document.getElementById('importSourceJson').value = '';
    document.getElementById('importSourcePreview').innerHTML = '';
    document.getElementById('importSourcePreview').style.display = 'none';
    document.getElementById('btnConfirmSourceImport').disabled = true;
    onImportFormatChange();
    openModal('modalImportSources');
}

function fetchImportSource() {
    const url = document.getElementById('importSourceUrl').value.trim();
    if (!url) return toast('⚠️ URL requise');

    toast('⏳ Récupération en cours...');
    fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            document.getElementById('importSourceJson').value = JSON.stringify(data, null, 2);
            previewSourceImport();
        })
        .catch(err => {
            toast(`❌ Erreur: ${err.message}`);
        });
}

function previewSourceImport() {
    const raw = document.getElementById('importSourceJson').value.trim();
    if (!raw) return toast('⚠️ Aucune donnée');

    const format = document.getElementById('importSourceFormat').value;
    const preview = document.getElementById('importSourcePreview');
    const btn = document.getElementById('btnConfirmSourceImport');

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        preview.innerHTML = '<div class="preview-item invalid"><div class="preview-item-icon">✕</div><div class="preview-item-content"><div class="preview-item-error">JSON invalide</div></div></div>';
        preview.style.display = 'block';
        btn.disabled = true;
        return;
    }

    const items = parseSourceData(parsed, format);
    if (items.length === 0) {
        preview.innerHTML = '<div class="preview-item invalid"><div class="preview-item-icon">✕</div><div class="preview-item-content"><div class="preview-item-error">Aucun élément reconnu dans ce format</div></div></div>';
        preview.style.display = 'block';
        btn.disabled = true;
        return;
    }

    preview.innerHTML = items.map(i => `
        <div class="preview-item valid">
            <div class="preview-item-icon">✓</div>
            <div class="preview-item-content">
                <div class="preview-item-name">${esc(i.name)}</div>
                <div class="preview-item-details">
                    <span class="preview-item-badge type-${i.type}">${i.type.toUpperCase()}</span>
                    <span class="preview-item-badge status-${i.status}">${i.status.toUpperCase()}</span>
                    ${i.ip ? `<span>📡 ${esc(i.ip)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    preview.style.display = 'block';
    btn.disabled = false;
    toast(`👁️ ${items.length} élément(s) détecté(s)`);
}

function parseSourceData(data, format) {
    const items = [];

    if (format === 'prometheus') {
        // Prometheus targets or up metric
        if (data.data?.result) {
            data.data.result.forEach(r => {
                const name = r.metric?.instance || r.metric?.job || r.metric?.__name__ || 'unknown';
                const value = parseFloat(r.value?.[1] ?? r.values?.slice(-1)?.[0]?.[1] ?? 1);
                items.push({
                    name: name.replace(/:\d+$/, ''),
                    type: 'vm',
                    status: value >= 1 ? 'up' : 'down',
                    ip: r.metric?.instance?.match(/[\d.]+/)?.[0] || '',
                    details: `job: ${r.metric?.job || 'N/A'}`
                });
            });
        } else if (data.targets || data.activeTargets) {
            (data.targets || data.activeTargets || []).forEach(t => {
                items.push({
                    name: t.labels?.instance || t.discoveredLabels?.__address__ || 'unknown',
                    type: 'vm',
                    status: t.health === 'up' ? 'up' : t.health === 'down' ? 'down' : 'degraded',
                    ip: (t.labels?.instance || '').match(/[\d.]+/)?.[0] || '',
                    details: `job: ${t.labels?.job || 'N/A'}`
                });
            });
        }
    } else if (format === 'zabbix') {
        // Zabbix hosts API response
        const hosts = Array.isArray(data) ? data : data.result || [];
        hosts.forEach(h => {
            const available = h.available || h.status;
            items.push({
                name: h.host || h.name || 'unknown',
                type: 'vm',
                status: available === '1' || available === 1 ? 'up' : available === '2' ? 'down' : 'degraded',
                ip: h.interfaces?.[0]?.ip || '',
                details: h.description || h.groups?.map(g => g.name).join(', ') || ''
            });
        });
    } else if (format === 'json') {
        // Generic JSON array
        const arr = Array.isArray(data) ? data : data.items || data.hosts || data.nodes || data.results || [data];
        arr.forEach(item => {
            if (item.name || item.hostname || item.host) {
                items.push({
                    name: item.name || item.hostname || item.host,
                    type: normalizeType(item.type || 'vm'),
                    status: normalizeStatus(item.status || item.state || 'up'),
                    ip: item.ip || item.address || item.endpoint || '',
                    details: item.details || item.description || item.info || ''
                });
            }
        });
    }

    return items;
}

function confirmSourceImport() {
    const raw = document.getElementById('importSourceJson').value.trim();
    const format = document.getElementById('importSourceFormat').value;

    let parsed;
    try { parsed = JSON.parse(raw); } catch { return toast('❌ JSON invalide'); }

    const items = parseSourceData(parsed, format);
    if (items.length === 0) return toast('⚠️ Aucun élément à importer');

    let count = 0;
    items.forEach(i => {
        // Check if machine already exists (by name)
        const existing = state.infra.find(e => e.name === i.name);
        if (existing) {
            // Update status
            if (existing.status !== i.status) {
                existing.status = i.status;
                count++;
            }
        } else {
            state.infra.push({
                id: uid(),
                name: i.name,
                type: i.type,
                status: i.status,
                ip: i.ip,
                details: i.details,
                added: new Date().toISOString()
            });
            count++;
        }
    });

    // Save source config
    const url = document.getElementById('importSourceUrl').value.trim();
    if (url) {
        if (!state.importSources) state.importSources = [];
        const existingSource = state.importSources.find(s => s.url === url);
        if (existingSource) {
            existingSource.lastSync = new Date().toISOString();
            existingSource.format = format;
        } else {
            state.importSources.push({ url, format, lastSync: new Date().toISOString() });
        }
    }

    addLog('📡', `Import source (${format}): ${count} élément(s) importé(s)/mis à jour`);
    saveState();
    renderInfra();
    renderMetrics();
    updateGlobalStatus();
    updateInfraStatusChart();
    updateTrafficLight();
    closeModal('modalImportSources');
    toast(`📡 ${count} élément(s) importé(s)/mis à jour`);
}

// ==================== DASHBOARD SETTINGS ====================
function openDashboardSettings() {
    renderDashboardSettingsUI();
    syncSidebarChannels();
    document.getElementById('dsSidebar').classList.add('open');
    document.getElementById('dsSidebarBackdrop').classList.add('open');
}

function closeDashboardSettings() {
    document.getElementById('dsSidebar').classList.remove('open');
    document.getElementById('dsSidebarBackdrop').classList.remove('open');
}

function renderDashboardSettingsUI() {
    const container = document.getElementById('dsCategories');
    if (!container) return;
    const settings = state.dashboardSettings || {};
    let html = '';

    for (const [catKey, cat] of Object.entries(DASHBOARD_ELEMENTS)) {
        const childKeys = Object.keys(cat.children);
        const visibleCount = childKeys.filter(k => settings[k] !== false).length;
        const allVisible = visibleCount === childKeys.length;

        html += `<div class="ds-category" data-cat="${catKey}">`;
        html += `<div class="ds-category-header" onclick="dsToggleCollapse(this)">`;
        html += `<span class="ds-chevron">\u25BC</span>`;
        html += `<span class="ds-category-icon">${cat.icon}</span>`;
        html += `<span class="ds-category-label">${cat.label}</span>`;
        html += `<span class="ds-category-count">${visibleCount}/${childKeys.length}</span>`;
        html += `<div class="ds-item-toggle" onclick="event.stopPropagation()">`;
        html += `<label class="tl-switch"><input type="checkbox" ${allVisible ? 'checked' : ''} onchange="dsMasterToggle('${catKey}', this.checked)"><span class="tl-switch-slider"></span></label>`;
        html += `</div></div>`;
        html += `<div class="ds-children">`;

        for (const [elemKey, elem] of Object.entries(cat.children)) {
            const isVisible = settings[elemKey] !== false;
            html += `<div class="ds-item ${isVisible ? '' : 'ds-disabled'}" onclick="dsClickRow('${elemKey}', this)">`;
            html += `<span class="ds-item-type">${elem.type}</span>`;
            html += `<div class="ds-item-info"><span class="ds-item-label">${elem.label}</span><span class="ds-item-desc">${elem.desc}</span></div>`;
            html += `<div class="ds-item-toggle"><label class="tl-switch" onclick="event.stopPropagation()"><input type="checkbox" ${isVisible ? 'checked' : ''} onchange="dsItemToggle('${elemKey}', this.checked)"><span class="tl-switch-slider"></span></label></div>`;
            html += `</div>`;
        }

        html += `</div></div>`;
    }

    container.innerHTML = html;

    // Disable "Tout afficher" button when everything is already visible
    const resetBtn = document.getElementById('dsResetBtn');
    const allShown = !Object.values(settings).some(v => v === false);
    if (resetBtn) resetBtn.disabled = allShown;
}

function dsToggleCollapse(headerEl) {
    headerEl.closest('.ds-category').classList.toggle('collapsed');
}

function dsClickRow(elemKey, rowEl) {
    const cb = rowEl.querySelector('input[type="checkbox"]');
    if (cb) {
        cb.checked = !cb.checked;
        dsItemToggle(elemKey, cb.checked);
    }
}

function dsMasterToggle(catKey, checked) {
    if (!state.dashboardSettings) state.dashboardSettings = {};
    const children = DASHBOARD_ELEMENTS[catKey].children;
    for (const key of Object.keys(children)) {
        if (checked) {
            delete state.dashboardSettings[key];
        } else {
            state.dashboardSettings[key] = false;
        }
    }
    saveState();
    applyDashboardSettings();
    renderDashboardSettingsUI();
}

function dsItemToggle(elemKey, checked) {
    if (!state.dashboardSettings) state.dashboardSettings = {};
    if (checked) {
        delete state.dashboardSettings[elemKey];
    } else {
        state.dashboardSettings[elemKey] = false;
    }
    saveState();
    applyDashboardSettings();
    renderDashboardSettingsUI();
}

function dsResetAll() {
    state.dashboardSettings = {};
    saveState();
    applyDashboardSettings();
    renderDashboardSettingsUI();
    toast('⚙️ Tous les éléments sont affichés');
}

function applyDashboardSettings() {
    const settings = state.dashboardSettings || {};
    document.querySelectorAll('[data-settings-id]').forEach(el => {
        if (settings[el.dataset.settingsId] === false) {
            el.classList.add('ds-hidden');
        } else {
            el.classList.remove('ds-hidden');
        }
    });
    updateMetricGroupVisibility();
    // Resize visible charts
    setTimeout(() => {
        [activityChart, infraStatusChartInstance, priorityChartInstance, impactsTimelineChartInstance, pricingChartInstance].forEach(c => { if (c) c.resize(); });
        if (window.trafficLightChartInstance) window.trafficLightChartInstance.resize();
        updateSectionDividers();
    }, 50);
}

// ==================== SIDEBAR: CHANNELS ====================
function dsToggleChannels(headerEl) {
    headerEl.closest('.ds-channels-section').classList.toggle('collapsed');
}

function syncSidebarChannels() {
    const channels = state.channels || DEFAULT_STATE.channels;
    const fields = ['Slack', 'Email', 'Teams', 'Mattermost', 'Discord', 'Other'];
    fields.forEach(f => {
        const el = document.getElementById('dsChannel' + f);
        if (el) el.value = channels[f.toLowerCase()] || '';
    });
}

function dsSaveChannels() {
    state.channels = {
        slack: (document.getElementById('dsChannelSlack')?.value || '').trim(),
        email: (document.getElementById('dsChannelEmail')?.value || '').trim(),
        teams: (document.getElementById('dsChannelTeams')?.value || '').trim(),
        mattermost: (document.getElementById('dsChannelMattermost')?.value || '').trim(),
        discord: (document.getElementById('dsChannelDiscord')?.value || '').trim(),
        other: (document.getElementById('dsChannelOther')?.value || '').trim()
    };
    saveState();
    renderChannels();
}

function dsGetLabel(key) {
    for (const cat of Object.values(DASHBOARD_ELEMENTS)) {
        if (cat.children[key]) return cat.children[key].label;
    }
    return key;
}

function initDsHideButtons() {
    document.querySelectorAll('[data-settings-id]').forEach(el => {
        if (el.querySelector('.ds-hide-btn')) return;
        const key = el.dataset.settingsId;
        const cs = getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';

        const btn = document.createElement('button');
        btn.className = 'ds-hide-btn';
        btn.title = 'Maintenir 2s pour masquer : ' + dsGetLabel(key);
        btn.innerHTML = '<span class="ds-hide-icon">👁️</span><span class="ds-hide-fill"></span>';

        let timer = null;
        let fillEl = null;

        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            fillEl = btn.querySelector('.ds-hide-fill');
            fillEl.classList.add('filling');
            timer = setTimeout(() => {
                fillEl.classList.remove('filling');
                state.dashboardSettings = state.dashboardSettings || {};
                state.dashboardSettings[key] = false;
                saveState();
                applyDashboardSettings();
                renderDashboardSettingsUI();
                toast('👁️‍🗨️ ' + dsGetLabel(key) + ' masqué — réafficher via ⚙️');
            }, 2000);
        });

        const cancel = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            const f = btn.querySelector('.ds-hide-fill');
            if (f) f.classList.remove('filling');
        };
        btn.addEventListener('mouseup', cancel);
        btn.addEventListener('mouseleave', cancel);

        el.appendChild(btn);
    });
}
