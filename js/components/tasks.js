// ==================== TASKS ====================

// ==================== TASKS ====================
function openTaskModal() {
    document.getElementById('taskEditId').value = '';
    document.getElementById('taskModalTitle').textContent = '📋 Nouvelle tâche';
    document.getElementById('taskSaveBtn').textContent = 'Ajouter';
    document.getElementById('taskStatusLabel').textContent = 'Statut initial';
    document.getElementById('taskStatus').value = 'todo';
    document.getElementById('taskPriority').value = 'medium';
    clearForm('taskTitle', 'taskDesc', 'taskAssignee', 'taskTags');
    setSelectedEnvs([]);
    openModal('modalTask');
}

function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('taskEditId').value = id;
    document.getElementById('taskModalTitle').textContent = '✏️ Modifier la tâche';
    document.getElementById('taskSaveBtn').textContent = 'Enregistrer';
    document.getElementById('taskStatusLabel').textContent = 'Statut';
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDesc').value = task.desc || '';
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskTags').value = (task.tags || []).join(', ');
    document.getElementById('taskPriority').value = task.priority || 'medium';
    document.getElementById('taskStatus').value = task.status || 'todo';
    setSelectedEnvs(task.envs || []);
    openModal('modalTask');
}

function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return toast('⚠️ Titre requis');

    const editId = document.getElementById('taskEditId').value;
    const desc = document.getElementById('taskDesc').value.trim();
    const assignee = document.getElementById('taskAssignee').value.trim();
    const tags = parseTags(document.getElementById('taskTags').value);
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;
    const envs = getSelectedEnvs();

    if (editId) {
        // --- Edit mode ---
        const task = state.tasks.find(t => t.id === editId);
        if (!task) return;
        const oldStatus = task.status;
        task.title = title;
        task.desc = desc;
        task.assignee = assignee;
        task.tags = tags;
        task.priority = priority;
        task.status = status;
        task.envs = envs;
        if (status === 'done' && oldStatus !== 'done') bumpChartCompleted();
        addLog('✏️', `Tâche modifiée: ${title}`);
        toast('✏️ Tâche modifiée');
    } else {
        // --- Create mode ---
        state.tasks.push({
            id: uid(), title, desc, assignee, tags, priority, status, envs,
            created: new Date().toISOString()
        });
        bumpChartCreated();
        addLog('📋', `Tâche créée: ${title}`);
        toast('📋 Tâche ajoutée');
    }

    saveState();
    renderTasks();
    renderMetrics();
    updateActivityChart();
    updatePriorityChart();
    closeModal('modalTask');
    clearForm('taskTitle', 'taskDesc', 'taskAssignee', 'taskTags');
    document.getElementById('taskEditId').value = '';
}

function moveTask(id, newStatus) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const oldStatus = task.status;
    task.status = newStatus;

    if (newStatus === 'done' && oldStatus !== 'done') {
        bumpChartCompleted();
    }

    addLog('➡️', `${task.title} → ${statusLabel(newStatus)}`);
    saveState();
    renderTasks();
    renderMetrics();
    updateActivityChart();
    toast(`➡️ ${statusLabel(newStatus)}`);
}

function deleteTask(id) {
    const task = state.tasks.find(t => t.id === id);
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (task) addLog('🗑️', `Tâche supprimée: ${task.title}`);
    saveState();
    renderTasks();
    renderMetrics();
    updatePriorityChart();
    toast('🗑️ Tâche supprimée');
}

function getKnownAssignees() {
    const names = state.tasks.map(t => t.assignee).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

function showAssigneeSuggestions(input) {
    const list = document.getElementById('assigneeSuggestions');
    const val = input.value.trim().toLowerCase();
    if (!val) { list.innerHTML = ''; list.style.display = 'none'; return; }

    const matches = getKnownAssignees().filter(n => n.toLowerCase().includes(val));
    if (matches.length === 0 || (matches.length === 1 && matches[0].toLowerCase() === val)) {
        list.innerHTML = '';
        list.style.display = 'none';
        return;
    }

    list.style.display = '';
    list.innerHTML = matches.map(n =>
        `<div class="autocomplete-item" onmousedown="pickAssignee('${esc(n)}')">${esc(n)}</div>`
    ).join('');
}

function pickAssignee(name) {
    document.getElementById('taskAssignee').value = name;
    const list = document.getElementById('assigneeSuggestions');
    list.innerHTML = '';
    list.style.display = 'none';
}

// --- Env chips ---
function toggleEnvChip(btn) {
    btn.classList.toggle('active');
}

function getSelectedEnvs() {
    return [...document.querySelectorAll('#taskEnvChips .env-chip.active')].map(b => b.dataset.env);
}

function setSelectedEnvs(envs) {
    document.querySelectorAll('#taskEnvChips .env-chip').forEach(b => {
        b.classList.toggle('active', (envs || []).includes(b.dataset.env));
    });
}

// --- Tags autocomplete ---
function getKnownTags() {
    const all = state.tasks.flatMap(t => t.tags || []);
    return [...new Set(all)].sort((a, b) => a.localeCompare(b));
}

function showTagSuggestions(input) {
    const list = document.getElementById('tagSuggestions');
    const raw = input.value;
    const parts = raw.split(',');
    const current = parts[parts.length - 1].trim().toLowerCase();
    if (!current) { list.innerHTML = ''; list.style.display = 'none'; return; }

    const existing = parts.slice(0, -1).map(p => p.trim().toLowerCase());
    const matches = getKnownTags().filter(t => t.toLowerCase().includes(current) && !existing.includes(t.toLowerCase()));
    if (matches.length === 0 || (matches.length === 1 && matches[0].toLowerCase() === current)) {
        list.innerHTML = '';
        list.style.display = 'none';
        return;
    }

    list.style.display = '';
    list.innerHTML = matches.slice(0, 8).map(t =>
        `<div class="autocomplete-item" onmousedown="pickTag('${esc(t)}')">${esc(t)}</div>`
    ).join('');
}

function pickTag(tag) {
    const input = document.getElementById('taskTags');
    const parts = input.value.split(',').map(p => p.trim()).filter(Boolean);
    parts[parts.length - 1] = tag;
    input.value = parts.join(', ') + ', ';
    input.focus();
    const list = document.getElementById('tagSuggestions');
    list.innerHTML = '';
    list.style.display = 'none';
}

let kanbanViewMode = localStorage.getItem('kanbanViewMode') || 'status';

function toggleKanbanView() {
    kanbanViewMode = kanbanViewMode === 'status' ? 'env' : 'status';
    localStorage.setItem('kanbanViewMode', kanbanViewMode);
    renderTasks();
}

function filterTasks(allTasks) {
    const filters = getActiveFilters();
    let tasks = [...allTasks];
    if (filters.status && ['todo', 'wip', 'done'].includes(filters.status)) {
        tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.env) {
        tasks = tasks.filter(t => (t.envs || []).includes(filters.env));
    }
    if (filters.search) {
        tasks = tasks.filter(t => {
            const searchable = [t.title, t.desc, t.priority, t.assignee || '', ...(t.tags || [])].join(' ').toLowerCase();
            return searchable.includes(filters.search);
        });
    }
    if (filters.tags) {
        const terms = filters.tags.split(',').map(t => t.trim()).filter(Boolean);
        tasks = tasks.filter(t => {
            const taskTags = (t.tags || []).map(tag => tag.toLowerCase());
            const text = [t.title, t.desc].join(' ').toLowerCase();
            return terms.some(term => taskTags.some(tag => tag.includes(term)) || text.includes(term));
        });
    }
    tasks.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
    return tasks;
}

function renderTaskCard(t) {
    const priLabel = { critical: '⚫ CRIT', high: '🔴 HIGH', medium: '🟡 MED', low: '🟢 LOW' };
    const hasFooter = t.assignee || (t.tags && t.tags.length);
    const showEnvs = kanbanViewMode === 'status' && t.envs && t.envs.length;
    return `
    <div class="task-card priority-${t.priority}">
        <div class="task-toolbar">
            <button class="task-edit" onclick="editTask('${t.id}')" title="Modifier">✏️</button>
            <button class="task-delete" onclick="deleteTask('${t.id}')" title="Supprimer">✕</button>
        </div>
        <div class="task-header-row">
            <span class="task-priority-badge priority-${t.priority}">${priLabel[t.priority] || t.priority}</span>
            ${showEnvs ? `<div class="task-envs">${t.envs.map(e => `<span class="task-env-chip env-${e}">${e.toUpperCase()}</span>`).join('')}</div>` : ''}
        </div>
        <div class="task-title">${esc(t.title)}</div>
        ${t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
        ${hasFooter ? `<div class="task-footer">
            ${t.assignee ? `<span class="task-assignee"><span class="task-assignee-avatar">${t.assignee.charAt(0).toUpperCase()}</span>${esc(t.assignee)}</span>` : ''}
            ${t.tags && t.tags.length ? `<div class="task-tags">${t.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>` : ''}
        </div>` : ''}
        <div class="task-actions">
            ${t.status !== 'todo' ? `<button class="action-todo" onclick="moveTask('${t.id}','todo')">📌</button>` : ''}
            ${t.status !== 'wip' ? `<button class="action-wip" onclick="moveTask('${t.id}','wip')">🔧</button>` : ''}
            ${t.status !== 'done' ? `<button class="action-done" onclick="moveTask('${t.id}','done')">✅</button>` : ''}
        </div>
    </div>`;
}

function renderTasksEmpty() {
    return '<div class="empty-state"><span class="empty-state-icon">📋</span>Aucune tache<span class="empty-state-hint">Creez des taches avec + Tache</span></div>';
}

function renderTasks() {
    const container = document.getElementById('kanbanContainer');
    const toggleBtn = document.getElementById('kanbanViewToggle');
    const filtered = filterTasks(state.tasks);

    if (toggleBtn) toggleBtn.textContent = kanbanViewMode === 'status' ? '🏷️ Par env' : '📊 Par statut';

    if (kanbanViewMode === 'env') {
        renderKanbanByEnv(container, filtered);
    } else {
        renderKanbanByStatus(container, filtered);
    }
}

function renderKanbanByStatus(container, tasks) {
    const statuses = ['todo', 'wip', 'done'];
    const statusMeta = {
        todo: { icon: '📌', label: 'À faire', cls: 'todo' },
        wip:  { icon: '🔧', label: 'En cours', cls: 'wip' },
        done: { icon: '✅', label: 'Terminé', cls: 'done' }
    };

    let html = '<div class="kanban-board">';
    statuses.forEach(s => {
        const col = tasks.filter(t => t.status === s);
        const m = statusMeta[s];
        html += `<div class="kanban-column">
            <div class="column-header ${m.cls}">
                <span>${m.icon} ${m.label}</span>
                <span class="count">${col.length}</span>
            </div>
            <div class="column-body">${col.length ? col.map(renderTaskCard).join('') : renderTasksEmpty()}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderKanbanByEnv(container, tasks) {
    const envDefs = [
        { key: 'prod',    label: 'PROD',    icon: '🔴', cls: 'env-prod' },
        { key: 'preprod', label: 'PREPROD', icon: '🟡', cls: 'env-preprod' },
        { key: 'dev',     label: 'DEV',     icon: '🔵', cls: 'env-dev' },
        { key: '',        label: 'NON ASSIGNÉ', icon: '⚪', cls: 'env-none' }
    ];
    const statusMeta = {
        todo: { icon: '📌', label: 'Todo' },
        wip:  { icon: '🔧', label: 'WIP' },
        done: { icon: '✅', label: 'Done' }
    };

    let html = '<div class="kanban-swimlanes">';
    envDefs.forEach(env => {
        const envTasks = tasks.filter(t => {
            const envs = t.envs || [];
            return env.key === '' ? envs.length === 0 : envs.includes(env.key);
        });
        if (envTasks.length === 0 && env.key === '') return;
        html += `<div class="swimlane">
            <div class="swimlane-header ${env.cls}">
                <span>${env.icon} ${env.label}</span>
                <span class="count">${envTasks.length}</span>
            </div>
            <div class="swimlane-columns">`;
        ['todo', 'wip', 'done'].forEach(s => {
            const col = envTasks.filter(t => t.status === s);
            const sm = statusMeta[s];
            html += `<div class="swimlane-col">
                <div class="swimlane-col-header"><span>${sm.icon}</span> <span class="count">${col.length}</span></div>
                <div class="swimlane-col-body">${col.length ? col.map(renderTaskCard).join('') : ''}</div>
            </div>`;
        });
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}
