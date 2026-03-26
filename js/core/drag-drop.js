// ==================== DRAG & DROP ====================

function initDragDrop() {
    if (typeof Sortable === 'undefined') {
        console.warn('SortableJS not loaded — drag-drop disabled');
        return;
    }
    initMetricSortables();
    initChartsSortable();
    initInfraSortables();
}

// ---- Métriques ----
function initMetricSortables() {
    document.querySelectorAll('.metrics-group').forEach(group => {
        if (group._sortable) group._sortable.destroy();
        group._sortable = new Sortable(group, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            draggable: '.metric-card',
            onEnd: saveMetricsOrder
        });
    });
    applyMetricsOrder();
}

function saveMetricsOrder() {
    const order = {};
    document.querySelectorAll('.metrics-group').forEach(group => {
        const label = group.querySelector('.metrics-group-label');
        if (!label) return;
        const key = label.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/\//g, '');
        const ids = Array.from(group.querySelectorAll('.metric-card[data-settings-id]'))
            .map(c => c.getAttribute('data-settings-id'));
        order[key] = ids;
    });
    state.metricsOrder = order;
    saveState();
}

function applyMetricsOrder() {
    const order = state.metricsOrder || {};
    document.querySelectorAll('.metrics-group').forEach(group => {
        const label = group.querySelector('.metrics-group-label');
        if (!label) return;
        const key = label.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/\//g, '');
        const ids = order[key];
        if (!ids || ids.length === 0) return;
        ids.forEach(id => {
            const card = group.querySelector(`.metric-card[data-settings-id="${id}"]`);
            if (card) group.appendChild(card);
        });
    });
}

// ---- Graphiques ----
function initChartsSortable() {
    const grid = document.getElementById('chartsGrid');
    if (!grid) return;
    if (grid._sortable) grid._sortable.destroy();
    grid._sortable = new Sortable(grid, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        draggable: '.chart-container, .chart-row-dual, .chart-row-quad',
        filter: '.charts-layout-toggle',
        onEnd: saveChartsOrder
    });
    applyChartsOrder();
}

function saveChartsOrder() {
    const grid = document.getElementById('chartsGrid');
    if (!grid) return;
    const ids = Array.from(grid.children)
        .filter(el => el.hasAttribute('data-settings-id'))
        .map(el => el.getAttribute('data-settings-id'));
    state.chartsOrder = ids;
    saveState();
}

function applyChartsOrder() {
    const grid = document.getElementById('chartsGrid');
    if (!grid) return;
    const ids = state.chartsOrder || [];
    if (ids.length === 0) return;
    ids.forEach(id => {
        const el = grid.querySelector(`:scope > [data-settings-id="${id}"]`);
        if (el) grid.appendChild(el);
    });
}

// ---- Infra ----
function initInfraSortables() {
    document.querySelectorAll('.infra-group').forEach(group => {
        if (group._sortable) group._sortable.destroy();
        group._sortable = new Sortable(group, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            draggable: '.infra-row',
            onEnd: saveInfraOrder
        });
    });
    applyInfraOrder();
}

function saveInfraOrder() {
    const order = {};
    document.querySelectorAll('.infra-group').forEach(group => {
        const header = group.querySelector('.infra-group-label');
        if (!header) return;
        const key = header.textContent.trim().toLowerCase();
        const ids = Array.from(group.querySelectorAll('.infra-row[data-infra-id]'))
            .map(r => r.getAttribute('data-infra-id'));
        order[key] = ids;
    });
    state.infraOrder = order;
    saveState();
}

function applyInfraOrder() {
    const order = state.infraOrder || {};
    document.querySelectorAll('.infra-group').forEach(group => {
        const header = group.querySelector('.infra-group-label');
        if (!header) return;
        const key = header.textContent.trim().toLowerCase();
        const ids = order[key];
        if (!ids || ids.length === 0) return;
        ids.forEach(id => {
            const row = group.querySelector(`.infra-row[data-infra-id="${id}"]`);
            if (row) group.appendChild(row);
        });
    });
}

// ---- Drag handles ----
function injectDragHandles() {
    // Métriques : insérer ⠿ en premier enfant de chaque .metric-card
    document.querySelectorAll('.metric-card').forEach(card => {
        if (card.querySelector('.drag-handle')) return;
        const h = document.createElement('span');
        h.className = 'drag-handle';
        h.textContent = '\u2817';
        h.title = 'Déplacer';
        card.prepend(h);
    });

    // Charts : insérer dans chaque enfant direct de #chartsGrid (sauf le toggle)
    const grid = document.getElementById('chartsGrid');
    if (grid) {
        Array.from(grid.children).forEach(el => {
            if (el.classList.contains('charts-layout-toggle')) return;
            if (el.querySelector(':scope > .drag-handle')) return;
            const h = document.createElement('span');
            h.className = 'drag-handle';
            h.textContent = '\u2817';
            h.title = 'Déplacer';
            h.style.position = 'absolute';
            h.style.top = '8px';
            h.style.right = '8px';
            el.style.position = 'relative';
            el.appendChild(h);
        });
    }

    // Infra : insérer en premier enfant de chaque .infra-row
    document.querySelectorAll('.infra-row').forEach(row => {
        if (row.querySelector('.drag-handle')) return;
        const h = document.createElement('span');
        h.className = 'drag-handle';
        h.textContent = '\u2817';
        h.title = 'Déplacer';
        row.prepend(h);
    });
}
