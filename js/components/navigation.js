// ==================== NAVIGATION (quick-nav + scroll-to-top + dividers) ====================

// Masque les dividers dont la section suivante est vide ou cachee
function updateSectionDividers() {
    document.querySelectorAll('.section-divider').forEach(div => {
        const section = div.nextElementSibling;
        if (!section) { div.style.display = 'none'; return; }

        // Section cachee (vue ou dashboard settings)
        const sectionStyle = getComputedStyle(section);
        if (sectionStyle.display === 'none') { div.style.display = 'none'; return; }

        // Section charts : verifier qu'au moins un chart-container est visible et a du contenu
        if (section.classList.contains('charts-grid')) {
            const containers = section.querySelectorAll('.chart-container');
            const hasVisibleChart = Array.from(containers).some(c => {
                if (c.style.display === 'none') return false;
                if (c.classList.contains('ds-hidden')) return false;
                // Visible et pas en empty state = a du contenu
                if (!c.querySelector('.chart-empty-msg')) return true;
                return false;
            });
            div.style.display = hasVisibleChart ? '' : 'none';
            return;
        }

        // Sinon : garder visible
        div.style.display = '';
    });
}

function initQuickNav() {
    const nav = document.getElementById('quickNav');
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (!nav) return;

    nav.classList.add('visible');

    const dots = nav.querySelectorAll('.qn-dot');
    const sectionIds = Array.from(dots).map(d => d.dataset.target);

    // Clic sur un dot = scroll vers la section + highlight
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const target = document.getElementById(dot.dataset.target);
            if (!target) return;
            const header = document.querySelector('header');
            const toolbar = document.querySelector('.toolbar');
            const offset = (header?.offsetHeight || 0) + (toolbar?.offsetHeight || 0) + 16;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });

            // Highlight la section
            target.classList.remove('section-highlight');
            void target.offsetWidth;
            target.classList.add('section-highlight');
            target.addEventListener('animationend', () => {
                target.classList.remove('section-highlight');
            }, { once: true });
        });
    });

    // Observer pour detecter la section visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
            }
        });
    }, {
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0
    });

    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });

    // Afficher/masquer le quick-nav et le scroll-to-top selon le scroll
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            const showThreshold = 200;

            // Quick-nav : toujours visible
            nav.classList.add('visible');

            // Scroll-to-top : visible apres 400px
            if (scrollBtn) {
                if (scrollY > 400) {
                    scrollBtn.classList.add('visible');
                } else {
                    scrollBtn.classList.remove('visible');
                }
            }

            // Masquer les dots des sections non visibles (via data-views)
            const currentView = state.currentView || 'ops';
            dots.forEach(dot => {
                const section = document.getElementById(dot.dataset.target);
                if (!section) { dot.style.display = 'none'; return; }
                const views = section.dataset.views;
                if (views && !views.split(' ').includes(currentView)) {
                    dot.style.display = 'none';
                } else if (section.classList.contains('ds-hidden')) {
                    dot.style.display = 'none';
                } else {
                    dot.style.display = '';
                }
            });

            ticking = false;
        });
    });
}
