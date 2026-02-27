// ==================== UTILS ====================

// ==================== UTILITIES ====================
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function clearForm(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function parseTags(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function normalizeType(str) {
    const s = str.toLowerCase().trim();
    if (['vm', 'lxc', 'stack', 'logger'].includes(s)) return s;
    return 'other';
}

function normalizeStatus(str) {
    const s = str.toLowerCase().trim();
    if (['up', 'degraded', 'down'].includes(s)) return s;
    return 'up';
}

function normalizeEnv(str) {
    const s = str.toLowerCase().trim();
    if (['dev', 'preprod', 'prod'].includes(s)) return s;
    return '';
}

function statusLabel(status) {
    return { todo: '📌 À faire', wip: '🔧 En cours', done: '✅ Terminé' }[status] || status;
}

function priorityWeight(p) {
    return { critical: 4, high: 3, medium: 2, low: 1 }[p] || 0;
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`;
    const days = Math.floor(hrs / 24);
    return `${days}j`;
}

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function toast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function formatDuration(ms) {
    if (ms < 0) return '—';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return `${hrs}h${remMins > 0 ? String(remMins).padStart(2, '0') : ''}`;
    const days = Math.floor(hrs / 24);
    return `${days}j ${hrs % 24}h`;
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
    document.getElementById(id).classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    document.body.style.overflow = '';
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('show')) {
        e.target.classList.remove('show');
        document.body.style.overflow = '';
    }
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => {
            m.classList.remove('show');
        });
        document.body.style.overflow = '';
        closeDashboardSettings();
    }
});
