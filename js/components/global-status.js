// ==================== GLOBAL STATUS ====================

// ==================== BANNER ====================
function dismissBanner() {
    document.getElementById('privacyBanner').classList.add('hidden');
    state.bannerDismissed = true;
    saveState();
}

// ==================== GLOBAL STATUS ====================
function updateGlobalStatus() {
    // Update traffic light system
    updateTrafficLight();
    renderEnvIndicators();
    renderProdAlert();
}

function renderEnvIndicators() {
    const container = document.getElementById('envIndicators');
    if (!container) return;

    const envs = ['dev', 'preprod', 'prod'];
    const envLabels = { dev: 'DEV', preprod: 'PREPROD', prod: 'PROD' };

    const html = envs.map(env => {
        const machines = state.infra.filter(i => i.env === env);
        const total = machines.length;

        if (total === 0) {
            return `<div class="env-pill env-empty" title="${envLabels[env]} : aucune machine">
                <span class="env-pill-dot unknown"></span>
                <span class="env-pill-label">${envLabels[env]}</span>
            </div>`;
        }

        const down = machines.filter(i => i.status === 'down').length;
        const degraded = machines.filter(i => i.status === 'degraded').length;
        const up = machines.filter(i => i.status === 'up').length;

        let color, statusText;
        if (down > 0) {
            color = 'red';
            statusText = `${down} down`;
        } else if (degraded > 0) {
            color = 'yellow';
            statusText = `${degraded} degraded`;
        } else {
            color = 'green';
            statusText = `${up}/${total} up`;
        }

        return `<div class="env-pill env-${color}" title="${envLabels[env]} : ${statusText}">
            <span class="env-pill-dot ${color}"></span>
            <span class="env-pill-label">${envLabels[env]}</span>
            <span class="env-pill-count">${up}/${total}</span>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

// ==================== PROD ALERT BANNER ====================
function renderProdAlert() {
    const banner = document.getElementById('prodAlertBanner');
    const headerImpacts = banner ? banner.closest('.header-impacts') : null;
    const borderOverlay = document.getElementById('prodBorderOverlay');
    if (!banner) return;

    const prodMachines = state.infra.filter(i => i.env === 'prod');
    const down = prodMachines.filter(i => i.status === 'down');
    const degraded = prodMachines.filter(i => i.status === 'degraded');
    const prodImpacts = state.impacts.filter(i => i.active && (i.severity === 'critical' || i.severity === 'major'));

    const problems = [];

    if (down.length > 0) {
        problems.push({ icon: '🔴', text: `${down.length} machine${down.length > 1 ? 's' : ''} DOWN`, detail: down.map(m => m.name).join(', '), level: 'critical', target: 'infra', ids: down.map(m => m.id) });
    }
    if (degraded.length > 0) {
        problems.push({ icon: '🟡', text: `${degraded.length} machine${degraded.length > 1 ? 's' : ''} dégradée${degraded.length > 1 ? 's' : ''}`, detail: degraded.map(m => m.name).join(', '), level: 'warning', target: 'infra', ids: degraded.map(m => m.id) });
    }
    if (prodImpacts.length > 0) {
        const criticals = prodImpacts.filter(i => i.severity === 'critical');
        const majors = prodImpacts.filter(i => i.severity === 'major');
        if (criticals.length > 0) {
            problems.push({ icon: '🚨', text: `${criticals.length} impact${criticals.length > 1 ? 's' : ''} critique${criticals.length > 1 ? 's' : ''}`, detail: criticals.map(i => i.title).join(' · '), level: 'critical', target: 'impacts' });
        }
        if (majors.length > 0) {
            problems.push({ icon: '⚠️', text: `${majors.length} impact${majors.length > 1 ? 's' : ''} majeur${majors.length > 1 ? 's' : ''}`, detail: majors.map(i => i.title).join(' · '), level: 'warning', target: 'impacts' });
        }
    }

    if (problems.length === 0) {
        banner.style.display = 'none';
        banner.classList.remove('active');
        if (headerImpacts) headerImpacts.classList.remove('has-prod-alert');
        if (borderOverlay) borderOverlay.classList.remove('active');
        return;
    }

    const isCritical = problems.some(p => p.level === 'critical');
    banner.className = `prod-alert-banner active ${isCritical ? 'prod-alert-critical' : 'prod-alert-warning'}`;
    banner.style.display = '';
    if (headerImpacts) headerImpacts.classList.add('has-prod-alert');
    if (borderOverlay) borderOverlay.classList.add('active');

    banner.innerHTML = `
        <div class="prod-alert-icon">${isCritical ? '🚨' : '⚠️'}</div>
        <div class="prod-alert-content">
            <div class="prod-alert-title">ALERTE PRODUCTION</div>
            <div class="prod-alert-items">
                ${problems.map(p => `
                    <span class="prod-alert-item prod-alert-item-clickable" onclick="scrollToAlertTarget('${p.target}', ${JSON.stringify(p.ids || []).replace(/"/g, '&quot;')})">
                        <span class="prod-alert-item-icon">${p.icon}</span>
                        <strong>${p.text}</strong>
                        <span class="prod-alert-item-detail">${esc(p.detail)}</span>
                    </span>
                `).join('<span class="prod-alert-sep">·</span>')}
            </div>
        </div>
        <button class="prod-alert-dismiss" onclick="dismissProdAlert()" title="Masquer temporairement">✕</button>
    `;
}

function dismissProdAlert() {
    const banner = document.getElementById('prodAlertBanner');
    const headerImpacts = banner ? banner.closest('.header-impacts') : null;
    const borderOverlay = document.getElementById('prodBorderOverlay');
    if (banner) {
        banner.classList.add('dismissed');
        setTimeout(() => {
            banner.style.display = 'none';
            banner.classList.remove('dismissed', 'active');
            if (headerImpacts) headerImpacts.classList.remove('has-prod-alert');
            if (borderOverlay) borderOverlay.classList.remove('active');
        }, 400);
    }
}

function scrollToAlertTarget(target, ids) {
    if (target === 'infra') {
        let scrollTarget = document.getElementById('infraGrid');
        if (ids && ids.length) {
            const firstRow = document.querySelector(`.infra-row[data-infra-id="${ids[0]}"]`);
            if (firstRow) scrollTarget = firstRow;
        }
        if (scrollTarget) {
            const headerH = document.querySelector('header')?.offsetHeight || 0;
            const barH = document.querySelector('.sticky-bar')?.offsetHeight || 0;
            const offset = headerH + barH + 16;
            const top = scrollTarget.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            setTimeout(() => {
                (ids || []).forEach(id => {
                    const row = document.querySelector(`.infra-row[data-infra-id="${id}"]`);
                    if (row) {
                        row.classList.add('highlight-flash');
                        setTimeout(() => row.classList.remove('highlight-flash'), 3000);
                    }
                });
            }, 400);
        }
    } else if (target === 'impacts') {
        openMetricDetail('impacts');
    }
}
