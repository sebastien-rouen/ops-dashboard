// ==================== METRICS ====================
function renderMetrics() {
    const filters = getActiveFilters();
    const hasFilters = filters.search || filters.type || filters.status || filters.env || filters.tags;

    // Use filtered data when filters are active
    const filteredTasks = hasFilters ? filterTaskItems(filters) : state.tasks;
    const filteredInfra = hasFilters ? filterInfraItems(filters) : state.infra;
    const filteredImpacts = hasFilters ? filterImpactItems(filters) : state.impacts.filter(i => i.active);

    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const wip = filteredTasks.filter(t => t.status === 'wip').length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const total = filteredTasks.length;

    // Basic metrics with animation
    animateValue('metricTodo', todo);
    animateValue('metricWip', wip);
    animateValue('metricDone', done);
    animateValue('metricInfra', filteredInfra.length);

    // Infra mini summary (up / degraded / down)
    const infraSummaryEl = document.getElementById('metricInfraSummary');
    if (infraSummaryEl) {
        const upCount = filteredInfra.filter(i => i.status === 'up').length;
        const degCount = filteredInfra.filter(i => i.status === 'degraded').length;
        const downCount = filteredInfra.filter(i => i.status === 'down').length;
        if (filteredInfra.length > 0) {
            infraSummaryEl.innerHTML =
                `<span class="mms-dot green"></span>${upCount}` +
                (degCount ? `<span class="mms-sep"></span><span class="mms-dot yellow"></span>${degCount}` : '') +
                (downCount ? `<span class="mms-sep"></span><span class="mms-dot red"></span>${downCount}` : '');
        } else {
            infraSummaryEl.innerHTML = '';
        }
    }

    // Completion rate
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('metricCompletion').textContent = completionRate + '%';
    const progressCompletion = document.getElementById('progressCompletion');
    if (progressCompletion) {
        setTimeout(() => {
            progressCompletion.style.width = completionRate + '%';
        }, 100);
    }

    // Infrastructure uptime
    const upInfra = filteredInfra.filter(i => i.status === 'up').length;
    const uptimeRate = filteredInfra.length > 0 ? Math.round((upInfra / filteredInfra.length) * 100) : 0;
    document.getElementById('metricUptime').textContent = uptimeRate + '%';
    const progressUptime = document.getElementById('progressUptime');
    if (progressUptime) {
        setTimeout(() => {
            progressUptime.style.width = uptimeRate + '%';
        }, 100);
    }

    // Active impacts
    const activeImpacts = filteredImpacts.length;
    animateValue('metricImpacts', activeImpacts);

    // Impacts mini summary (critical / major / warning)
    const impactsSummaryEl = document.getElementById('metricImpactsSummary');
    if (impactsSummaryEl) {
        const critCount = filteredImpacts.filter(i => i.severity === 'critical').length;
        const majCount = filteredImpacts.filter(i => i.severity === 'major').length;
        const warnCount = filteredImpacts.filter(i => i.severity === 'warning').length;
        if (activeImpacts > 0) {
            const parts = [];
            if (critCount) parts.push(`<span class="mms-sev mms-crit">🔴 ${critCount}</span>`);
            if (majCount) parts.push(`<span class="mms-sev mms-major">🔶 ${majCount}</span>`);
            if (warnCount) parts.push(`<span class="mms-sev mms-warn">⚠️ ${warnCount}</span>`);
            impactsSummaryEl.innerHTML = parts.join('<span class="mms-sep"></span>');
        } else {
            impactsSummaryEl.innerHTML = '';
        }
    }

    // Add pulse animation to warning card if there are active impacts
    const warningCard = document.querySelector('.metric-card-warning');
    if (warningCard) {
        if (activeImpacts > 0) {
            warningCard.classList.add('has-impacts');
        } else {
            warningCard.classList.remove('has-impacts');
        }
    }

    // Resolved impacts (not filtered — always show total)
    const resolvedImpacts = state.impacts.filter(i => !i.active).length;
    animateValue('metricResolved', resolvedImpacts);

    // Visual hint: show filter badge on metrics bar when filtered
    const metricsBar = document.querySelector('.metrics-bar');
    if (metricsBar) metricsBar.classList.toggle('is-filtered', hasFilters);
}

function animateValue(elementId, end, duration = 800) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    if (start === end) return;

    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + range * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end;
        }
    }

    requestAnimationFrame(update);
}

// ==================== METRIC DETAIL ====================

function mdMoveTask(taskId, newStatus, currentView) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    task.status = newStatus;
    if (newStatus === 'done' && oldStatus !== 'done') bumpChartCompleted();
    addLog('➡️', `${task.title} → ${statusLabel(newStatus)}`);
    saveState();
    renderTasks();
    renderMetrics();
    updateActivityChart();
    toast(`➡️ ${statusLabel(newStatus)}`);
    // Refresh modal content for current view
    openMetricDetail(currentView);
}

function mdToggleDesc(rowEl) {
    if (!rowEl.classList.contains('md-row-expandable')) return;
    rowEl.classList.toggle('expanded');
}

function mdResolveImpact(impactId) {
    const impact = state.impacts.find(i => i.id === impactId);
    if (!impact || !impact.active) return;
    impact.active = false;
    impact.resolvedAt = new Date().toISOString();
    addLog('✅', `Impact résolu: ${impact.title}`);
    saveState();
    renderImpacts(); renderHistory(); updateGlobalStatus();
    renderMetrics(); updateImpactsTimelineChart();
    toast('✅ Impact résolu');
    openMetricDetail('impacts');
}

function openMetricDetail(type) {
    const titleEl = document.getElementById('metricDetailTitle');
    const contentEl = document.getElementById('metricDetailContent');
    if (!titleEl || !contentEl) return;

    const priLabel = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const sevIcon = { critical: '🔴', major: '🔶', warning: '⚠️' };
    const originLabel = { external: '🌐 Ext', internal: '🏠 Int' };
    const statusDot = { up: 'green', degraded: 'yellow', down: 'red' };
    const statusLabel = { up: 'Up', degraded: 'Dégradé', down: 'Down' };

    let html = '';

    if (type === 'todo' || type === 'wip' || type === 'done') {
        const labelMap = { todo: '📌 Tâches à faire', wip: '🔧 Tâches en cours', done: '✅ Tâches terminées' };
        titleEl.textContent = labelMap[type];
        const tasks = state.tasks.filter(t => t.status === type);
        tasks.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

        if (tasks.length === 0) {
            html = '<div class="md-empty">Aucune tâche</div>';
        } else {
            // Summary by priority
            const byCrit = tasks.filter(t => t.priority === 'critical').length;
            const byHigh = tasks.filter(t => t.priority === 'high').length;
            const byMed = tasks.filter(t => t.priority === 'medium').length;
            const byLow = tasks.filter(t => t.priority === 'low').length;
            html += '<div class="md-summary">';
            if (byCrit) html += `<span class="md-summary-item">⚫ ${byCrit} critical</span>`;
            if (byHigh) html += `<span class="md-summary-item">🔴 ${byHigh} high</span>`;
            if (byMed) html += `<span class="md-summary-item">🟡 ${byMed} medium</span>`;
            if (byLow) html += `<span class="md-summary-item">🟢 ${byLow} low</span>`;
            html += '</div>';

            html += tasks.map(t => {
                const tags = (t.tags || []).slice(0, 4).map(tag => `<span class="md-row-tag">${esc(tag)}</span>`).join('');
                const statusBtns = ['todo', 'wip', 'done'].map(s => {
                    const icons = { todo: '📌', wip: '🔧', done: '✅' };
                    const active = t.status === s ? ' active' : '';
                    return `<button class="md-status-btn md-status-${s}${active}" onclick="event.stopPropagation();mdMoveTask('${t.id}','${s}','${type}')" title="${statusLabel(s)}">${icons[s]}</button>`;
                }).join('');
                const hasDesc = t.desc && t.desc.trim();
                return `<div class="md-row md-row-${t.priority} md-row-task${hasDesc ? ' md-row-expandable' : ''}" onclick="mdToggleDesc(this)">
                    <span class="md-row-badge badge-${t.priority}">${priLabel[t.priority]}</span>
                    <span class="md-row-name">${esc(t.title)}</span>
                    ${t.assignee ? `<span class="md-row-meta">${esc(t.assignee)}</span>` : ''}
                    <div class="md-row-tags">${tags}</div>
                    <div class="md-status-group">${statusBtns}</div>
                    ${hasDesc ? `<div class="md-row-desc">${esc(t.desc)}</div>` : ''}
                </div>`;
            }).join('');
        }

    } else if (type === 'infra') {
        titleEl.textContent = '🖥️ Infrastructure — Détail';
        const infra = state.infra;
        const up = infra.filter(i => i.status === 'up').length;
        const deg = infra.filter(i => i.status === 'degraded').length;
        const down = infra.filter(i => i.status === 'down').length;

        html += `<div class="md-summary">
            <span class="md-summary-item"><span class="md-row-dot green"></span> ${up} up</span>
            <span class="md-summary-item"><span class="md-row-dot yellow"></span> ${deg} degraded</span>
            <span class="md-summary-item"><span class="md-row-dot red"></span> ${down} down</span>
        </div>`;

        // Group by type
        const types = {};
        infra.forEach(i => {
            const t = i.type || 'other';
            if (!types[t]) types[t] = [];
            types[t].push(i);
        });

        const typeLabels = { vm: 'VM', lxc: 'LXC', stack: 'Stack', logger: 'Logger', other: 'Autre' };
        Object.keys(typeLabels).forEach(t => {
            const items = types[t];
            if (!items || items.length === 0) return;
            items.sort((a, b) => {
                const sOrder = { down: 0, degraded: 1, up: 2 };
                return (sOrder[a.status] || 2) - (sOrder[b.status] || 2) || a.name.localeCompare(b.name);
            });
            html += `<div class="md-group"><div class="md-group-title">${typeLabels[t]} (${items.length})</div>`;
            html += items.map(i => `<div class="md-row md-row-${statusDot[i.status]}">
                <span class="md-row-dot ${statusDot[i.status]}"></span>
                <span class="md-row-name">${esc(i.name)}</span>
                <span class="md-row-badge badge-${i.status}">${statusLabel[i.status]}</span>
                ${i.env ? `<span class="md-row-meta">${i.env.toUpperCase()}</span>` : ''}
                ${i.ip ? `<span class="md-row-meta">${esc(i.ip)}</span>` : ''}
            </div>`).join('');
            html += '</div>';
        });

    } else if (type === 'uptime') {
        titleEl.textContent = '💚 Disponibilité infrastructure';
        const infra = state.infra;
        const up = infra.filter(i => i.status === 'up');
        const deg = infra.filter(i => i.status === 'degraded');
        const down = infra.filter(i => i.status === 'down');
        const total = infra.length;
        const pct = total > 0 ? Math.round((up.length / total) * 100) : 0;

        html += `<div class="md-summary">
            <span class="md-summary-item">${pct}% disponible — ${up.length}/${total} machines up</span>
        </div>`;

        if (down.length > 0) {
            html += '<div class="md-group"><div class="md-group-title">🔴 Down (' + down.length + ')</div>';
            html += down.map(i => `<div class="md-row md-row-red">
                <span class="md-row-dot red"></span>
                <span class="md-row-name">${esc(i.name)}</span>
                ${i.env ? `<span class="md-row-meta">${i.env.toUpperCase()}</span>` : ''}
                ${i.details ? `<span class="md-row-meta">${esc(i.details)}</span>` : ''}
            </div>`).join('');
            html += '</div>';
        }
        if (deg.length > 0) {
            html += '<div class="md-group"><div class="md-group-title">🟡 Dégradé (' + deg.length + ')</div>';
            html += deg.map(i => `<div class="md-row md-row-yellow">
                <span class="md-row-dot yellow"></span>
                <span class="md-row-name">${esc(i.name)}</span>
                ${i.env ? `<span class="md-row-meta">${i.env.toUpperCase()}</span>` : ''}
                ${i.details ? `<span class="md-row-meta">${esc(i.details)}</span>` : ''}
            </div>`).join('');
            html += '</div>';
        }
        if (up.length > 0) {
            html += '<div class="md-group"><div class="md-group-title">🟢 Opérationnel (' + up.length + ')</div>';
            html += up.map(i => `<div class="md-row md-row-green">
                <span class="md-row-dot green"></span>
                <span class="md-row-name">${esc(i.name)}</span>
                ${i.env ? `<span class="md-row-meta">${i.env.toUpperCase()}</span>` : ''}
            </div>`).join('');
            html += '</div>';
        }

    } else if (type === 'impacts') {
        titleEl.textContent = '🔴 Impacts actifs';
        const active = state.impacts.filter(i => i.active);
        active.sort((a, b) => {
            const sOrder = { critical: 0, major: 1, warning: 2 };
            return (sOrder[a.severity] || 2) - (sOrder[b.severity] || 2);
        });

        if (active.length === 0) {
            html = '<div class="md-empty">✅ Aucun impact actif — situation nominale</div>';
        } else {
            const byCrit = active.filter(i => i.severity === 'critical').length;
            const byMaj = active.filter(i => i.severity === 'major').length;
            const byWarn = active.filter(i => i.severity === 'warning').length;
            const total = active.length;

            html += '<div class="sre-detail">';

            // Stat cards
            html += '<div class="sre-stats">';
            html += `<div class="sre-stat"><span class="sre-stat-val">${total}</span><span class="sre-stat-label">Impacts actifs</span></div>`;
            if (byCrit) html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--critical)">${byCrit}</span><span class="sre-stat-label">Critical</span></div>`;
            if (byMaj) html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--orange)">${byMaj}</span><span class="sre-stat-label">Major</span></div>`;
            if (byWarn) html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--yellow)">${byWarn}</span><span class="sre-stat-label">Warning</span></div>`;
            html += '</div>';

            // Severity progress bar
            html += '<div class="sre-progress">';
            if (byCrit) html += `<div class="sre-progress-fill red" style="width:${(byCrit / total * 100).toFixed(1)}%" title="Critical: ${byCrit}"></div>`;
            if (byMaj) html += `<div class="sre-progress-fill yellow" style="width:${(byMaj / total * 100).toFixed(1)}%;background:var(--orange)" title="Major: ${byMaj}"></div>`;
            if (byWarn) html += `<div class="sre-progress-fill accent" style="width:${(byWarn / total * 100).toFixed(1)}%" title="Warning: ${byWarn}"></div>`;
            html += '</div>';

            // Detail list
            html += '<div class="sre-section-title">Détail des impacts</div>';
            html += '<div class="sre-list">';
            active.forEach(i => {
                const sevCss = i.severity === 'critical' ? 'background:rgba(220,38,38,0.12);color:var(--critical)' : i.severity === 'major' ? 'background:rgba(249,115,22,0.1);color:var(--orange)' : 'background:rgba(245,158,11,0.1);color:var(--yellow)';
                html += `<div class="sre-item">
                    <span class="sre-item-badge" style="${sevCss}">${i.severity}</span>
                    <span class="sre-item-name">${esc(i.title)}</span>
                    <span class="sre-item-meta">${originLabel[i.origin] || ''}</span>
                    <span class="sre-item-meta">${timeAgo(i.time)}</span>
                    <label class="md-resolve-check" onclick="event.stopPropagation()" title="Marquer comme résolu">
                        <input type="checkbox" onchange="mdResolveImpact('${i.id}')">
                        <span class="md-resolve-box"></span>
                    </label>
                </div>`;
            });
            html += '</div>';

            html += '</div>';
        }

    } else if (type === 'resolved') {
        titleEl.textContent = '✓ Impacts résolus';
        const resolved = state.impacts.filter(i => !i.active);
        resolved.sort((a, b) => new Date(b.resolvedAt || b.time) - new Date(a.resolvedAt || a.time));

        if (resolved.length === 0) {
            html = '<div class="md-empty">Aucun impact résolu</div>';
        } else {
            const byCrit = resolved.filter(i => i.severity === 'critical').length;
            const byMaj = resolved.filter(i => i.severity === 'major').length;
            const byWarn = resolved.filter(i => i.severity === 'warning').length;
            const total = resolved.length;

            // Compute durations
            const durations = resolved.filter(i => i.resolvedAt && i.time).map(i => new Date(i.resolvedAt).getTime() - new Date(i.time).getTime());
            const avgDur = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
            const bestDur = durations.length > 0 ? Math.min(...durations) : 0;
            const worstDur = durations.length > 0 ? Math.max(...durations) : 0;

            html += '<div class="sre-detail">';

            // Stat cards
            html += '<div class="sre-stats">';
            html += `<div class="sre-stat"><span class="sre-stat-val">${total}</span><span class="sre-stat-label">Résolus</span></div>`;
            html += `<div class="sre-stat"><span class="sre-stat-val">${formatDurationShort(avgDur)}</span><span class="sre-stat-label">Durée moyenne</span></div>`;
            html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--green)">${formatDurationShort(bestDur)}</span><span class="sre-stat-label">Plus rapide</span></div>`;
            html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--red)">${formatDurationShort(worstDur)}</span><span class="sre-stat-label">Plus long</span></div>`;
            html += '</div>';

            // Severity progress bar
            html += '<div class="sre-section-title">Répartition par sévérité</div>';
            html += '<div class="sre-progress">';
            if (byCrit) html += `<div class="sre-progress-fill red" style="width:${(byCrit / total * 100).toFixed(1)}%" title="Critical: ${byCrit}"></div>`;
            if (byMaj) html += `<div class="sre-progress-fill yellow" style="width:${(byMaj / total * 100).toFixed(1)}%;background:var(--orange)" title="Major: ${byMaj}"></div>`;
            if (byWarn) html += `<div class="sre-progress-fill accent" style="width:${(byWarn / total * 100).toFixed(1)}%" title="Warning: ${byWarn}"></div>`;
            html += '</div>';

            // Detail list
            html += '<div class="sre-section-title">Historique des résolutions</div>';
            html += '<div class="sre-list">';
            resolved.forEach(i => {
                const resolvedDate = i.resolvedAt ? new Date(i.resolvedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                const duration = i.resolvedAt && i.time ? formatDurationShort(new Date(i.resolvedAt).getTime() - new Date(i.time).getTime()) : '';
                const sevCss = i.severity === 'critical' ? 'background:rgba(220,38,38,0.12);color:var(--critical)' : i.severity === 'major' ? 'background:rgba(249,115,22,0.1);color:var(--orange)' : 'background:rgba(245,158,11,0.1);color:var(--yellow)';
                html += `<div class="sre-item">
                    <span class="sre-item-badge" style="${sevCss}">${i.severity}</span>
                    <span class="sre-item-name">${esc(i.title)}</span>
                    ${duration ? `<span class="sre-item-meta">${duration}</span>` : ''}
                    ${resolvedDate ? `<span class="sre-item-meta">${resolvedDate}</span>` : ''}
                </div>`;
            });
            html += '</div>';

            html += '</div>';
        }
    }

    contentEl.innerHTML = html;
    openModal('modalMetricDetail');
}

// ==================== METRIC GROUP VISIBILITY ====================
function updateMetricGroupVisibility() {
    document.querySelectorAll('.metrics-group').forEach(group => {
        const cards = group.querySelectorAll('.metric-card');
        if (cards.length === 0) return;
        const allHidden = Array.from(cards).every(card =>
            card.classList.contains('no-source') ||
            card.classList.contains('ds-hidden') ||
            card.style.display === 'none'
        );
        group.classList.toggle('group-hidden', allHidden);
    });
}
