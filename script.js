/**
 * Global Scripts for Learning Space
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initMobileMenu();
    initTabs();
});

/**
 * Theme Toggle Logic (Light/Dark Mode)
 */
function initThemeToggle() {
    const root = document.documentElement;
    const themeToggles = document.querySelectorAll('.theme-toggle');
    
    // Check saved theme or system preference
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme) {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    root.setAttribute('data-theme', currentTheme);

    themeToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
        });
    });
}

/**
 * Mobile Sidebar Menu Toggle
 */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('sidebar-nav');
    
    if (menuBtn && nav) {
        menuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            const isExpanded = nav.classList.contains('active');
            menuBtn.setAttribute('aria-expanded', isExpanded);
        });

        // Close menu when clicking a link on mobile
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1040) {
                    nav.classList.remove('active');
                    menuBtn.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }
}

/**
 * Tabs Logic (for pages with tabs like englisch.html and wirtschaft.html)
 */
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs-container');
    
    tabContainers.forEach(container => {
        const tabBtns = container.querySelectorAll('.tab-btn');
        const tabPanes = container.querySelectorAll('.tab-pane');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-tab');
                if (!targetId) return;
                
                // Remove active class from all buttons and panes in this container
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked button and target pane
                btn.classList.add('active');
                const targetPane = container.querySelector(`#${targetId}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    });
}

/**
 * Utility: Toggle Answer Visibility (for exercises)
 */
window.toggleSolution = function(button) {
    const solution = button.nextElementSibling;
    if (!solution || !solution.classList.contains('solution')) return;
    
    solution.classList.toggle('show');
    
    if (solution.classList.contains('show')) {
        button.innerHTML = '🔒 Lösung verbergen';
    } else {
        button.innerHTML = '📖 Lösung anzeigen';
    }
};

/**
 * Quiz Logic
 */
window.toggleOption = function(option) {
    const quizCard = option.closest('.quiz-card');
    if (!quizCard) return;
    
    if (quizCard.classList.contains('checked')) return;
    
    const isMulti = quizCard.getAttribute('data-multi') === 'true';
    
    if (!isMulti) {
        const options = quizCard.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.classList.remove('selected'));
    }
    
    option.classList.toggle('selected');
};

window.checkQuiz = function(btn) {
    const quizCard = btn.closest('.quiz-card');
    if (!quizCard) return;
    
    const correctIndicesStr = quizCard.getAttribute('data-correct');
    if (!correctIndicesStr) return;
    
    const correctIndices = correctIndicesStr.split(',').map(Number);
    const options = quizCard.querySelectorAll('.quiz-option');
    
    let allCorrect = true;
    let anySelected = false;
    
    options.forEach((opt, index) => {
        const isSelected = opt.classList.contains('selected');
        const isCorrect = correctIndices.includes(index);
        
        if (isSelected) {
            anySelected = true;
            if (isCorrect) {
                opt.classList.add('correct');
            } else {
                opt.classList.add('incorrect');
                allCorrect = false;
            }
        } else {
            if (isCorrect) {
                opt.classList.add('correct');
                allCorrect = false;
            }
        }
    });
    
    if (!anySelected) {
        alert("Bitte wähle mindestens eine Antwort aus.");
        return;
    }
    
    quizCard.classList.add('checked');
    btn.style.display = 'none';
    
    const solution = quizCard.querySelector('.solution');
    if (solution) {
        solution.classList.add('show');
    }
};
