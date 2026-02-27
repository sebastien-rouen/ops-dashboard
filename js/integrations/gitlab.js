// ==================== GITLAB ====================

const REPO_COLORS = ['#fc6d26', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
function repoColor(i) { return REPO_COLORS[i % REPO_COLORS.length]; }
function repoColorBg(i) {
    const h = REPO_COLORS[i % REPO_COLORS.length];
    return `rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},0.06)`;
}

// ==================== GITLAB MERGE REQUESTS ====================
function addGitlabRepo() {
    const name = document.getElementById('glRepoName').value.trim();
    const url = document.getElementById('glRepoUrl').value.trim().replace(/\/+$/, '');
    const projectId = document.getElementById('glRepoProjectId').value.trim();
    const branch = document.getElementById('glRepoBranch').value.trim() || 'main';
    const token = document.getElementById('glRepoToken').value.trim();

    if (!name || !url || !projectId) {
        toast('⚠️ Nom, URL et Project ID sont requis');
        return;
    }

    if (!state.gitlabRepos) state.gitlabRepos = [];
    state.gitlabRepos.push({ id: uid(), name, url, projectId, branch, token });
    saveState();
    addLog('🦊', `Repo GitLab ajouté : ${name}`);

    // Clear form
    ['glRepoName', 'glRepoUrl', 'glRepoProjectId', 'glRepoBranch', 'glRepoToken'].forEach(id => {
        document.getElementById(id).value = '';
    });

    renderApiEndpointList();
    fetchAllGitlabMRs();
}

function removeGitlabRepo(id) {
    if (!state.gitlabRepos) return;
    const repo = state.gitlabRepos.find(r => r.id === id);
    state.gitlabRepos = state.gitlabRepos.filter(r => r.id !== id);
    if (state.gitlabMRCache) delete state.gitlabMRCache[id];
    saveState();
    if (repo) addLog('🦊', `Repo GitLab supprimé : ${repo.name}`);
    renderApiEndpointList();
    renderGitlabMetric();
}

async function fetchGitlabMRs(repoId) {
    const repo = (state.gitlabRepos || []).find(r => r.id === repoId);
    if (!repo) return;

    const apiUrl = `${repo.url}/api/v4/projects/${encodeURIComponent(repo.projectId)}/merge_requests?state=opened&target_branch=${encodeURIComponent(repo.branch)}&per_page=100`;
    const headers = {};
    if (repo.token) headers['PRIVATE-TOKEN'] = repo.token;

    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const mrs = await resp.json();
        if (!state.gitlabMRCache) state.gitlabMRCache = {};
        state.gitlabMRCache[repoId] = {
            count: mrs.length,
            fetchedAt: new Date().toISOString(),
            mrs: mrs.map(mr => ({
                id: mr.iid,
                title: mr.title,
                author: mr.author ? mr.author.name : '?',
                url: mr.web_url,
                created: mr.created_at,
                labels: mr.labels || [],
                draft: mr.draft || mr.work_in_progress || false
            }))
        };
        saveState();
        renderGitlabMetric();
        renderApiEndpointList();
    } catch (e) {
        console.error(`GitLab fetch error (${repo.name}):`, e);
        toast(`⚠️ Erreur GitLab (${repo.name}) : ${e.message}`);
        if (!state.gitlabMRCache) state.gitlabMRCache = {};
        state.gitlabMRCache[repoId] = {
            count: -1,
            fetchedAt: new Date().toISOString(),
            mrs: [],
            error: e.message
        };
        saveState();
        renderGitlabMetric();
        renderApiEndpointList();
    }
}

async function fetchAllGitlabMRs() {
    const repos = state.gitlabRepos || [];
    if (repos.length === 0) {
        toast('ℹ️ Aucun repo GitLab configuré');
        return;
    }
    toast('🦊 Rafraîchissement des MR GitLab…');
    await Promise.allSettled(repos.map(r => fetchGitlabMRs(r.id)));
    toast('🦊 MR GitLab mises à jour');
    addLog('🦊', `MR GitLab rafraîchies (${repos.length} repos)`);
}

function renderGitlabMetric() {
    const el = document.getElementById('metricGitlabMR');
    if (!el) return;

    const repos = state.gitlabRepos || [];
    const cache = state.gitlabMRCache || {};
    const card = el.closest('.metric-card');

    if (repos.length === 0) {
        if (card) card.classList.add('no-source');
        el.textContent = '—';
        return;
    }
    if (card) card.classList.remove('no-source');

    let total = 0;
    let hasError = false;
    repos.forEach(r => {
        const c = cache[r.id];
        if (c && c.count >= 0) total += c.count;
        else if (c && c.count === -1) hasError = true;
    });

    const hasCachedData = repos.some(r => cache[r.id] && cache[r.id].count >= 0);
    if (hasCachedData) {
        animateValue('metricGitlabMR', total);
    } else if (hasError) {
        el.textContent = '⚠️';
    } else {
        el.textContent = '—';
    }
}

function openGitlabDetail() {
    const repos = state.gitlabRepos || [];
    const cache = state.gitlabMRCache || {};
    const container = document.getElementById('gitlabDetailContent');
    if (!container) return;

    if (repos.length === 0) {
        container.innerHTML = `<div class="gl-detail-empty">
            <p>Aucun repo GitLab configuré.</p>
            <button class="btn btn-small btn-primary" onclick="closeModal('modalGitlabDetail');openGitlabConfig()">⚙️ Configurer les repos</button>
        </div>`;
        openModal('modalGitlabDetail');
        return;
    }

    let html = '';
    let totalMRs = 0;

    repos.forEach((repo, idx) => {
        const cached = cache[repo.id];
        const mrs = cached ? cached.mrs || [] : [];
        const count = cached ? cached.count : -1;
        const error = cached ? cached.error : null;
        if (count >= 0) totalMRs += count;

        html += `<div class="gl-detail-repo">
            <div class="gl-detail-repo-header" style="background:${repoColorBg(idx)}">
                <span class="gl-detail-repo-name" style="color:${repoColor(idx)}">${esc(repo.name)}</span>
                <span class="gl-detail-repo-branch">${esc(repo.branch || 'main')}</span>
                <span class="gl-detail-repo-count${count === -1 ? ' gl-error' : ''}">${count >= 0 ? count + ' MR' : (error ? '⚠️ ' + esc(error) : '…')}</span>
            </div>`;

        if (mrs.length > 0) {
            html += '<div class="gl-detail-mr-list">';
            mrs.forEach(mr => {
                const age = timeAgoShort(mr.created);
                const labels = (mr.labels || []).slice(0, 3).map(l => `<span class="gl-mr-label">${esc(l)}</span>`).join('');
                html += `<div class="gl-detail-mr${mr.draft ? ' gl-mr-draft' : ''}">
                    <span class="gl-mr-id">!${mr.id}</span>
                    <a class="gl-mr-title" href="${esc(mr.url)}" target="_blank" rel="noopener">${mr.draft ? '<span class="gl-draft-badge">Draft</span> ' : ''}${esc(mr.title)}</a>
                    <span class="gl-mr-meta">${esc(mr.author)} · ${age}</span>
                    ${labels}
                </div>`;
            });
            html += '</div>';
        } else if (count === 0) {
            html += '<div class="gl-detail-empty-repo">Aucune MR ouverte</div>';
        }

        html += '</div>';
    });

    const summary = `<div class="gl-detail-summary">${totalMRs} MR ouverte${totalMRs !== 1 ? 's' : ''} sur ${repos.length} repo${repos.length !== 1 ? 's' : ''}</div>`;
    container.innerHTML = summary + html;
    openModal('modalGitlabDetail');
}

// ==================== GITLAB PIPELINES ====================
async function fetchGitlabPipelines(repoId) {
    const repo = (state.gitlabRepos || []).find(r => r.id === repoId);
    if (!repo) return;
    const apiUrl = `${repo.url}/api/v4/projects/${encodeURIComponent(repo.projectId)}/pipelines?ref=${encodeURIComponent(repo.branch)}&per_page=20`;
    const headers = {};
    if (repo.token) headers['PRIVATE-TOKEN'] = repo.token;
    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const pipelines = await resp.json();
        if (!state.gitlabPipelinesCache) state.gitlabPipelinesCache = {};
        const success = pipelines.filter(p => p.status === 'success').length;
        const failed = pipelines.filter(p => p.status === 'failed').length;
        const running = pipelines.filter(p => p.status === 'running').length;
        const other = pipelines.length - success - failed - running;
        state.gitlabPipelinesCache[repoId] = {
            total: pipelines.length, success, failed, running, other,
            fetchedAt: new Date().toISOString(),
            pipelines: pipelines.slice(0, 20).map(p => ({
                id: p.id, status: p.status, ref: p.ref,
                url: p.web_url, created: p.created_at, updated: p.updated_at
            }))
        };
        saveState();
        renderGitlabPipelinesMetric();
    } catch (e) {
        console.error(`GitLab pipelines error (${repo.name}):`, e);
        if (!state.gitlabPipelinesCache) state.gitlabPipelinesCache = {};
        state.gitlabPipelinesCache[repoId] = { total: -1, fetchedAt: new Date().toISOString(), error: e.message, pipelines: [] };
        saveState();
        renderGitlabPipelinesMetric();
    }
}

async function fetchAllGitlabPipelines() {
    const repos = state.gitlabRepos || [];
    if (repos.length === 0) { toast('ℹ️ Aucun repo GitLab configuré'); return; }
    toast('🚀 Rafraîchissement des pipelines…');
    await Promise.allSettled(repos.map(r => fetchGitlabPipelines(r.id)));
    toast('🚀 Pipelines mises à jour');
    addLog('🚀', `Pipelines rafraîchies (${repos.length} repos)`);
}

function renderGitlabPipelinesMetric() {
    const el = document.getElementById('metricGitlabPipelines');
    const sumEl = document.getElementById('metricGitlabPipelinesSummary');
    if (!el) return;
    const repos = state.gitlabRepos || [];
    const cache = state.gitlabPipelinesCache || {};
    const card = el.closest('.metric-card');
    if (repos.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; if (sumEl) sumEl.innerHTML = ''; return; }
    if (card) card.classList.remove('no-source');
    let total = 0, success = 0, failed = 0, running = 0, hasError = false;
    repos.forEach(r => {
        const c = cache[r.id];
        if (c && c.total >= 0) { total += c.total; success += c.success; failed += c.failed; running += c.running; }
        else if (c && c.total === -1) hasError = true;
    });
    const hasData = repos.some(r => cache[r.id] && cache[r.id].total >= 0);
    if (hasData) {
        animateValue('metricGitlabPipelines', total);
        if (sumEl) {
            let parts = [];
            if (success) parts.push(`<span class="mms-dot" style="background:var(--green)"></span>${success}`);
            if (failed) parts.push(`<span class="mms-dot" style="background:var(--red)"></span>${failed}`);
            if (running) parts.push(`<span class="mms-dot" style="background:var(--accent)"></span>${running}`);
            sumEl.innerHTML = parts.join('<span class="mms-sep">·</span>');
        }
    } else if (hasError) { el.textContent = '⚠️'; if (sumEl) sumEl.innerHTML = ''; }
    else { el.textContent = '—'; if (sumEl) sumEl.innerHTML = ''; }
}

function openGitlabPipelinesDetail() {
    const repos = state.gitlabRepos || [];
    const cache = state.gitlabPipelinesCache || {};
    const container = document.getElementById('gitlabPipelinesContent');
    if (!container) return;
    if (repos.length === 0) {
        container.innerHTML = '<div class="md-empty">Aucun repo GitLab configuré.</div>';
        openModal('modalGitlabPipelines'); return;
    }
    const statusIcon = s => s === 'success' ? '✅' : s === 'failed' ? '❌' : s === 'running' ? '🔄' : s === 'canceled' ? '🚫' : '⏸️';
    const statusBadge = s => s === 'success' ? 'badge-up' : s === 'failed' ? 'badge-critical' : s === 'running' ? 'badge-warning' : 'badge-low';
    let html = '<div class="md-col3"><div class="md-col3-col"><div class="md-col3-head" style="color:var(--green)">✅ Success</div>';
    let colFailed = '<div class="md-col3-col"><div class="md-col3-head" style="color:var(--red)">❌ Failed</div>';
    let colOther = '<div class="md-col3-col"><div class="md-col3-head" style="color:var(--accent)">🔄 Running / Autres</div>';
    repos.forEach(repo => {
        const c = cache[repo.id];
        const pips = c ? c.pipelines || [] : [];
        pips.forEach(p => {
            const item = `<div class="md-col3-item"><a href="${esc(p.url || '#')}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">#${p.id}</a> <span class="md-col3-meta">${esc(repo.name)} · ${timeAgoShort(p.created)}</span></div>`;
            if (p.status === 'success') html += item;
            else if (p.status === 'failed') colFailed += item;
            else colOther += item;
        });
    });
    html += '</div>' + colFailed + '</div>' + colOther + '</div></div>';
    let total = 0, success = 0, failed = 0, running = 0;
    repos.forEach(r => { const c = cache[r.id]; if (c && c.total >= 0) { total += c.total; success += c.success; failed += c.failed; running += c.running; } });
    const summary = `<div class="md-summary"><div class="md-summary-item"><strong>${total}</strong> pipelines</div><div class="md-summary-item" style="color:var(--green)"><strong>${success}</strong> success</div><div class="md-summary-item" style="color:var(--red)"><strong>${failed}</strong> failed</div><div class="md-summary-item" style="color:var(--accent)"><strong>${running}</strong> running</div></div>`;
    container.innerHTML = summary + html;
    openModal('modalGitlabPipelines');
}

// ==================== GITLAB COMMITS ====================
async function fetchGitlabCommits(repoId) {
    const repo = (state.gitlabRepos || []).find(r => r.id === repoId);
    if (!repo) return;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const apiUrl = `${repo.url}/api/v4/projects/${encodeURIComponent(repo.projectId)}/repository/commits?ref_name=${encodeURIComponent(repo.branch)}&since=${since}&per_page=100`;
    const headers = {};
    if (repo.token) headers['PRIVATE-TOKEN'] = repo.token;
    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const commits = await resp.json();
        if (!state.gitlabCommitsCache) state.gitlabCommitsCache = {};
        state.gitlabCommitsCache[repoId] = {
            count: commits.length,
            fetchedAt: new Date().toISOString(),
            commits: commits.slice(0, 30).map(c => ({
                id: c.short_id, title: c.title, author: c.author_name,
                url: c.web_url, created: c.created_at
            }))
        };
        saveState();
        renderGitlabCommitsMetric();
    } catch (e) {
        console.error(`GitLab commits error (${repo.name}):`, e);
        if (!state.gitlabCommitsCache) state.gitlabCommitsCache = {};
        state.gitlabCommitsCache[repoId] = { count: -1, fetchedAt: new Date().toISOString(), error: e.message, commits: [] };
        saveState();
        renderGitlabCommitsMetric();
    }
}

async function fetchAllGitlabCommits() {
    const repos = state.gitlabRepos || [];
    if (repos.length === 0) { toast('ℹ️ Aucun repo GitLab configuré'); return; }
    toast('📝 Rafraîchissement des commits…');
    await Promise.allSettled(repos.map(r => fetchGitlabCommits(r.id)));
    toast('📝 Commits mis à jour');
    addLog('📝', `Commits rafraîchis (${repos.length} repos)`);
}

function renderGitlabCommitsMetric() {
    const el = document.getElementById('metricGitlabCommits');
    if (!el) return;
    const repos = state.gitlabRepos || [];
    const cache = state.gitlabCommitsCache || {};
    const card = el.closest('.metric-card');
    if (repos.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; return; }
    if (card) card.classList.remove('no-source');
    let total = 0, hasError = false;
    repos.forEach(r => {
        const c = cache[r.id];
        if (c && c.count >= 0) total += c.count;
        else if (c && c.count === -1) hasError = true;
    });
    const hasData = repos.some(r => cache[r.id] && cache[r.id].count >= 0);
    if (hasData) animateValue('metricGitlabCommits', total);
    else if (hasError) el.textContent = '⚠️';
    else el.textContent = '—';
}

function openGitlabCommitsDetail() {
    const repos = state.gitlabRepos || [];
    const cache = state.gitlabCommitsCache || {};
    const container = document.getElementById('gitlabCommitsContent');
    if (!container) return;
    if (repos.length === 0) {
        container.innerHTML = '<div class="md-empty">Aucun repo GitLab configuré.</div>';
        openModal('modalGitlabCommits'); return;
    }
    let html = '';
    let totalCommits = 0;
    repos.forEach((repo, idx) => {
        const c = cache[repo.id];
        const commits = c ? c.commits || [] : [];
        const count = c ? c.count : -1;
        if (count >= 0) totalCommits += count;
        html += `<div class="gl-detail-repo"><div class="gl-detail-repo-header" style="background:${repoColorBg(idx)}"><span class="gl-detail-repo-name" style="color:${repoColor(idx)}">${esc(repo.name)}</span><span class="gl-detail-repo-branch">${esc(repo.branch || 'main')}</span><span class="gl-detail-repo-count">${count >= 0 ? count + ' commits' : (c && c.error ? '⚠️' : '…')}</span></div>`;
        if (commits.length > 0) {
            html += '<div class="gl-detail-mr-list">';
            commits.forEach(cm => {
                html += `<div class="gl-detail-mr"><span class="gl-mr-id">${esc(cm.id)}</span><a class="gl-mr-title" href="${esc(cm.url || '#')}" target="_blank" rel="noopener">${esc(cm.title)}</a><span class="gl-mr-meta">${esc(cm.author)} · ${timeAgoShort(cm.created)}</span></div>`;
            });
            html += '</div>';
        } else if (count === 0) {
            html += '<div class="gl-detail-empty-repo">Aucun commit ces 7 derniers jours</div>';
        }
        html += '</div>';
    });
    const summary = `<div class="gl-detail-summary">${totalCommits} commit${totalCommits !== 1 ? 's' : ''} (7j) sur ${repos.length} repo${repos.length !== 1 ? 's' : ''}</div>`;
    container.innerHTML = summary + html;
    openModal('modalGitlabCommits');
}

function timeAgoShort(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return mins + 'min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'j';
}
