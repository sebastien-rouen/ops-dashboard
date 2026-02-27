// ==================== GITHUB ====================
// ==================== GITHUB PULL REQUESTS ====================
function addGithubRepo() {
    const name = document.getElementById('ghRepoName').value.trim();
    const url = (document.getElementById('ghRepoUrl').value.trim().replace(/\/+$/, '')) || 'https://api.github.com';
    const ownerRepo = document.getElementById('ghRepoOwnerRepo').value.trim();
    const branch = document.getElementById('ghRepoBranch').value.trim() || 'main';
    const token = document.getElementById('ghRepoToken').value.trim();

    if (!name || !ownerRepo) { toast('⚠️ Nom et owner/repo requis'); return; }
    const parts = ownerRepo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) { toast('⚠️ Format owner/repo invalide (ex: org/myrepo)'); return; }

    if (!state.githubRepos) state.githubRepos = [];
    state.githubRepos.push({ id: uid(), name, url, owner: parts[0], repo: parts[1], branch, token });
    saveState();
    addLog('🐙', `Repo GitHub ajouté : ${name}`);

    ['ghRepoName', 'ghRepoUrl', 'ghRepoOwnerRepo', 'ghRepoBranch', 'ghRepoToken'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    renderApiEndpointList();
    fetchAllGithubPRs();
}

function removeGithubRepo(id) {
    if (!state.githubRepos) return;
    const repo = state.githubRepos.find(r => r.id === id);
    state.githubRepos = state.githubRepos.filter(r => r.id !== id);
    if (state.githubPRCache) delete state.githubPRCache[id];
    if (state.githubActionsCache) delete state.githubActionsCache[id];
    if (state.githubCommitsCache) delete state.githubCommitsCache[id];
    saveState();
    if (repo) addLog('🐙', `Repo GitHub supprimé : ${repo.name}`);
    renderApiEndpointList();
    renderGithubPRMetric(); renderGithubActionsMetric(); renderGithubCommitsMetric();
}

async function fetchGithubPRs(repoId) {
    const repo = (state.githubRepos || []).find(r => r.id === repoId);
    if (!repo) return;
    const baseUrl = repo.url || 'https://api.github.com';
    const apiUrl = `${baseUrl}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls?state=open&base=${encodeURIComponent(repo.branch)}&per_page=100`;
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (repo.token) headers['Authorization'] = `Bearer ${repo.token}`;
    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const prs = await resp.json();
        if (!state.githubPRCache) state.githubPRCache = {};
        state.githubPRCache[repoId] = {
            count: prs.length,
            fetchedAt: new Date().toISOString(),
            prs: prs.map(pr => ({
                number: pr.number, title: pr.title,
                author: pr.user ? pr.user.login : '?',
                url: pr.html_url, created: pr.created_at,
                labels: (pr.labels || []).map(l => l.name),
                draft: pr.draft || false
            }))
        };
        saveState(); renderGithubPRMetric(); renderApiEndpointList();
    } catch (e) {
        console.error(`GitHub PR error (${repo.name}):`, e);
        toast(`⚠️ Erreur GitHub (${repo.name}) : ${e.message}`);
        if (!state.githubPRCache) state.githubPRCache = {};
        state.githubPRCache[repoId] = { count: -1, fetchedAt: new Date().toISOString(), prs: [], error: e.message };
        saveState(); renderGithubPRMetric(); renderApiEndpointList();
    }
}

async function fetchAllGithubPRs() {
    const repos = state.githubRepos || [];
    if (repos.length === 0) { toast('ℹ️ Aucun repo GitHub configuré'); return; }
    toast('🐙 Rafraîchissement des PR GitHub…');
    await Promise.allSettled(repos.map(r => fetchGithubPRs(r.id)));
    toast('🐙 PR GitHub mises à jour');
    addLog('🐙', `PR GitHub rafraîchies (${repos.length} repos)`);
}

function renderGithubPRMetric() {
    const el = document.getElementById('metricGithubPR');
    if (!el) return;
    const repos = state.githubRepos || [];
    const cache = state.githubPRCache || {};
    const card = el.closest('.metric-card');
    if (repos.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; return; }
    if (card) card.classList.remove('no-source');
    let total = 0, hasError = false;
    repos.forEach(r => {
        const c = cache[r.id];
        if (c && c.count >= 0) total += c.count;
        else if (c && c.count === -1) hasError = true;
    });
    if (repos.some(r => cache[r.id] && cache[r.id].count >= 0)) animateValue('metricGithubPR', total);
    else if (hasError) el.textContent = '⚠️';
    else el.textContent = '—';
}

function openGithubPRDetail() {
    const repos = state.githubRepos || [];
    const cache = state.githubPRCache || {};
    const container = document.getElementById('githubPRDetailContent');
    if (!container) return;
    if (repos.length === 0) {
        container.innerHTML = '<div class="gl-detail-empty"><p>Aucun repo GitHub configuré.</p><button class="btn btn-small btn-primary" onclick="closeModal(\'modalGithubPR\');openApiConfig()">⚙️ Configurer</button></div>';
        openModal('modalGithubPR'); return;
    }
    let html = '', totalPRs = 0;
    repos.forEach((repo, idx) => {
        const cached = cache[repo.id];
        const prs = cached ? cached.prs || [] : [];
        const count = cached ? cached.count : -1;
        const error = cached ? cached.error : null;
        if (count >= 0) totalPRs += count;
        html += `<div class="gl-detail-repo"><div class="gl-detail-repo-header" style="background:${repoColorBg(idx)}"><span class="gl-detail-repo-name" style="color:${repoColor(idx)}">${esc(repo.name)}</span><span class="gl-detail-repo-branch">${esc(repo.branch || 'main')}</span><span class="gl-detail-repo-count${count === -1 ? ' gl-error' : ''}">${count >= 0 ? count + ' PR' : (error ? '⚠️ ' + esc(error) : '…')}</span></div>`;
        if (prs.length > 0) {
            html += '<div class="gl-detail-mr-list">';
            prs.forEach(pr => {
                const age = timeAgoShort(pr.created);
                const labels = (pr.labels || []).slice(0, 3).map(l => `<span class="gl-mr-label">${esc(l)}</span>`).join('');
                html += `<div class="gl-detail-mr${pr.draft ? ' gl-mr-draft' : ''}"><span class="gl-mr-id">#${pr.number}</span><a class="gl-mr-title" href="${esc(pr.url)}" target="_blank" rel="noopener">${pr.draft ? '<span class="gl-draft-badge">Draft</span> ' : ''}${esc(pr.title)}</a><span class="gl-mr-meta">${esc(pr.author)} · ${age}</span>${labels}</div>`;
            });
            html += '</div>';
        } else if (count === 0) html += '<div class="gl-detail-empty-repo">Aucune PR ouverte</div>';
        html += '</div>';
    });
    container.innerHTML = `<div class="gl-detail-summary">${totalPRs} PR ouverte${totalPRs !== 1 ? 's' : ''} sur ${repos.length} repo${repos.length !== 1 ? 's' : ''}</div>` + html;
    openModal('modalGithubPR');
}

// ==================== GITHUB ACTIONS ====================
async function fetchGithubActions(repoId) {
    const repo = (state.githubRepos || []).find(r => r.id === repoId);
    if (!repo) return;
    const baseUrl = repo.url || 'https://api.github.com';
    const apiUrl = `${baseUrl}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/actions/runs?branch=${encodeURIComponent(repo.branch)}&per_page=20`;
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (repo.token) headers['Authorization'] = `Bearer ${repo.token}`;
    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const runs = data.workflow_runs || [];
        if (!state.githubActionsCache) state.githubActionsCache = {};
        const success = runs.filter(r => r.conclusion === 'success').length;
        const failed = runs.filter(r => r.conclusion === 'failure').length;
        const running = runs.filter(r => r.status === 'in_progress').length;
        const other = runs.length - success - failed - running;
        state.githubActionsCache[repoId] = {
            total: runs.length, success, failed, running, other,
            fetchedAt: new Date().toISOString(),
            runs: runs.slice(0, 20).map(r => ({
                id: r.id, name: r.name, status: r.status, conclusion: r.conclusion,
                url: r.html_url, created: r.created_at, updated: r.updated_at
            }))
        };
        saveState(); renderGithubActionsMetric();
    } catch (e) {
        console.error(`GitHub Actions error (${repo.name}):`, e);
        if (!state.githubActionsCache) state.githubActionsCache = {};
        state.githubActionsCache[repoId] = { total: -1, fetchedAt: new Date().toISOString(), error: e.message, runs: [] };
        saveState(); renderGithubActionsMetric();
    }
}

async function fetchAllGithubActions() {
    const repos = state.githubRepos || [];
    if (repos.length === 0) { toast('ℹ️ Aucun repo GitHub configuré'); return; }
    toast('🐙 Rafraîchissement des Actions…');
    await Promise.allSettled(repos.map(r => fetchGithubActions(r.id)));
    toast('🐙 Actions mises à jour');
    addLog('🐙', `Actions GitHub rafraîchies (${repos.length} repos)`);
}

function renderGithubActionsMetric() {
    const el = document.getElementById('metricGithubActions');
    const sumEl = document.getElementById('metricGithubActionsSummary');
    if (!el) return;
    const repos = state.githubRepos || [];
    const cache = state.githubActionsCache || {};
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
        animateValue('metricGithubActions', total);
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

function openGithubActionsDetail() {
    const repos = state.githubRepos || [];
    const cache = state.githubActionsCache || {};
    const container = document.getElementById('githubActionsContent');
    if (!container) return;
    if (repos.length === 0) {
        container.innerHTML = '<div class="md-empty">Aucun repo GitHub configuré.</div>';
        openModal('modalGithubActions'); return;
    }
    let html = '<div class="md-col3"><div class="md-col3-col"><div class="md-col3-head" style="color:var(--green)">✅ Success</div>';
    let colFailed = '<div class="md-col3-col"><div class="md-col3-head" style="color:var(--red)">❌ Failed</div>';
    let colOther = '<div class="md-col3-col"><div class="md-col3-head" style="color:var(--accent)">🔄 Running / Autres</div>';
    repos.forEach(repo => {
        const c = cache[repo.id];
        const runs = c ? c.runs || [] : [];
        runs.forEach(r => {
            const item = `<div class="md-col3-item"><a href="${esc(r.url || '#')}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(r.name || '#' + r.id)}</a> <span class="md-col3-meta">${esc(repo.name)} · ${timeAgoShort(r.created)}</span></div>`;
            if (r.conclusion === 'success') html += item;
            else if (r.conclusion === 'failure') colFailed += item;
            else colOther += item;
        });
    });
    html += '</div>' + colFailed + '</div>' + colOther + '</div></div>';
    let total = 0, success = 0, failed = 0, running = 0;
    repos.forEach(r => { const c = cache[r.id]; if (c && c.total >= 0) { total += c.total; success += c.success; failed += c.failed; running += c.running; } });
    const summary = `<div class="md-summary"><div class="md-summary-item"><strong>${total}</strong> workflow runs</div><div class="md-summary-item" style="color:var(--green)"><strong>${success}</strong> success</div><div class="md-summary-item" style="color:var(--red)"><strong>${failed}</strong> failed</div><div class="md-summary-item" style="color:var(--accent)"><strong>${running}</strong> running</div></div>`;
    container.innerHTML = summary + html;
    openModal('modalGithubActions');
}

// ==================== GITHUB COMMITS ====================
async function fetchGithubCommits(repoId) {
    const repo = (state.githubRepos || []).find(r => r.id === repoId);
    if (!repo) return;
    const baseUrl = repo.url || 'https://api.github.com';
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const apiUrl = `${baseUrl}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/commits?sha=${encodeURIComponent(repo.branch)}&since=${since}&per_page=100`;
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (repo.token) headers['Authorization'] = `Bearer ${repo.token}`;
    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const commits = await resp.json();
        if (!state.githubCommitsCache) state.githubCommitsCache = {};
        state.githubCommitsCache[repoId] = {
            count: commits.length,
            fetchedAt: new Date().toISOString(),
            commits: commits.slice(0, 30).map(c => ({
                sha: c.sha ? c.sha.substring(0, 7) : '?',
                title: c.commit ? c.commit.message.split('\n')[0] : '?',
                author: c.commit && c.commit.author ? c.commit.author.name : '?',
                url: c.html_url,
                created: c.commit && c.commit.author ? c.commit.author.date : ''
            }))
        };
        saveState(); renderGithubCommitsMetric();
    } catch (e) {
        console.error(`GitHub commits error (${repo.name}):`, e);
        if (!state.githubCommitsCache) state.githubCommitsCache = {};
        state.githubCommitsCache[repoId] = { count: -1, fetchedAt: new Date().toISOString(), error: e.message, commits: [] };
        saveState(); renderGithubCommitsMetric();
    }
}

async function fetchAllGithubCommits() {
    const repos = state.githubRepos || [];
    if (repos.length === 0) { toast('ℹ️ Aucun repo GitHub configuré'); return; }
    toast('🐙 Rafraîchissement des commits GitHub…');
    await Promise.allSettled(repos.map(r => fetchGithubCommits(r.id)));
    toast('🐙 Commits GitHub mis à jour');
    addLog('🐙', `Commits GitHub rafraîchis (${repos.length} repos)`);
}

function renderGithubCommitsMetric() {
    const el = document.getElementById('metricGithubCommits');
    if (!el) return;
    const repos = state.githubRepos || [];
    const cache = state.githubCommitsCache || {};
    const card = el.closest('.metric-card');
    if (repos.length === 0) { if (card) card.classList.add('no-source'); el.textContent = '—'; return; }
    if (card) card.classList.remove('no-source');
    let total = 0, hasError = false;
    repos.forEach(r => {
        const c = cache[r.id];
        if (c && c.count >= 0) total += c.count;
        else if (c && c.count === -1) hasError = true;
    });
    if (repos.some(r => cache[r.id] && cache[r.id].count >= 0)) animateValue('metricGithubCommits', total);
    else if (hasError) el.textContent = '⚠️';
    else el.textContent = '—';
}

function openGithubCommitsDetail() {
    const repos = state.githubRepos || [];
    const cache = state.githubCommitsCache || {};
    const container = document.getElementById('githubCommitsContent');
    if (!container) return;
    if (repos.length === 0) {
        container.innerHTML = '<div class="md-empty">Aucun repo GitHub configuré.</div>';
        openModal('modalGithubCommits'); return;
    }
    let html = '', totalCommits = 0;
    repos.forEach((repo, idx) => {
        const c = cache[repo.id];
        const commits = c ? c.commits || [] : [];
        const count = c ? c.count : -1;
        if (count >= 0) totalCommits += count;
        html += `<div class="gl-detail-repo"><div class="gl-detail-repo-header" style="background:${repoColorBg(idx)}"><span class="gl-detail-repo-name" style="color:${repoColor(idx)}">${esc(repo.name)}</span><span class="gl-detail-repo-branch">${esc(repo.branch || 'main')}</span><span class="gl-detail-repo-count">${count >= 0 ? count + ' commits' : (c && c.error ? '⚠️' : '…')}</span></div>`;
        if (commits.length > 0) {
            html += '<div class="gl-detail-mr-list">';
            commits.forEach(cm => {
                html += `<div class="gl-detail-mr"><span class="gl-mr-id">${esc(cm.sha)}</span><a class="gl-mr-title" href="${esc(cm.url || '#')}" target="_blank" rel="noopener">${esc(cm.title)}</a><span class="gl-mr-meta">${esc(cm.author)} · ${timeAgoShort(cm.created)}</span></div>`;
            });
            html += '</div>';
        } else if (count === 0) html += '<div class="gl-detail-empty-repo">Aucun commit ces 7 derniers jours</div>';
        html += '</div>';
    });
    container.innerHTML = `<div class="gl-detail-summary">${totalCommits} commit${totalCommits !== 1 ? 's' : ''} (7j) sur ${repos.length} repo${repos.length !== 1 ? 's' : ''}</div>` + html;
    openModal('modalGithubCommits');
}

// Backward compat
function openGithubConfig() { openApiConfig(); }
