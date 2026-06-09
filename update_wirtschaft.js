const fs = require('fs');

const filePath = 'g:/Meine Ablage/Berufsschule/Lernseite/learning-space-main/wirtschaft.html';
const content = fs.readFileSync(filePath, 'utf-8');

const bodyMatch = content.match(/<!-- TAB 1: THEORIE -->([\s\S]*?)<!-- Footer -->/);
if (!bodyMatch) {
    console.error('Could not find body');
    process.exit(1);
}

let bodyContent = bodyMatch[1];
bodyContent = bodyContent.replace(/class="tab-content active"/g, 'class="tab-pane active"');
bodyContent = bodyContent.replace(/class="tab-content"/g, 'class="tab-pane"');

const newHtml = `<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wirtschaftskunde</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Merriweather:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <style>
        /* specific styles for wirtschaft */
        .info-box { background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)); border-left: 4px solid var(--color-primary); padding: var(--space-4); margin: var(--space-4) 0; border-radius: var(--radius-sm); }
        .warning-box { background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface)); border-left: 4px solid var(--color-warning); padding: var(--space-4); margin: var(--space-4) 0; border-radius: var(--radius-sm); }
        .formula { background: var(--color-surface); border: 1px solid var(--color-border); padding: var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); border-radius: var(--radius-md); overflow-x: auto; white-space: pre; margin: var(--space-4) 0; }
        .definition { background: var(--color-surface-2); border-left: 4px solid var(--color-success); padding: var(--space-4); margin: var(--space-4) 0; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
        .example-box { border: 2px solid var(--color-primary-highlight); border-radius: var(--radius-lg); padding: var(--space-5); margin: var(--space-6) 0; }
        .exercise { background: var(--color-surface); border: 2px solid color-mix(in srgb, var(--color-success) 30%, transparent); border-radius: var(--radius-lg); padding: var(--space-5); margin: var(--space-6) 0; }
        .solution { background: var(--color-surface-offset); border-left: 3px solid var(--color-success); padding: var(--space-4); margin-top: var(--space-4); display: none; }
        .solution.show { display: block; }
        .exercise-number { background: var(--color-primary-highlight); color: var(--color-primary); padding: .2rem .6rem; border-radius: 999px; font-size: var(--text-xs); font-weight: 700; margin-right: .5rem; }
        .comparison-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin: var(--space-4) 0; }
        .comparison-col { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
        @media (max-width: 768px) { .comparison-row { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="shell">
        <aside class="sidebar" aria-label="Seitennavigation">
            <div class="sidebar-header">
                <div class="brand">
                    <a href="index.html" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: .9rem;">
                        <div class="logo" aria-hidden="true">💼</div>
                        <div>
                            <h1>Wirtschaft</h1>
                            <p>Lernzettel BW7</p>
                        </div>
                    </a>
                </div>
                <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Menü öffnen" aria-expanded="false">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </div>
            
            <nav class="nav" id="sidebar-nav">
                <a href="index.html" style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 10px;">← Zurück zur Übersicht</a>
                <a href="#theorie" onclick="document.querySelector('[data-tab=\\'theorie\\']').click();">📚 Theorie</a>
                <a href="#definitionen" onclick="document.querySelector('[data-tab=\\'definitionen\\']').click();">📖 Definitionen</a>
                <a href="#beispiele" onclick="document.querySelector('[data-tab=\\'beispiele\\']').click();">💡 Beispiele</a>
                <a href="#uebungen" onclick="document.querySelector('[data-tab=\\'uebungen\\']').click();">✏️ Übungsaufgaben</a>
            </nav>
            
            <button class="theme-toggle">
                <span aria-hidden="true">◐</span><span>Hell/Dunkel</span>
            </button>
        </aside>

        <main class="content tabs-container">
            <h1 class="page-title">Kosten- & Leistungsrechnung</h1>
            <p class="page-subtitle">Kompletter Überblick mit Definitionen, Erklärungen & Übungsaufgaben (BW7)</p>
            
            <div class="tabs-nav">
                <button class="tab-btn active" data-tab="theorie">📚 Theorie</button>
                <button class="tab-btn" data-tab="definitionen">📖 Definitionen</button>
                <button class="tab-btn" data-tab="beispiele">💡 Beispiele</button>
                <button class="tab-btn" data-tab="uebungen">✏️ Übungsaufgaben</button>
            </div>
            
            <!-- TAB 1: THEORIE -->
            ${bodyContent}
            
            <footer style="margin-top: 2rem; border-top: 1px solid var(--color-border); padding-top: 1rem; color: var(--color-text-muted); font-size: 0.9em; text-align: center;">
                <p>🎓 <strong>Viel Erfolg bei deiner Prüfung!</strong> Du packst das! 💪</p>
                <p>Lernzettel: Kosten- & Leistungsrechnung (BW7) – Alle Themen, alle Aufgaben, komplette Lösungen</p>
            </footer>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>`;

fs.writeFileSync(filePath, newHtml, 'utf-8');
console.log('Updated wirtschaft.html successfully.');
