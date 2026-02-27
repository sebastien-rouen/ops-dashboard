// ==================== TRAFFIC LIGHT ====================
// ==================== TRAFFIC LIGHT ENGINE ====================
function getTrafficLightSettings() {
    const def = DEFAULT_STATE.trafficLight.settings;
    const s = state.trafficLight?.settings;
    if (!s) return def;
    return {
        mode: s.mode || def.mode,
        thresholds: { ...def.thresholds, ...s.thresholds },
        weights: { ...def.weights, ...s.weights },
        exclusions: s.exclusions || def.exclusions,
        timeRanges: { ...def.timeRanges, ...s.timeRanges }
    };
}

function computeTrafficLight(scope) {
    const settings = getTrafficLightSettings();
    const exclusions = settings.exclusions || [];

    let infra = state.infra.filter(i => !exclusions.includes(i.id));
    let impacts = state.impacts.filter(i => i.active);
    let tasks = state.tasks;

    // Scope filtering for per-perimeter lights
    if (scope === 'reseau') {
        infra = infra.filter(i => ['vm', 'stack', 'logger'].includes(i.type));
        tasks = [];
    } else if (scope === 'apps') {
        infra = [];
        impacts = [];
    }

    const machinesDown = infra.filter(i => i.status === 'down').length;
    const machinesDegraded = infra.filter(i => i.status === 'degraded').length;
    const totalMachines = infra.length;
    const machinesUp = infra.filter(i => i.status === 'up').length;

    const criticalImpacts = impacts.filter(i => i.severity === 'critical').length;
    const majorImpacts = impacts.filter(i => i.severity === 'major').length;
    const warningImpacts = impacts.filter(i => i.severity === 'warning').length;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 100;

    const thresholds = settings.thresholds || { completionGreen: 80, completionYellow: 50 };

    // Check time range relaxation
    let relaxed = false;
    if (settings.timeRanges?.enabled) {
        const now = new Date();
        const hour = now.getHours();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        if (settings.timeRanges.weekendRelax && isWeekend) relaxed = true;
        if (hour < settings.timeRanges.businessStart || hour >= settings.timeRanges.businessEnd) relaxed = true;
    }

    // Compute individual scores (0-100)
    let infraScore = 100;
    if (totalMachines > 0) {
        infraScore = Math.max(0, 100 - (machinesDown * 30) - (machinesDegraded * 10));
    }

    let impactScore = 100;
    impactScore -= criticalImpacts * 40;
    impactScore -= majorImpacts * 20;
    impactScore -= warningImpacts * 8;
    impactScore = Math.max(0, impactScore);

    let taskScore = completionRate;

    // Determine color per metric using configured thresholds
    function metricColor(score) {
        if (score >= thresholds.completionGreen) return 'green';
        if (score >= thresholds.completionYellow) return 'yellow';
        return 'red';
    }

    const infraColor = metricColor(infraScore);
    const impactColor = metricColor(impactScore);
    const taskColor = metricColor(taskScore);

    // Worst mode vs weighted
    let globalColor, globalScore;
    const weights = settings.weights || { infra: 40, impacts: 35, tasks: 25 };
    const totalWeight = weights.infra + weights.impacts + weights.tasks;

    if (settings.mode === 'weighted') {
        globalScore = Math.round(
            (infraScore * weights.infra + impactScore * weights.impacts + taskScore * weights.tasks) / totalWeight
        );
        if (globalScore >= thresholds.completionGreen) globalColor = 'green';
        else if (globalScore >= thresholds.completionYellow) globalColor = 'yellow';
        else globalColor = 'red';
    } else {
        // Worst mode: red if any red, yellow if any yellow
        const colors = [infraColor, impactColor, taskColor];
        if (colors.includes('red')) globalColor = 'red';
        else if (colors.includes('yellow')) globalColor = 'yellow';
        else globalColor = 'green';
        globalScore = Math.round(
            (infraScore * weights.infra + impactScore * weights.impacts + taskScore * weights.tasks) / totalWeight
        );
    }

    // Hard override: only critical situations force red regardless of score
    if (machinesDown >= 1 || criticalImpacts >= 1) {
        globalColor = 'red';
    }

    // Relaxed mode: downgrade red→yellow outside business hours
    if (relaxed && globalColor === 'red' && machinesDown === 0 && criticalImpacts === 0) {
        globalColor = 'yellow';
    }

    let trigger = '';
    if (globalColor === 'red') {
        if (machinesDown >= 1) trigger = `${machinesDown} machine(s) DOWN`;
        else if (criticalImpacts >= 1) trigger = `${criticalImpacts} impact(s) critical`;
        else trigger = `Taux complétion ${Math.round(completionRate)}%`;
    } else if (globalColor === 'yellow') {
        if (machinesDegraded >= 1) trigger = `${machinesDegraded} machine(s) dégradée(s)`;
        else if (majorImpacts + warningImpacts >= 1) trigger = `${majorImpacts + warningImpacts} impact(s) actif(s)`;
        else trigger = `Taux complétion ${Math.round(completionRate)}%`;
    } else {
        trigger = 'Situation nominale';
    }

    return {
        color: globalColor,
        score: Math.max(0, Math.min(100, globalScore)),
        trigger,
        details: {
            infra: { score: infraScore, color: infraColor, up: machinesUp, degraded: machinesDegraded, down: machinesDown, total: totalMachines },
            impacts: { score: impactScore, color: impactColor, critical: criticalImpacts, major: majorImpacts, warning: warningImpacts },
            tasks: { score: Math.round(taskScore), color: taskColor, completion: Math.round(completionRate), done: doneTasks, total: totalTasks }
        }
    };
}

function updateTrafficLight() {
    const tl = computeTrafficLight();
    const prev = state.trafficLight?.history?.length > 0
        ? state.trafficLight.history[state.trafficLight.history.length - 1]
        : null;

    // Record history on color change
    if (!prev || prev.color !== tl.color) {
        if (!state.trafficLight) state.trafficLight = { ...DEFAULT_STATE.trafficLight };
        if (!state.trafficLight.history) state.trafficLight.history = [];
        state.trafficLight.history.push({
            time: new Date().toISOString(),
            color: tl.color,
            score: tl.score,
            trigger: tl.trigger
        });
        // Keep max 200 entries
        if (state.trafficLight.history.length > 200) {
            state.trafficLight.history = state.trafficLight.history.slice(-200);
        }
        saveState();

        // Alert on transition to red
        if (prev && tl.color === 'red') {
            sendNotification('🔴 Alerte Traffic Light', `Passage en ROUGE: ${tl.trigger}`);
            addLog('🚦', `Traffic Light → ROUGE: ${tl.trigger}`);
        } else if (prev && prev.color === 'red' && tl.color !== 'red') {
            addLog('🚦', `Traffic Light → ${tl.color === 'green' ? 'VERT' : 'JAUNE'}: ${tl.trigger}`);
        }
    }

    renderTrafficLightWidget(tl);
    renderPerimeterLights();
    updateTrafficLightChart();
}

function renderTrafficLightWidget(tl) {
    const widget = document.getElementById('trafficLightWidget');
    if (!widget) return;

    const colorEmoji = { green: '🟢', yellow: '🟡', red: '🔴' };
    const colorLabel = { green: 'Nominal', yellow: 'Vigilance', red: 'Critique' };

    widget.title = `Santé globale : ${tl.score}% — ${colorLabel[tl.color]}\nCliquer pour configurer le scoring`;
    widget.innerHTML = `
        <span class="tl-widget-label">Santé</span>
        <div class="tl-indicator ${tl.color}">
            <span class="tl-light">${colorEmoji[tl.color]}</span>
            <span class="tl-score">${tl.score}%</span>
        </div>
        <div class="tl-details">
            <span class="tl-label">${colorLabel[tl.color]}</span>
            <span class="tl-trigger">${tl.trigger}</span>
        </div>
        <span class="tl-widget-chevron">▾</span>
    `;
}

function renderPerimeterLights() {
    const views = ['ops', 'reseau', 'apps'];
    views.forEach(v => {
        const btn = document.querySelector(`.view-tab[data-view="${v}"]`);
        if (!btn) return;
        const tl = computeTrafficLight(v);
        // Remove old dot
        const oldDot = btn.querySelector('.tl-tab-dot');
        if (oldDot) oldDot.remove();
        const dot = document.createElement('span');
        dot.className = `tl-tab-dot ${tl.color}`;
        dot.title = `Score: ${tl.score}%`;
        btn.appendChild(dot);
    });
}

function updateTrafficLightChart() {
    const ctx = document.getElementById('trafficLightChart');
    if (!ctx) return;

    const history = state.trafficLight?.history || [];
    if (history.length === 0) {
        if (window.trafficLightChartInstance) { window.trafficLightChartInstance.destroy(); window.trafficLightChartInstance = null; }
        chartEmptyState('trafficLightChart', 'Aucun historique — configurez le Traffic Light');
        return;
    }
    chartEmptyState('trafficLightChart', null, false);

    // Remove legacy empty message if exists
    const emptyEl = ctx.closest('.chart-container')?.querySelector('.tl-chart-empty');
    if (emptyEl) emptyEl.remove();

    // Build 30-day timeline
    const labels = [];
    const scores = [];
    const bgColors = [];

    // Group by day (last 30 days)
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));

        // Find last entry of that day
        const dayEntries = history.filter(h => {
            const ht = new Date(h.time);
            return ht >= d && ht < nextDay;
        });

        if (dayEntries.length > 0) {
            const last = dayEntries[dayEntries.length - 1];
            scores.push(last.score);
            bgColors.push(last.color === 'green' ? 'rgba(16,185,129,0.7)' : last.color === 'yellow' ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)');
        } else {
            // Find last known entry before this day
            const before = history.filter(h => new Date(h.time) < d);
            if (before.length > 0) {
                const last = before[before.length - 1];
                scores.push(last.score);
                bgColors.push(last.color === 'green' ? 'rgba(16,185,129,0.3)' : last.color === 'yellow' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)');
            } else {
                scores.push(null);
                bgColors.push('rgba(100,116,139,0.2)');
            }
        }
    }

    const colors = getChartColors();

    if (window.trafficLightChartInstance) {
        window.trafficLightChartInstance.data.labels = labels;
        window.trafficLightChartInstance.data.datasets[0].data = scores;
        window.trafficLightChartInstance.data.datasets[0].backgroundColor = bgColors;
        window.trafficLightChartInstance.options.scales.x.ticks.color = colors.textColor;
        window.trafficLightChartInstance.options.scales.y.ticks.color = colors.textColor;
        window.trafficLightChartInstance.options.scales.x.grid.color = colors.gridColor;
        window.trafficLightChartInstance.options.scales.y.grid.color = colors.gridColor;
        window.trafficLightChartInstance.update();
        return;
    }

    const tlScoreToLabel = v => {
        if (v === null) return '—';
        if (v >= 80) return 'Vert';
        if (v >= 50) return 'Orange';
        return 'Rouge';
    };

    window.trafficLightChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Santé',
                data: scores,
                backgroundColor: bgColors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => items[0].label,
                        label: ctx => {
                            const v = ctx.parsed.y;
                            if (v === null) return 'Pas de données';
                            return `${tlScoreToLabel(v)} — ${v}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: colors.textColor, maxRotation: 45 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: colors.textColor,
                        stepSize: 25,
                        callback: function(value) {
                            if (value === 0) return 'Rouge';
                            if (value === 50) return 'Orange';
                            if (value === 100) return 'Vert';
                            return '';
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 50) return 'rgba(245,158,11,0.3)';
                            if (context.tick.value === 80) return 'rgba(16,185,129,0.3)';
                            return colors.gridColor;
                        }
                    }
                }
            }
        }
    });
}

// ==================== TRAFFIC LIGHT SETTINGS ====================
function openTrafficLightSettings() {
    const settings = getTrafficLightSettings();
    document.getElementById('tlMode').value = settings.mode;
    document.getElementById('tlThresholdGreen').value = settings.thresholds.completionGreen;
    document.getElementById('tlThresholdYellow').value = settings.thresholds.completionYellow;
    document.getElementById('tlWeightInfra').value = settings.weights.infra;
    document.getElementById('tlWeightImpacts').value = settings.weights.impacts;
    document.getElementById('tlWeightTasks').value = settings.weights.tasks;
    document.getElementById('tlTimeEnabled').checked = settings.timeRanges?.enabled || false;
    document.getElementById('tlBusinessStart').value = settings.timeRanges?.businessStart || 8;
    document.getElementById('tlBusinessEnd').value = settings.timeRanges?.businessEnd || 18;
    document.getElementById('tlWeekendRelax').checked = settings.timeRanges?.weekendRelax !== false;

    selectTlMode(settings.mode);
    updateThresholdBar();
    updateWeightsDisplay();
    renderTlModalLive();
    renderExclusionsList();
    openModal('modalTrafficLight');
}

function selectTlMode(mode) {
    document.getElementById('tlMode').value = mode;
    document.getElementById('tlModeWorst').classList.toggle('active', mode === 'worst');
    document.getElementById('tlModeWeighted').classList.toggle('active', mode === 'weighted');
}

function updateThresholdBar() {
    const green = parseInt(document.getElementById('tlThresholdGreen').value) || 80;
    const yellow = parseInt(document.getElementById('tlThresholdYellow').value) || 50;
    const redFlex = yellow;
    const yellowFlex = green - yellow;
    const greenFlex = 100 - green;
    document.querySelector('.tl-zone-red').style.flex = redFlex;
    document.querySelector('.tl-zone-yellow').style.flex = Math.max(yellowFlex, 1);
    document.querySelector('.tl-zone-green').style.flex = Math.max(greenFlex, 1);
    document.getElementById('tlZoneYellowLabel').textContent = yellow + '%';
    document.getElementById('tlZoneGreenLabel').textContent = green + '%';
}

function updateWeightsDisplay() {
    const infra = parseInt(document.getElementById('tlWeightInfra').value) || 0;
    const impacts = parseInt(document.getElementById('tlWeightImpacts').value) || 0;
    const tasks = parseInt(document.getElementById('tlWeightTasks').value) || 0;
    document.getElementById('tlWeightInfraDisplay').textContent = infra;
    document.getElementById('tlWeightImpactsDisplay').textContent = impacts;
    document.getElementById('tlWeightTasksDisplay').textContent = tasks;
    const total = infra + impacts + tasks;
    const totalEl = document.getElementById('tlWeightsTotalValue');
    const warnEl = document.getElementById('tlWeightsWarn');
    totalEl.textContent = total;
    if (total === 100) {
        warnEl.textContent = '(parfait)';
        warnEl.className = 'tl-weights-warn ok';
    } else {
        warnEl.textContent = total > 100 ? '(trop haut)' : '(trop bas)';
        warnEl.className = 'tl-weights-warn bad';
    }
}

function renderTlModalLive() {
    const el = document.getElementById('tlModalLive');
    if (!el) return;
    const tl = computeTrafficLight();
    const emoji = { green: '🟢', yellow: '🟡', red: '🔴' };
    el.innerHTML = `${emoji[tl.color] || '⚪'} <strong>${tl.score}%</strong>`;
}

function renderExclusionsList() {
    const container = document.getElementById('tlExclusionsList');
    if (!container) return;
    const exclusions = getTrafficLightSettings().exclusions || [];

    if (state.infra.length === 0) {
        container.innerHTML = '<div class="tl-excl-empty">Aucune machine enregistrée</div>';
        return;
    }

    const statusIcon = { up: '🟢', degraded: '🟡', down: '🔴' };
    const typeIcon = { vm: '🖥️', lxc: '📦', stack: '📚', logger: '📝', other: '⚙️' };

    container.innerHTML = state.infra.map(i => {
        const checked = exclusions.includes(i.id);
        const envTag = i.env ? `<span class="infra-env-badge env-${i.env}" style="font-size:0.58rem;padding:0 4px;">${i.env.toUpperCase()}</span>` : '';
        return `
        <label class="tl-excl-card ${checked ? 'excluded' : ''}">
            <input type="checkbox" value="${i.id}" ${checked ? 'checked' : ''} onchange="this.closest('.tl-excl-card').classList.toggle('excluded', this.checked)">
            <span class="tl-excl-status">${statusIcon[i.status] || '⚪'}</span>
            <div class="tl-excl-info">
                <span class="tl-excl-name">${esc(i.name)} ${envTag}</span>
                <span class="tl-excl-meta">${typeIcon[i.type] || '⚙️'} ${i.type}${i.ip ? ' · ' + esc(i.ip) : ''}</span>
            </div>
            <span class="tl-excl-badge ${checked ? 'active' : ''}">${checked ? 'exclu' : 'inclus'}</span>
        </label>`;
    }).join('');
}

function saveTrafficLightSettings() {
    if (!state.trafficLight) state.trafficLight = { ...DEFAULT_STATE.trafficLight };
    if (!state.trafficLight.settings) state.trafficLight.settings = { ...DEFAULT_STATE.trafficLight.settings };

    const exclusionChecks = document.querySelectorAll('#tlExclusionsList input[type="checkbox"]:checked');
    const exclusions = Array.from(exclusionChecks).map(cb => cb.value);

    const pInt = (id, fallback) => { const v = parseInt(document.getElementById(id).value); return isNaN(v) ? fallback : v; };
    state.trafficLight.settings = {
        mode: document.getElementById('tlMode').value,
        thresholds: {
            completionGreen: pInt('tlThresholdGreen', 80),
            completionYellow: pInt('tlThresholdYellow', 50)
        },
        weights: {
            infra: pInt('tlWeightInfra', 40),
            impacts: pInt('tlWeightImpacts', 35),
            tasks: pInt('tlWeightTasks', 25)
        },
        exclusions,
        timeRanges: {
            enabled: document.getElementById('tlTimeEnabled').checked,
            businessStart: parseInt(document.getElementById('tlBusinessStart').value) || 8,
            businessEnd: parseInt(document.getElementById('tlBusinessEnd').value) || 18,
            weekendRelax: document.getElementById('tlWeekendRelax').checked
        }
    };

    saveState();
    closeModal('modalTrafficLight');
    updateTrafficLight();
    addLog('🚦', 'Paramètres Traffic Light mis à jour');
    toast('🚦 Paramètres enregistrés');
}
