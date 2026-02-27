// ==================== SRE INDICATORS ====================

// ---- MTTR (Mean Time To Recover) ----
function computeMTTR() {
    const resolved = state.impacts.filter(i => !i.active && i.resolvedAt && i.time);
    if (resolved.length === 0) return null;

    let totalMs = 0;
    resolved.forEach(i => {
        totalMs += new Date(i.resolvedAt).getTime() - new Date(i.time).getTime();
    });
    return totalMs / resolved.length;
}

function formatDurationShort(ms) {
    if (ms < 0) return '—';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return totalMin + 'min';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h < 24) return h + 'h' + (m > 0 ? m.toString().padStart(2, '0') : '');
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return d + 'j' + (rh > 0 ? rh + 'h' : '');
}

function renderMTTRMetric() {
    const el = document.getElementById('metricMTTR');
    if (!el) return;

    const mttr = computeMTTR();
    if (mttr === null) {
        el.textContent = '—';
        return;
    }
    el.textContent = formatDurationShort(mttr);
}

function getDoraLevel(metric, value) {
    if (metric === 'mttr') {
        const hours = value / 3600000;
        if (hours < 1) return { level: 'elite', label: 'Elite', hint: '< 1 heure' };
        if (hours < 24) return { level: 'high', label: 'High', hint: '< 24 heures' };
        if (hours / 24 < 7) return { level: 'medium', label: 'Medium', hint: '< 7 jours' };
        return { level: 'low', label: 'Low', hint: '> 7 jours' };
    }
    if (metric === 'deploy') {
        if (value >= 1) return { level: 'elite', label: 'Elite', hint: 'Quotidien ou plus' };
        if (value >= 1 / 7) return { level: 'high', label: 'High', hint: 'Hebdomadaire' };
        if (value >= 1 / 30) return { level: 'medium', label: 'Medium', hint: 'Mensuel' };
        return { level: 'low', label: 'Low', hint: '< 1 / mois' };
    }
    if (metric === 'cfr') {
        if (value <= 5) return { level: 'elite', label: 'Elite', hint: '0 – 5%' };
        if (value <= 10) return { level: 'high', label: 'High', hint: '5 – 10%' };
        if (value <= 15) return { level: 'medium', label: 'Medium', hint: '10 – 15%' };
        return { level: 'low', label: 'Low', hint: '> 15%' };
    }
    return { level: 'medium', label: '—', hint: '' };
}

function openMTTRDetail() {
    const resolved = state.impacts.filter(i => !i.active && i.resolvedAt && i.time);
    const container = document.getElementById('mttrDetailContent');
    if (!container) return;

    if (resolved.length === 0) {
        container.innerHTML = '<div class="gl-detail-empty">Aucun impact résolu avec horodatage — le MTTR sera calculé automatiquement à partir des impacts résolus.</div>';
        openModal('modalMTTR');
        return;
    }

    const mttr = computeMTTR();
    const items = resolved.map(i => {
        const dur = new Date(i.resolvedAt).getTime() - new Date(i.time).getTime();
        return { ...i, duration: dur };
    }).sort((a, b) => b.duration - a.duration);

    const best = Math.min(...items.map(i => i.duration));
    const worst = Math.max(...items.map(i => i.duration));
    const median = items.length > 0 ? items[Math.floor(items.length / 2)].duration : 0;
    const dora = getDoraLevel('mttr', mttr);

    let html = '<div class="sre-detail">';

    // DORA level
    html += `<div class="sre-level-row">
        <span class="sre-level sre-level-${dora.level}">DORA ${dora.label}</span>
        <span class="sre-level-hint">${dora.hint}</span>
    </div>`;

    // Stat cards
    html += `<div class="sre-stats">
        <div class="sre-stat">
            <span class="sre-stat-val">${formatDurationShort(mttr)}</span>
            <span class="sre-stat-label">MTTR moyen</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val">${formatDurationShort(median)}</span>
            <span class="sre-stat-label">Médiane</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:var(--green)">${formatDurationShort(best)}</span>
            <span class="sre-stat-label">Meilleur</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:var(--red)">${formatDurationShort(worst)}</span>
            <span class="sre-stat-label">Pire</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val">${resolved.length}</span>
            <span class="sre-stat-label">Impacts résolus</span>
        </div>
    </div>`;

    // Severity breakdown bar
    const bySev = { critical: 0, major: 0, warning: 0 };
    items.forEach(i => { if (bySev[i.severity] !== undefined) bySev[i.severity]++; });
    const total = items.length;
    html += '<div class="sre-section-title">Répartition par sévérité</div>';
    html += '<div class="sre-progress">';
    if (bySev.critical > 0) html += `<div class="sre-progress-fill red" style="width:${(bySev.critical / total * 100).toFixed(1)}%" title="Critical: ${bySev.critical}"></div>`;
    if (bySev.major > 0) html += `<div class="sre-progress-fill yellow" style="width:${(bySev.major / total * 100).toFixed(1)}%" title="Major: ${bySev.major}"></div>`;
    if (bySev.warning > 0) html += `<div class="sre-progress-fill accent" style="width:${(bySev.warning / total * 100).toFixed(1)}%" title="Warning: ${bySev.warning}"></div>`;
    html += '</div>';

    // Detail list
    html += '<div class="sre-section-title">Détail des impacts résolus</div>';
    html += '<div class="sre-list">';
    items.forEach(i => {
        const sevCss = i.severity === 'critical' ? 'background:rgba(220,38,38,0.12);color:var(--critical)' : i.severity === 'major' ? 'background:rgba(249,115,22,0.1);color:var(--orange)' : 'background:rgba(245,158,11,0.1);color:var(--yellow)';
        html += `<div class="sre-item">
            <span class="sre-item-badge" style="${sevCss}">${i.severity}</span>
            <span class="sre-item-name">${esc(i.title)}</span>
            <span class="sre-item-meta">${formatDurationShort(i.duration)}</span>
            <span class="sre-item-meta">${timeAgo(i.resolvedAt)}</span>
        </div>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
    openModal('modalMTTR');
}

// ---- Deployment Frequency ----
function computeDeployFrequency() {
    let totalCommits = 0;
    let hasData = false;

    // GitLab commits
    const glCache = state.gitlabCommitsCache || {};
    Object.values(glCache).forEach(c => {
        if (c && c.commits && c.commits.length > 0) {
            totalCommits += c.commits.length;
            hasData = true;
        }
    });

    // GitHub commits
    const ghCache = state.githubCommitsCache || {};
    Object.values(ghCache).forEach(c => {
        if (c && c.commits && c.commits.length > 0) {
            totalCommits += c.commits.length;
            hasData = true;
        }
    });

    if (!hasData) return null;
    return totalCommits / 7; // per day over 7-day window
}

function renderDeployFrequencyMetric() {
    const el = document.getElementById('metricDeployFreq');
    if (!el) return;

    const card = el.closest('.metric-card');
    const hasGlRepos = (state.gitlabRepos || []).length > 0;
    const hasGhRepos = (state.githubRepos || []).length > 0;
    if (!hasGlRepos && !hasGhRepos) {
        if (card) card.classList.add('no-source');
        el.textContent = '—';
        return;
    }
    if (card) card.classList.remove('no-source');

    const freq = computeDeployFrequency();
    if (freq === null) {
        el.textContent = '—';
        return;
    }
    el.textContent = freq < 1 ? freq.toFixed(1) : Math.round(freq);
}

function openDeployFrequencyDetail() {
    const container = document.getElementById('deployFreqDetailContent');
    if (!container) return;

    const glCache = state.gitlabCommitsCache || {};
    const ghCache = state.githubCommitsCache || {};
    const hasGl = Object.values(glCache).some(c => c && c.commits && c.commits.length > 0);
    const hasGh = Object.values(ghCache).some(c => c && c.commits && c.commits.length > 0);

    if (!hasGl && !hasGh) {
        container.innerHTML = '<div class="gl-detail-empty">Aucun flux de commits configuré — configurez un repo GitLab ou GitHub via 🔌 API Config pour activer cet indicateur.</div>';
        openModal('modalDeployFreq');
        return;
    }

    const freq = computeDeployFrequency();
    let totalGl = 0, totalGh = 0;
    Object.values(glCache).forEach(c => { if (c?.commits) totalGl += c.commits.length; });
    Object.values(ghCache).forEach(c => { if (c?.commits) totalGh += c.commits.length; });
    const total = totalGl + totalGh;
    const dora = getDoraLevel('deploy', freq || 0);

    let html = '<div class="sre-detail">';

    // DORA level
    html += `<div class="sre-level-row">
        <span class="sre-level sre-level-${dora.level}">DORA ${dora.label}</span>
        <span class="sre-level-hint">${dora.hint}</span>
    </div>`;

    // Stat cards
    html += `<div class="sre-stats">
        <div class="sre-stat">
            <span class="sre-stat-val">${freq < 1 ? freq.toFixed(1) : Math.round(freq)}</span>
            <span class="sre-stat-label">Commits / jour</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val">${total}</span>
            <span class="sre-stat-label">Total (7 jours)</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:#fc6d26">${totalGl}</span>
            <span class="sre-stat-label">GitLab</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:#8b5cf6">${totalGh}</span>
            <span class="sre-stat-label">GitHub</span>
        </div>
    </div>`;

    // Distribution bar GL vs GH
    if (total > 0) {
        const glPct = (totalGl / total * 100).toFixed(1);
        const ghPct = (totalGh / total * 100).toFixed(1);
        html += '<div class="sre-section-title">Répartition GitLab / GitHub</div>';
        html += '<div class="sre-progress">';
        if (totalGl > 0) html += `<div class="sre-progress-fill yellow" style="width:${glPct}%;background:#fc6d26" title="GitLab: ${totalGl}"></div>`;
        if (totalGh > 0) html += `<div class="sre-progress-fill accent" style="width:${ghPct}%;background:#8b5cf6" title="GitHub: ${totalGh}"></div>`;
        html += '</div>';
    }

    // Per-repo breakdown
    html += '<div class="sre-section-title">Détail par dépôt</div>';
    html += '<div class="sre-list">';

    // Build sorted list of all repos with counts
    const allRepos = [];
    const glRepos = state.gitlabRepos || [];
    glRepos.forEach(r => {
        const count = glCache[r.id]?.commits?.length || 0;
        allRepos.push({ icon: '🦊', name: r.name, count, perDay: (count / 7) });
    });
    const ghRepos = state.githubRepos || [];
    ghRepos.forEach(r => {
        const count = ghCache[r.id]?.commits?.length || 0;
        allRepos.push({ icon: '🐙', name: r.name, count, perDay: (count / 7) });
    });
    allRepos.sort((a, b) => b.count - a.count);

    allRepos.forEach(r => {
        const barW = total > 0 ? (r.count / total * 100).toFixed(1) : 0;
        html += `<div class="sre-item">
            <span class="sre-item-icon">${r.icon}</span>
            <span class="sre-item-name">${esc(r.name)}</span>
            <span class="sre-item-meta">${r.perDay < 1 ? r.perDay.toFixed(1) : Math.round(r.perDay)}/j</span>
            <span class="sre-item-badge" style="background:var(--bg-input);color:var(--text-secondary);min-width:50px;text-align:center">${r.count} commits</span>
        </div>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
    openModal('modalDeployFreq');
}

// ---- Change Failure Rate ----
function computeChangeFailureRate() {
    let totalRuns = 0;
    let failedRuns = 0;
    let hasData = false;

    // GitLab pipelines
    const glPipelines = state.gitlabPipelinesCache || {};
    Object.values(glPipelines).forEach(c => {
        if (c && c.pipelines && c.pipelines.length > 0) {
            hasData = true;
            c.pipelines.forEach(p => {
                totalRuns++;
                if (p.status === 'failed') failedRuns++;
            });
        }
    });

    // GitHub Actions
    const ghActions = state.githubActionsCache || {};
    Object.values(ghActions).forEach(c => {
        if (c && c.runs && c.runs.length > 0) {
            hasData = true;
            c.runs.forEach(r => {
                totalRuns++;
                if (r.conclusion === 'failure') failedRuns++;
            });
        }
    });

    if (!hasData || totalRuns === 0) return null;
    return { rate: (failedRuns / totalRuns) * 100, failed: failedRuns, total: totalRuns };
}

function renderChangeFailureRateMetric() {
    const el = document.getElementById('metricCFR');
    if (!el) return;

    const card = el.closest('.metric-card');
    const hasGlRepos = (state.gitlabRepos || []).length > 0;
    const hasGhRepos = (state.githubRepos || []).length > 0;
    if (!hasGlRepos && !hasGhRepos) {
        if (card) card.classList.add('no-source');
        el.textContent = '—';
        return;
    }
    if (card) card.classList.remove('no-source');

    const cfr = computeChangeFailureRate();
    if (cfr === null) {
        el.textContent = '—';
        return;
    }
    el.textContent = cfr.rate < 1 ? cfr.rate.toFixed(1) + '%' : Math.round(cfr.rate) + '%';
}

function openChangeFailureRateDetail() {
    const container = document.getElementById('cfrDetailContent');
    if (!container) return;

    const cfr = computeChangeFailureRate();

    if (cfr === null) {
        container.innerHTML = '<div class="gl-detail-empty">Aucun flux de pipelines configuré — configurez un repo GitLab ou GitHub via 🔌 API Config pour activer cet indicateur.</div>';
        openModal('modalCFR');
        return;
    }

    const successRate = 100 - cfr.rate;
    const rateColor = cfr.rate <= 5 ? 'var(--green)' : cfr.rate <= 15 ? 'var(--yellow)' : 'var(--red)';
    const successColor = successRate >= 95 ? 'var(--green)' : successRate >= 85 ? 'var(--yellow)' : 'var(--red)';
    const dora = getDoraLevel('cfr', cfr.rate);

    let html = '<div class="sre-detail">';

    // DORA level
    html += `<div class="sre-level-row">
        <span class="sre-level sre-level-${dora.level}">DORA ${dora.label}</span>
        <span class="sre-level-hint">${dora.hint}</span>
    </div>`;

    // Stat cards
    html += `<div class="sre-stats">
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:${rateColor}">${cfr.rate < 1 ? cfr.rate.toFixed(1) : Math.round(cfr.rate)}%</span>
            <span class="sre-stat-label">Taux d'échec</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:${successColor}">${successRate < 1 ? successRate.toFixed(1) : Math.round(successRate)}%</span>
            <span class="sre-stat-label">Taux de succès</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val" style="color:var(--red)">${cfr.failed}</span>
            <span class="sre-stat-label">Échecs</span>
        </div>
        <div class="sre-stat">
            <span class="sre-stat-val">${cfr.total}</span>
            <span class="sre-stat-label">Total runs</span>
        </div>
    </div>`;

    // Success/Failure progress bar
    html += '<div class="sre-section-title">Succès vs Échecs</div>';
    html += '<div class="sre-progress">';
    const successPct = cfr.total > 0 ? ((cfr.total - cfr.failed) / cfr.total * 100).toFixed(1) : 0;
    const failPct = cfr.total > 0 ? (cfr.failed / cfr.total * 100).toFixed(1) : 0;
    html += `<div class="sre-progress-fill green" style="width:${successPct}%" title="Succès: ${cfr.total - cfr.failed}"></div>`;
    html += `<div class="sre-progress-fill red" style="width:${failPct}%" title="Échecs: ${cfr.failed}"></div>`;
    html += '</div>';

    // Per-repo breakdown
    html += '<div class="sre-section-title">Détail par dépôt</div>';
    html += '<div class="sre-list">';

    const allRepos = [];
    const glPipelines = state.gitlabPipelinesCache || {};
    const glRepos = state.gitlabRepos || [];
    glRepos.forEach(r => {
        const c = glPipelines[r.id];
        if (!c?.pipelines?.length) return;
        const failed = c.pipelines.filter(p => p.status === 'failed').length;
        const t = c.pipelines.length;
        allRepos.push({ icon: '🦊', name: r.name, failed, total: t, pct: t > 0 ? (failed / t * 100) : 0 });
    });

    const ghActions = state.githubActionsCache || {};
    const ghRepos = state.githubRepos || [];
    ghRepos.forEach(r => {
        const c = ghActions[r.id];
        if (!c?.runs?.length) return;
        const failed = c.runs.filter(run => run.conclusion === 'failure').length;
        const t = c.runs.length;
        allRepos.push({ icon: '🐙', name: r.name, failed, total: t, pct: t > 0 ? (failed / t * 100) : 0 });
    });
    allRepos.sort((a, b) => b.pct - a.pct);

    allRepos.forEach(r => {
        const pctColor = r.pct <= 5 ? 'var(--green)' : r.pct <= 15 ? 'var(--yellow)' : 'var(--red)';
        html += `<div class="sre-item">
            <span class="sre-item-icon">${r.icon}</span>
            <span class="sre-item-name">${esc(r.name)}</span>
            <span class="sre-item-meta">${r.failed}/${r.total} échecs</span>
            <span class="sre-item-badge" style="background:var(--bg-input);color:${pctColor};min-width:42px;text-align:center">${Math.round(r.pct)}%</span>
        </div>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
    openModal('modalCFR');
}

// ---- Downtime Cost Chart ----
function updateDowntimeCostChart() {
    const canvas = document.getElementById('downtimeCostChart');
    if (!canvas) return;

    // Read rates from inputs (or defaults)
    const rateCritical = parseFloat(document.getElementById('rateCritical')?.value) || 50;
    const rateMajor = parseFloat(document.getElementById('rateMajor')?.value) || 20;
    const rateWarning = parseFloat(document.getElementById('rateWarning')?.value) || 5;
    const rates = { critical: rateCritical, major: rateMajor, warning: rateWarning };

    // Get resolved impacts
    const resolved = state.impacts.filter(i => !i.active && i.resolvedAt && i.time);

    if (resolved.length === 0) {
        if (downtimeCostChartInstance) { downtimeCostChartInstance.destroy(); downtimeCostChartInstance = null; }
        chartEmptyState('downtimeCostChart', 'Aucun impact résolu');
        document.getElementById('downtimeInsight').innerHTML = '';
        return;
    }

    // Build 30-day labels & buckets
    const days = 30;
    const labels = [];
    const buckets = { critical: [], major: [], warning: [] };
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
        buckets.critical.push(0);
        buckets.major.push(0);
        buckets.warning.push(0);
    }

    // Assign each resolved impact to its resolution day
    let totalCost = 0;
    let maxCost = 0;
    let maxTitle = '';
    resolved.forEach(imp => {
        const dur = (new Date(imp.resolvedAt).getTime() - new Date(imp.time).getTime()) / 60000; // minutes
        const sev = imp.severity || 'warning';
        const cost = dur * (rates[sev] || 0);
        totalCost += cost;
        if (cost > maxCost) { maxCost = cost; maxTitle = imp.title; }

        const resolvedDate = new Date(imp.resolvedAt);
        const diffDays = Math.floor((now.getTime() - resolvedDate.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays < days && buckets[sev]) {
            buckets[sev][days - 1 - diffDays] += cost;
        }
    });

    // Chart
    const colors = getChartColors();
    const datasets = [
        { label: 'Critical', data: buckets.critical, backgroundColor: 'rgba(220,38,38,0.8)', borderRadius: 3 },
        { label: 'Major',    data: buckets.major,    backgroundColor: 'rgba(249,115,22,0.8)', borderRadius: 3 },
        { label: 'Warning',  data: buckets.warning,  backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 3 }
    ];

    if (downtimeCostChartInstance) {
        downtimeCostChartInstance.data.labels = labels;
        downtimeCostChartInstance.data.datasets = datasets;
        downtimeCostChartInstance.update();
    } else {
        downtimeCostChartInstance = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: colors.text, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €' } }
                },
                scales: {
                    x: { stacked: true, grid: { color: colors.grid }, ticks: { color: colors.text, maxRotation: 45 } },
                    y: { stacked: true, grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => v.toLocaleString('fr-FR') + ' €' } }
                }
            }
        });
    }

    // Insight
    const avgCost = totalCost / resolved.length;
    const insightEl = document.getElementById('downtimeInsight');
    if (insightEl) {
        insightEl.innerHTML =
            '<div class="downtime-insight-item"><span class="downtime-insight-val">' + totalCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €</span><span class="downtime-insight-label">Coût total estimé</span></div>' +
            '<div class="downtime-insight-item"><span class="downtime-insight-val">' + avgCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €</span><span class="downtime-insight-label">Coût moyen / incident</span></div>' +
            '<div class="downtime-insight-item"><span class="downtime-insight-val">' + maxCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €</span><span class="downtime-insight-label">Incident le plus coûteux</span></div>' +
            '<div class="downtime-insight-item downtime-insight-title">' + esc(maxTitle) + '</div>';
    }
}
