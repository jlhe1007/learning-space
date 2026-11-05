/**
 * nav.js - Zentrale, einheitliche Seitennavigation für alle Lernseiten.
 *
 * Neue Seite hinzufügen? Nur hier in NAV_GROUPS eintragen - alle Seiten
 * übernehmen die Änderung automatisch.
 *
 * Seiteninterne Anker-Links (href="#...") aus dem bisherigen HTML der Seite
 * bleiben erhalten und erscheinen als Abschnitt "Auf dieser Seite".
 */
(function () {
    'use strict';

    var NAV_GROUPS = [
        {
            label: null,
            items: [
                { href: 'index.html', icon: '🏠', text: 'Startseite' }
            ]
        },
        {
            label: 'Informatik',
            items: [
                { href: 'java.html', icon: '☕', text: 'Java' },
                { href: 'uml.html', icon: '🎯', text: 'UML-Aktivitätsdiagramm' },
                { href: 'Normalisierung.html', icon: '🧩', text: 'Normalisierung' },
                { href: 'sql.html', icon: '🗄️', text: 'SQL (terra-Datenbank)' },
                { href: 'IP_Routing.html', icon: '🌐', text: 'IP-Routing' },
                { href: 'raid.html', icon: '💽', text: 'RAID & Speicher' },
                { href: 'usv.html', icon: '🔌', text: 'USV' },
                { href: 'weihnachtsroute.html', icon: '🎅', text: 'Weihnachtsmann-Problem' }
            ]
        },
        {
            label: 'Wirtschaft',
            items: [
                { href: 'wirtschaft.html', icon: '💼', text: 'Wirtschaftskunde' },
                { href: 'Marktformen.html', icon: '📊', text: 'Marktformen' },
                { href: 'entgeltabrechnung.html', icon: '💶', text: 'Entgeltabrechnung' }
            ]
        },
        {
            label: 'Sprache',
            items: [
                { href: 'englisch.html', icon: '🎤', text: 'Englisch Präsentation' },
                { href: 'it-begriffe.html', icon: '🔤', text: 'IT-Begriffe' }
            ]
        }
    ];

    function currentPage() {
        var seg = decodeURIComponent(location.pathname.split('/').pop() || '');
        return (seg === '' ? 'index.html' : seg).toLowerCase();
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function buildLink(item, page) {
        var a = el('a', 'nav-link');
        a.href = item.href;
        var icon = el('span', 'nav-icon', item.icon);
        icon.setAttribute('aria-hidden', 'true');
        a.appendChild(icon);
        a.appendChild(el('span', 'nav-text', item.text));
        if (item.href.toLowerCase() === page) {
            a.classList.add('nav-active');
            a.setAttribute('aria-current', 'page');
        }
        return a;
    }

    function init() {
        var nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        var page = currentPage();

        // Seiteninterne Anker-Links (inkl. onclick-Tab-Umschaltung) sichern
        var localLinks = Array.prototype.filter.call(
            nav.querySelectorAll('a'),
            function (a) { return (a.getAttribute('href') || '').charAt(0) === '#'; }
        );

        var frag = document.createDocumentFragment();

        NAV_GROUPS.forEach(function (group) {
            var section = el('div', 'nav-group');
            if (group.label) {
                var heading = el('div', 'nav-group-label', group.label);
                heading.setAttribute('aria-hidden', 'true');
                section.appendChild(heading);
            }
            group.items.forEach(function (item) {
                section.appendChild(buildLink(item, page));
            });
            frag.appendChild(section);
        });

        if (localLinks.length) {
            var local = el('div', 'nav-group nav-group-local');
            var heading = el('div', 'nav-group-label', 'Auf dieser Seite');
            heading.setAttribute('aria-hidden', 'true');
            local.appendChild(heading);
            localLinks.forEach(function (a) {
                // Inline-Styles der Altlast entfernen, Handler bleiben erhalten
                a.removeAttribute('style');
                a.className = 'nav-link nav-link-local';
                local.appendChild(a);
            });
            frag.appendChild(local);
        }

        nav.textContent = '';
        nav.appendChild(frag);
        nav.setAttribute('aria-label', 'Hauptnavigation');

        // Mobile: Menü schließen, sobald ein Link gewählt wurde
        // (script.js erledigt das nur für beim Laden vorhandene Links)
        var btn = document.getElementById('mobile-menu-btn');
        if (btn) {
            nav.addEventListener('click', function (e) {
                if (e.target.closest('a') && window.innerWidth <= 1040) {
                    nav.classList.remove('active');
                    btn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Aktiven Eintrag in der scrollbaren Sidebar sichtbar machen
        var active = nav.querySelector('.nav-active');
        if (active && active.scrollIntoView && window.innerWidth > 1040) {
            active.scrollIntoView({ block: 'nearest' });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

