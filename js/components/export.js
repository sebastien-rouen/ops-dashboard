// ==================== EXPORT ====================

// ==================== CHANNELS ====================
function renderChannels() {
    const container = document.getElementById('channelsList');
    if (!container) return;

    const channels = state.channels || DEFAULT_STATE.channels;
    let html = '';

    const channelConfig = [
        { type: 'slack', icon: '💬', label: 'Slack', data: channels.slack },
        { type: 'email', icon: '📧', label: 'Email', data: channels.email },
        { type: 'teams', icon: '👥', label: 'Teams', data: channels.teams },
        { type: 'mattermost', icon: '💬', label: 'Mattermost', data: channels.mattermost },
        { type: 'discord', icon: '🎮', label: 'Discord', data: channels.discord },
        { type: 'other', icon: '🔗', label: 'Autre', data: channels.other }
    ];

    channelConfig.forEach(({ type, icon, label, data }) => {
        if (data && data.trim()) {
            const items = data.split(',').map(s => s.trim()).filter(Boolean);
            if (items.length > 0) {
                html += `
                    <div class="channel-group">
                        <span class="channel-type">${label}</span>
                        ${items.map(item => `
                            <span class="channel-badge ${type}">
                                <span class="badge-icon">${icon}</span>
                                ${esc(item)}
                            </span>
                        `).join('')}
                    </div>
                `;
            }
        }
    });

    if (html === '') {
        html = '<div class="channel-group"><span class="channel-type">Aucun canal configuré</span><button class="btn btn-small btn-secondary" onclick="editChannels()">Configurer</button></div>';
    }

    container.innerHTML = html;
}

function editChannels() {
    const channels = state.channels || DEFAULT_STATE.channels;
    document.getElementById('channelSlack').value = channels.slack || '';
    document.getElementById('channelEmail').value = channels.email || '';
    document.getElementById('channelTeams').value = channels.teams || '';
    document.getElementById('channelMattermost').value = channels.mattermost || '';
    document.getElementById('channelDiscord').value = channels.discord || '';
    document.getElementById('channelOther').value = channels.other || '';
    closeModal('modalExport');
    openModal('modalChannels');
}

function saveChannels() {
    state.channels = {
        slack: document.getElementById('channelSlack').value.trim(),
        email: document.getElementById('channelEmail').value.trim(),
        teams: document.getElementById('channelTeams').value.trim(),
        mattermost: document.getElementById('channelMattermost').value.trim(),
        discord: document.getElementById('channelDiscord').value.trim(),
        other: document.getElementById('channelOther').value.trim()
    };
    saveState();
    closeModal('modalChannels');
    openModal('modalExport');
    renderChannels();
    syncSidebarChannels();
    // Refresh export content with updated channels
    generateExport(currentExportFormat);
    toast('✅ Canaux enregistrés et rapport mis à jour');
}

// ==================== EXPORT ====================
let currentExportFormat = 'markdown';

function openExportModal() {
    currentExportFormat = 'markdown';
    document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.export-tab').classList.add('active');
    generateExport('markdown');
    renderChannels();
    openModal('modalExport');
}

function switchExportTab(format, btn) {
    currentExportFormat = format;
    document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    generateExport(format);
}

function generateExport(format) {
    const textarea = document.getElementById('exportContent');
    const preview = document.getElementById('exportPreview');
    if (format === 'preview') {
        textarea.style.display = 'none';
        preview.style.display = 'block';
        preview.innerHTML = mdToHtml(generateMarkdown());
    } else {
        textarea.style.display = '';
        preview.style.display = 'none';
        textarea.value = format === 'markdown' ? generateMarkdown() : format === 'mattermost' ? generateMattermost() : generateSlack();
    }
}

function mdToHtml(md) {
    let h = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Tables — convert full blocks before anything else
    h = h.replace(/^(\|.+\|)\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, body) => {
        const ths = header.split('|').filter(c => c.trim());
        const rows = body.trim().split('\n');
        let t = '<table><thead><tr>' + ths.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach(r => {
            const tds = r.replace(/^\||\|$/g, '').split('|');
            t += '<tr>' + tds.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        });
        return t + '</tbody></table>';
    });

    // Block elements
    h = h.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    h = h.replace(/^---$/gm, '<hr>');

    // Inline
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/_(.+?)_/g, '<em>$1</em>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists
    h = h.replace(/^- \[x\] (.+)$/gm, '<li class="ep-done">☑ $1</li>');
    h = h.replace(/^- \[~\] (.+)$/gm, '<li class="ep-wip">◐ $1</li>');
    h = h.replace(/^- \[ \] (.+)$/gm, '<li class="ep-todo">☐ $1</li>');
    h = h.replace(/^- (.+)$/gm, '<li>$1</li>');

    // Strip blank lines around block elements to avoid spurious <br>/<p>
    h = h.replace(/\n{2,}(?=<(table|h[2-4]|blockquote|hr|li))/g, '\n');
    h = h.replace(/(<\/(table|h[2-4]|blockquote|hr)>)\n{2,}/g, '$1\n');

    // Paragraphs
    h = h.replace(/\n\n+/g, '</p><p>');
    h = h.replace(/\n/g, '<br>');
    h = '<p>' + h + '</p>';

    // Cleanup
    h = h.replace(/<p>\s*<\/p>/g, '');
    h = h.replace(/<p>(<(?:table|h[2-4]|blockquote|hr|ul))/g, '$1');
    h = h.replace(/(<\/(?:table|h[2-4]|blockquote|hr|ul)>)<\/p>/g, '$1');
    h = h.replace(/<br>(<(?:table|h[2-4]|blockquote|hr|li))/g, '$1');
    h = h.replace(/(<\/(?:table|h[2-4]|blockquote|hr|li)>)<br>/g, '$1');

    return h;
}

function generateMarkdown() {
    const now = new Date().toLocaleString('fr-FR');
    let md = `# ⚡ OPS Report — ${now}\n\n`;

    // Global status
    const activeImpacts = state.impacts.filter(i => i.active);
    const downCount = state.infra.filter(i => i.status === 'down').length;
    const degradedCount = state.infra.filter(i => i.status === 'degraded').length;
    const upCount = state.infra.filter(i => i.status === 'up').length;

    if (activeImpacts.length > 0 || downCount > 0) {
        md += `> 🔴 **STATUT: DÉGRADÉ** — ${activeImpacts.length} impact(s) actif(s), ${downCount} machine(s) DOWN\n\n`;
    } else {
        md += `> ✅ **STATUT: NOMINAL**\n\n`;
    }

    // Impacts
    if (activeImpacts.length > 0) {
        md += `## 🔴 Impacts actifs\n\n`;
        activeImpacts.forEach(i => {
            const sev = i.severity === 'critical' ? '🔴 CRITICAL' : i.severity === 'major' ? '🔶 MAJOR' : '⚠️ WARNING';
            const origin = i.origin === 'external' ? '🌐 Externe' : '🏠 Interne';
            md += `### ${sev} — ${i.title}\n`;
            md += `- **Origine:** ${origin}\n`;
            md += `- **Depuis:** ${timeAgo(i.time)}\n`;
            if (i.desc) md += `- **Détails:** ${i.desc}\n`;
            md += `\n`;
        });
    }

    // Infrastructure summary
    md += `## 🖥️ Infrastructure (${state.infra.length} éléments)\n\n`;
    md += `| Statut | Nombre |\n|--------|--------|\n`;
    md += `| 🟢 Up | ${upCount} |\n`;
    md += `| 🟡 Dégradé | ${degradedCount} |\n`;
    md += `| 🔴 Down | ${downCount} |\n\n`;

    if (state.infra.length > 0) {
        md += `| Nom | Type | Statut | IP | Détails |\n`;
        md += `|-----|------|--------|----|---------|\n`;
        state.infra.forEach(i => {
            const statusIcon = i.status === 'up' ? '🟢' : i.status === 'degraded' ? '🟡' : '🔴';
            md += `| ${i.name} | ${i.type.toUpperCase()} | ${statusIcon} ${i.status} | ${i.ip || '-'} | ${i.details || '-'} |\n`;
        });
        md += `\n`;
    }

    // Kanban
    const todo = state.tasks.filter(t => t.status === 'todo');
    const wip = state.tasks.filter(t => t.status === 'wip');
    const done = state.tasks.filter(t => t.status === 'done');

    md += `## 📋 Kanban\n\n`;
    md += `- **À faire:** ${todo.length} | **En cours:** ${wip.length} | **Terminé:** ${done.length}\n\n`;

    if (todo.length > 0) {
        md += `### 📌 À faire\n`;
        todo.forEach(t => {
            md += `- [ ] **${t.title}**${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}${t.desc ? ` — ${t.desc}` : ''}\n`;
        });
        md += `\n`;
    }

    if (wip.length > 0) {
        md += `### 🔧 En cours\n`;
        wip.forEach(t => {
            md += `- [~] **${t.title}**${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}${t.desc ? ` — ${t.desc}` : ''}\n`;
        });
        md += `\n`;
    }

    if (done.length > 0) {
        md += `### ✅ Terminé\n`;
        done.forEach(t => {
            md += `- [x] **${t.title}**${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}\n`;
        });
        md += `\n`;
    }

    md += `---\n*Généré par OPS Command Center — ${now}*\n`;

    // Add communication channels reminder
    const channels = state.channels || DEFAULT_STATE.channels;
    const hasChannels = Object.values(channels).some(v => v && v.trim());
    if (hasChannels) {
        md += `\n### 📢 Canaux de diffusion suggérés\n\n`;
        if (channels.slack && channels.slack.trim()) md += `- **Slack:** ${channels.slack}\n`;
        if (channels.email && channels.email.trim()) md += `- **Email:** ${channels.email}\n`;
        if (channels.teams && channels.teams.trim()) md += `- **Teams:** ${channels.teams}\n`;
        if (channels.mattermost && channels.mattermost.trim()) md += `- **Mattermost:** ${channels.mattermost}\n`;
        if (channels.discord && channels.discord.trim()) md += `- **Discord:** ${channels.discord}\n`;
        if (channels.other && channels.other.trim()) md += `- **Autre:** ${channels.other}\n`;
    }

    return md;
}

function generateSlack() {
    const now = new Date().toLocaleString('fr-FR');
    let s = `⚡ *OPS Report — ${now}*\n\n`;

    const activeImpacts = state.impacts.filter(i => i.active);
    const downCount = state.infra.filter(i => i.status === 'down').length;
    const degradedCount = state.infra.filter(i => i.status === 'degraded').length;
    const upCount = state.infra.filter(i => i.status === 'up').length;

    if (activeImpacts.length > 0 || downCount > 0) {
        s += `> :red_circle: *STATUT: DÉGRADÉ* — ${activeImpacts.length} impact(s), ${downCount} machine(s) DOWN\n\n`;
    } else {
        s += `> :white_check_mark: *STATUT: NOMINAL*\n\n`;
    }

    // Impacts
    if (activeImpacts.length > 0) {
        s += `:rotating_light: *Impacts actifs*\n`;
        activeImpacts.forEach(i => {
            const sev = i.severity === 'critical' ? ':red_circle:' : i.severity === 'major' ? ':large_orange_circle:' : ':warning:';
            s += `${sev} *${i.title}*\n`;
            s += `    _${i.origin === 'external' ? 'Externe' : 'Interne'} · Depuis ${timeAgo(i.time)}_\n`;
            if (i.desc) s += `    ${i.desc}\n`;
            s += `\n`;
        });
    }

    // Infra
    s += `:desktop_computer: *Infrastructure* (${state.infra.length})\n`;
    s += `    :green_circle: Up: *${upCount}*  |  :yellow_circle: Dégradé: *${degradedCount}*  |  :red_circle: Down: *${downCount}*\n\n`;

    const problems = state.infra.filter(i => i.status !== 'up');
    if (problems.length > 0) {
        s += `_Machines en anomalie:_\n`;
        problems.forEach(i => {
            const icon = i.status === 'down' ? ':red_circle:' : ':yellow_circle:';
            s += `${icon} \`${i.name}\` (${i.type.toUpperCase()}) — ${i.ip || 'N/A'} — ${i.details || ''}\n`;
        });
        s += `\n`;
    }

    // Kanban
    const todo = state.tasks.filter(t => t.status === 'todo');
    const wip = state.tasks.filter(t => t.status === 'wip');
    const done = state.tasks.filter(t => t.status === 'done');

    s += `:clipboard: *Kanban* — À faire: *${todo.length}* | En cours: *${wip.length}* | Terminé: *${done.length}*\n\n`;

    if (wip.length > 0) {
        s += `:wrench: *En cours*\n`;
        wip.forEach(t => {
            s += `• *${t.title}*${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}\n`;
        });
        s += `\n`;
    }

    if (todo.length > 0) {
        s += `:pushpin: *À faire*\n`;
        todo.forEach(t => {
            const pri = t.priority === 'critical' ? ':black_circle:' : t.priority === 'high' ? ':red_circle:' : t.priority === 'medium' ? ':yellow_circle:' : ':green_circle:';
            s += `${pri} ${t.title}${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}\n`;
        });
        s += `\n`;
    }

    s += `---\n_OPS Command Center · ${now}_`;

    // Add communication channels reminder
    const channels = state.channels || DEFAULT_STATE.channels;
    const hasChannels = Object.values(channels).some(v => v && v.trim());
    if (hasChannels) {
        s += `\n\n:mega: *Canaux de diffusion suggérés*\n`;
        if (channels.slack && channels.slack.trim()) s += `:slack: Slack: ${channels.slack}\n`;
        if (channels.email && channels.email.trim()) s += `:email: Email: ${channels.email}\n`;
        if (channels.teams && channels.teams.trim()) s += `:busts_in_silhouette: Teams: ${channels.teams}\n`;
        if (channels.mattermost && channels.mattermost.trim()) s += `:speech_balloon: Mattermost: ${channels.mattermost}\n`;
        if (channels.discord && channels.discord.trim()) s += `:video_game: Discord: ${channels.discord}\n`;
        if (channels.other && channels.other.trim()) s += `:link: Autre: ${channels.other}\n`;
    }

    return s;
}

function generateMattermost() {
    const now = new Date().toLocaleString('fr-FR');
    let m = `#### ⚡ OPS Report — ${now}\n\n`;

    const activeImpacts = state.impacts.filter(i => i.active);
    const downCount = state.infra.filter(i => i.status === 'down').length;
    const degradedCount = state.infra.filter(i => i.status === 'degraded').length;
    const upCount = state.infra.filter(i => i.status === 'up').length;

    if (activeImpacts.length > 0 || downCount > 0) {
        m += `> 🔴 **STATUT: DÉGRADÉ** — ${activeImpacts.length} impact(s), ${downCount} machine(s) DOWN\n\n`;
    } else {
        m += `> ✅ **STATUT: NOMINAL**\n\n`;
    }

    // Impacts
    if (activeImpacts.length > 0) {
        m += `##### 🚨 Impacts actifs\n`;
        activeImpacts.forEach(i => {
            const sev = i.severity === 'critical' ? '🔴 CRITICAL' : i.severity === 'major' ? '🟠 MAJOR' : '⚠️ WARNING';
            m += `${sev} **${i.title}**\n`;
            m += `  _${i.origin === 'external' ? 'Externe' : 'Interne'} · Depuis ${timeAgo(i.time)}_\n`;
            if (i.desc) m += `  ${i.desc}\n`;
            m += `\n`;
        });
    }

    // Infra
    m += `##### 🖥️ Infrastructure (${state.infra.length})\n`;
    m += `| Statut | Nombre |\n|:--|:--|\n`;
    m += `| 🟢 Up | ${upCount} |\n`;
    m += `| 🟡 Dégradé | ${degradedCount} |\n`;
    m += `| 🔴 Down | ${downCount} |\n\n`;

    const problems = state.infra.filter(i => i.status !== 'up');
    if (problems.length > 0) {
        m += `_Machines en anomalie:_\n`;
        problems.forEach(i => {
            const icon = i.status === 'down' ? '🔴' : '🟡';
            m += `${icon} \`${i.name}\` (${i.type.toUpperCase()}) — ${i.ip || 'N/A'} — ${i.details || ''}\n`;
        });
        m += `\n`;
    }

    // Kanban
    const todo = state.tasks.filter(t => t.status === 'todo');
    const wip = state.tasks.filter(t => t.status === 'wip');
    const done = state.tasks.filter(t => t.status === 'done');

    m += `##### 📋 Kanban — À faire: **${todo.length}** | En cours: **${wip.length}** | Terminé: **${done.length}**\n\n`;

    if (wip.length > 0) {
        m += `**🔧 En cours**\n`;
        wip.forEach(t => {
            m += `- **${t.title}**${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}\n`;
        });
        m += `\n`;
    }

    if (todo.length > 0) {
        m += `**📌 À faire**\n`;
        todo.forEach(t => {
            const pri = t.priority === 'critical' ? '⚫' : t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
            m += `${pri} ${t.title}${t.tags.length ? ` \`${t.tags.join('` `')}\`` : ''}\n`;
        });
        m += `\n`;
    }

    m += `---\n_OPS Command Center · ${now}_`;

    // Channels
    const channels = state.channels || DEFAULT_STATE.channels;
    const hasChannels = Object.values(channels).some(v => v && v.trim());
    if (hasChannels) {
        m += `\n\n##### 📢 Canaux de diffusion suggérés\n`;
        if (channels.slack && channels.slack.trim()) m += `- 💬 **Slack:** ${channels.slack}\n`;
        if (channels.email && channels.email.trim()) m += `- 📧 **Email:** ${channels.email}\n`;
        if (channels.teams && channels.teams.trim()) m += `- 👥 **Teams:** ${channels.teams}\n`;
        if (channels.mattermost && channels.mattermost.trim()) m += `- 💬 **Mattermost:** ${channels.mattermost}\n`;
        if (channels.discord && channels.discord.trim()) m += `- 🎮 **Discord:** ${channels.discord}\n`;
        if (channels.other && channels.other.trim()) m += `- 🔗 **Autre:** ${channels.other}\n`;
    }

    return m;
}

function copyExport() {
    const textarea = document.getElementById('exportContent');
    const copyBtn = document.querySelector('.btn-copy-export');

    const text = currentExportFormat === 'preview' ? generateMarkdown() : textarea.value;
    if (currentExportFormat !== 'preview') textarea.select();
    navigator.clipboard.writeText(text).then(() => {
        toast('📋 Copié dans le presse-papier');

        // Visual feedback on button
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            copyBtn.style.background = 'var(--green)';
            copyBtn.style.borderColor = 'var(--green)';
            copyBtn.style.color = '#fff';

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
                copyBtn.style.borderColor = '';
                copyBtn.style.color = '';
            }, 2000);
        }
    }).catch(() => {
        document.execCommand('copy');
        toast('📋 Copié');

        // Visual feedback on button
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            copyBtn.style.background = 'var(--green)';
            copyBtn.style.borderColor = 'var(--green)';
            copyBtn.style.color = '#fff';

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
                copyBtn.style.borderColor = '';
                copyBtn.style.color = '';
            }, 2000);
        }
    });
}
