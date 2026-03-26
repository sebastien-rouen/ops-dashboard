// ==================== INTEGRATIONS ====================

// ==================== CONSUL ====================
function openConsulDetail() { renderConsulDetailContent(); openModal('modalConsulDetail'); }

function addConsulEndpoint() {
    const name = document.getElementById('consulName').value.trim();
    const url = document.getElementById('consulUrl').value.trim().replace(/\/+$/, '');
    const token = document.getElementById('consulToken').value.trim();
    if (!name || !url) { toast('⚠️ Nom et URL requis'); return; }
    if (!state.consulEndpoints) state.consulEndpoints = [];
    state.consulEndpoints.push({ id: uid(), name, url, token });
    saveState();
    addLog('🟢', `Endpoint Consul ajouté : ${name}`);
    ['consulName', 'consulUrl', 'consulToken'].forEach(id => document.getElementById(id).value = '');
    renderApiEndpointList();
    fetchAllConsul();
}

function removeConsulEndpoint(id) {
    if (!state.consulEndpoints) return;
    const ep = state.consulEndpoints.find(e => e.id === id);
    state.consulEndpoints = state.consulEndpoints.filter(e => e.id !== id);
    if (state.consulCache) delete state.consulCache[id];
    saveState();
    if (ep) addLog('🟢', `Endpoint Consul supprimé : ${ep.name}`);
    renderApiEndpointList();
    renderConsulMetric();
}

async function fetchConsul(epId) {
    const ep = (state.consulEndpoints || []).find(e => e.id === epId);
    if (!ep) return;
    const headers = ep.token ? { 'X-Consul-Token': ep.token } : {};
    try {
        const [svcResp, nodeResp] = await Promise.all([
            fetch(`${ep.url}/v1/health/state/any`, { headers }),
            fetch(`${ep.url}/v1/catalog/nodes`, { headers })
        ]);
        if (!svcResp.ok) throw new Error(`HTTP ${svcResp.status}`);
        const checks = await svcResp.json();
        const nodes = await nodeResp.json();
        const passing = checks.filter(c => c.Status === 'passing').length;
        const serviceNames = [...new Set(checks.map(c => c.ServiceName).filter(Boolean))];
        // Build detailed service list
        const services = serviceNames.map(sn => {
            const svcChecks = checks.filter(c => c.ServiceName === sn);
            const healthy = svcChecks.every(c => c.Status === 'passing');
            const worstStatus = svcChecks.some(c => c.Status === 'critical') ? 'critical' : svcChecks.some(c => c.Status === 'warning') ? 'warning' : 'passing';
            return { name: sn, healthy, status: worstStatus, checks: svcChecks.length };
        });
        // Build detailed node list
        const nodeDetails = nodes.map(n => ({ name: n.Node || n.ID, address: n.Address || '' }));
        // Build detailed check list
        const checkDetails = checks.filter(c => c.ServiceName).map(c => ({
            service: c.ServiceName, name: c.Name || c.CheckID, status: c.Status, output: (c.Output || '').slice(0, 120), node: c.Node || ''
        }));
        if (!state.consulCache) state.consulCache = {};
        state.consulCache[epId] = {
            servicesTotal: serviceNames.length,
            servicesHealthy: services.filter(s => s.healthy).length,
            nodesTotal: nodes.length,
            checksTotal: checks.length,
            checksPassing: passing,
            checksCritical: checks.filter(c => c.Status === 'critical').length,
            checksWarning: checks.filter(c => c.Status === 'warning').length,
            services, nodeDetails, checkDetails,
            fetchedAt: new Date().toISOString()
        };
        saveState(); renderConsulMetric(); renderApiEndpointList();
    } catch (e) {
        console.error(`Consul fetch error (${ep.name}):`, e);
        toast(`⚠️ Erreur Consul (${ep.name}) : ${e.message}`);
        if (!state.consulCache) state.consulCache = {};
        state.consulCache[epId] = { error: e.message, fetchedAt: new Date().toISOString() };
        saveState(); renderConsulMetric(); renderApiEndpointList();
    }
}

async function fetchAllConsul() {
    const eps = state.consulEndpoints || [];
    if (eps.length === 0) { toast('ℹ️ Aucun endpoint Consul configuré'); return; }
    toast('🟢 Rafraîchissement Consul…');
    await Promise.allSettled(eps.map(e => fetchConsul(e.id)));
    toast('🟢 Consul mis à jour');
    addLog('🟢', `Consul rafraîchi (${eps.length} endpoints)`);
}

function renderConsulMetric() {
    const el = document.getElementById('metricConsul');
    const summaryEl = document.getElementById('metricConsulSummary');
    if (!el) return;
    const eps = state.consulEndpoints || [];
    const cache = state.consulCache || {};
    const card = el.closest('.metric-card');
    if (eps.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; if (summaryEl) summaryEl.innerHTML = ''; return; }
    if (card) card.classList.remove('no-source');
    let totalSvc = 0, healthySvc = 0, totalNodes = 0;
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) { totalSvc += c.servicesTotal; healthySvc += c.servicesHealthy; totalNodes += c.nodesTotal; }
    });
    el.textContent = healthySvc + '/' + totalSvc;
    if (summaryEl) {
        summaryEl.innerHTML = `<span class="mms-dot green"></span>${healthySvc} svc`
            + (totalSvc - healthySvc > 0 ? `<span class="mms-sep"></span><span class="mms-dot red"></span>${totalSvc - healthySvc}` : '')
            + `<span class="mms-sep"></span>${totalNodes} nodes`;
    }
}

function toggleConsulPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const wasOpen = panel.classList.contains('open');
    // Close all panels
    document.querySelectorAll('#consulDetailContent .sre-expand-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('#consulDetailContent .sre-stat.clickable').forEach(s => s.classList.remove('active'));
    // Toggle if not already open
    if (!wasOpen) {
        panel.classList.add('open');
        const stat = document.querySelector(`[data-consul-panel="${panelId}"]`);
        if (stat) stat.classList.add('active');
    }
}

function toggleAnsiblePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const wasOpen = panel.classList.contains('open');
    // Close all panels within same endpoint block
    const parent = panel.closest('.gl-detail-repo');
    if (parent) {
        parent.querySelectorAll('.sre-expand-panel').forEach(p => p.classList.remove('open'));
        parent.querySelectorAll('.sre-stat.clickable').forEach(s => s.classList.remove('active'));
    }
    if (!wasOpen) {
        panel.classList.add('open');
        const stat = document.querySelector(`[data-ansible-panel="${panelId}"]`);
        if (stat) stat.classList.add('active');
    }
}

function renderConsulDetailContent() {
    const content = document.getElementById('consulDetailContent');
    if (!content) return;
    const eps = state.consulEndpoints || [];
    const cache = state.consulCache || {};
    if (eps.length === 0) { content.innerHTML = '<div class="md-empty">Aucun endpoint configuré — <a href="#" onclick="event.preventDefault();closeModal(\'modalConsulDetail\');openConsulConfig()">configurer</a></div>'; return; }

    // Aggregate across all endpoints
    let aggSvcTotal = 0, aggSvcHealthy = 0, aggNodes = 0, aggPassing = 0, aggWarning = 0, aggCritical = 0;
    const allServices = [], allNodes = [], allChecks = [];
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) {
            aggSvcTotal += c.servicesTotal || 0;
            aggSvcHealthy += c.servicesHealthy || 0;
            aggNodes += c.nodesTotal || 0;
            aggPassing += c.checksPassing || 0;
            aggWarning += c.checksWarning || 0;
            aggCritical += c.checksCritical || 0;
            if (c.services) c.services.forEach(s => allServices.push({ ...s, endpoint: ep.name }));
            if (c.nodeDetails) c.nodeDetails.forEach(n => allNodes.push({ ...n, endpoint: ep.name }));
            if (c.checkDetails) c.checkDetails.forEach(ch => allChecks.push({ ...ch, endpoint: ep.name }));
        }
    });
    const aggSvcUnhealthy = aggSvcTotal - aggSvcHealthy;
    const healthPct = aggSvcTotal > 0 ? (aggSvcHealthy / aggSvcTotal * 100) : 0;
    const hasDetails = allServices.length > 0 || allNodes.length > 0;

    let html = '<div class="sre-detail">';

    // Global stat cards — clickable when detail data available
    html += '<div class="sre-stats">';
    if (hasDetails) {
        html += `<div class="sre-stat clickable" data-consul-panel="consul-panel-healthy" onclick="toggleConsulPanel('consul-panel-healthy')">
            <span class="sre-stat-val" style="color:var(--green)">${aggSvcHealthy}</span>
            <span class="sre-stat-label">Services healthy</span>
        </div>`;
        html += `<div class="sre-stat clickable" data-consul-panel="consul-panel-unhealthy" onclick="toggleConsulPanel('consul-panel-unhealthy')">
            <span class="sre-stat-val" style="color:${aggSvcUnhealthy > 0 ? 'var(--red)' : 'var(--text-muted)'}">${aggSvcUnhealthy}</span>
            <span class="sre-stat-label">Unhealthy</span>
        </div>`;
        html += `<div class="sre-stat clickable" data-consul-panel="consul-panel-nodes" onclick="toggleConsulPanel('consul-panel-nodes')">
            <span class="sre-stat-val">${aggNodes}</span>
            <span class="sre-stat-label">Nodes</span>
        </div>`;
        html += `<div class="sre-stat clickable" data-consul-panel="consul-panel-checks" onclick="toggleConsulPanel('consul-panel-checks')">
            <span class="sre-stat-val">${aggPassing + aggWarning + aggCritical}</span>
            <span class="sre-stat-label">Health checks</span>
        </div>`;
    } else {
        html += `<div class="sre-stat">
            <span class="sre-stat-val" style="color:var(--green)">${aggSvcHealthy}</span>
            <span class="sre-stat-label">Services healthy</span>
        </div>`;
        html += `<div class="sre-stat">
            <span class="sre-stat-val" style="color:${aggSvcUnhealthy > 0 ? 'var(--red)' : 'var(--text-muted)'}">${aggSvcUnhealthy}</span>
            <span class="sre-stat-label">Unhealthy</span>
        </div>`;
        html += `<div class="sre-stat">
            <span class="sre-stat-val">${aggNodes}</span>
            <span class="sre-stat-label">Nodes</span>
        </div>`;
        html += `<div class="sre-stat">
            <span class="sre-stat-val">${aggPassing + aggWarning + aggCritical}</span>
            <span class="sre-stat-label">Health checks</span>
        </div>`;
    }
    html += '</div>';

    // Expand panels (hidden by default)
    if (hasDetails) {
        // Healthy services panel
        const healthyList = allServices.filter(s => s.healthy);
        html += '<div class="sre-expand-panel" id="consul-panel-healthy">';
        if (healthyList.length === 0) {
            html += '<div class="md-empty">Aucun service healthy</div>';
        } else {
            healthyList.forEach(s => {
                html += `<div class="sre-expand-row">
                    <span class="sre-expand-dot green"></span>
                    <span class="sre-expand-name">${esc(s.name)}</span>
                    <span class="sre-expand-meta">${s.checks} checks</span>
                    ${eps.length > 1 ? `<span class="sre-expand-meta">${esc(s.endpoint)}</span>` : ''}
                </div>`;
            });
        }
        html += '</div>';

        // Unhealthy services panel
        const unhealthyList = allServices.filter(s => !s.healthy);
        html += '<div class="sre-expand-panel" id="consul-panel-unhealthy">';
        if (unhealthyList.length === 0) {
            html += '<div class="md-empty">Aucun service unhealthy</div>';
        } else {
            unhealthyList.forEach(s => {
                const dotCss = s.status === 'critical' ? 'red' : 'yellow';
                html += `<div class="sre-expand-row">
                    <span class="sre-expand-dot ${dotCss}"></span>
                    <span class="sre-expand-name">${esc(s.name)}</span>
                    <span class="sre-expand-meta" style="color:var(--${dotCss})">${s.status}</span>
                    <span class="sre-expand-meta">${s.checks} checks</span>
                </div>`;
            });
        }
        html += '</div>';

        // Nodes panel
        html += '<div class="sre-expand-panel" id="consul-panel-nodes">';
        if (allNodes.length === 0) {
            html += '<div class="md-empty">Aucun node</div>';
        } else {
            allNodes.forEach(n => {
                html += `<div class="sre-expand-row">
                    <span class="sre-expand-dot green"></span>
                    <span class="sre-expand-name">${esc(n.name)}</span>
                    ${n.address ? `<span class="sre-expand-meta">${esc(n.address)}</span>` : ''}
                    ${eps.length > 1 ? `<span class="sre-expand-meta">${esc(n.endpoint)}</span>` : ''}
                </div>`;
            });
        }
        html += '</div>';

        // Health checks panel — show non-passing first
        html += '<div class="sre-expand-panel" id="consul-panel-checks">';
        const sortedChecks = [...allChecks].sort((a, b) => {
            const order = { critical: 0, warning: 1, passing: 2 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        if (sortedChecks.length === 0) {
            html += '<div class="md-empty">Aucun détail de check disponible</div>';
        } else {
            sortedChecks.forEach(ch => {
                const dotCss = ch.status === 'critical' ? 'red' : ch.status === 'warning' ? 'yellow' : 'green';
                html += `<div class="sre-expand-row">
                    <span class="sre-expand-dot ${dotCss}"></span>
                    <span class="sre-expand-name">${esc(ch.service)}</span>
                    <span class="sre-expand-meta">${esc(ch.name)}</span>
                    ${ch.output ? `<span class="sre-expand-output" title="${esc(ch.output)}">${esc(ch.output)}</span>` : ''}
                    ${ch.node ? `<span class="sre-expand-meta">${esc(ch.node)}</span>` : ''}
                </div>`;
            });
        }
        html += '</div>';
    }

    // Health bar
    if (aggSvcTotal > 0) {
        html += '<div class="sre-section-title">Santé des services</div>';
        html += '<div class="sre-progress">';
        html += `<div class="sre-progress-fill green" style="width:${healthPct.toFixed(1)}%" title="Healthy: ${aggSvcHealthy}"></div>`;
        if (aggSvcUnhealthy > 0) html += `<div class="sre-progress-fill red" style="width:${(100 - healthPct).toFixed(1)}%" title="Unhealthy: ${aggSvcUnhealthy}"></div>`;
        html += '</div>';
    }

    // Per-endpoint detail
    if (eps.length > 1) html += '<div class="sre-section-title">Détail par endpoint</div>';

    eps.forEach(ep => {
        const c = cache[ep.id];
        html += '<div class="consul-ep-card">';
        html += `<div class="consul-ep-header">
            <span>🟢</span>
            <span>${esc(ep.name)}</span>`;
        if (c && !c.error) {
            html += `<span class="consul-ep-header-count">${c.servicesHealthy}/${c.servicesTotal} services — ${c.nodesTotal} nodes</span>`;
        }
        html += '</div>';

        if (!c) {
            html += '<div class="md-empty">Pas encore synchronisé</div>';
        } else if (c.error) {
            html += `<div class="md-empty" style="color:var(--red)">Erreur : ${esc(c.error)}</div>`;
        } else {
            html += '<div class="consul-checks">';
            html += `<span class="consul-check passing">✅ ${c.checksPassing} passing</span>`;
            if (c.checksWarning > 0) html += `<span class="consul-check warning">⚠️ ${c.checksWarning} warning</span>`;
            if (c.checksCritical > 0) html += `<span class="consul-check critical">🔴 ${c.checksCritical} critical</span>`;
            html += '</div>';

            if (c.servicesTotal > 0) {
                const epPct = (c.servicesHealthy / c.servicesTotal * 100).toFixed(1);
                html += `<div style="padding:0 14px 10px">
                    <div class="sre-progress">
                        <div class="sre-progress-fill green" style="width:${epPct}%"></div>
                        ${c.servicesTotal - c.servicesHealthy > 0 ? `<div class="sre-progress-fill red" style="width:${(100 - parseFloat(epPct)).toFixed(1)}%"></div>` : ''}
                    </div>
                </div>`;
            }
        }

        html += '</div>';
    });

    html += '</div>';
    content.innerHTML = html;
}

// ==================== ANSIBLE ====================
function openAnsibleDetail() { renderAnsibleDetailContent(); openModal('modalAnsibleDetail'); }

function addAnsibleEndpoint() {
    const name = document.getElementById('ansibleName').value.trim();
    const url = document.getElementById('ansibleUrl').value.trim().replace(/\/+$/, '');
    const token = document.getElementById('ansibleToken').value.trim();
    if (!name || !url) { toast('⚠️ Nom et URL requis'); return; }
    if (!state.ansibleEndpoints) state.ansibleEndpoints = [];
    state.ansibleEndpoints.push({ id: uid(), name, url, token });
    saveState();
    addLog('🅰️', `Endpoint Ansible ajouté : ${name}`);
    ['ansibleName', 'ansibleUrl', 'ansibleToken'].forEach(id => document.getElementById(id).value = '');
    renderApiEndpointList();
    fetchAllAnsible();
}

function removeAnsibleEndpoint(id) {
    if (!state.ansibleEndpoints) return;
    const ep = state.ansibleEndpoints.find(e => e.id === id);
    state.ansibleEndpoints = state.ansibleEndpoints.filter(e => e.id !== id);
    if (state.ansibleCache) delete state.ansibleCache[id];
    saveState();
    if (ep) addLog('🅰️', `Endpoint Ansible supprimé : ${ep.name}`);
    renderApiEndpointList();
    renderAnsibleMetric();
}

async function fetchAnsible(epId) {
    const ep = (state.ansibleEndpoints || []).find(e => e.id === epId);
    if (!ep) return;
    const headers = { 'Content-Type': 'application/json' };
    if (ep.token) headers['Authorization'] = `Bearer ${ep.token}`;
    try {
        const resp = await fetch(`${ep.url}/api/v2/jobs/?order_by=-finished&page_size=50`, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const jobs = data.results || [];
        const successful = jobs.filter(j => j.status === 'successful').length;
        const failed = jobs.filter(j => j.status === 'failed').length;
        const running = jobs.filter(j => j.status === 'running').length;
        if (!state.ansibleCache) state.ansibleCache = {};
        state.ansibleCache[epId] = {
            totalJobs: data.count || jobs.length,
            recentJobs: jobs.slice(0, 20).map(j => ({
                id: j.id, name: j.name, status: j.status,
                finished: j.finished, started: j.started,
                playbook: j.playbook
            })),
            successful, failed, running,
            fetchedAt: new Date().toISOString()
        };
        saveState(); renderAnsibleMetric(); renderApiEndpointList();
    } catch (e) {
        console.error(`Ansible fetch error (${ep.name}):`, e);
        toast(`⚠️ Erreur Ansible (${ep.name}) : ${e.message}`);
        if (!state.ansibleCache) state.ansibleCache = {};
        state.ansibleCache[epId] = { error: e.message, fetchedAt: new Date().toISOString() };
        saveState(); renderAnsibleMetric(); renderApiEndpointList();
    }
}

async function fetchAllAnsible() {
    const eps = state.ansibleEndpoints || [];
    if (eps.length === 0) { toast('ℹ️ Aucun endpoint Ansible configuré'); return; }
    toast('🅰️ Rafraîchissement Ansible…');
    await Promise.allSettled(eps.map(e => fetchAnsible(e.id)));
    toast('🅰️ Ansible mis à jour');
    addLog('🅰️', `Ansible rafraîchi (${eps.length} endpoints)`);
}

function renderAnsibleMetric() {
    const el = document.getElementById('metricAnsible');
    const summaryEl = document.getElementById('metricAnsibleSummary');
    if (!el) return;
    const eps = state.ansibleEndpoints || [];
    const cache = state.ansibleCache || {};
    const card = el.closest('.metric-card');
    if (eps.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; if (summaryEl) summaryEl.innerHTML = ''; return; }
    if (card) card.classList.remove('no-source');
    let totalJobs = 0, ok = 0, fail = 0, running = 0;
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) { totalJobs += c.totalJobs; ok += c.successful; fail += c.failed; running += c.running; }
    });
    el.textContent = totalJobs;
    if (summaryEl) {
        const parts = [];
        if (ok) parts.push(`<span class="mms-dot green"></span>${ok}`);
        if (fail) parts.push(`<span class="mms-dot red"></span>${fail}`);
        if (running) parts.push(`<span class="mms-dot yellow"></span>${running}`);
        summaryEl.innerHTML = parts.join('<span class="mms-sep"></span>');
    }
}

function renderAnsibleDetailContent() {
    const content = document.getElementById('ansibleDetailContent');
    if (!content) return;
    const eps = state.ansibleEndpoints || [];
    const cache = state.ansibleCache || {};
    if (eps.length === 0) { content.innerHTML = '<div class="md-empty">Aucun endpoint configuré — <a href="#" onclick="event.preventDefault();closeModal(\'modalAnsibleDetail\');openApiConfig()">configurer</a></div>'; return; }

    let html = '';
    eps.forEach((ep, idx) => {
        const c = cache[ep.id];
        const color = typeof repoColor === 'function' ? repoColor(idx) : 'var(--accent)';
        const bg = typeof repoColorBg === 'function' ? repoColorBg(idx) : 'rgba(99,102,241,0.06)';

        html += `<div class="gl-detail-repo">`;
        html += `<div class="gl-detail-repo-header" style="background:${bg}"><span class="gl-detail-repo-name" style="color:${color}">${esc(ep.name)}</span>`;
        if (c && !c.error) html += `<span class="gl-detail-repo-count">${c.totalJobs} jobs</span>`;
        html += '</div>';

        if (!c) { html += '<div class="md-empty">Pas encore synchronisé</div>'; }
        else if (c.error) { html += `<div class="md-empty" style="color:var(--red)">Erreur : ${esc(c.error)}</div>`; }
        else {
            html += '<div style="padding:14px">';
            const jobs = c.recentJobs || [];
            const epSuffix = ep.id || idx;

            // Stat cards — clickable for Successful, Failed, Running
            const successRate = c.totalJobs > 0 ? (c.successful / c.totalJobs * 100) : 0;
            const rateColor = successRate >= 95 ? 'var(--green)' : successRate >= 80 ? 'var(--yellow)' : 'var(--red)';
            html += '<div class="sre-stats">';
            html += `<div class="sre-stat"><span class="sre-stat-val" style="color:${rateColor}">${Math.round(successRate)}%</span><span class="sre-stat-label">Taux de succès</span></div>`;

            const hasSuccessful = c.successful > 0;
            const hasFailed = c.failed > 0;
            const hasRunning = c.running > 0;

            if (hasSuccessful) {
                html += `<div class="sre-stat clickable" data-ansible-panel="ansible-ok-${epSuffix}" onclick="toggleAnsiblePanel('ansible-ok-${epSuffix}')">
                    <span class="sre-stat-val" style="color:var(--green)">${c.successful}</span><span class="sre-stat-label">Successful</span></div>`;
            } else {
                html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--text-muted)">0</span><span class="sre-stat-label">Successful</span></div>`;
            }
            if (hasFailed) {
                html += `<div class="sre-stat clickable" data-ansible-panel="ansible-fail-${epSuffix}" onclick="toggleAnsiblePanel('ansible-fail-${epSuffix}')">
                    <span class="sre-stat-val" style="color:var(--red)">${c.failed}</span><span class="sre-stat-label">Failed</span></div>`;
            } else {
                html += `<div class="sre-stat"><span class="sre-stat-val" style="color:var(--text-muted)">0</span><span class="sre-stat-label">Failed</span></div>`;
            }
            if (hasRunning) {
                html += `<div class="sre-stat clickable" data-ansible-panel="ansible-run-${epSuffix}" onclick="toggleAnsiblePanel('ansible-run-${epSuffix}')">
                    <span class="sre-stat-val" style="color:var(--accent)">${c.running}</span><span class="sre-stat-label">Running</span></div>`;
            }
            html += `<div class="sre-stat"><span class="sre-stat-val">${c.totalJobs}</span><span class="sre-stat-label">Total jobs</span></div>`;
            html += '</div>';

            // Expand panels (hidden by default)
            const jobsByStatus = { successful: [], failed: [], running: [] };
            jobs.forEach(j => { if (jobsByStatus[j.status]) jobsByStatus[j.status].push(j); });

            const renderJobRows = (list) => list.map(j => {
                const statusCss = j.status === 'successful' ? 'background:rgba(16,185,129,0.12);color:var(--green)' : j.status === 'failed' ? 'background:rgba(220,38,38,0.12);color:var(--red)' : 'background:rgba(99,102,241,0.12);color:var(--accent)';
                const statusIcon = j.status === 'successful' ? '✓' : j.status === 'failed' ? '✕' : '⟳';
                return `<div class="sre-expand-row">
                    <span class="sre-item-badge" style="${statusCss};flex-shrink:0">${statusIcon}</span>
                    <span class="sre-expand-name">${esc(j.name || 'Job #' + j.id)}</span>
                    ${j.playbook ? `<span class="sre-expand-meta" style="font-family:monospace">${esc(j.playbook)}</span>` : ''}
                    ${j.finished ? `<span class="sre-expand-meta">${timeAgo(j.finished)}</span>` : '<span class="sre-expand-meta" style="color:var(--accent)">en cours…</span>'}
                </div>`;
            }).join('');

            const renderHint = (shown, total, label) => {
                if (shown < total) return `<div class="sre-expand-hint">${shown} affichés sur ${total} ${label} au total (jobs récents uniquement)</div>`;
                return '';
            };

            if (hasSuccessful) {
                html += `<div class="sre-expand-panel" id="ansible-ok-${epSuffix}">`;
                if (jobsByStatus.successful.length > 0) {
                    html += renderJobRows(jobsByStatus.successful);
                    html += renderHint(jobsByStatus.successful.length, c.successful, 'successful');
                } else {
                    html += `<div class="md-empty">${c.successful} jobs successful — non disponibles dans les jobs récents</div>`;
                }
                html += '</div>';
            }
            if (hasFailed) {
                html += `<div class="sre-expand-panel" id="ansible-fail-${epSuffix}">`;
                if (jobsByStatus.failed.length > 0) {
                    html += renderJobRows(jobsByStatus.failed);
                    html += renderHint(jobsByStatus.failed.length, c.failed, 'failed');
                } else {
                    html += `<div class="md-empty">${c.failed} jobs failed — non disponibles dans les jobs récents</div>`;
                }
                html += '</div>';
            }
            if (hasRunning) {
                html += `<div class="sre-expand-panel" id="ansible-run-${epSuffix}">`;
                if (jobsByStatus.running.length > 0) {
                    html += renderJobRows(jobsByStatus.running);
                    html += renderHint(jobsByStatus.running.length, c.running, 'running');
                } else {
                    html += `<div class="md-empty">${c.running} jobs running — non disponibles dans les jobs récents</div>`;
                }
                html += '</div>';
            }

            // Progress bar
            if (c.totalJobs > 0) {
                const sPct = (c.successful / c.totalJobs * 100).toFixed(1);
                const fPct = (c.failed / c.totalJobs * 100).toFixed(1);
                const rPct = (c.running / c.totalJobs * 100).toFixed(1);
                html += '<div class="sre-progress">';
                if (c.successful > 0) html += `<div class="sre-progress-fill green" style="width:${sPct}%" title="Successful: ${c.successful}"></div>`;
                if (c.failed > 0) html += `<div class="sre-progress-fill red" style="width:${fPct}%" title="Failed: ${c.failed}"></div>`;
                if (c.running > 0) html += `<div class="sre-progress-fill accent" style="width:${rPct}%" title="Running: ${c.running}"></div>`;
                html += '</div>';
            }

            // All jobs list
            if (jobs.length > 0) {
                html += '<div class="sre-section-title">Jobs récents</div>';
                html += '<div class="sre-list">';
                jobs.forEach(j => {
                    const statusCss = j.status === 'successful' ? 'background:rgba(16,185,129,0.12);color:var(--green)' : j.status === 'failed' ? 'background:rgba(220,38,38,0.12);color:var(--red)' : 'background:rgba(99,102,241,0.12);color:var(--accent)';
                    const statusIcon = j.status === 'successful' ? '✓' : j.status === 'failed' ? '✕' : '⟳';
                    html += `<div class="sre-item">
                        <span class="sre-item-badge" style="${statusCss}">${statusIcon} ${j.status}</span>
                        <span class="sre-item-name">${esc(j.name || 'Job #' + j.id)}</span>
                        ${j.playbook ? `<span class="sre-item-meta" style="font-family:monospace;font-size:0.68rem">${esc(j.playbook)}</span>` : ''}
                        ${j.finished ? `<span class="sre-item-meta">${timeAgo(j.finished)}</span>` : '<span class="sre-item-meta" style="color:var(--accent)">en cours…</span>'}
                    </div>`;
                });
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';
    });
    content.innerHTML = html;
}

// ==================== OPENSTACK ====================
function openOpenstackDetail() { renderOpenstackDetailContent(); openModal('modalOpenstackDetail'); }

function addOpenstackEndpoint() {
    const name = document.getElementById('openstackName').value.trim();
    const url = document.getElementById('openstackUrl').value.trim().replace(/\/+$/, '');
    const project = document.getElementById('openstackProject').value.trim();
    const token = document.getElementById('openstackToken').value.trim();
    if (!name || !url) { toast('⚠️ Nom et URL requis'); return; }
    if (!state.openstackEndpoints) state.openstackEndpoints = [];
    state.openstackEndpoints.push({ id: uid(), name, url, project, token });
    saveState();
    addLog('☁️', `Endpoint OpenStack ajouté : ${name}`);
    ['openstackName', 'openstackUrl', 'openstackProject', 'openstackToken'].forEach(id => document.getElementById(id).value = '');
    renderApiEndpointList();
    fetchAllOpenstack();
}

function removeOpenstackEndpoint(id) {
    if (!state.openstackEndpoints) return;
    const ep = state.openstackEndpoints.find(e => e.id === id);
    state.openstackEndpoints = state.openstackEndpoints.filter(e => e.id !== id);
    if (state.openstackCache) delete state.openstackCache[id];
    saveState();
    if (ep) addLog('☁️', `Endpoint OpenStack supprimé : ${ep.name}`);
    renderApiEndpointList();
    renderOpenstackMetric();
}

async function fetchOpenstack(epId) {
    const ep = (state.openstackEndpoints || []).find(e => e.id === epId);
    if (!ep) return;
    const headers = { 'X-Auth-Token': ep.token || '' };
    try {
        const [srvResp, volResp] = await Promise.all([
            fetch(`${ep.url}/compute/v2.1/servers/detail`, { headers }),
            fetch(`${ep.url}/volume/v3/volumes/detail`, { headers })
        ]);
        if (!srvResp.ok) throw new Error(`Compute HTTP ${srvResp.status}`);
        const servers = await srvResp.json();
        let volumes = { volumes: [] };
        if (volResp.ok) volumes = await volResp.json();
        const srvList = servers.servers || [];
        const volList = volumes.volumes || [];
        const active = srvList.filter(s => s.status === 'ACTIVE').length;
        const error = srvList.filter(s => s.status === 'ERROR').length;
        if (!state.openstackCache) state.openstackCache = {};
        state.openstackCache[epId] = {
            instances: srvList.length,
            instancesActive: active,
            instancesError: error,
            instancesStopped: srvList.length - active - error,
            volumes: volList.length,
            volumesInUse: volList.filter(v => v.status === 'in-use').length,
            volumesAvailable: volList.filter(v => v.status === 'available').length,
            recentServers: srvList.slice(0, 20).map(s => ({ name: s.name, status: s.status, id: s.id })),
            fetchedAt: new Date().toISOString()
        };
        saveState(); renderOpenstackMetric(); renderApiEndpointList();
    } catch (e) {
        console.error(`OpenStack fetch error (${ep.name}):`, e);
        toast(`⚠️ Erreur OpenStack (${ep.name}) : ${e.message}`);
        if (!state.openstackCache) state.openstackCache = {};
        state.openstackCache[epId] = { error: e.message, fetchedAt: new Date().toISOString() };
        saveState(); renderOpenstackMetric(); renderApiEndpointList();
    }
}

async function fetchAllOpenstack() {
    const eps = state.openstackEndpoints || [];
    if (eps.length === 0) { toast('ℹ️ Aucun endpoint OpenStack configuré'); return; }
    toast('☁️ Rafraîchissement OpenStack…');
    await Promise.allSettled(eps.map(e => fetchOpenstack(e.id)));
    toast('☁️ OpenStack mis à jour');
    addLog('☁️', `OpenStack rafraîchi (${eps.length} endpoints)`);
}

function renderOpenstackMetric() {
    const el = document.getElementById('metricOpenstack');
    const summaryEl = document.getElementById('metricOpenstackSummary');
    if (!el) return;
    const eps = state.openstackEndpoints || [];
    const cache = state.openstackCache || {};
    const card = el.closest('.metric-card');
    if (eps.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; if (summaryEl) summaryEl.innerHTML = ''; return; }
    if (card) card.classList.remove('no-source');
    let inst = 0, vols = 0, active = 0, errCount = 0;
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) { inst += c.instances; vols += c.volumes; active += c.instancesActive; errCount += c.instancesError; }
    });
    el.textContent = inst + ' / ' + vols;
    if (summaryEl) {
        const parts = [`<span class="mms-dot green"></span>${active} inst.`];
        if (errCount) parts.push(`<span class="mms-dot red"></span>${errCount}`);
        parts.push(`${vols} vol.`);
        summaryEl.innerHTML = parts.join('<span class="mms-sep"></span>');
    }
}

function renderOpenstackDetailContent() {
    const content = document.getElementById('openstackDetailContent');
    if (!content) return;
    const eps = state.openstackEndpoints || [];
    const cache = state.openstackCache || {};
    if (eps.length === 0) { content.innerHTML = '<div class="md-empty">Aucun endpoint configuré — <a href="#" onclick="event.preventDefault();closeModal(\'modalOpenstackDetail\');openOpenstackConfig()">configurer</a></div>'; return; }
    let html = '';
    eps.forEach(ep => {
        const c = cache[ep.id];
        html += `<div class="md-group"><div class="md-group-title">${esc(ep.name)}</div>`;
        if (!c) { html += '<div class="md-empty">Pas encore synchronisé</div>'; }
        else if (c.error) { html += `<div class="md-empty" style="color:var(--red)">Erreur : ${esc(c.error)}</div>`; }
        else {
            html += `<div class="md-summary">
                <span class="md-summary-item"><span class="md-row-dot green"></span> ${c.instancesActive} active</span>
                ${c.instancesError > 0 ? `<span class="md-summary-item"><span class="md-row-dot red"></span> ${c.instancesError} error</span>` : ''}
                ${c.instancesStopped > 0 ? `<span class="md-summary-item"><span class="md-row-dot yellow"></span> ${c.instancesStopped} stopped</span>` : ''}
                <span class="md-summary-item">📦 ${c.volumesInUse} vol. in-use / ${c.volumesAvailable} available</span>
            </div>`;
            const servers = c.recentServers || [];
            const cols = [
                { key: 'ACTIVE',  icon: '🟢', label: 'Active',  css: 'up' },
                { key: 'ERROR',   icon: '🔴', label: 'Error',   css: 'critical' },
                { key: 'SHUTOFF', icon: '🟡', label: 'Stopped', css: 'warning' }
            ];
            html += '<div class="md-col3">';
            cols.forEach(col => {
                const items = servers.filter(s => s.status === col.key);
                html += `<div class="md-col3-col">
                    <div class="md-col3-head"><span class="md-row-badge badge-${col.css}">${col.icon} ${col.label}</span></div>`;
                if (items.length === 0) html += '<div class="md-col3-empty">—</div>';
                items.forEach(s => {
                    html += `<div class="md-col3-item">${esc(s.name)}</div>`;
                });
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
    });
    content.innerHTML = html;
}

// ==================== UNIFIED API CONFIG ====================
const API_TYPES = {
    gitlab:    { icon: '🦊', label: 'GitLab',    color: '#e24329' },
    github:    { icon: '🐙', label: 'GitHub',    color: '#6e40c9' },
    consul:    { icon: '🟢', label: 'Consul',    color: '#dc477d' },
    ansible:   { icon: '🤖', label: 'Ansible',   color: '#ee0000' },
    openstack:  { icon: '☁️', label: 'OpenStack',  color: '#ed1944' },
    prometheus: { icon: '📊', label: 'Prometheus', color: '#e6522c' },
    grafana:    { icon: '📈', label: 'Grafana',    color: '#f46800' },
    loki:       { icon: '📋', label: 'Loki',       color: '#2c99d6' },
    vault:      { icon: '🔐', label: 'Vault',      color: '#000000' }
};

function openApiConfig() {
    renderApiEndpointList();
    onApiTypeChange();
    openModal('modalApiConfig');
}

function onApiTypeChange() {
    const type = document.getElementById('apiType').value;
    const extra = document.getElementById('apiFieldsExtra');
    const projId = document.getElementById('apiProjectId');
    const branch = document.getElementById('apiBranch');
    if (type === 'gitlab') {
        extra.style.display = 'flex';
        projId.style.display = '';
        branch.style.display = '';
        projId.placeholder = 'Project ID (ex: 12345)';
        branch.placeholder = 'Branche (défaut: main)';
    } else if (type === 'github') {
        extra.style.display = 'flex';
        projId.style.display = '';
        branch.style.display = '';
        projId.placeholder = 'owner/repo (ex: org/myrepo)';
        branch.placeholder = 'Branche (défaut: main)';
    } else if (type === 'openstack') {
        extra.style.display = 'flex';
        projId.style.display = '';
        branch.style.display = 'none';
        projId.placeholder = 'Projet / Tenant';
    } else if (type === 'grafana') {
        extra.style.display = 'flex';
        projId.style.display = '';
        branch.style.display = 'none';
        projId.placeholder = 'Org ID (optionnel)';
    } else if (type === 'vault') {
        extra.style.display = 'flex';
        projId.style.display = '';
        branch.style.display = 'none';
        projId.placeholder = 'Namespace (optionnel)';
    } else {
        extra.style.display = 'none';
    }
}

function renderApiEndpointList() {
    const container = document.getElementById('apiEndpointList');
    if (!container) return;

    const all = [];
    (state.gitlabRepos || []).forEach(ep => {
        const c = (state.gitlabMRCache || {})[ep.id];
        const info = c && !c.error ? `${c.count} MR` : c?.error ? 'erreur' : '…';
        all.push({ type: 'gitlab', id: ep.id, name: ep.name, url: ep.url, detail: `${ep.projectId} · ${ep.branch || 'main'}`, info, fetchedAt: c?.fetchedAt });
    });
    (state.githubRepos || []).forEach(ep => {
        const c = (state.githubPRCache || {})[ep.id];
        const info = c && !c.error ? `${c.count} PR` : c?.error ? 'erreur' : '…';
        all.push({ type: 'github', id: ep.id, name: ep.name, url: ep.url || 'github.com', detail: `${ep.owner}/${ep.repo} · ${ep.branch || 'main'}`, info, fetchedAt: c?.fetchedAt });
    });
    (state.consulEndpoints || []).forEach(ep => {
        const c = (state.consulCache || {})[ep.id];
        const info = c && !c.error ? `${c.servicesHealthy}/${c.servicesTotal} svc` : c?.error ? 'erreur' : '…';
        all.push({ type: 'consul', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.fetchedAt });
    });
    (state.ansibleEndpoints || []).forEach(ep => {
        const c = (state.ansibleCache || {})[ep.id];
        const info = c && !c.error ? `${c.totalJobs} jobs` : c?.error ? 'erreur' : '…';
        all.push({ type: 'ansible', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.fetchedAt });
    });
    (state.openstackEndpoints || []).forEach(ep => {
        const c = (state.openstackCache || {})[ep.id];
        const info = c && !c.error ? `${c.instances} inst. / ${c.volumes} vol.` : c?.error ? 'erreur' : '…';
        all.push({ type: 'openstack', id: ep.id, name: ep.name, url: ep.url, detail: ep.project || '', info, fetchedAt: c?.fetchedAt });
    });
    (state.prometheusEndpoints || []).forEach(ep => {
        const c = (state.prometheusCache || {})[ep.id];
        const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '…';
        all.push({ type: 'prometheus', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.testedAt, testResult: c });
    });
    (state.grafanaEndpoints || []).forEach(ep => {
        const c = (state.grafanaCache || {})[ep.id];
        const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '…';
        all.push({ type: 'grafana', id: ep.id, name: ep.name, url: ep.url, detail: ep.orgId || '', info, fetchedAt: c?.testedAt, testResult: c });
    });
    (state.lokiEndpoints || []).forEach(ep => {
        const c = (state.lokiCache || {})[ep.id];
        const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '…';
        all.push({ type: 'loki', id: ep.id, name: ep.name, url: ep.url, detail: '', info, fetchedAt: c?.testedAt, testResult: c });
    });
    (state.vaultEndpoints || []).forEach(ep => {
        const c = (state.vaultCache || {})[ep.id];
        const info = c ? (c.ok ? '✓ ' + c.status : '✗ ' + (c.status || 'err')) : '…';
        all.push({ type: 'vault', id: ep.id, name: ep.name, url: ep.url, detail: ep.namespace || '', info, fetchedAt: c?.testedAt, testResult: c });
    });

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:16px;font-size:0.82rem">Aucun endpoint configuré. Utilisez le formulaire ci-dessous.</div>';
        return;
    }

    container.innerHTML = all.map(ep => {
        const t = API_TYPES[ep.type];
        const sync = ep.fetchedAt ? `<span class="api-ep-sync" title="${new Date(ep.fetchedAt).toLocaleString('fr-FR')}">⟳ ${timeAgoShort(ep.fetchedAt)}</span>` : '';
        const infoClass = ep.info === 'erreur' || (ep.testResult && !ep.testResult.ok) ? ' style="color:var(--red)"' : (ep.testResult?.ok ? ' style="color:var(--green)"' : '');
        return `<div class="api-ep-item">
            <span class="api-ep-type" style="background:${t.color}">${t.icon}</span>
            <div class="api-ep-info">
                <span class="api-ep-name">${esc(ep.name)}</span>
                <span class="api-ep-url">${esc(ep.url)}${ep.detail ? ' · ' + esc(ep.detail) : ''}</span>
            </div>
            <span class="api-ep-count"${infoClass}>${ep.info}</span>
            ${sync}
            <button class="btn btn-small btn-secondary api-ep-test-btn" onclick="testApiEndpoint('${ep.type}','${ep.id}')" title="Tester la connexion">⚡</button>
            <button class="btn btn-small btn-secondary" onclick="refreshApiEndpoint('${ep.type}','${ep.id}')" title="Rafraîchir">🔄</button>
            <button class="btn btn-small btn-danger" onclick="removeApiEndpoint('${ep.type}','${ep.id}')" title="Supprimer">✕</button>
        </div>`;
    }).join('');
}

function addApiEndpoint() {
    const type = document.getElementById('apiType').value;
    const name = document.getElementById('apiName').value.trim();
    const url = document.getElementById('apiUrl').value.trim();
    const token = document.getElementById('apiToken').value.trim();
    if (!name || !url) return toast('⚠️ Nom et URL requis');

    if (type === 'gitlab') {
        const projectId = document.getElementById('apiProjectId').value.trim();
        if (!projectId) return toast('⚠️ Project ID requis pour GitLab');
        const branch = document.getElementById('apiBranch').value.trim() || 'main';
        if (!state.gitlabRepos) state.gitlabRepos = [];
        const id = uid();
        state.gitlabRepos.push({ id, name, url, projectId, branch, token });
        saveState(); renderApiEndpointList(); renderGitlabMetric();
        fetchGitlabMRs(id);
    } else if (type === 'github') {
        const ownerRepo = document.getElementById('apiProjectId').value.trim();
        if (!ownerRepo || !ownerRepo.includes('/')) return toast('⚠️ Format owner/repo requis (ex: org/myrepo)');
        const [owner, repo] = ownerRepo.split('/');
        const branch = document.getElementById('apiBranch').value.trim() || 'main';
        const ghUrl = url || 'https://api.github.com';
        if (!state.githubRepos) state.githubRepos = [];
        const id = uid();
        state.githubRepos.push({ id, name, url: ghUrl, owner, repo, branch, token });
        saveState(); renderApiEndpointList(); renderGithubPRMetric();
        fetchGithubPRs(id);
    } else if (type === 'consul') {
        if (!state.consulEndpoints) state.consulEndpoints = [];
        const id = uid();
        state.consulEndpoints.push({ id, name, url, token });
        saveState(); renderApiEndpointList(); renderConsulMetric();
        fetchConsul(id);
    } else if (type === 'ansible') {
        if (!state.ansibleEndpoints) state.ansibleEndpoints = [];
        const id = uid();
        state.ansibleEndpoints.push({ id, name, url, token });
        saveState(); renderApiEndpointList(); renderAnsibleMetric();
        fetchAnsible(id);
    } else if (type === 'openstack') {
        const project = document.getElementById('apiProjectId').value.trim();
        if (!state.openstackEndpoints) state.openstackEndpoints = [];
        const id = uid();
        state.openstackEndpoints.push({ id, name, url, project, token });
        saveState(); renderApiEndpointList(); renderOpenstackMetric();
        fetchOpenstack(id);
    } else if (type === 'prometheus') {
        if (!state.prometheusEndpoints) state.prometheusEndpoints = [];
        const id = uid();
        state.prometheusEndpoints.push({ id, name, url, token });
        saveState(); renderApiEndpointList();
        testApiEndpoint('prometheus', id);
    } else if (type === 'grafana') {
        const orgId = document.getElementById('apiProjectId').value.trim();
        if (!state.grafanaEndpoints) state.grafanaEndpoints = [];
        const id = uid();
        state.grafanaEndpoints.push({ id, name, url, orgId, token });
        saveState(); renderApiEndpointList();
        testApiEndpoint('grafana', id);
    } else if (type === 'loki') {
        if (!state.lokiEndpoints) state.lokiEndpoints = [];
        const id = uid();
        state.lokiEndpoints.push({ id, name, url, token });
        saveState(); renderApiEndpointList();
        testApiEndpoint('loki', id);
    } else if (type === 'vault') {
        const namespace = document.getElementById('apiProjectId').value.trim();
        if (!state.vaultEndpoints) state.vaultEndpoints = [];
        const id = uid();
        state.vaultEndpoints.push({ id, name, url, namespace, token });
        saveState(); renderApiEndpointList();
        testApiEndpoint('vault', id);
    }

    // Clear form
    document.getElementById('apiName').value = '';
    document.getElementById('apiUrl').value = '';
    document.getElementById('apiToken').value = '';
    document.getElementById('apiProjectId').value = '';
    document.getElementById('apiBranch').value = '';
    updateMetricGroupVisibility();
    toast('✅ Endpoint ' + name + ' ajouté');
}

function removeApiEndpoint(type, id) {
    if (type === 'gitlab') {
        state.gitlabRepos = (state.gitlabRepos || []).filter(e => e.id !== id);
        if (state.gitlabMRCache) delete state.gitlabMRCache[id];
        if (state.gitlabPipelinesCache) delete state.gitlabPipelinesCache[id];
        if (state.gitlabCommitsCache) delete state.gitlabCommitsCache[id];
        saveState(); renderApiEndpointList(); renderGitlabMetric(); renderGitlabPipelinesMetric(); renderGitlabCommitsMetric();
        renderDeployFrequencyMetric(); renderChangeFailureRateMetric();
    } else if (type === 'github') {
        state.githubRepos = (state.githubRepos || []).filter(e => e.id !== id);
        if (state.githubPRCache) delete state.githubPRCache[id];
        if (state.githubActionsCache) delete state.githubActionsCache[id];
        if (state.githubCommitsCache) delete state.githubCommitsCache[id];
        saveState(); renderApiEndpointList(); renderGithubPRMetric(); renderGithubActionsMetric(); renderGithubCommitsMetric();
        renderDeployFrequencyMetric(); renderChangeFailureRateMetric();
    } else if (type === 'consul') {
        state.consulEndpoints = (state.consulEndpoints || []).filter(e => e.id !== id);
        if (state.consulCache) delete state.consulCache[id];
        saveState(); renderApiEndpointList(); renderConsulMetric();
    } else if (type === 'ansible') {
        state.ansibleEndpoints = (state.ansibleEndpoints || []).filter(e => e.id !== id);
        if (state.ansibleCache) delete state.ansibleCache[id];
        saveState(); renderApiEndpointList(); renderAnsibleMetric(); updateAnsibleCharts();
    } else if (type === 'openstack') {
        state.openstackEndpoints = (state.openstackEndpoints || []).filter(e => e.id !== id);
        if (state.openstackCache) delete state.openstackCache[id];
        saveState(); renderApiEndpointList(); renderOpenstackMetric(); updateOpenstackCharts();
    } else if (type === 'prometheus') {
        state.prometheusEndpoints = (state.prometheusEndpoints || []).filter(e => e.id !== id);
        if (state.prometheusCache) delete state.prometheusCache[id];
        saveState(); renderApiEndpointList();
    } else if (type === 'grafana') {
        state.grafanaEndpoints = (state.grafanaEndpoints || []).filter(e => e.id !== id);
        if (state.grafanaCache) delete state.grafanaCache[id];
        saveState(); renderApiEndpointList();
    } else if (type === 'loki') {
        state.lokiEndpoints = (state.lokiEndpoints || []).filter(e => e.id !== id);
        if (state.lokiCache) delete state.lokiCache[id];
        saveState(); renderApiEndpointList();
    } else if (type === 'vault') {
        state.vaultEndpoints = (state.vaultEndpoints || []).filter(e => e.id !== id);
        if (state.vaultCache) delete state.vaultCache[id];
        saveState(); renderApiEndpointList();
    }
    updateMetricGroupVisibility();
}

function refreshApiEndpoint(type, id) {
    if (type === 'gitlab') fetchGitlabMRs(id).then(() => renderApiEndpointList());
    else if (type === 'github') fetchGithubPRs(id).then(() => renderApiEndpointList());
    else if (type === 'consul') fetchConsul(id).then(() => renderApiEndpointList());
    else if (type === 'ansible') fetchAnsible(id).then(() => renderApiEndpointList());
    else if (type === 'openstack') fetchOpenstack(id).then(() => renderApiEndpointList());
    else if (type === 'prometheus' || type === 'grafana' || type === 'loki' || type === 'vault') testApiEndpoint(type, id);
}

// ==================== API TEST CONNECTION ====================
const API_TEST_PATHS = {
    gitlab:     { path: (ep) => `/api/v4/projects/${encodeURIComponent(ep.projectId)}`, authHeader: 'PRIVATE-TOKEN' },
    github:     { path: (ep) => `/repos/${ep.owner}/${ep.repo}`, authHeader: 'Authorization', authPrefix: 'Bearer ' },
    consul:     { path: () => '/v1/status/leader', authHeader: 'X-Consul-Token' },
    ansible:    { path: () => '/api/v2/ping/', authHeader: 'Authorization', authPrefix: 'Bearer ' },
    openstack:  { path: () => '/v3/', authHeader: 'X-Auth-Token' },
    prometheus: { path: () => '/api/v1/status/buildinfo', authHeader: 'Authorization', authPrefix: 'Bearer ' },
    grafana:    { path: () => '/api/health', authHeader: 'Authorization', authPrefix: 'Bearer ' },
    loki:       { path: () => '/loki/api/v1/status/buildinfo', authHeader: 'Authorization', authPrefix: 'Bearer ' },
    vault:      { path: () => '/v1/sys/health', authHeader: 'X-Vault-Token' }
};

function getEndpointArrayKey(type) {
    const map = { gitlab: 'gitlabRepos', github: 'githubRepos' };
    return map[type] || type + 'Endpoints';
}

function getCacheKey(type) {
    const map = { gitlab: 'gitlabMRCache', github: 'githubPRCache' };
    return map[type] || type + 'Cache';
}

async function testApiEndpoint(type, id) {
    const arrKey = getEndpointArrayKey(type);
    const ep = (state[arrKey] || []).find(e => e.id === id);
    if (!ep) return;

    const conf = API_TEST_PATHS[type];
    if (!conf) return;

    const testUrl = ep.url.replace(/\/+$/, '') + conf.path(ep);
    const headers = {};
    if (ep.token) {
        headers[conf.authHeader] = (conf.authPrefix || '') + ep.token;
    }

    const cacheKey = getCacheKey(type);
    if (!state[cacheKey]) state[cacheKey] = {};

    try {
        const res = await fetch(testUrl, { method: 'GET', headers, mode: 'cors', signal: AbortSignal.timeout(10000) });
        state[cacheKey][id] = { ok: res.ok, status: res.status, testedAt: Date.now() };
        toast(res.ok ? `✅ ${ep.name} : connexion OK (${res.status})` : `⚠️ ${ep.name} : ${res.status}`);
    } catch (err) {
        const msg = err.name === 'TimeoutError' ? 'timeout' : err.name === 'TypeError' ? 'CORS/réseau' : err.message;
        state[cacheKey][id] = { ok: false, status: msg, testedAt: Date.now() };
        toast(`❌ ${ep.name} : ${msg}`);
    }
    saveState();
    renderApiEndpointList();
}

async function testApiConnection() {
    const type = document.getElementById('apiType').value;
    const url = document.getElementById('apiUrl').value.trim();
    const token = document.getElementById('apiToken').value.trim();
    if (!url) return toast('⚠️ URL requise pour tester');

    const conf = API_TEST_PATHS[type];
    if (!conf) return toast('⚠️ Type non supporté pour le test');

    // Build a temporary endpoint object for path generation
    const tempEp = { url, token };
    if (type === 'gitlab') tempEp.projectId = document.getElementById('apiProjectId').value.trim() || '0';
    if (type === 'github') {
        const ownerRepo = document.getElementById('apiProjectId').value.trim() || '/';
        const parts = ownerRepo.split('/');
        tempEp.owner = parts[0] || '';
        tempEp.repo = parts[1] || '';
    }

    const testUrl = url.replace(/\/+$/, '') + conf.path(tempEp);
    const headers = {};
    if (token) {
        headers[conf.authHeader] = (conf.authPrefix || '') + token;
    }

    toast('⏳ Test en cours...');
    try {
        const res = await fetch(testUrl, { method: 'GET', headers, mode: 'cors', signal: AbortSignal.timeout(10000) });
        toast(res.ok ? `✅ Connexion OK (${res.status})` : `⚠️ Réponse ${res.status}`);
    } catch (err) {
        const msg = err.name === 'TimeoutError' ? 'timeout (10s)' : err.name === 'TypeError' ? 'CORS ou réseau injoignable' : err.message;
        toast(`❌ Échec : ${msg}`);
    }
}

// Backward compat — old functions redirect to unified modal
function openGitlabConfig() { openApiConfig(); }
function openConsulConfig() { openApiConfig(); }
function openAnsibleConfig() { openApiConfig(); }
function openOpenstackConfig() { openApiConfig(); }

// ==================== CHARTS: ANSIBLE ====================
function updateAnsibleCharts() {
    const eps = state.ansibleEndpoints || [];
    const chartRow = document.querySelector('[data-settings-id="chart-ansible"]');
    if (eps.length === 0) { if (chartRow) chartRow.classList.add('no-source'); return; }
    if (chartRow) chartRow.classList.remove('no-source');
    const cache = state.ansibleCache || {};
    let successful = 0, failed = 0, running = 0, total = 0;
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) {
            successful += c.successful || 0;
            failed += c.failed || 0;
            running += c.running || 0;
            total += c.totalJobs || 0;
        }
    });

    // -- Donut 1 : Jobs par statut --
    const ctx1 = document.getElementById('ansibleJobsChart');
    if (ctx1) {
        if (total === 0) {
            if (ansibleJobsChartInstance) { ansibleJobsChartInstance.destroy(); ansibleJobsChartInstance = null; }
            chartEmptyState('ansibleJobsChart', 'Aucun job Ansible');
            const leg = document.getElementById('ansibleJobsLegend'); if (leg) leg.innerHTML = '';
        } else {
            chartEmptyState('ansibleJobsChart', null, false);
            const data = [successful, failed, running];
            const bg = ['#10b981', '#ef4444', '#f59e0b'];
            const border = ['#059669', '#dc2626', '#d97706'];
            const labels = ['Successful', 'Failed', 'Running'];
            const leg = document.getElementById('ansibleJobsLegend');
            if (leg) leg.innerHTML = labels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${bg[i]}"></span> ${l}: <strong>${data[i]}</strong></div>`).join('') + `<div class="legend-item legend-total">Total: <strong>${total}</strong></div>`;

            if (ansibleJobsChartInstance) {
                ansibleJobsChartInstance.data.datasets[0].data = data;
                ansibleJobsChartInstance.update();
            } else {
                ansibleJobsChartInstance = new Chart(ctx1, {
                    type: 'doughnut',
                    data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: border, borderWidth: 2, hoverOffset: 8 }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} (${total > 0 ? Math.round(c.parsed / total * 100) : 0}%)` } } } }
                });
            }
        }
    }

    // -- Donut 2 : Taux de succès --
    const ctx2 = document.getElementById('ansibleRateChart');
    if (ctx2) {
        if (total === 0) {
            if (ansibleRateChartInstance) { ansibleRateChartInstance.destroy(); ansibleRateChartInstance = null; }
            chartEmptyState('ansibleRateChart', 'Aucun job Ansible');
            const leg = document.getElementById('ansibleRateLegend'); if (leg) leg.innerHTML = '';
        } else {
            chartEmptyState('ansibleRateChart', null, false);
            const pct = Math.round(successful / total * 100);
            const data = [pct, 100 - pct];
            const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
            const leg = document.getElementById('ansibleRateLegend');
            if (leg) leg.innerHTML = `<div class="legend-item"><span class="legend-dot" style="background:${color}"></span> Succès: <strong>${pct}%</strong></div><div class="legend-item"><span class="legend-dot" style="background:var(--border)"></span> Échecs+Autres: <strong>${100 - pct}%</strong></div>`;

            if (ansibleRateChartInstance) {
                ansibleRateChartInstance.data.datasets[0].data = data;
                ansibleRateChartInstance.data.datasets[0].backgroundColor = [color, 'rgba(128,128,128,0.15)'];
                ansibleRateChartInstance.data.datasets[0].borderColor = [color, 'transparent'];
                ansibleRateChartInstance.update();
            } else {
                ansibleRateChartInstance = new Chart(ctx2, {
                    type: 'doughnut',
                    data: { labels: ['Succès', 'Reste'], datasets: [{ data, backgroundColor: [color, 'rgba(128,128,128,0.15)'], borderColor: [color, 'transparent'], borderWidth: 2, hoverOffset: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}%` } } } }
                });
            }
        }
    }
}

// ==================== CHARTS: OPENSTACK ====================
function updateOpenstackCharts() {
    const eps = state.openstackEndpoints || [];
    const chartRow = document.querySelector('[data-settings-id="chart-openstack"]');
    if (eps.length === 0) { if (chartRow) chartRow.classList.add('no-source'); return; }
    if (chartRow) chartRow.classList.remove('no-source');
    const cache = state.openstackCache || {};
    let active = 0, error = 0, stopped = 0, totalInst = 0, volInUse = 0, volAvail = 0, totalVol = 0;
    eps.forEach(ep => {
        const c = cache[ep.id];
        if (c && !c.error) {
            active += c.instancesActive || 0;
            error += c.instancesError || 0;
            stopped += c.instancesStopped || 0;
            totalInst += c.instances || 0;
            volInUse += c.volumesInUse || 0;
            volAvail += c.volumesAvailable || 0;
            totalVol += c.volumes || 0;
        }
    });

    // -- Donut 1 : Instances --
    const ctx1 = document.getElementById('openstackInstancesChart');
    if (ctx1) {
        if (totalInst === 0) {
            if (openstackInstancesChartInstance) { openstackInstancesChartInstance.destroy(); openstackInstancesChartInstance = null; }
            chartEmptyState('openstackInstancesChart', 'Aucune instance OpenStack');
            const leg = document.getElementById('openstackInstancesLegend'); if (leg) leg.innerHTML = '';
        } else {
            chartEmptyState('openstackInstancesChart', null, false);
            const data = [active, error, stopped];
            const bg = ['#10b981', '#ef4444', '#f59e0b'];
            const border = ['#059669', '#dc2626', '#d97706'];
            const labels = ['Active', 'Error', 'Stopped'];
            const leg = document.getElementById('openstackInstancesLegend');
            if (leg) leg.innerHTML = labels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${bg[i]}"></span> ${l}: <strong>${data[i]}</strong></div>`).join('') + `<div class="legend-item legend-total">Total: <strong>${totalInst}</strong></div>`;

            if (openstackInstancesChartInstance) {
                openstackInstancesChartInstance.data.datasets[0].data = data;
                openstackInstancesChartInstance.update();
            } else {
                openstackInstancesChartInstance = new Chart(ctx1, {
                    type: 'doughnut',
                    data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: border, borderWidth: 2, hoverOffset: 8 }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} (${totalInst > 0 ? Math.round(c.parsed / totalInst * 100) : 0}%)` } } } }
                });
            }
        }
    }

    // -- Donut 2 : Volumes --
    const ctx2 = document.getElementById('openstackVolumesChart');
    if (ctx2) {
        if (totalVol === 0) {
            if (openstackVolumesChartInstance) { openstackVolumesChartInstance.destroy(); openstackVolumesChartInstance = null; }
            chartEmptyState('openstackVolumesChart', 'Aucun volume OpenStack');
            const leg = document.getElementById('openstackVolumesLegend'); if (leg) leg.innerHTML = '';
        } else {
            chartEmptyState('openstackVolumesChart', null, false);
            const data = [volInUse, volAvail];
            const bg = ['#6366f1', '#a5b4fc'];
            const border = ['#4f46e5', '#818cf8'];
            const labels = ['In-use', 'Available'];
            const leg = document.getElementById('openstackVolumesLegend');
            if (leg) leg.innerHTML = labels.map((l, i) => `<div class="legend-item"><span class="legend-dot" style="background:${bg[i]}"></span> ${l}: <strong>${data[i]}</strong></div>`).join('') + `<div class="legend-item legend-total">Total: <strong>${totalVol}</strong></div>`;

            if (openstackVolumesChartInstance) {
                openstackVolumesChartInstance.data.datasets[0].data = data;
                openstackVolumesChartInstance.update();
            } else {
                openstackVolumesChartInstance = new Chart(ctx2, {
                    type: 'doughnut',
                    data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: border, borderWidth: 2, hoverOffset: 8 }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} (${totalVol > 0 ? Math.round(c.parsed / totalVol * 100) : 0}%)` } } } }
                });
            }
        }
    }
}
