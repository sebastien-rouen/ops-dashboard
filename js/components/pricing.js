// ==================== PRICING ====================
// ==================== PRICING CHART ====================
const PRICING_DATA = {
    labels: ['1K', '5K', '10K', '25K', '50K', '100K', '250K', '500K', '1M'],
    requestVolumes: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000],
    infra: {
        'VM': {
            unitCost: [0.120, 0.095, 0.072, 0.048, 0.035, 0.022, 0.014, 0.010, 0.007],
            color: '#3b82f6',
            icon: '🖥️'
        },
        'LXC': {
            unitCost: [0.065, 0.058, 0.052, 0.044, 0.038, 0.032, 0.028, 0.025, 0.023],
            color: '#8b5cf6',
            icon: '📦'
        },
        'Stack': {
            unitCost: [0.200, 0.110, 0.060, 0.030, 0.018, 0.012, 0.008, 0.006, 0.005],
            color: '#10b981',
            icon: '🐳'
        },
        'Logger': {
            unitCost: [0.040, 0.042, 0.048, 0.058, 0.070, 0.085, 0.100, 0.115, 0.130],
            color: '#f59e0b',
            icon: '📊'
        }
    }
};

function getCumulativeCosts(unitCosts, volumes) {
    return unitCosts.map((cost, i) => parseFloat((cost * volumes[i] / 1000).toFixed(2)));
}

function switchPricingView(view) {
    pricingCurrentView = view;
    document.querySelectorAll('.pricing-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pricingView === view);
    });
    if (pricingChartInstance) {
        pricingChartInstance.destroy();
        pricingChartInstance = null;
    }
    updatePricingChart();
}

function switchPricingDuration(days, btn) {
    pricingDurationDays = days;
    document.querySelectorAll('.pricing-dur-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (pricingChartInstance) {
        pricingChartInstance.destroy();
        pricingChartInstance = null;
    }
    updatePricingChart();
}

function updatePricingChart() {
    const ctx = document.getElementById('pricingChart');
    if (!ctx) return;

    const colors = getChartColors();
    const isCumulative = pricingCurrentView === 'cumulative';

    const infraTypes = Object.keys(PRICING_DATA.infra);
    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const infraInState = hasFilters ? filterInfraItems(filters) : (state.infra || []);

    const mult = pricingDurationDays;
    const durLabel = mult === 1 ? '' : mult < 30 ? ` (${mult}j)` : mult < 365 ? ` (${Math.round(mult / 30)}mois)` : ' (1an)';

    const datasets = infraTypes.map(type => {
        const info = PRICING_DATA.infra[type];
        const count = infraInState.filter(i => i.type === type.toLowerCase()).length;
        const baseData = isCumulative
            ? getCumulativeCosts(info.unitCost, PRICING_DATA.requestVolumes)
            : info.unitCost;
        const rawData = mult > 1 ? baseData.map(v => parseFloat((v * mult).toFixed(2))) : baseData;

        return {
            label: `${info.icon} ${type}${count > 0 ? ' (' + count + ')' : ''}`,
            data: rawData,
            borderColor: info.color,
            backgroundColor: info.color + '18',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: info.color,
            pointBorderColor: 'var(--bg-card)',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
        };
    });

    const yLabel = isCumulative ? `Coût total${durLabel} (€)` : `Coût / 1K req${durLabel} (€)`;

    if (pricingChartInstance) {
        pricingChartInstance.data.datasets = datasets;
        pricingChartInstance.options.scales.x.ticks.color = colors.textColor;
        pricingChartInstance.options.scales.y.ticks.color = colors.textColor;
        pricingChartInstance.options.scales.x.grid.color = colors.gridColor;
        pricingChartInstance.options.scales.y.grid.color = colors.gridColor;
        pricingChartInstance.options.scales.y.title.text = yLabel;
        pricingChartInstance.options.scales.y.title.color = colors.textColor;
        pricingChartInstance.update();
        updatePricingInsight();
        return;
    }

    pricingChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: PRICING_DATA.labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    bodySpacing: 6,
                    callbacks: {
                        title: function(items) {
                            return `📡 ${items[0].label} requêtes`;
                        },
                        label: function(context) {
                            const val = context.parsed.y;
                            const label = context.dataset.label;
                            if (isCumulative) {
                                return `${label}: ${val.toFixed(2)} €`;
                            }
                            return `${label}: ${val.toFixed(3)} € / 1K req`;
                        },
                        afterBody: function(items) {
                            const values = items.map(i => ({ label: i.dataset.label, val: i.parsed.y }));
                            const min = values.reduce((a, b) => a.val < b.val ? a : b);
                            return [`\n✅ Optimal: ${min.label}`];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Volume de requêtes',
                        color: colors.textColor,
                        font: { size: 11, weight: '500' }
                    },
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yLabel,
                        color: colors.textColor,
                        font: { size: 11, weight: '500' }
                    },
                    ticks: {
                        color: colors.textColor,
                        callback: v => v.toFixed(isCumulative ? 0 : 3) + ' €'
                    },
                    grid: { color: colors.gridColor }
                }
            }
        }
    });

    renderPricingLegend();
    updatePricingInsight();
}

function renderPricingLegend() {
    const container = document.getElementById('pricingChartLegend');
    if (!container) return;

    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const infraInState = hasFilters ? filterInfraItems(filters) : (state.infra || []);
    container.innerHTML = Object.entries(PRICING_DATA.infra).map(([type, info]) => {
        const count = infraInState.filter(i => i.type === type.toLowerCase()).length;
        return `<div class="pricing-legend-item">
            <span class="pricing-legend-dot" style="background:${info.color}"></span>
            <span class="pricing-legend-label">${info.icon} ${type}</span>
            ${count > 0 ? `<span class="pricing-legend-count">${count} actif${count > 1 ? 's' : ''}</span>` : ''}
        </div>`;
    }).join('');
}

function updatePricingInsight() {
    const el = document.getElementById('pricingInsight');
    if (!el) return;

    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;
    const infraInState = hasFilters ? filterInfraItems(filters) : (state.infra || []);
    if (infraInState.length === 0) {
        el.innerHTML = hasFilters
            ? '<span class="insight-hint">Aucune infrastructure correspondant aux filtres.</span>'
            : '<span class="insight-hint">💡 Ajoutez des infrastructures pour voir les recommandations de coût.</span>';
        return;
    }

    const types = Object.keys(PRICING_DATA.infra);
    const midIndex = 4;
    const midVolume = PRICING_DATA.labels[midIndex];
    const costs = types.map(t => ({
        type: t,
        icon: PRICING_DATA.infra[t].icon,
        cost: PRICING_DATA.infra[t].unitCost[midIndex]
    }));
    costs.sort((a, b) => a.cost - b.cost);
    const best = costs[0];

    const crossovers = [];
    for (let i = 0; i < PRICING_DATA.requestVolumes.length - 1; i++) {
        const cumCosts = types.map(t => ({
            type: t,
            cost: getCumulativeCosts(PRICING_DATA.infra[t].unitCost, PRICING_DATA.requestVolumes)[i]
        }));
        const cumCostsNext = types.map(t => ({
            type: t,
            cost: getCumulativeCosts(PRICING_DATA.infra[t].unitCost, PRICING_DATA.requestVolumes)[i + 1]
        }));
        const cheapNow = cumCosts.reduce((a, b) => a.cost < b.cost ? a : b).type;
        const cheapNext = cumCostsNext.reduce((a, b) => a.cost < b.cost ? a : b).type;
        if (cheapNow !== cheapNext) {
            crossovers.push({ at: PRICING_DATA.labels[i + 1], from: cheapNow, to: cheapNext });
        }
    }

    const durSuffix = pricingDurationDays > 1 ? ` sur ${pricingDurationDays}j` : '';
    let html = `<span class="insight-best">🏆 À ~${midVolume} req, <strong>${best.icon} ${best.type}</strong> est le plus économique (${best.cost.toFixed(3)} €/1K req${durSuffix ? ` × ${pricingDurationDays}` : ''})</span>`;
    if (crossovers.length > 0) {
        const co = crossovers[0];
        html += `<span class="insight-crossover">🔀 Point de bascule à ${co.at} req : ${co.from} → ${co.to}</span>`;
    }
    if (pricingDurationDays > 1) {
        html += `<span class="insight-hint">📅 Projection${durSuffix} — coûts multipliés par ${pricingDurationDays}</span>`;
    }
    el.innerHTML = html;
}
