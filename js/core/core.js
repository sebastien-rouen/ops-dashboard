// ==================== CORE ====================

// ==================== THEME ====================
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    updateActivityChart();
    updateInfraStatusChart();
    updatePriorityChart();
    updateImpactsTimelineChart();
    updateTrafficLightChart();
    updatePricingChart();
}

// ==================== COMPACT MODE ====================
function toggleCompactMode() {
    document.body.classList.toggle('compact-mode');
    const isCompact = document.body.classList.contains('compact-mode');
    state.compactMode = isCompact;
    saveState();
    requestAnimationFrame(updateViewTabsPosition);
    toast(isCompact ? '📐 Mode compact activé' : '📐 Mode normal');
    // Resize charts
    setTimeout(() => {
        if (activityChart) activityChart.resize();
        if (infraStatusChartInstance) infraStatusChartInstance.resize();
        if (priorityChartInstance) priorityChartInstance.resize();
        if (impactsTimelineChartInstance) impactsTimelineChartInstance.resize();
        if (window.trafficLightChartInstance) window.trafficLightChartInstance.resize();
        if (pricingChartInstance) pricingChartInstance.resize();
    }, 100);
}

// ==================== LOG ====================
function addLog(icon, msg) {
    state.log.unshift({
        time: new Date().toISOString(),
        icon,
        msg
    });
    if (state.log.length > 100) state.log = state.log.slice(0, 100);
    saveState();
    renderLog();
}

function renderLog() {
    const container = document.getElementById('logEntries');
    if (state.log.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📝</span>Aucun evenement<span class="empty-state-hint">Les actions seront journalisees ici</span></div>';
        return;
    }
    container.innerHTML = state.log.slice(0, 50).map(l => `
        <div class="log-entry">
            <span class="log-time">${formatTime(l.time)}</span>
            <span class="log-icon">${l.icon}</span>
            <span class="log-msg">${esc(l.msg)}</span>
        </div>
    `).join('');
}

function clearLog() {
    state.log = [];
    saveState();
    renderLog();
    toast('🗑️ Journal vidé');
}

// ==================== NOTIFICATIONS ====================
function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification(title, body, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(title, { body, icon: icon || '⚡', tag: 'ops-' + Date.now() });
    } catch (e) { /* silent */ }
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    // Skip if typing in an input/textarea/select
    const tag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    // Skip if a modal is open
    if (document.querySelector('.modal-overlay.show')) return;

    switch (e.key) {
        case '?':
            e.preventDefault();
            toggleShortcutsHelp();
            break;
        case '1':
            e.preventDefault();
            switchView('ops', document.querySelector('.view-tab[data-view="ops"]'));
            break;
        case '2':
            e.preventDefault();
            switchView('reseau', document.querySelector('.view-tab[data-view="reseau"]'));
            break;
        case '3':
            e.preventDefault();
            switchView('apps', document.querySelector('.view-tab[data-view="apps"]'));
            break;
        case '/':
            e.preventDefault();
            document.getElementById('globalSearch')?.focus();
            break;
        case 'i':
            e.preventDefault();
            openImpactModal();
            break;
        case 't':
            e.preventDefault();
            openTaskModal();
            break;
        case 'c':
            e.preventDefault();
            toggleCompactMode();
            break;
        case 's':
            e.preventDefault();
            openDashboardSettings();
            break;
        case 'e':
            e.preventDefault();
            openExportModal();
            break;
    }
});

function toggleShortcutsHelp() {
    let el = document.getElementById('shortcutsOverlay');
    if (el) { el.remove(); return; }
    el = document.createElement('div');
    el.id = 'shortcutsOverlay';
    el.className = 'shortcuts-overlay';
    el.onclick = () => el.remove();
    el.innerHTML = `
        <div class="shortcuts-card" onclick="event.stopPropagation()">
            <h3>⌨️ Raccourcis clavier</h3>
            <div class="shortcuts-grid">
                <kbd>?</kbd><span>Afficher/masquer cette aide</span>
                <kbd>1</kbd><span>Vue Ops</span>
                <kbd>2</kbd><span>Vue Réseau</span>
                <kbd>3</kbd><span>Vue Apps</span>
                <kbd>/</kbd><span>Focus recherche</span>
                <kbd>i</kbd><span>Déclarer un impact</span>
                <kbd>t</kbd><span>Nouvelle tâche</span>
                <kbd>e</kbd><span>Exporter</span>
                <kbd>s</kbd><span>Paramètres d'affichage</span>
                <kbd>c</kbd><span>Mode compact</span>
                <kbd>Esc</kbd><span>Fermer modal/aide</span>
            </div>
        </div>`;
    document.body.appendChild(el);
}

// ==================== CHARTS LAYOUT ====================
let chartsLayoutCols = parseInt(localStorage.getItem('chartsLayoutCols')) || 3;

function applyChartsLayout() {
    const grid = document.getElementById('chartsGrid');
    const btn = document.getElementById('chartsLayoutToggle');
    if (!grid) return;
    grid.classList.toggle('cols-3', chartsLayoutCols === 3);
    if (btn) btn.textContent = chartsLayoutCols === 2 ? 'Disposition : ▦ 3 colonnes' : 'Disposition : ▥ 2 colonnes';
}

function toggleChartsLayout() {
    chartsLayoutCols = chartsLayoutCols === 2 ? 3 : 2;
    localStorage.setItem('chartsLayoutCols', chartsLayoutCols);
    applyChartsLayout();
    setTimeout(() => {
        if (activityChart) activityChart.resize();
        if (infraStatusChartInstance) infraStatusChartInstance.resize();
        if (priorityChartInstance) priorityChartInstance.resize();
        if (impactsTimelineChartInstance) impactsTimelineChartInstance.resize();
        if (window.trafficLightChartInstance) window.trafficLightChartInstance.resize();
        if (pricingChartInstance) pricingChartInstance.resize();
    }, 100);
}
