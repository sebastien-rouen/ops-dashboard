// ==================== IMPACTS ====================

// ==================== IMPACTS ====================
function openImpactModal() { openModal('modalImpact'); }

function saveImpact() {
    const title = document.getElementById('impactTitle').value.trim();
    if (!title) return toast('⚠️ Titre requis');

    const impact = {
        id: uid(),
        title,
        severity: document.getElementById('impactSeverity').value,
        origin: document.getElementById('impactOrigin').value,
        desc: document.getElementById('impactDesc').value.trim(),
        time: new Date().toISOString(),
        active: true
    };

    state.impacts.unshift(impact);
    addLog('🔴', `Impact déclaré: ${title} (${impact.severity})`);
    saveState();
    renderImpacts();
    updateGlobalStatus();
    renderMetrics();
    updateImpactsTimelineChart();
    closeModal('modalImpact');
    clearForm('impactTitle', 'impactDesc');
    toast('🔴 Impact déclaré');
    if (impact.severity === 'critical' || impact.severity === 'major') {
        sendNotification('🔴 Impact ' + impact.severity.toUpperCase(), title);
    }
}

function toggleImpactDetail(el) {
    el.classList.toggle('expanded');
    requestAnimationFrame(updateViewTabsPosition);
}

function resolveImpact(id) {
    const impact = state.impacts.find(i => i.id === id);
    if (impact) {
        impact.active = false;
        impact.resolvedAt = new Date().toISOString();
        addLog('✅', `Impact résolu: ${impact.title}`);
        saveState();
        renderImpacts();
        renderHistory();
        updateGlobalStatus();
        renderMetrics();
        updateImpactsTimelineChart();
        toast('✅ Impact résolu');
    }
}

function renderImpacts() {
    const container = document.getElementById('impactsList');
    const tickerWrap = document.getElementById('impactsTickerWrap');
    const noImpacts = document.getElementById('noImpacts');
    const active = filterImpactItems(getActiveFilters());

    if (active.length === 0) {
        container.innerHTML = '';
        if (tickerWrap) tickerWrap.style.display = 'none';
        noImpacts.style.display = 'block';
        requestAnimationFrame(updateViewTabsPosition);
        return;
    }

    noImpacts.style.display = 'none';
    if (tickerWrap) tickerWrap.style.display = '';
    const sevLabel = { critical: '🔴 CRIT', major: '🔶 MAJ', warning: '⚠️ WARN' };
    const originLabel = { external: '🌐 Externe', internal: '🏠 Interne' };
    const chipHtml = active.map(i => `
        <div class="impact-chip ${i.severity}" onclick="toggleImpactDetail(this)">
            <span class="impact-chip-severity">${sevLabel[i.severity] || '⚠️'}</span>
            <span class="impact-chip-text">${esc(i.title)}</span>
            <button class="impact-chip-close" onclick="event.stopPropagation();resolveImpact('${i.id}')" title="Résoudre">✓</button>
            <div class="impact-chip-detail">
                ${i.desc ? `<span>${esc(i.desc)}</span>` : ''}
                <span class="impact-chip-meta">${originLabel[i.origin] || ''} · Depuis ${timeAgo(i.time)}</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = chipHtml;

    // Bounce scroll: calculate overflow and set CSS vars
    requestAnimationFrame(() => {
        const wrapWidth = tickerWrap.offsetWidth;
        const contentWidth = container.scrollWidth;
        const overflow = contentWidth - wrapWidth;
        if (overflow > 0) {
            container.style.setProperty('--scroll-start', '0px');
            container.style.setProperty('--scroll-end', `-${overflow}px`);
            const speed = Math.max(8, Math.min(40, overflow / 18));
            container.style.animationDuration = speed + 's';
            container.style.animationPlayState = '';
        } else {
            container.style.animationPlayState = 'paused';
            container.style.transform = 'translateX(0)';
        }
    });

    requestAnimationFrame(updateViewTabsPosition);
}

// ==================== IMPACT HISTORY ====================
function renderHistory() {
    const container = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    if (!container) return;

    const resolved = state.impacts.filter(i => !i.active).sort((a, b) => {
        return new Date(b.resolvedAt || b.time) - new Date(a.resolvedAt || a.time);
    });

    if (resolved.length === 0) {
        container.innerHTML = '';
        noHistory.style.display = 'block';
        return;
    }

    noHistory.style.display = 'none';
    const sevIcon = { critical: '🔴', major: '🔶', warning: '⚠️' };
    container.innerHTML = resolved.map(i => {
        const created = new Date(i.time).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const resolvedAt = i.resolvedAt ? new Date(i.resolvedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
        const duration = i.resolvedAt ? formatDuration(new Date(i.resolvedAt) - new Date(i.time)) : '—';
        return `
            <div class="history-item ${i.severity}">
                <span class="history-sev">${sevIcon[i.severity] || '⚠️'}</span>
                <div class="history-content">
                    <span class="history-title">${esc(i.title)}</span>
                    ${i.desc ? `<span class="history-desc">${esc(i.desc)}</span>` : ''}
                </div>
                <div class="history-timeline">
                    <span>📅 ${created}</span>
                    <span>→ ${resolvedAt}</span>
                    <span class="history-duration">⏱ ${duration}</span>
                </div>
            </div>`;
    }).join('');
}

function clearResolvedImpacts() {
    const count = state.impacts.filter(i => !i.active).length;
    if (count === 0) return toast('Aucun historique à purger');
    if (!confirm(`Supprimer ${count} impact(s) résolu(s) ?`)) return;
    state.impacts = state.impacts.filter(i => i.active);
    addLog('🗑️', `${count} impact(s) résolu(s) purgé(s)`);
    saveState();
    renderHistory();
    renderMetrics();
    toast('🗑️ Historique purgé');
}
