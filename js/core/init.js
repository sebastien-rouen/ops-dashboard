// ==================== INIT ====================
function initApp() {
    if (state.bannerDismissed) {
        document.getElementById('privacyBanner').classList.add('hidden');
    }

    initChartData();
    renderAll();
    requestNotifPermission();

    // Restore compact mode
    if (state.compactMode) document.body.classList.add('compact-mode');

    // Restore charts layout
    applyChartsLayout();

    // Restore dashboard settings
    applyDashboardSettings();
    initDsHideButtons();

    // Init drag & drop
    injectDragHandles();
    initDragDrop();

    // Restore saved view
    const savedView = state.currentView || 'ops';
    const viewBtn = document.querySelector(`.view-tab[data-view="${savedView}"]`);
    switchView(savedView, viewBtn);

    updateViewTabsPosition();

    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 600);
}

function renderAll() {
    renderImpacts();
    renderHistory();
    renderTasks();
    renderInfra();
    renderMetrics();
    renderGitlabMetric();
    renderGitlabPipelinesMetric();
    renderGitlabCommitsMetric();
    renderGithubPRMetric();
    renderGithubActionsMetric();
    renderGithubCommitsMetric();
    renderMTTRMetric();
    renderDeployFrequencyMetric();
    renderChangeFailureRateMetric();
    renderConsulMetric();
    renderAnsibleMetric();
    renderOpenstackMetric();
    renderRateLimitMetric();
    updateMetricGroupVisibility();
    renderLog();
    updateGlobalStatus();
    updateActivityChart();
    updateInfraStatusChart();
    updatePriorityChart();
    updateImpactsTimelineChart();
    updatePricingChart();
    updateAnsibleCharts();
    updateOpenstackCharts();
    updateDowntimeCostChart();
    updateRateLimitChart();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
