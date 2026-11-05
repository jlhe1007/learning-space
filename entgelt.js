/* entgelt.js - Spezifische Logik für Entgeltabrechnung */

document.addEventListener('DOMContentLoaded', () => {
    initA11yTabs();
    initChecklist();
    initTableFill();
    initQuiz();
});

/* A11y Tabs (Keyboard + ARIA) */
function initA11yTabs() {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab, tabs));
        tab.addEventListener('keydown', (e) => {
            let nextIndex = null;
            if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
            if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (e.key === 'Home') nextIndex = 0;
            if (e.key === 'End') nextIndex = tabs.length - 1;
            
            if (nextIndex !== null) {
                e.preventDefault();
                tabs[nextIndex].focus();
                activateTab(tabs[nextIndex], tabs);
            }
        });
    });
}

function activateTab(selectedTab, allTabs) {
    allTabs.forEach(tab => {
        tab.setAttribute('aria-selected', 'false');
        tab.classList.remove('active');
        tab.setAttribute('tabindex', '-1');
        const targetId = tab.getAttribute('aria-controls');
        if (targetId) {
            const pane = document.getElementById(targetId);
            if (pane) {
                pane.hidden = true;
                pane.classList.remove('active');
            }
        }
    });
    
    selectedTab.setAttribute('aria-selected', 'true');
    selectedTab.classList.add('active');
    selectedTab.setAttribute('tabindex', '0');
    const activeTargetId = selectedTab.getAttribute('aria-controls');
    if (activeTargetId) {
        const activePane = document.getElementById(activeTargetId);
        if (activePane) {
            activePane.hidden = false;
            activePane.classList.add('active');
        }
    }
}

/* Checkliste Fortschritt (Local Storage) */
function initChecklist() {
    const checks = document.querySelectorAll('.progress-check');
    const progress = document.getElementById('learning-progress');
    if (!checks.length || !progress) return;
    
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem('entgelt-progress') || '[]');
    } catch (e) {
        saved = [];
    }
    
    checks.forEach((check, i) => {
        if (saved.includes(i)) check.checked = true;
        
        check.addEventListener('change', () => {
            updateProgress();
            saveProgress();
        });
    });
    
    function updateProgress() {
        const checkedCount = Array.from(checks).filter(c => c.checked).length;
        progress.value = (checkedCount / checks.length) * 100;
    }
    
    function saveProgress() {
        const state = [];
        checks.forEach((c, i) => { if (c.checked) state.push(i); });
        try {
            localStorage.setItem('entgelt-progress', JSON.stringify(state));
        } catch (e) {
            // LocalStorage might be disabled in private mode
        }
    }
    
    updateProgress();
}

/* Tabelle ausfüllen Logik */
function initTableFill() {
    const btn = document.getElementById('btn-self-fill');
    const table = document.getElementById('sv-table');
    const feedback = document.getElementById('table-feedback');
    if (!btn || !table || !feedback) return;
    
    const inputs = table.querySelectorAll('.fill-input');
    let isFillMode = false;
    
    btn.addEventListener('click', () => {
        isFillMode = !isFillMode;
        btn.setAttribute('aria-pressed', isFillMode);
        
        if (isFillMode) {
            table.classList.add('fill-mode');
            btn.textContent = "Eingaben prüfen";
            btn.classList.replace('btn-primary', 'btn-secondary');
            inputs.forEach(i => { i.value = ''; i.className = 'fill-input'; });
            feedback.textContent = "Trage die Werte ein (z. B. '7,3' oder '8450').";
            feedback.style.color = 'inherit';
        } else {
            // Check mode
            let correct = 0;
            let total = 0;
            inputs.forEach(input => {
                const expected = input.getAttribute('data-answer') || '';
                if (expected === '-') return; // Skip empty checks
                total++;
                
                // Normalize input for checking (remove %, €, spaces, treat , and . equal, lowercase)
                const normInput = input.value.replace(/[%€\s]/g, '').replace(/,/g, '.').toLowerCase();
                const normExpected = expected.replace(/[%€\s]/g, '').replace(/,/g, '.').toLowerCase();
                
                if (normInput === normExpected && normInput !== '') {
                    input.classList.add('fill-correct');
                    input.classList.remove('fill-error');
                    correct++;
                } else {
                    input.classList.add('fill-error');
                    input.classList.remove('fill-correct');
                }
            });
            
            feedback.textContent = `Du hast ${correct} von ${total} Feldern richtig!`;
            feedback.style.color = correct === total ? 'var(--color-success)' : 'var(--color-error)';
            
            setTimeout(() => {
                table.classList.remove('fill-mode');
                btn.textContent = "Tabelle selbst ausfüllen";
                btn.classList.replace('btn-secondary', 'btn-primary');
                feedback.textContent = "";
            }, 6000);
        }
    });
}

/* Mini-Quiz Steuern */
function initQuiz() {
    const container = document.querySelector('.quiz-container');
    const quizFeedback = document.getElementById('quiz-feedback');
    if (!container) return;
    
    const questions = [
        { q: "Ledig, ohne Kinder.", a: "I", options: ["I", "II", "III", "IV"], ex: "Steuerklasse I gilt für ledige, verwitwete oder geschiedene Arbeitnehmer ohne Entlastungsbetrag." },
        { q: "Alleinerziehend (mit Kind im Haushalt).", a: "II", options: ["I", "II", "IV", "V"], ex: "Die Voraussetzung für Klasse II ist der Anspruch auf den Entlastungsbetrag für Alleinerziehende." },
        { q: "Verheiratet, Partner verdient nichts.", a: "III", options: ["III", "IV", "V", "VI"], ex: "Wenn der Partner kein oder viel weniger Einkommen hat, wählt der Alleinverdiener Klasse III (Partner ist in V)." },
        { q: "Verheiratet, beide verdienen etwa 3.000 €.", a: "IV", options: ["III", "IV", "V", "VI"], ex: "Bei etwa gleichem Einkommen ist die Kombination IV/IV am sinnvollsten. Sie gilt ab Heirat automatisch." },
        { q: "Verheiratet, Partner ist in Klasse III.", a: "V", options: ["III", "IV", "V", "VI"], ex: "Die Gegenklasse zu III ist immer die V (für denjenigen, der deutlich weniger verdient)." },
        { q: "Studentin, arbeitet bei zwei verschiedenen Arbeitgebern (Zweitjob auf Lohnsteuerkarte).", a: "VI", options: ["I", "II", "V", "VI"], ex: "Jedes zweite oder weitere Arbeitsverhältnis wird zwingend mit der Steuerklasse VI (höchste Abzüge) abgerechnet." }
    ];
    
    questions.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.innerHTML = `<strong>Fall ${index + 1}:</strong> ${item.q}<br>`;
        
        const opts = document.createElement('div');
        opts.className = 'quiz-options';
        opts.setAttribute('role', 'group');
        opts.setAttribute('aria-label', `Antwortoptionen für Fall ${index + 1}`);
        
        item.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-btn';
            btn.textContent = opt;
            btn.setAttribute('aria-pressed', 'false');
            
            btn.addEventListener('click', () => {
                // Reset others in this card
                opts.querySelectorAll('.quiz-btn').forEach(b => {
                    b.setAttribute('aria-pressed', 'false');
                    b.classList.remove('correct', 'incorrect');
                });
                
                btn.setAttribute('aria-pressed', 'true');
                const isCorrect = opt === item.a;
                btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                
                const expl = card.querySelector('.quiz-explanation');
                if (expl) expl.classList.add('show');
                
                if (quizFeedback) {
                    quizFeedback.textContent = isCorrect ? 'Richtig!' : 'Leider falsch.';
                    quizFeedback.style.color = isCorrect ? 'var(--color-success)' : 'var(--color-error)';
                }
            });
            opts.appendChild(btn);
        });
        
        const explanation = document.createElement('div');
        explanation.className = 'quiz-explanation';
        explanation.textContent = item.ex;
        
        card.appendChild(opts);
        card.appendChild(explanation);
        container.appendChild(card);
    });
}

