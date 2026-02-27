// ==================== CHARTS ====================
function initChartData() {
    if (!state.chartData || !Array.isArray(state.chartData.labels) || state.chartData.labels.length !== 7) {
        const labels = [];
        const created = [];
        const completed = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
            created.push(0);
            completed.push(0);
        }
        state.chartData = { labels, created, completed };
        saveState();
    }
}

function bumpChartCreated() {
    if (!state.chartData) initChartData();
    state.chartData.created[6]++;
    saveState();
}

function bumpChartCompleted() {
    if (!state.chartData) initChartData();
    state.chartData.completed[6]++;
    saveState();
}

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textColor: isDark ? '#94a3b8' : '#64748b'
    };
}

function chartEmptyState(canvasId, message, hide) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return false;
    const container = canvas.closest('.chart-container');
    if (!container) return false;
    let emptyEl = container.querySelector('.chart-empty-msg');
    if (hide) {
        container.style.display = 'none';
        if (emptyEl) emptyEl.remove();
        return true;
    }
    if (message) {
        container.style.display = '';
        canvas.closest('.chart-wrap').style.display = 'none';
        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'chart-empty-msg';
            container.appendChild(emptyEl);
        }
        emptyEl.textContent = message;
        return true;
    }
    // Clear empty state
    container.style.display = '';
    canvas.closest('.chart-wrap').style.display = '';
    if (emptyEl) emptyEl.remove();
    return false;
}

function updateActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const hasData = state.chartData &&
        (state.chartData.created.some(v => v > 0) || state.chartData.completed.some(v => v > 0));

    if (!hasData) {
        if (activityChart) { activityChart.destroy(); activityChart = null; }
        chartEmptyState('activityChart', null, true);
        return;
    }
    chartEmptyState('activityChart', null, false);

    const colors = getChartColors();

    if (activityChart) {
        activityChart.data.labels = state.chartData.labels;
        activityChart.data.datasets[0].data = state.chartData.created;
        activityChart.data.datasets[1].data = state.chartData.completed;
        activityChart.options.scales.x.ticks.color = colors.textColor;
        activityChart.options.scales.y.ticks.color = colors.textColor;
        activityChart.options.scales.x.grid.color = colors.gridColor;
        activityChart.options.scales.y.grid.color = colors.gridColor;
        activityChart.update();
        return;
    }

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: state.chartData.labels,
            datasets: [
                {
                    label: 'Créées',
                    data: state.chartData.created,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false
                },
                {
                    label: 'Terminées',
                    data: state.chartData.completed,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: colors.textColor, usePointStyle: true, pointStyle: 'rectRounded', padding: 16 }
                }
            },
            scales: {
                x: {
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.textColor, stepSize: 1 },
                    grid: { color: colors.gridColor }
                }
            }
        }
    });
}

// ==================== CHART: Infra Status ====================
function updateInfraStatusChart() {
    const ctx = document.getElementById('infraStatusChart');
    if (!ctx) return;

    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const infra = hasFilters ? filterInfraItems(filters) : state.infra;

    const up = infra.filter(i => i.status === 'up').length;
    const degraded = infra.filter(i => i.status === 'degraded').length;
    const down = infra.filter(i => i.status === 'down').length;
    const total = infra.length;

    if (total === 0) {
        if (infraStatusChartInstance) { infraStatusChartInstance.destroy(); infraStatusChartInstance = null; }
        chartEmptyState('infraStatusChart', 'Aucune machine enregistrée — ajoutez des infrastructures');
        const legendEl = document.getElementById('infraStatusLegend');
        if (legendEl) legendEl.innerHTML = '';
        return;
    }
    chartEmptyState('infraStatusChart', null, false);

    // Mise à jour de la légende custom
    const legendEl = document.getElementById('infraStatusLegend');
    if (legendEl) {
        legendEl.innerHTML = `
            <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span> Up: <strong>${up}</strong></div>
            <div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span> Dégradé: <strong>${degraded}</strong></div>
            <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> Down: <strong>${down}</strong></div>
            <div class="legend-item legend-total">Total: <strong>${total}</strong></div>
        `;
    }

    const colors = getChartColors();
    const data = [up, degraded, down];
    const bgColors = ['#10b981', '#f59e0b', '#ef4444'];
    const borderColors = ['#059669', '#d97706', '#dc2626'];

    if (infraStatusChartInstance) {
        infraStatusChartInstance.data.datasets[0].data = data;
        infraStatusChartInstance.options.plugins.legend.labels.color = colors.textColor;
        infraStatusChartInstance.update();
        return;
    }

    infraStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Up', 'Dégradé', 'Down'],
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const pct = total > 0 ? Math.round(value / total * 100) : 0;
                            return ` ${label}: ${value} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ==================== CHART: Priority Distribution ====================
function updatePriorityChart() {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;

    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const tasks = hasFilters ? filterTaskItems(filters) : state.tasks;

    const critical = tasks.filter(t => t.priority === 'critical').length;
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    const total = tasks.length;

    if (total === 0) {
        if (priorityChartInstance) { priorityChartInstance.destroy(); priorityChartInstance = null; }
        chartEmptyState('priorityChart', 'Aucune tâche — créez des tâches dans le Kanban');
        return;
    }
    chartEmptyState('priorityChart', null, false);

    const colors = getChartColors();
    const data = [critical, high, medium, low];
    const bgColors = ['#dc2626', '#ef4444', '#f59e0b', '#10b981'];
    const borderColors = ['#991b1b', '#dc2626', '#d97706', '#059669'];

    if (priorityChartInstance) {
        priorityChartInstance.data.datasets[0].data = data;
        priorityChartInstance.options.plugins.legend.labels.color = colors.textColor;
        priorityChartInstance.update();
        return;
    }

    priorityChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.textColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 12,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const pct = total > 0 ? Math.round(value / total * 100) : 0;
                            return ` ${label}: ${value} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ==================== CHART: Impacts Timeline ====================
function updateImpactsTimelineChart() {
    const ctx = document.getElementById('impactsTimelineChart');
    if (!ctx) return;

    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    // Apply search filter to impacts for timeline
    let allImpacts = state.impacts;
    if (filters.search) {
        allImpacts = allImpacts.filter(i => [i.title, i.desc, i.severity, i.origin].join(' ').toLowerCase().includes(filters.search));
    }

    if (allImpacts.length === 0) {
        if (impactsTimelineChartInstance) { impactsTimelineChartInstance.destroy(); impactsTimelineChartInstance = null; }
        chartEmptyState('impactsTimelineChart', hasFilters ? 'Aucun impact correspondant aux filtres' : 'Aucun impact enregistré — situation nominale');
        return;
    }
    chartEmptyState('impactsTimelineChart', null, false);

    const colors = getChartColors();

    // Build 7 days data
    const labels = [];
    const criticalData = [];
    const majorData = [];
    const warningData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));

        // Count impacts created on this day by severity
        const dayImpacts = allImpacts.filter(imp => {
            const impactDate = new Date(imp.time);
            return impactDate >= d && impactDate < nextDay;
        });

        criticalData.push(dayImpacts.filter(i => i.severity === 'critical').length);
        majorData.push(dayImpacts.filter(i => i.severity === 'major').length);
        warningData.push(dayImpacts.filter(i => i.severity === 'warning').length);
    }

    if (impactsTimelineChartInstance) {
        impactsTimelineChartInstance.data.labels = labels;
        impactsTimelineChartInstance.data.datasets[0].data = criticalData;
        impactsTimelineChartInstance.data.datasets[1].data = majorData;
        impactsTimelineChartInstance.data.datasets[2].data = warningData;
        impactsTimelineChartInstance.options.scales.x.ticks.color = colors.textColor;
        impactsTimelineChartInstance.options.scales.y.ticks.color = colors.textColor;
        impactsTimelineChartInstance.options.scales.x.grid.color = colors.gridColor;
        impactsTimelineChartInstance.options.scales.y.grid.color = colors.gridColor;
        impactsTimelineChartInstance.update();
        return;
    }

    impactsTimelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Critical',
                    data: criticalData,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Major',
                    data: majorData,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Warning',
                    data: warningData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: colors.textColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 12,
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.textColor, stepSize: 1 },
                    grid: { color: colors.gridColor }
                }
            }
        }
    });
}
