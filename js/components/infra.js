// ==================== INFRA ====================
function openInfraModal() { openModal('modalInfra'); }
function openPasteModal() {
    // Reset preview state
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('previewStats').innerHTML = '';
    document.getElementById('btnConfirmImport').disabled = true;
    openModal('modalPaste');
}

function saveInfra() {
    const name = document.getElementById('infraName').value.trim();
    if (!name) return toast('⚠️ Nom requis');

    const item = {
        id: uid(),
        name,
        type: document.getElementById('infraType').value,
        env: document.getElementById('infraEnv').value || '',
        status: document.getElementById('infraStatus').value,
        ip: document.getElementById('infraIp').value.trim(),
        details: document.getElementById('infraDetails').value.trim(),
        added: new Date().toISOString()
    };

    state.infra.push(item);
    addLog('🖥️', `Infra ajouté: ${name} (${item.type.toUpperCase()})`);
    saveState();
    renderInfra();
    renderMetrics();
    updateGlobalStatus();
    updateInfraStatusChart();
    closeModal('modalInfra');
    clearForm('infraName', 'infraIp', 'infraDetails', 'infraEnv');
    toast('🖥️ Infrastructure ajoutée');
}

function previewPaste() {
    const raw = document.getElementById('pasteContent').value.trim();
    if (!raw) {
        toast('⚠️ Rien à prévisualiser');
        return;
    }

    const lines = raw.split('\n').filter(l => l.trim());
    const previewContainer = document.getElementById('previewContainer');
    const previewContent = document.getElementById('previewContent');
    const previewStats = document.getElementById('previewStats');
    const btnImport = document.getElementById('btnConfirmImport');

    let validCount = 0;
    let invalidCount = 0;
    let html = '';

    lines.forEach((line, index) => {
        const parts = line.split('|').map(s => s.trim());
        const isValid = parts.length >= 1 && parts[0];

        if (isValid) {
            validCount++;
            const name = parts[0];
            const type = normalizeType(parts[1] || 'other');
            const status = normalizeStatus(parts[2] || 'up');
            const ip = parts[3] || '';
            const details = parts[4] || '';
            const env = normalizeEnv(parts[5] || '');

            html += `
                <div class="preview-item valid">
                    <div class="preview-item-icon">✓</div>
                    <div class="preview-item-content">
                        <div class="preview-item-name">${esc(name)}</div>
                        <div class="preview-item-details">
                            <span class="preview-item-badge type-${type}">${type.toUpperCase()}</span>
                            <span class="preview-item-badge status-${status}">${status.toUpperCase()}</span>
                            ${env ? `<span class="preview-item-badge env-${env}">${env.toUpperCase()}</span>` : ''}
                            ${ip ? `<span>📡 ${esc(ip)}</span>` : ''}
                            ${details ? `<span>${esc(details)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            invalidCount++;
            html += `
                <div class="preview-item invalid">
                    <div class="preview-item-icon">✕</div>
                    <div class="preview-item-content">
                        <div class="preview-item-name">Ligne ${index + 1}</div>
                        <div class="preview-item-error">Format invalide: "${esc(line)}"</div>
                    </div>
                </div>
            `;
        }
    });

    previewContent.innerHTML = html;
    previewStats.innerHTML = `
        <span class="stat-valid">✓ ${validCount} valide(s)</span>
        ${invalidCount > 0 ? `<span class="stat-invalid">✕ ${invalidCount} invalide(s)</span>` : ''}
    `;

    previewContainer.style.display = 'block';
    btnImport.disabled = validCount === 0;

    if (validCount === 0) {
        toast('⚠️ Aucune ligne valide à importer');
    } else {
        toast(`👁️ ${validCount} ligne(s) prête(s) à importer`);
    }
}

function parsePaste() {
    const raw = document.getElementById('pasteContent').value.trim();
    if (!raw) return toast('⚠️ Rien à importer');

    const lines = raw.split('\n').filter(l => l.trim());
    let count = 0;

    lines.forEach(line => {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 1 && parts[0]) {
            const item = {
                id: uid(),
                name: parts[0],
                type: normalizeType(parts[1] || 'other'),
                status: normalizeStatus(parts[2] || 'up'),
                ip: parts[3] || '',
                details: parts[4] || '',
                env: normalizeEnv(parts[5] || ''),
                added: new Date().toISOString()
            };
            state.infra.push(item);
            count++;
        }
    });

    addLog('📋', `Import en masse: ${count} éléments ajoutés`);
    saveState();
    renderInfra();
    renderMetrics();
    updateGlobalStatus();
    updateInfraStatusChart();
    closeModal('modalPaste');
    document.getElementById('pasteContent').value = '';
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('previewStats').innerHTML = '';
    document.getElementById('btnConfirmImport').disabled = true;
    toast(`📋 ${count} éléments importés`);
}

function deleteInfra(id) {
    state.infra = state.infra.filter(i => i.id !== id);
    addLog('🗑️', 'Élément infra supprimé');
    saveState();
    renderInfra();
    renderMetrics();
    updateGlobalStatus();
    updateInfraStatusChart();
    toast('🗑️ Élément supprimé');
}

function cycleInfraStatus(id) {
    const item = state.infra.find(i => i.id === id);
    if (!item) return;
    const cycle = { up: 'degraded', degraded: 'down', down: 'up' };
    item.status = cycle[item.status] || 'up';
    addLog('🔄', `${item.name} → ${item.status.toUpperCase()}`);
    if (item.status === 'down') {
        sendNotification('🔴 Machine DOWN', item.name + (item.ip ? ' (' + item.ip + ')' : ''));
    }
    saveState();
    renderInfra();
    updateGlobalStatus();
    updateInfraStatusChart();
    toast(`${item.name} → ${item.status.toUpperCase()}`);
}


let infraGroupMode = localStorage.getItem('infraGroupMode') || 'status';

function toggleInfraGrouping() {
    infraGroupMode = infraGroupMode === 'status' ? 'env' : 'status';
    localStorage.setItem('infraGroupMode', infraGroupMode);
    renderInfra();
}

function renderInfraRow(i, statusCss, exclusions) {
    const isExcluded = exclusions.includes(i.id);
    return `
    <div class="infra-row infra-row-${statusCss}${isExcluded ? ' infra-row-excluded' : ''}" data-infra-id="${i.id}">
        <span class="infra-row-name">${esc(i.name)}</span>
        <div class="infra-row-badges">
            ${i.env ? `<span class="infra-env-badge env-${i.env}">${i.env.toUpperCase()}</span>` : ''}
            <span class="infra-type-badge ${i.type}">${i.type.toUpperCase()}</span>
        </div>
        ${i.ip ? `<span class="infra-row-ip">${esc(i.ip)}</span>` : ''}
        <span class="infra-row-details">${i.details ? esc(i.details) : ''}</span>
        <div class="infra-row-actions">
            <button class="btn-cycle-status" onclick="cycleInfraStatus('${i.id}')" title="Changer le statut">⟳</button>
            <button class="infra-row-delete" onclick="deleteInfra('${i.id}')" title="Supprimer">🗑</button>
        </div>
    </div>`;
}

function renderInfra() {
    const container = document.getElementById('infraGrid');
    const noInfra = document.getElementById('noInfra');
    const items = filterInfraItems(getActiveFilters());

    // Update toggle button label
    const toggleBtn = document.getElementById('infraGroupToggle');
    if (toggleBtn) toggleBtn.textContent = infraGroupMode === 'status' ? '🔀 Par env' : '🔀 Par statut';

    if (items.length === 0) {
        container.innerHTML = '';
        noInfra.style.display = 'block';
        return;
    }

    noInfra.style.display = 'none';
    const exclusions = getTrafficLightSettings().exclusions || [];
    const statusOrder = { down: 0, degraded: 1, up: 2 };
    const statusCssMap = { down: 'red', degraded: 'yellow', up: 'green' };
    const envOrder = { prod: 0, preprod: 1, dev: 2, '': 3 };

    let html = '';

    if (infraGroupMode === 'env') {
        // Group by environment, then sort by status within each env
        const envGroups = [
            { key: 'prod', label: 'PROD', icon: '🏭', css: 'prod' },
            { key: 'preprod', label: 'PREPROD', icon: '🧪', css: 'preprod' },
            { key: 'dev', label: 'DEV', icon: '💻', css: 'dev' },
            { key: '', label: 'Transverse', icon: '🔗', css: 'none' }
        ];

        for (const eg of envGroups) {
            const envItems = items.filter(i => (i.env || '') === eg.key)
                .sort((a, b) => (statusOrder[a.status] - statusOrder[b.status]) || a.name.localeCompare(b.name));
            if (envItems.length === 0) continue;

            const down = envItems.filter(i => i.status === 'down').length;
            const degraded = envItems.filter(i => i.status === 'degraded').length;
            const headerCss = down > 0 ? 'red' : degraded > 0 ? 'yellow' : 'green';

            html += `<div class="infra-group infra-group-${headerCss}">`;
            html += `<div class="infra-group-header">
                <span class="infra-group-icon">${eg.icon}</span>
                <span class="infra-group-label">${eg.label}</span>
                <span class="infra-group-count">${envItems.length}</span>
                ${down > 0 ? `<span class="infra-group-badge badge-red">${down} down</span>` : ''}
                ${degraded > 0 ? `<span class="infra-group-badge badge-yellow">${degraded} deg.</span>` : ''}
            </div>`;
            html += envItems.map(i => renderInfraRow(i, statusCssMap[i.status], exclusions)).join('');
            html += '</div>';
        }
    } else {
        // Group by status (default)
        const statusGroups = [
            { key: 'down', label: 'DOWN', icon: '🔴', css: 'red' },
            { key: 'degraded', label: 'Dégradé', icon: '🟡', css: 'yellow' },
            { key: 'up', label: 'Opérationnel', icon: '🟢', css: 'green' }
        ];

        const sorted = [...items].sort((a, b) =>
            (statusOrder[a.status] - statusOrder[b.status])
            || ((envOrder[a.env] ?? 3) - (envOrder[b.env] ?? 3))
            || a.name.localeCompare(b.name)
        );

        for (const g of statusGroups) {
            const groupItems = sorted.filter(i => i.status === g.key);
            if (groupItems.length === 0) continue;

            html += `<div class="infra-group infra-group-${g.css}">`;
            html += `<div class="infra-group-header">
                <span class="infra-group-icon">${g.icon}</span>
                <span class="infra-group-label">${g.label}</span>
                <span class="infra-group-count">${groupItems.length}</span>
            </div>`;
            html += groupItems.map(i => renderInfraRow(i, g.css, exclusions)).join('');
            html += '</div>';
        }
    }

    container.innerHTML = html;
    if (typeof injectDragHandles === 'function') injectDragHandles();
    if (typeof initInfraSortables === 'function') initInfraSortables();
}
