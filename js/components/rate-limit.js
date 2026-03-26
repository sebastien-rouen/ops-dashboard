// ==================== RATE LIMITING ====================

// Résolution des paramètres utilisateur avec fallback sur DASHBOARD_CONFIG
function getRateLimitSettings() {
    return {
        windowSec: DASHBOARD_CONFIG.rateLimitDefaultWindowSec,
        thresholds: {
            warning: state.rateLimitSettings?.thresholds?.warning ?? DASHBOARD_CONFIG.rateLimitDefaultWarning,
            critical: state.rateLimitSettings?.thresholds?.critical ?? DASHBOARD_CONFIG.rateLimitDefaultCritical
        }
    };
}

// ---- Compute stats (fenêtre configurée dans DASHBOARD_CONFIG) ----
function computeRateLimitStats() {
    const events = state.rateLimitEvents || [];
    if (events.length === 0) return null;

    const now = Date.now();
    const last24h = events.filter(e => now - new Date(e.ts).getTime() < DASHBOARD_CONFIG.rateLimitStatsWindowMs);
    if (last24h.length === 0) return null;

    const totalEvents = last24h.length;
    const blockedEvents = last24h.filter(e => e.blocked).length;
    const blockRate = totalEvents > 0 ? (blockedEvents / totalEvents * 100) : 0;

    // Peak rate: max req/min from any single event
    let peakRate = 0;
    last24h.forEach(e => {
        const ratePerMin = e.reqCount / Math.max(e.windowSec / 60, 0.01);
        if (ratePerMin > peakRate) peakRate = ratePerMin;
    });

    // IP and endpoint counts
    const ipCounts = {};
    const endpointCounts = {};
    last24h.forEach(e => {
        if (e.ip) ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
        if (e.endpoint) endpointCounts[e.endpoint] = (endpointCounts[e.endpoint] || 0) + 1;
    });

    const uniqueIPs = Object.keys(ipCounts).length;
    const uniqueEndpoints = Object.keys(endpointCounts).length;

    return { totalEvents, blockedEvents, blockRate, peakRate, uniqueIPs, uniqueEndpoints, ipCounts, endpointCounts, last24h };
}

// ---- Attack pattern detection ----
function detectAttackPattern(stats) {
    if (!stats || stats.totalEvents === 0) return null;
    const { uniqueIPs, uniqueEndpoints, peakRate, totalEvents } = stats;

    if (uniqueIPs === 1 && uniqueEndpoints <= 1 && peakRate > 100) {
        return { type: 'brute-force', label: 'Brute Force', icon: '🔴', desc: 'Une seule IP ciblant un endpoint unique à très haute fréquence' };
    }
    if (uniqueIPs > 10 && uniqueEndpoints <= 2 && totalEvents > 30) {
        return { type: 'ddos', label: 'DDoS', icon: '🟠', desc: 'Nombreuses IPs concentrées sur un ou deux endpoints' };
    }
    if (uniqueIPs <= 2 && uniqueEndpoints > 5) {
        return { type: 'scan', label: 'Scan / Énumération', icon: '🟡', desc: 'IP(s) unique(s) parcourant de nombreux endpoints différents' };
    }
    if (uniqueIPs > 3 && uniqueEndpoints > 3) {
        return { type: 'flood', label: 'Flood distribué', icon: '🔶', desc: 'Multiples IPs ciblant plusieurs endpoints simultanément' };
    }
    if (totalEvents >= 5) {
        return { type: 'anomaly', label: 'Anomalie', icon: '⚠️', desc: 'Activité inhabituelle — analyse manuelle recommandée' };
    }
    return null;
}

// ---- Render metric card ----
function renderRateLimitMetric() {
    const el = document.getElementById('metricRateLimit');
    const summaryEl = document.getElementById('metricRateLimitSummary');
    if (!el) return;

    const stats = computeRateLimitStats();
    const card = el.closest('.metric-card');
    const settings = getRateLimitSettings();

    if (!stats) {
        el.textContent = '0';
        if (summaryEl) summaryEl.innerHTML = '';
        if (card) { card.classList.remove('rl-has-critical', 'rl-has-alert'); }
        return;
    }

    el.textContent = stats.totalEvents;

    const isCritical = stats.peakRate >= settings.thresholds.critical;
    const isWarning = stats.peakRate >= settings.thresholds.warning;

    if (card) {
        card.classList.toggle('rl-has-critical', isCritical);
        card.classList.toggle('rl-has-alert', isWarning && !isCritical);
    }

    if (summaryEl) {
        const parts = [];
        if (stats.blockedEvents > 0) parts.push(`<span class="mms-sev mms-crit">🚫 ${stats.blockedEvents}</span>`);
        if (stats.uniqueIPs > 0) parts.push(`<span class="mms-sev">🌐 ${stats.uniqueIPs} IP</span>`);
        summaryEl.innerHTML = parts.join('<span class="mms-sep"></span>');
    }
}

// ---- Add a rate-limit event ----
function addRateLimitEvent() {
    const ip = document.getElementById('rlIp')?.value.trim() || '';
    const endpoint = document.getElementById('rlEndpoint')?.value.trim() || '';
    const reqCount = parseInt(document.getElementById('rlReqCount')?.value) || 0;
    const windowSec = parseInt(document.getElementById('rlWindowSec')?.value) || DASHBOARD_CONFIG.rateLimitDefaultWindowSec;
    const blocked = document.getElementById('rlBlocked')?.checked || false;
    const note = document.getElementById('rlNote')?.value.trim() || '';

    if (!ip || reqCount <= 0) { toast('⚠️ IP et nombre de requêtes requis'); return; }

    if (!state.rateLimitEvents) state.rateLimitEvents = [];

    const event = { id: uid(), ts: new Date().toISOString(), ip, endpoint, reqCount, windowSec, blocked, note };
    state.rateLimitEvents.unshift(event);

    if (state.rateLimitEvents.length > DASHBOARD_CONFIG.rateLimitMaxEvents) {
        state.rateLimitEvents = state.rateLimitEvents.slice(0, DASHBOARD_CONFIG.rateLimitMaxEvents);
    }

    saveState();

    // Alert on thresholds
    const settings = getRateLimitSettings();
    const ratePerMin = reqCount / Math.max(windowSec / 60, 0.01);
    if (ratePerMin >= settings.thresholds.critical) {
        toast(`🚨 CRITIQUE — ${ip} : ${Math.round(ratePerMin)} req/min`);
        addLog('🚨', `Rate limit critique : ${ip}${endpoint ? ' → ' + endpoint : ''} — ${Math.round(ratePerMin)} req/min`);
    } else if (ratePerMin >= settings.thresholds.warning) {
        toast(`⚠️ Rate limit warning — ${ip} : ${Math.round(ratePerMin)} req/min`);
        addLog('⚠️', `Rate limit warning : ${ip}${endpoint ? ' → ' + endpoint : ''} — ${Math.round(ratePerMin)} req/min`);
    } else {
        addLog('🛡️', `Rate limit event : ${ip} — ${reqCount} req / ${windowSec}s`);
    }

    // Reset form
    ['rlIp', 'rlEndpoint', 'rlNote'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const rlReq = document.getElementById('rlReqCount'); if (rlReq) rlReq.value = '';
    const rlWin = document.getElementById('rlWindowSec'); if (rlWin) rlWin.value = String(DASHBOARD_CONFIG.rateLimitDefaultWindowSec);
    const rlBlocked = document.getElementById('rlBlocked'); if (rlBlocked) rlBlocked.checked = false;

    renderRateLimitMetric();
    updateRateLimitChart();
    if (document.getElementById('modalRateLimit')?.classList.contains('show')) openRateLimitDetail();
}

// ---- Remove an event ----
function removeRateLimitEvent(id) {
    state.rateLimitEvents = (state.rateLimitEvents || []).filter(e => e.id !== id);
    saveState();
    renderRateLimitMetric();
    updateRateLimitChart();
    if (document.getElementById('modalRateLimit')?.classList.contains('show')) openRateLimitDetail();
}

// ---- Save alert settings ----
function saveRateLimitSettings() {
    const warn = parseInt(document.getElementById('rlThreshWarn')?.value) || DASHBOARD_CONFIG.rateLimitDefaultWarning;
    const crit = parseInt(document.getElementById('rlThreshCrit')?.value) || DASHBOARD_CONFIG.rateLimitDefaultCritical;
    if (!state.rateLimitSettings) state.rateLimitSettings = {};
    state.rateLimitSettings.thresholds = { warning: warn, critical: crit };
    saveState();
    toast('✅ Seuils sauvegardés');
    renderRateLimitMetric();
}

// ---- Open detail modal ----
function openRateLimitDetail() {
    const container = document.getElementById('rateLimitDetailContent');
    if (!container) return;

    const stats = computeRateLimitStats();
    const settings = getRateLimitSettings();

    let html = '<div class="sre-detail">';

    // --- Add form ---
    html += `<div class="rl-add-form">
        <div class="rl-form-header">
            <span class="rl-form-header-icon">🛡️</span>
            <span class="rl-form-header-title">Enregistrer un événement</span>
            <span class="rl-form-header-hint">Documenter une détection de rate limiting</span>
        </div>
        <div class="rl-form-grid">
            <div class="rl-field">
                <label class="rl-field-label">Source IP</label>
                <input id="rlIp" type="text" placeholder="192.168.1.42" class="rl-input" autocomplete="off" />
            </div>
            <div class="rl-field">
                <label class="rl-field-label">Endpoint ciblé</label>
                <input id="rlEndpoint" type="text" placeholder="/api/login" class="rl-input" autocomplete="off" />
            </div>
            <div class="rl-field">
                <label class="rl-field-label">Fréquence</label>
                <div class="rl-rate-group">
                    <input id="rlReqCount" type="number" placeholder="100" min="1" class="rl-input" />
                    <span class="rl-rate-sep">req /</span>
                    <input id="rlWindowSec" type="number" value="${DASHBOARD_CONFIG.rateLimitDefaultWindowSec}" min="1" class="rl-input rl-input-small" />
                    <span class="rl-rate-unit">s</span>
                </div>
            </div>
            <div class="rl-field">
                <label class="rl-field-label">Note libre</label>
                <input id="rlNote" type="text" placeholder="Contexte, source WAF, règle…" class="rl-input" autocomplete="off" />
            </div>
        </div>
        <div class="rl-form-actions">
            <label class="rl-toggle-wrap">
                <input type="checkbox" id="rlBlocked" class="rl-toggle-input">
                <span class="rl-toggle-track"></span>
                <span class="rl-toggle-label">Bloqué</span>
            </label>
            <button class="btn btn-primary" onclick="addRateLimitEvent()">➕ Ajouter</button>
        </div>
    </div>`;

    if (!stats) {
        html += '<div class="gl-detail-empty">Aucun événement enregistré sur les dernières 24h — utilisez le formulaire ci-dessus pour documenter les attaques détectées.</div>';
        html += `<div class="sre-section-title" style="margin-top:16px">Seuils d'alerte</div>
        <div class="rl-thresholds">
            <div class="rl-threshold-card rl-thresh-warn">
                <span class="rl-thresh-icon">⚠️</span>
                <div class="rl-thresh-body">
                    <span class="rl-thresh-label">Warning</span>
                    <div class="rl-thresh-input-row">
                        <input type="number" id="rlThreshWarn" value="${settings.thresholds.warning}" min="1" class="rl-thresh-input">
                        <span class="rl-thresh-unit">req / min</span>
                    </div>
                </div>
            </div>
            <div class="rl-threshold-card rl-thresh-crit">
                <span class="rl-thresh-icon">🚨</span>
                <div class="rl-thresh-body">
                    <span class="rl-thresh-label">Critique</span>
                    <div class="rl-thresh-input-row">
                        <input type="number" id="rlThreshCrit" value="${settings.thresholds.critical}" min="1" class="rl-thresh-input">
                        <span class="rl-thresh-unit">req / min</span>
                    </div>
                </div>
            </div>
            <button class="btn btn-small btn-secondary" onclick="saveRateLimitSettings()">Enregistrer</button>
        </div>`;
        html += '</div>';
        container.innerHTML = html;
        openModal('modalRateLimit');
        return;
    }

    // --- Pattern badge ---
    const pattern = detectAttackPattern(stats);
    if (pattern) {
        const patternColors = {
            'brute-force': 'rgba(220,38,38,0.15);color:var(--red)',
            'ddos': 'rgba(249,115,22,0.15);color:var(--orange)',
            'scan': 'rgba(245,158,11,0.15);color:var(--yellow)',
            'flood': 'rgba(249,115,22,0.12);color:var(--orange)',
            'anomaly': 'rgba(245,158,11,0.1);color:var(--yellow)'
        };
        const pColor = patternColors[pattern.type] || 'rgba(255,255,255,0.1);color:var(--text)';
        html += `<div class="sre-level-row">
            <span class="sre-level" style="background:${pColor.split(';')[0]};${pColor.split(';')[1] || ''}">${pattern.icon} ${pattern.label}</span>
            <span class="sre-level-hint">${esc(pattern.desc)}</span>
        </div>`;
    }

    // --- Stat cards ---
    const peakColor = stats.peakRate >= settings.thresholds.critical ? 'var(--red)' : stats.peakRate >= settings.thresholds.warning ? 'var(--yellow)' : 'var(--green)';
    html += `<div class="sre-stats">
        <div class="sre-stat"><span class="sre-stat-val">${stats.totalEvents}</span><span class="sre-stat-label">Événements 24h</span></div>
        <div class="sre-stat"><span class="sre-stat-val" style="color:var(--red)">${stats.blockedEvents}</span><span class="sre-stat-label">Bloqués</span></div>
        <div class="sre-stat"><span class="sre-stat-val" style="color:${peakColor}">${Math.round(stats.peakRate)}</span><span class="sre-stat-label">Pic req/min</span></div>
        <div class="sre-stat"><span class="sre-stat-val">${stats.uniqueIPs}</span><span class="sre-stat-label">IPs uniques</span></div>
        <div class="sre-stat"><span class="sre-stat-val">${stats.uniqueEndpoints}</span><span class="sre-stat-label">Endpoints ciblés</span></div>
        <div class="sre-stat"><span class="sre-stat-val">${stats.blockRate.toFixed(0)}%</span><span class="sre-stat-label">Taux de blocage</span></div>
    </div>`;

    // --- Intensity bar ---
    const intensityPct = Math.min(stats.peakRate / settings.thresholds.critical * 100, 100).toFixed(1);
    const barClass = stats.peakRate >= settings.thresholds.critical ? 'red' : stats.peakRate >= settings.thresholds.warning ? 'yellow' : 'green';
    html += `<div class="sre-section-title">Intensité du pic — ${Math.round(stats.peakRate)} req/min (seuil critique : ${settings.thresholds.critical})</div>
    <div class="sre-progress">
        <div class="sre-progress-fill ${barClass}" style="width:${intensityPct}%"></div>
    </div>`;

    // --- Top IPs ---
    const topIPs = Object.entries(stats.ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (topIPs.length > 0) {
        html += '<div class="sre-section-title">Top IPs</div><div class="sre-list">';
        topIPs.forEach(([ip, count]) => {
            const ipEvents = stats.last24h.filter(e => e.ip === ip);
            const ipBlocked = ipEvents.filter(e => e.blocked).length;
            const ipPeak = Math.max(...ipEvents.map(e => e.reqCount / Math.max(e.windowSec / 60, 0.01)));
            const ipPeakColor = ipPeak >= settings.thresholds.critical ? 'var(--red)' : ipPeak >= settings.thresholds.warning ? 'var(--yellow)' : 'var(--text-muted)';
            html += `<div class="sre-item">
                <span class="sre-item-name" style="font-family:monospace;font-size:0.82rem">${esc(ip)}</span>
                <span class="sre-item-meta" style="color:${ipPeakColor}">pic : ${Math.round(ipPeak)} req/min</span>
                ${ipBlocked ? `<span class="sre-item-badge" style="background:rgba(220,38,38,0.15);color:var(--red)">🚫 ${ipBlocked} bloqué${ipBlocked > 1 ? 's' : ''}</span>` : ''}
                <span class="sre-item-badge" style="background:var(--bg-input);color:var(--text-secondary)">${count} evt</span>
            </div>`;
        });
        html += '</div>';
    }

    // --- Top endpoints ---
    const topEndpoints = Object.entries(stats.endpointCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topEndpoints.length > 0) {
        html += '<div class="sre-section-title">Endpoints ciblés</div><div class="sre-list">';
        topEndpoints.forEach(([ep, count]) => {
            const pct = (count / stats.totalEvents * 100).toFixed(0);
            html += `<div class="sre-item">
                <span class="sre-item-name" style="font-family:monospace;font-size:0.78rem">${esc(ep)}</span>
                <span class="sre-item-badge" style="background:var(--bg-input);color:var(--text-secondary)">${count} evt · ${pct}%</span>
            </div>`;
        });
        html += '</div>';
    }

    // --- Recent events ---
    html += '<div class="sre-section-title">Historique récent (20 derniers)</div><div class="sre-list">';
    stats.last24h.slice(0, 20).forEach(e => {
        const ratePerMin = e.reqCount / Math.max(e.windowSec / 60, 0.01);
        const rateColor = ratePerMin >= settings.thresholds.critical ? 'var(--red)' : ratePerMin >= settings.thresholds.warning ? 'var(--yellow)' : 'var(--text-muted)';
        html += `<div class="sre-item">
            ${e.blocked
                ? '<span class="sre-item-badge" style="background:rgba(220,38,38,0.15);color:var(--red);flex-shrink:0">🚫 bloqué</span>'
                : '<span class="sre-item-badge" style="background:rgba(245,158,11,0.1);color:var(--yellow);flex-shrink:0">⚠️ détecté</span>'}
            <span class="sre-item-name" style="font-family:monospace;font-size:0.8rem">${esc(e.ip)}</span>
            ${e.endpoint ? `<span class="sre-item-meta" style="font-family:monospace;font-size:0.72rem;max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(e.endpoint)}</span>` : ''}
            <span class="sre-item-meta" style="color:${rateColor}">${Math.round(ratePerMin)} req/min</span>
            <span class="sre-item-meta">${timeAgo(e.ts)}</span>
            ${e.note ? `<span class="sre-item-meta" style="font-style:italic">${esc(e.note)}</span>` : ''}
            <button class="rl-btn-remove" onclick="removeRateLimitEvent('${e.id}')" title="Supprimer">✕</button>
        </div>`;
    });
    html += '</div>';

    // --- Alert settings ---
    html += `<div class="sre-section-title">Seuils d'alerte</div>
    <div class="rl-thresholds">
        <div class="rl-threshold-card rl-thresh-warn">
            <span class="rl-thresh-icon">⚠️</span>
            <div class="rl-thresh-body">
                <span class="rl-thresh-label">Warning</span>
                <div class="rl-thresh-input-row">
                    <input type="number" id="rlThreshWarn" value="${settings.thresholds.warning}" min="1" class="rl-thresh-input">
                    <span class="rl-thresh-unit">req / min</span>
                </div>
            </div>
        </div>
        <div class="rl-threshold-card rl-thresh-crit">
            <span class="rl-thresh-icon">🚨</span>
            <div class="rl-thresh-body">
                <span class="rl-thresh-label">Critique</span>
                <div class="rl-thresh-input-row">
                    <input type="number" id="rlThreshCrit" value="${settings.thresholds.critical}" min="1" class="rl-thresh-input">
                    <span class="rl-thresh-unit">req / min</span>
                </div>
            </div>
        </div>
        <button class="btn btn-small btn-secondary" onclick="saveRateLimitSettings()">Enregistrer</button>
    </div>`;

    html += '</div>';
    container.innerHTML = html;
    openModal('modalRateLimit');
}

// ---- Chart: événements par fenêtre (DASHBOARD_CONFIG) ----
function updateRateLimitChart() {
    const canvas = document.getElementById('rateLimitChart');
    if (!canvas) return;

    const events = state.rateLimitEvents || [];
    if (events.length === 0) {
        if (rateLimitChartInstance) { rateLimitChartInstance.destroy(); rateLimitChartInstance = null; }
        chartEmptyState('rateLimitChart', 'Aucun événement rate limiting');
        return;
    }

    const now = Date.now();
    const bucketCount = DASHBOARD_CONFIG.rateLimitChartBuckets;
    const bucketMs = DASHBOARD_CONFIG.rateLimitChartBucketMs;
    const labels = [];
    const allData = new Array(bucketCount).fill(0);
    const blockedData = new Array(bucketCount).fill(0);

    for (let i = bucketCount - 1; i >= 0; i--) {
        const bucketStart = now - (i + 1) * bucketMs;
        labels.push(new Date(bucketStart + bucketMs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }

    events.forEach(e => {
        const diffMs = now - new Date(e.ts).getTime();
        if (diffMs < 0 || diffMs >= bucketCount * bucketMs) return;
        const idx = bucketCount - 1 - Math.floor(diffMs / bucketMs);
        if (idx >= 0 && idx < bucketCount) {
            allData[idx]++;
            if (e.blocked) blockedData[idx]++;
        }
    });

    const colors = getChartColors();
    const datasets = [
        {
            label: 'Événements',
            data: allData,
            borderColor: 'rgba(245,158,11,0.9)',
            backgroundColor: 'rgba(245,158,11,0.1)',
            fill: true, tension: 0.3, pointRadius: 3
        },
        {
            label: 'Bloqués',
            data: blockedData,
            borderColor: 'rgba(220,38,38,0.9)',
            backgroundColor: 'rgba(220,38,38,0.1)',
            fill: true, tension: 0.3, pointRadius: 3
        }
    ];

    if (rateLimitChartInstance) {
        rateLimitChartInstance.data.labels = labels;
        rateLimitChartInstance.data.datasets = datasets;
        rateLimitChartInstance.update();
    } else {
        chartEmptyState('rateLimitChart', '', true);
        rateLimitChartInstance = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.text, usePointStyle: true, padding: 16 } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
                    y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text, stepSize: 1 } }
                }
            }
        });
    }
}
