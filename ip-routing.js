/**
 * IP_Routing.js - Didaktische Trainer, Lösungswege, Widgets und barrierefreie Tab-Logik
 * Dedizierte Skriptdatei für IP_Routing.html (keine Konflikte mit globalem script.js).
 */

(function () {
    "use strict";

    // --- DOM- & Math-Helfer ---
    const $ = id => document.getElementById(id);
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const ip2i = s => s.split('.').reduce((a, o) => a * 256 + (+o), 0);
    const i2ip = n => [(n >>> 24), (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    const maskI = p => p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
    const nw = (ip, p) => (ip & maskI(p)) >>> 0;
    const bc = (ip, p) => p >= 32 ? (ip >>> 0) : (nw(ip, p) + Math.pow(2, 32 - p) - 1) >>> 0;
    const hostsOf = p => p >= 31 ? 0 : Math.pow(2, 32 - p) - 2;
    const fmt = n => n.toLocaleString('de-DE');
    const hex2 = n => n.toString(16).padStart(2, '0');

    function byteToBin(n) {
        return (n >>> 0).toString(2).padStart(8, '0');
    }

    function octetInfo(p) {
        if (p <= 0 || p >= 32) return null;
        if (p % 8 === 0) {
            const k = p / 8;
            return { k: k + 1, m: 0, block: 256, isBoundary: true, boundaryOctet: k };
        }
        const k = Math.floor(p / 8);
        const m = (maskI(p) >>> (24 - 8 * k)) & 255;
        return { k: k + 1, m: m, block: 256 - m, isBoundary: false };
    }

    // Normalisierer für Eingabefelder
    function normIp(s) {
        const p = String(s).trim().replace(/\s/g, '').replace(/^\//, '').split('/')[0].split('.');
        if (p.length !== 4 || p.some(x => x === '' || isNaN(+x) || +x < 0 || +x > 255)) return null;
        return p.map(x => +x).join('.');
    }
    function normNum(s) {
        const t = String(s).trim().replace(/[.\s]/g, '').replace(/^\//, '');
        if (t === '') return null;
        return /^\d+$/.test(t) ? String(+t) : null;
    }
    function normMac(s) {
        const t = String(s).toLowerCase().replace(/[^0-9a-f]/g, '');
        return t.length === 12 ? t : null;
    }
    function normText(s) {
        return String(s).replace(/\\r|\\n|␍|␊/g, '').trim().toLowerCase();
    }
    const NORM = { ip: normIp, num: normNum, mac: normMac, text: normText, sel: x => x };

    // Formular-Generator für Trainer
    function buildForm(form, fields, prefix) {
        form.innerHTML = '';
        fields.forEach((f, i) => {
            const id = prefix + '_' + i;
            const w = document.createElement('div');
            w.className = 'f-field';
            let ctl;
            if (f.type === 'sel') {
                ctl = `<select id="${id}" aria-label="${f.label}"><option value="">– wählen –</option>${f.opts.map(o => `<option>${o}</option>`).join('')}</select>`;
            } else {
                ctl = `<input id="${id}" aria-label="${f.label}" autocomplete="off" spellcheck="false" ${f.disabled ? 'disabled placeholder="entfällt"' : ''} placeholder="${f.ph || ''}">`;
            }
            w.innerHTML = `<label for="${id}">${f.label}</label>${ctl}<div class="exp" id="${id}_x" aria-live="polite"></div>`;
            form.appendChild(w);
        });
        form.onsubmit = e => e.preventDefault();
        form.onkeydown = e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (prefix === 'sf') $('scheck').click();
                else if (prefix === 'zf') $('zcheck').click();
                else if (prefix === 'tf') $('tcheck').click();
            }
        };
    }

    function checkForm(fields, prefix, scoreObj, scoreEl, fbEl) {
        let ok = 0, tot = 0;
        fields.forEach((f, i) => {
            if (f.disabled) return;
            const el = $(prefix + '_' + i), x = $(prefix + '_' + i + '_x');
            const n = NORM[f.type];
            const got = n(el.value);
            const want = n(String(f.ans));
            tot++;
            el.classList.remove('ok', 'bad');
            if (got !== null && got === want) {
                el.classList.add('ok');
                x.textContent = '';
                ok++;
            } else {
                el.classList.add('bad');
                x.textContent = '→ ' + (f.show || f.ans);
            }
        });
        scoreObj.ok += ok;
        scoreObj.tot += tot;
        scoreEl.textContent = `${scoreObj.ok} / ${scoreObj.tot} Felder richtig`;
        fbEl.textContent = ok === tot ? '✓ Alles richtig!' : `${ok} von ${tot} richtig`;
        fbEl.className = 'status-feedback ' + (ok === tot ? 'ok' : 'bad');
    }

    function toggleSolBox(btn, box) {
        const isOpen = box.classList.contains('on');
        if (isOpen) {
            box.classList.remove('on');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '📖 Lösungsweg';
        } else {
            box.classList.add('on');
            btn.setAttribute('aria-expanded', 'true');
            btn.innerHTML = '🔒 Lösungsweg verbergen';
        }
    }

    function resetSolBox(btn, box) {
        box.classList.remove('on');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '📖 Lösungsweg';
    }

    // =========================================================================
    // TEIL A1: Neuer didaktischer Lösungsweg für Typ A (calcWay)
    // =========================================================================
    function calcWay(ip, p) {
        const ipStr = i2ip(ip);
        const ipOctets = ipStr.split('.').map(Number);
        const mInt = maskI(p);
        const mStr = i2ip(mInt);
        const mOctets = mStr.split('.').map(Number);
        const nwInt = nw(ip, p);
        const nwStr = i2ip(nwInt);
        const bcInt = bc(ip, p);
        const bcStr = i2ip(bcInt);
        const hostBits = 32 - p;
        const totalHosts = hostsOf(p);

        // Binärdarstellung der Maske mit Punkten
        let maskBinParts = [];
        for (let o = 0; o < 4; o++) {
            maskBinParts.push(byteToBin(mOctets[o]));
        }

        // Farbige Binärdarstellung mit visueller Trennlinie
        let binHtml = '';
        let bitCount = 0;
        for (let o = 0; o < 4; o++) {
            let octHtml = '';
            for (let b = 0; b < 8; b++) {
                bitCount++;
                const isNet = bitCount <= p;
                const isBoundary = bitCount === p && p < 32;
                octHtml += `<span class="${isNet ? 'net-bit' : 'host-bit'}${isBoundary ? ' bit-boundary' : ''}">${isNet ? '1' : '0'}</span>`;
            }
            binHtml += octHtml + (o < 3 ? '<span class="bin-dot">.</span>' : '');
        }

        const oi = octetInfo(p);
        let k, maskVal, block;
        let isBoundaryNote = '';

        if (!oi || p >= 32) {
            // /32 oder /0
            k = 4; maskVal = 255; block = 1;
        } else if (oi.isBoundary) {
            k = oi.k;
            maskVal = 0;
            block = 256;
            isBoundaryNote = `Das Präfix <code>/${p}</code> endet exakt an einer Oktettgrenze (${oi.boundaryOctet}. Oktett ist voll mit 255). Das Rechnen geschieht im nachfolgenden <b>${k}. Oktett</b> (Maskenwert 0, Blockgröße 256).`;
        } else {
            k = oi.k;
            maskVal = oi.m;
            block = oi.block;
        }

        const ipVal = ipOctets[k - 1];
        const nwVal = Math.floor(ipVal / block) * block;
        const bcVal = Math.min(255, nwVal + block - 1);

        // Blockgrenzen zur Anschauung
        let lowerBound = Math.max(0, nwVal - block);
        let nextBound = nwVal + block;
        let blockSequence = `${lowerBound > 0 ? '... ' : ''}<b>${nwVal}</b>, ${nextBound} ...`;

        // UND-Verknüpfung im interessanten Oktett
        const ipBinOctet = byteToBin(ipVal);
        const maskBinOctet = byteToBin(maskVal);
        const resBinOctet = byteToBin(nwVal);

        let s = '<ol class="sol-steps">';

        // Schritt 0: Gegeben
        s += `<li>
            <div class="sol-step-title">Schritt 0 · Gegebene Werte erfassen</div>
            <div class="sol-calc">IP-Adresse: <code>${ipStr}</code> · Präfix: <code>/${p}</code></div>
            <div class="sol-why">Das CIDR-Präfix <code>/${p}</code> gibt an, wie viele Bits von links die Netzwerkadresse festlegen (Netzanteil). Die restlichen <code>32 − ${p} = ${hostBits}</code> Bits stehen für Hosts zur Verfügung.</div>
        </li>`;

        // Schritt 1: Subnetzmaske
        s += `<li>
            <div class="sol-step-title">Schritt 1 · Subnetzmaske bestimmen</div>
            <div class="sol-calc">Binär: ${binHtml}<br>Dezimal: <code>${mStr}</code></div>
            <div class="sol-why">Ein <code>/${p}</code>-Präfix bedeutet: Die ersten ${p} Bits sind auf <b>1</b> gesetzt (Netzanteil, <span class="sol-highlight">grün</span>), alle verbleibenden ${hostBits} Bits auf <b>0</b> (Hostanteil). Jedes volle 8-Bit-Paket (11111111) ergibt dezimal <b>255</b>.</div>
        </li>`;

        // Schritt 2: Interessantes Oktett
        s += `<li>
            <div class="sol-step-title">Schritt 2 · Interessantes Oktett ermitteln</div>
            <div class="sol-calc">Interessantes Oktett: <mark class="sol-highlight">${k}. Oktett</mark> · Maskenwert: <code>${maskVal}</code></div>
            <div class="sol-why">${isBoundaryNote || `Das "interessante Oktett" ist das erste Oktett von links, dessen Maskenwert weder 255 noch 0 ist. Hier teilt die Maske das Oktett in Netz- und Hostbits.`}</div>
        </li>`;

        // Schritt 3: Blockgröße
        s += `<li>
            <div class="sol-step-title">Schritt 3 · Blockgröße berechnen</div>
            <div class="sol-calc">Blockgröße = 256 − Maskenwert = 256 − ${maskVal} = <b>${block}</b></div>
            <div class="sol-why">Subnetze beginnen im ${k}. Oktett immer bei Vielfachen der Blockgröße (0, ${block}, ${block * 2}, ...). Die gegebene IP mit dem Wert <code>${ipVal}</code> im ${k}. Oktett fällt in den Block <code>${nwVal}</code> bis <code>${bcVal}</code> (Schritte: ${blockSequence}).</div>
        </li>`;

        // Schritt 4: Netzwerkadresse
        s += `<li>
            <div class="sol-step-title">Schritt 4 · Netzwerkadresse berechnen</div>
            <div class="sol-calc">
                Rechnung: ${ipVal} ÷ ${block} = ${(ipVal / block).toFixed(2)} → abrunden auf ${Math.floor(ipVal / block)} × ${block} = <b>${nwVal}</b><br>
                Kontrolle per bitweiser UND-Verknüpfung im ${k}. Oktett:<br>
                &nbsp;&nbsp;IP-Wert:&nbsp;&nbsp;&nbsp;<code>${ipBinOctet}</code> (${ipVal})<br>
                &nbsp;&nbsp;Maske:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>${maskBinOctet}</code> (${maskVal})<br>
                &nbsp;&nbsp;----------------------<br>
                &nbsp;&nbsp;Netz-Wert:&nbsp;<code>${resBinOctet}</code> (<b>${nwVal}</b>)<br>
                → <b>Netzadresse: <code>${nwStr}</code></b>
            </div>
            <div class="sol-why">Alle Oktette vor dem ${k}. Oktett bleiben unverändert. Das ${k}. Oktett wird auf das Vielfache der Blockgröße abgerundet. Alle Oktette danach werden auf <b>0</b> gesetzt.</div>
        </li>`;

        // Schritt 5: Broadcast
        s += `<li>
            <div class="sol-step-title">Schritt 5 · Broadcastadresse ermitteln</div>
            <div class="sol-calc">
                ${k}. Oktett = Netz-Wert + Blockgröße − 1 = ${nwVal} + ${block} − 1 = <b>${bcVal}</b><br>
                → <b>Broadcastadresse: <code>${bcStr}</code></b>
            </div>
            <div class="sol-why">Die Broadcastadresse ist die letzte Adresse des Subnetzes. Im Hostanteil sind alle Bits auf <b>1</b> gesetzt, daher enden alle Oktette nach dem ${k}. Oktett auf <b>255</b>.</div>
        </li>`;

        // Schritt 6: Erster und letzter Host
        let firstHostStr, lastHostStr;
        if (p === 31) {
            firstHostStr = nwStr;
            lastHostStr = bcStr;
            s += `<li>
                <div class="sol-step-title">Schritt 6 · Host-Adressbereich (Sonderfall /31, RFC 3021)</div>
                <div class="sol-calc">Erste Adresse: <code>${firstHostStr}</code> · Zweite Adresse: <code>${lastHostStr}</code></div>
                <div class="sol-why">Ein <code>/31</code>-Netz bietet genau 2 Adressen. Nach <b>RFC 3021</b> wird es für Punkt-zu-Punkt-Routerlinks genutzt; es gibt hier keine separate Netz- und Broadcastadresse, beide IPs werden direkt an die Interfaces vergeben.</div>
            </li>`;
        } else if (p >= 32) {
            firstHostStr = nwStr;
            lastHostStr = nwStr;
            s += `<li>
                <div class="sol-step-title">Schritt 6 · Host-Adressbereich (Sonderfall /32)</div>
                <div class="sol-calc">Einzelhost: <code>${nwStr}</code></div>
                <div class="sol-why">Ein <code>/32</code>-Präfix bezeichnet eine einzelne Host-Route (z. B. Loopback-Interface). Es gibt keinen Hostbereich.</div>
            </li>`;
        } else {
            firstHostStr = i2ip(nwInt + 1);
            lastHostStr = i2ip(bcInt - 1);
            s += `<li>
                <div class="sol-step-title">Schritt 6 · Nutzbarer Hostbereich</div>
                <div class="sol-calc">
                    Erster Host: Netzadresse + 1 = <code>${firstHostStr}</code><br>
                    Letzter Host: Broadcastadresse − 1 = <code>${lastHostStr}</code>
                </div>
                <div class="sol-why">Die Netzadresse (alle Hostbits 0) und die Broadcastadresse (alle Hostbits 1) sind reserviert und dürfen keinem Endgerät zugewiesen werden.</div>
            </li>`;
        }

        // Schritt 7: Nutzbare Hosts
        if (p === 31) {
            s += `<li>
                <div class="sol-step-title">Schritt 7 · Anzahl nutzbarer Hosts</div>
                <div class="sol-calc">2 Adressen (Punkt-zu-Punkt nach RFC 3021)</div>
                <div class="sol-why">Klassische Formel 2<sup>1</sup> − 2 = 0 zieht fälschlicherweise 2 ab. Nach RFC 3021 sind beide IPs nutzbar.</div>
            </li>`;
        } else if (p >= 32) {
            s += `<li>
                <div class="sol-step-title">Schritt 7 · Anzahl nutzbarer Hosts</div>
                <div class="sol-calc">1 Host (Einzeladresse)</div>
                <div class="sol-why">Ein /32 adressiert genau ein Interface ohne Subnetz-Overhead.</div>
            </li>`;
        } else {
            s += `<li>
                <div class="sol-step-title">Schritt 7 · Anzahl nutzbarer Hosts berechnen</div>
                <div class="sol-calc">Hostbits = 32 − ${p} = ${hostBits} → 2<sup>${hostBits}</sup> − 2 = ${fmt(Math.pow(2, hostBits))} − 2 = <b>${fmt(totalHosts)}</b> nutzbare Hosts</div>
                <div class="sol-why">Mit ${hostBits} Hostbits gibt es 2<sup>${hostBits}</sup> Bitmuster. Es werden genau 2 abgezogen: die Netzadresse (alles 0) und die Broadcastadresse (alles 1).</div>
            </li>`;
        }

        // Ergebnistabelle
        s += `</ol>
        <h4 style="margin: 14px 0 6px 0;">Ergebnistabelle für das Formular:</h4>
        <div class="table-wrap">
            <table class="sol-table">
                <tr><th>Feld</th><th>Wert</th></tr>
                <tr><td>Subnetzmaske</td><td><code>${mStr}</code></td></tr>
                <tr><td>Netzadresse</td><td><code>${nwStr}</code></td></tr>
                <tr><td>Erster Host</td><td><code>${firstHostStr}</code></td></tr>
                <tr><td>Letzter Host</td><td><code>${lastHostStr}</code></td></tr>
                <tr><td>Broadcast</td><td><code>${bcStr}</code></td></tr>
                <tr><td>Nutzbare Hosts</td><td><b>${fmt(totalHosts)}</b></td></tr>
            </table>
        </div>`;

        return s;
    }

    // =========================================================================
    // TEIL A2: Lösungsweg für Typ B (Aufteilen)
    // =========================================================================
    function splitWay(base, p, n, bits, np, k, subK, last, size) {
        const baseStr = i2ip(base);
        const npMaskStr = i2ip(maskI(np));
        const numSubnetsPossible = Math.pow(2, bits);
        const hostsPerSub = hostsOf(np);
        const oi = octetInfo(np);

        let powersTable = '<table class="sol-table" style="max-width:320px;"><tr><th>Bits x</th><th>2<sup>x</sup> Subnetze</th><th>Bedarf deckend?</th></tr>';
        for (let x = 1; x <= Math.max(bits + 1, 4); x++) {
            const pow = Math.pow(2, x);
            const isTarget = x === bits;
            powersTable += `<tr${isTarget ? ' style="background:var(--color-surface-offset); font-weight:bold;"' : ''}>
                <td>${x}</td><td>${pow}</td><td>${pow >= n ? '✓ Ja' : '✗ Nein (zu wenig)'}</td>
            </tr>`;
        }
        powersTable += '</table>';

        let subnetsListHtml = '<div class="table-wrap"><table class="sol-table"><tr><th>Nr.</th><th>Netzadresse</th><th>Hostbereich</th><th>Broadcast</th></tr>';
        const showCount = Math.min(numSubnetsPossible, 16);
        for (let i = 0; i < showCount; i++) {
            const snNw = base + i * size;
            const snBc = snNw + size - 1;
            const isK = (i + 1) === k;
            const isLast = (i + 1) === numSubnetsPossible;
            subnetsListHtml += `<tr${isK || isLast ? ' style="font-weight:bold; background:var(--color-surface-offset);"' : ''}>
                <td>Subnetz ${i + 1}${isK ? ' (gefragt)' : ''}${isLast ? ' (letztes)' : ''}</td>
                <td><code>${i2ip(snNw)}/${np}</code></td>
                <td><code>${i2ip(snNw + 1)} – ${i2ip(snBc - 1)}</code></td>
                <td><code>${i2ip(snBc)}</code></td>
            </tr>`;
        }
        if (numSubnetsPossible > 16) {
            subnetsListHtml += `<tr><td colspan="4" style="text-align:center; color:var(--color-text-muted);">... weitere Subnetze übersprungen ...</td></tr>`;
            const lastBc = last + size - 1;
            subnetsListHtml += `<tr style="font-weight:bold; background:var(--color-surface-offset);">
                <td>Subnetz ${numSubnetsPossible} (letztes)</td>
                <td><code>${i2ip(last)}/${np}</code></td>
                <td><code>${i2ip(last + 1)} – ${i2ip(lastBc - 1)}</code></td>
                <td><code>${i2ip(lastBc)}</code></td>
            </tr>`;
        }
        subnetsListHtml += '</table></div>';

        let nonPowerNote = '';
        if (Math.pow(2, bits) !== n) {
            nonPowerNote = `<b>Wichtiger Hinweis zu Nicht-Zweierpotenzen:</b> Du wolltest mindestens <b>${n}</b> Subnetze haben. Da man nur ganze Bits leihen kann, entstehen durch das Leihen von ${bits} Bits genau <b>${numSubnetsPossible}</b> gleich große Subnetze (2<sup>${bits}</sup>). Das <i>"letzte mögliche Subnetz"</i> bezieht sich immer auf das letzte dieser ${numSubnetsPossible} Netze (${numSubnetsPossible}. Subnetz), nicht auf das ${n}. Subnetz!`;
        }

        return `<ol class="sol-steps">
            <li>
                <div class="sol-step-title">Schritt 1 · Benötigte Subnetz-Bits berechnen</div>
                <div class="sol-calc">Gesucht: kleinstes x mit 2<sup>x</sup> ≥ ${n} → <b>x = ${bits} Bits</b> (liefert 2<sup>${bits}</sup> = ${numSubnetsPossible} Subnetze)</div>
                ${powersTable}
                <div class="sol-why">Jedes geliehene Bit verdoppelt die Anzahl der Subnetze. ${bits - 1} Bit${bits - 1 > 1 ? 's' : ''} würden nur ${Math.pow(2, bits - 1)} Subnetze liefern – das reicht für die geforderten ${n} Subnetze nicht aus.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 2 · Neues Präfix und Subnetzmaske ermitteln</div>
                <div class="sol-calc">
                    Neues Präfix: /${p} + ${bits} Bits = <b>/${np}</b><br>
                    Neue Subnetzmaske: <b><code>${npMaskStr}</code></b>
                </div>
                <div class="sol-why">Die geliehenen ${bits} Bits werden vom Hostanteil in den Netzanteil überführt. Die Maske wächst von /${p} auf /${np}. ${oi ? `Im ${oi.k}. Oktett ist die Schrittweite 256 − ${oi.m} = <b>${oi.block}</b>.` : `Die Netze springen um ${fmt(size)} Adressen.`}</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 3 · Übersicht der Subnetze</div>
                ${subnetsListHtml}
                <div class="sol-why">${nonPowerNote || 'Alle Subnetze liegen lückenlos und überschneidungsfrei hintereinander.'}</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 4 · Das ${k}. und das letzte Subnetz bestimmen</div>
                <div class="sol-calc">
                    ${k}. Subnetz: Basisadresse + (${k} − 1) × ${fmt(size)} = <b><code>${i2ip(subK)}/${np}</code></b><br>
                    Broadcast ${k}. Subnetz: <b><code>${i2ip(subK + size - 1)}</code></b><br>
                    Letztes mögliches Subnetz (#${numSubnetsPossible}): Basisadresse + (${numSubnetsPossible} − 1) × ${fmt(size)} = <b><code>${i2ip(last)}/${np}</code></b>
                </div>
                <div class="sol-why">Da der Index bei 0 beginnt, wird für das ${k}. Subnetz genau ${k - 1}-mal die Blockgröße addiert.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 5 · Nutzbare Hosts je Subnetz</div>
                <div class="sol-calc">Hostbits verbleibend: 32 − ${np} = ${32 - np} → 2<sup>${32 - np}</sup> − 2 = <b>${fmt(hostsPerSub)}</b> nutzbare Hosts</div>
                <div class="sol-why">Durch das Aufteilen verkleinert sich die Hostkapazität jedes einzelnen Subnetzes entsprechend.</div>
            </li>
        </ol>
        <h4 style="margin: 14px 0 6px 0;">Ergebnistabelle für das Formular:</h4>
        <div class="table-wrap">
            <table class="sol-table">
                <tr><th>Feld</th><th>Wert</th></tr>
                <tr><td>Neues Präfix</td><td><code>/${np}</code></td></tr>
                <tr><td>Neue Subnetzmaske</td><td><code>${npMaskStr}</code></td></tr>
                <tr><td>Hosts pro Subnetz</td><td><b>${fmt(hostsPerSub)}</b></td></tr>
                <tr><td>Netzadresse ${k}. Subnetz</td><td><code>${i2ip(subK)}</code></td></tr>
                <tr><td>Broadcast ${k}. Subnetz</td><td><code>${i2ip(subK + size - 1)}</code></td></tr>
                <tr><td>Netzadresse letztes Subnetz</td><td><code>${i2ip(last)}</code></td></tr>
            </table>
        </div>`;
    }

    // =========================================================================
    // TEIL A3: Lösungsweg für Typ C (Hostbedarf)
    // =========================================================================
    function hostsWay(h, x, np) {
        const maskStr = i2ip(maskI(np));
        const availHosts = hostsOf(np);

        let tableHtml = '<table class="sol-table" style="max-width:380px;"><tr><th>Hostbits x</th><th>2<sup>x</sup> − 2 Hosts</th><th>Reicht für ' + fmt(h) + ' Hosts?</th></tr>';
        for (let b = Math.max(2, x - 2); b <= x + 1; b++) {
            const cap = Math.pow(2, b) - 2;
            const isMatch = b === x;
            tableHtml += `<tr${isMatch ? ' style="background:var(--color-surface-offset); font-weight:bold;"' : ''}>
                <td>${b} Bits</td><td>${fmt(cap)} Hosts</td><td>${cap >= h ? '✓ Reicht aus (kleinstmöglich)' : '✗ Zu klein'}</td>
            </tr>`;
        }
        tableHtml += '</table>';

        return `<ol class="sol-steps">
            <li>
                <div class="sol-step-title">Schritt 1 · Benötigte Hostbits x bestimmen</div>
                <div class="sol-calc">Formel: kleinstes x mit <b>2<sup>x</sup> − 2 ≥ ${fmt(h)}</b> → <b>x = ${x} Hostbits</b></div>
                ${tableHtml}
                <div class="sol-why">Wir müssen <b>+2</b> Adressen für die Netzadresse (alle Hostbits 0) und die Broadcastadresse (alle Hostbits 1) hinzurechnen. Deshalb werden effektiv mindestens ${fmt(h + 2)} Adressen benötigt. Bei x = ${x - 1} stünden nur ${fmt(Math.pow(2, x - 1) - 2)} Hosts zur Verfügung, was zu wenig ist.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 2 · Präfixlänge berechnen</div>
                <div class="sol-calc">Präfix = Gesamte IPv4-Bits − Hostbits = 32 − ${x} = <b>/${np}</b></div>
                <div class="sol-why">Eine IPv4-Adresse hat immer exakt 32 Bits. Werden ${x} Bits für die Hosts reserviert, verbleiben 32 − ${x} Bits für den Netzanteil.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 3 · Subnetzmaske ermitteln</div>
                <div class="sol-calc">Subnetzmaske für /${np}: <b><code>${maskStr}</code></b></div>
                <div class="sol-why">Die ersten ${np} Bits sind 1, die restlichen ${x} Bits sind 0.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 4 · Kontrolle der nutzbaren Hosts</div>
                <div class="sol-calc">2<sup>${x}</sup> − 2 = ${fmt(Math.pow(2, x))} − 2 = <b>${fmt(availHosts)}</b> nutzbare Hosts (Bedarf: ${fmt(h)})</div>
                <div class="sol-why">Das Netz bietet mit ${fmt(availHosts)} Hosts ausreichend Platz für ${fmt(h)} Geräte. ${availHosts === h ? 'Dies ist eine Punktlandung (keine Adressverschwendung).' : `Es verbleiben ${fmt(availHosts - h)} Adressen als Reserve.`}</div>
            </li>
        </ol>
        <h4 style="margin: 14px 0 6px 0;">Ergebnistabelle für das Formular:</h4>
        <div class="table-wrap">
            <table class="sol-table">
                <tr><th>Feld</th><th>Wert</th></tr>
                <tr><td>Präfix</td><td><code>/${np}</code></td></tr>
                <tr><td>Subnetzmaske</td><td><code>${maskStr}</code></td></tr>
                <tr><td>Nutzbare Hosts</td><td><b>${fmt(availHosts)}</b></td></tr>
            </table>
        </div>`;
    }

    // =========================================================================
    // TEIL A4: Szenario- & Trace-Lösungswege
    // =========================================================================
    function scenarioWay(base, P, Sp, names, blocks, size, end, tr) {
        const oi = octetInfo(Sp), oiP = octetInfo(P);
        const site = i => base + i * size;
        const site1Nw = site(1);
        const site1Bc = site(1) + size - 1;
        const site2Router = site(2) + size - 2;
        const site3Nw = site(3);

        return `<ol class="sol-steps">
            <li>
                <div class="sol-step-title">Schritt 1 · Gesamten Firmenadressbereich erfassen</div>
                <div class="sol-calc">Block: <code>${i2ip(base)}/${P}</code> → Adressbereich: <code>${i2ip(base)}</code> bis <code>${i2ip(end)}</code></div>
                <div class="sol-why">Ein <code>/${P}</code>-Block ${oiP ? `hat im ${oiP.k}. Oktett eine Blockgröße von ${oiP.block}` : 'spannt den Adressbereich auf'}. Das Gesamtkontingent umfasst ${fmt(Math.pow(2, 32 - P))} IP-Adressen.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 2 · Standortnetze (/${Sp}) berechnen</div>
                <div class="sol-calc">
                    Maske für /${Sp}: <b><code>${i2ip(maskI(Sp))}</code></b> ${oi ? `(Blockgröße ${oi.block} im ${oi.k}. Oktett)` : ''}<br>
                    Hosts je Standort: 2<sup>${32 - Sp}</sup> − 2 = <b>${fmt(hostsOf(Sp))}</b> nutzbare Hosts
                </div>
                <div class="sol-why">Jeder Standort erhält ein vollwertiges /${Sp}-Subnetz, beginnend von vorn im Block.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 3 · Standort-Adressen aufstellen</div>
                <div class="table-wrap">
                    <table class="sol-table">
                        <tr><th>Standort</th><th>Netzadresse</th><th>Broadcast</th><th>Router-IP (letzte nutzbare)</th></tr>
                        <tr><td>1. ${names[0]}</td><td><code>${i2ip(site(0))}/${Sp}</code></td><td><code>${i2ip(site(0) + size - 1)}</code></td><td><code>${i2ip(site(0) + size - 2)}</code></td></tr>
                        <tr style="font-weight:bold; background:var(--color-surface-offset);"><td>2. ${names[1]} (gefragt)</td><td><code>${i2ip(site1Nw)}/${Sp}</code></td><td><code>${i2ip(site1Bc)}</code></td><td><code>${i2ip(site1Nw + size - 2)}</code></td></tr>
                        <tr style="font-weight:bold; background:var(--color-surface-offset);"><td>3. ${names[2]} (gefragt)</td><td><code>${i2ip(site(2))}/${Sp}</code></td><td><code>${i2ip(site(2) + size - 1)}</code></td><td><code>${i2ip(site2Router)}</code></td></tr>
                        <tr style="font-weight:bold; background:var(--color-surface-offset);"><td>4. ${names[3]} (gefragt)</td><td><code>${i2ip(site3Nw)}/${Sp}</code></td><td><code>${i2ip(site3Nw + size - 1)}</code></td><td><code>${i2ip(site3Nw + size - 2)}</code></td></tr>
                    </table>
                </div>
                <div class="sol-why">Jedes Standortnetz springt um exakt ${fmt(size)} Adressen weiter. Die Router-IP als letzte nutzbare Adresse ist immer <code>Broadcast − 1</code>.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 4 · Transfernetze (/30) rückwärts vergeben</div>
                <div class="sol-calc">
                    Maske Transfernetze: <b><code>255.255.255.252</code></b> (/30)<br>
                    1. Transfernetz (ganz am Ende): <b><code>${i2ip(tr(0))}/30</code></b> (Router-IPs: <code>${i2ip(tr(0) + 1)}</code> und <code>${i2ip(tr(0) + 2)}</code>)<br>
                    2. Transfernetz: <code>${i2ip(tr(1))}/30</code><br>
                    3. Transfernetz: <code>${i2ip(tr(2))}/30</code><br>
                    4. Transfernetz: <b><code>${i2ip(tr(3))}/30</code></b>
                </div>
                <div class="sol-why"><b>Warum rückwärts vom Ende?</b> Die Transfernetze belegen nur winzige 4-Byte-Blöcke. Indem man sie ganz ans Ende des letzten /${Sp}-Blocks legt, bleibt der davorliegende Adressraum für künftige neue Standorte zusammenhängend frei und muss nicht zerschnitten werden.</div>
            </li>
            <li>
                <div class="sol-step-title">Schritt 5 · Maximale Standortanzahl</div>
                <div class="sol-calc">2<sup>${Sp} − ${P}</sup> = 2<sup>${Sp - P}</sup> = ${blocks} Blöcke /${Sp} gesamt − 1 Block für Transfernetze = <b>${blocks - 1} Standorte</b></div>
                <div class="sol-why">Da der letzte /${Sp}-Block durch die Transfernetze blockiert ist, können maximal ${blocks - 1} vollwertige Standortnetze vergeben werden.</div>
            </li>
        </ol>`;
    }

    function traceWay(dstMAC, srcMAC, total, ttl, proto, protoName, srcIP, dstIP, sp, dp, svc, flags, textShow, payload, l4, l4s) {
        let w = '<ol class="sol-steps">';
        w += `<li>
            <div class="sol-step-title">Schritt 1 · Ethernet-Header (14 Bytes, Offset 0x00 bis 0x0D)</div>
            <div class="sol-calc">
                Ziel-MAC (0x00–0x05): <code>${macStr(dstMAC)}</code><br>
                Quell-MAC (0x06–0x0B): <code>${macStr(srcMAC)}</code><br>
                EtherType (0x0C–0x0D): <code>08 00</code> (definiert IPv4 als nachfolgendes Protokoll)
            </div>
            <div class="sol-why">Im Ethernet-Frame steht die <b>Ziel-MAC stets vor der Quell-MAC</b>, damit Switches sofort nach den ersten 6 Bytes mit der Weiterleitung beginnen können (Cut-Through).</div>
        </li>`;

        w += `<li>
            <div class="sol-step-title">Schritt 2 · IPv4-Header Grundlagen (Start bei 0x0E)</div>
            <div class="sol-calc">
                Byte 0x0E: <code>45</code> → IPv4, IHL = 5 (5 × 4 = 20 Bytes Headerlänge)<br>
                Gesamtlänge (0x10–0x11): <code>${hex2(total >> 8)} ${hex2(total & 255)}</code> = <b>${total} Bytes</b> (IP-Header + Transport + Daten)<br>
                TTL (0x16): <code>${hex2(ttl)}</code> = <b>${ttl}</b> (Time-to-Live)<br>
                Protokoll-Feld (0x17): <code>${hex2(proto)}</code> = <b>${protoName}</b> (01 = ICMP, 06 = TCP, 11 hex = 17 dec = UDP)
            </div>
            <div class="sol-why">Da keine IP-Optionen vorhanden sind (IHL=5), ist der IPv4-Header exakt 20 Bytes lang und endet bei Offset 0x21.</div>
        </li>`;

        w += `<li>
            <div class="sol-step-title">Schritt 3 · IP-Adressen (Quell- und Ziel-IP)</div>
            <div class="sol-calc">
                Quell-IP (0x1A–0x1D): <code>${srcIP.map(hex2).join(' ')}</code> = <b><code>${srcIP.join('.')}</code></b><br>
                Ziel-IP (0x1E–0x21): <code>${dstIP.map(hex2).join(' ')}</code> = <b><code>${dstIP.join('.')}</code></b>
            </div>
            <div class="sol-why">Jedes Byte wird direkt in eine dezimale Oktette umgerechnet (z. B. C0=192, A8=168). Beachte, dass die Ziel-IP im Hex-Dump über den Zeilenumbruch bei 0x20 reicht.</div>
        </li>`;

        if (proto !== 1) {
            w += `<li>
                <div class="sol-step-title">Schritt 4 · Transport-Ports (Start bei 0x22)</div>
                <div class="sol-calc">
                    Quell-Port (0x22–0x23): <code>${hex2(l4[0])} ${hex2(l4[1])}</code> = <b>${sp}</b><br>
                    Ziel-Port (0x24–0x25): <code>${hex2(l4[2])} ${hex2(l4[3])}</code> = <b>${dp}</b><br>
                    Erkannter Dienst: <b>${svc.n}</b> (Standardport ${svc.p})
                </div>
                <div class="sol-why">Der kleinere, bekannte Port gehört zum Serverdienst (${svc.n}), der dynamische Port (≥ 49152) zum Client. ${svc.p === dp ? 'Das Paket läuft vom Client zum Server.' : 'Das Paket ist eine Serverantwort an den Client.'}</div>
            </li>`;
        }

        if (proto === 6) {
            const doff = l4[12] >> 4;
            w += `<li>
                <div class="sol-step-title">Schritt 5 · TCP-Header Länge und Flags</div>
                <div class="sol-calc">
                    Data Offset (0x2E, obere 4 Bits): <code>${hex2(l4[12])}</code> → ${doff} × 4 = <b>${doff * 4} Bytes Headerlänge</b><br>
                    TCP-Flags (0x2F): <code>${hex2(flags)}</code> = <b>${FLAGNAMES[flags]}</b>
                </div>
                <div class="sol-why">Bit-Aufbau von Byte 0x2F: 02 = SYN, 10 = ACK, 08 = PSH (18 = PSH+ACK). Beträgt der Offset mehr als 20 Bytes, enthält der TCP-Header zusätzliche Optionen (z. B. MSS oder Timestamps).</div>
            </li>`;
        } else if (proto === 17) {
            w += `<li>
                <div class="sol-step-title">Schritt 5 · UDP-Header</div>
                <div class="sol-calc">Länge-Feld (0x26–0x27): <code>${hex2(l4[4])} ${hex2(l4[5])}</code> = <b>${8 + payload.length} Bytes</b> (8 Bytes Header + ${payload.length} Bytes Nutzdaten)</div>
                <div class="sol-why">Der UDP-Header ist stets exakt 8 Bytes lang und hat keine variablen Optionen.</div>
            </li>`;
        } else if (proto === 1) {
            w += `<li>
                <div class="sol-step-title">Schritt 5 · ICMP (Ping)</div>
                <div class="sol-calc">Typ (0x22): <code>08</code> (Echo Request) · Code (0x23): <code>00</code></div>
                <div class="sol-why">ICMP hat keine Portnummern. Die Payload mit fortlaufendem Alphabet (abcdef...) ist das klassische Windows-Ping-Muster.</div>
            </li>`;
        }

        if (payload.length > 0) {
            w += `<li>
                <div class="sol-step-title">Schritt 6 · Nutzdaten (Payload)</div>
                <div class="sol-calc">Daten ab Offset <code>0x${(l4s + l4.length).toString(16)}</code>: <b>„${textShow}“</b> (${payload.length} Bytes)</div>
                <div class="sol-why">Kontrollrechnung: IP-Gesamtlänge ${total} − 20 (IP-Header) − ${l4.length} (Transport-Header) = <b>${payload.length} Bytes</b>. Im ASCII-Bereich rechts im Dump ist der Text lesbar.</div>
            </li>`;
        } else {
            w += `<li>
                <div class="sol-step-title">Schritt 6 · Nutzdaten</div>
                <div class="sol-calc">Keine Nutzdaten vorhanden (Payload = 0 Bytes)</div>
                <div class="sol-why">Beim SYN-Handshake (Verbindungsaufbau) oder reinen ACKs werden keine Anwendungsdaten übertragen.</div>
            </li>`;
        }

        w += '</ol>';
        return w;
    }

    // =========================================================================
    // STATE DER TRAINER
    // =========================================================================
    const S = { fields: [], score: { ok: 0, tot: 0 } };
    const Z = { fields: [], score: { ok: 0, tot: 0 } };
    const T = { fields: [], score: { ok: 0, tot: 0 }, colored: false, bytes: [] };

    function randPrivate() {
        const t = R(0, 2);
        if (t === 0) return ip2i(`10.${R(0, 255)}.${R(0, 255)}.${R(1, 254)}`);
        if (t === 1) return ip2i(`172.${R(16, 31)}.${R(0, 255)}.${R(1, 254)}`);
        return ip2i(`192.168.${R(0, 255)}.${R(1, 254)}`);
    }

    function newS() {
        const t = $('stype').value;
        let task, f, sol;
        if (t === 'calc') {
            const p = pick([17, 18, 19, 20, 21, 22, 22, 23, 23, 24, 25, 26, 26, 27, 27, 28, 29, 30]);
            const ip = randPrivate();
            task = `Host-IP: <code>${i2ip(ip)}/${p}</code>. Berechne die Subnetzmaske, die Netzwerkadresse, den ersten und letzten nutzbaren Host, den Broadcast und die Gesamtzahl nutzbarer Hosts.`;
            f = [
                { label: 'Subnetzmaske', type: 'ip', ans: i2ip(maskI(p)) },
                { label: 'Netzadresse', type: 'ip', ans: i2ip(nw(ip, p)) },
                { label: 'Erster Host', type: 'ip', ans: i2ip(nw(ip, p) + 1) },
                { label: 'Letzter Host', type: 'ip', ans: i2ip(bc(ip, p) - 1) },
                { label: 'Broadcast', type: 'ip', ans: i2ip(bc(ip, p)) },
                { label: 'Nutzbare Hosts', type: 'num', ans: hostsOf(p), show: fmt(hostsOf(p)) }
            ];
            sol = calcWay(ip, p);
        } else if (t === 'split') {
            const p = pick([16, 18, 19, 20, 21, 22, 23, 24, 24, 25]);
            const n = pick([2, 3, 4, 5, 6, 8, 10, 12, 16]);
            const bits = Math.ceil(Math.log2(n));
            const np = p + bits;
            const base = nw(randPrivate(), p);
            const size = Math.pow(2, 32 - np);
            const k = Math.min(n, R(2, 4));
            const subK = base + (k - 1) * size;
            const last = base + (Math.pow(2, bits) - 1) * size;

            task = `Das Netzwerk <code>${i2ip(base)}/${p}</code> soll in mindestens <b>${n}</b> gleich große Subnetze aufgeteilt werden.`;
            f = [
                { label: 'Neues Präfix (z. B. 26)', type: 'num', ans: np, show: '/' + np },
                { label: 'Neue Subnetzmaske', type: 'ip', ans: i2ip(maskI(np)) },
                { label: 'Hosts pro Subnetz', type: 'num', ans: hostsOf(np), show: fmt(hostsOf(np)) },
                { label: `Netzadresse ${k}. Subnetz`, type: 'ip', ans: i2ip(subK) },
                { label: `Broadcast ${k}. Subnetz`, type: 'ip', ans: i2ip(subK + size - 1) },
                { label: 'Netzadresse letztes mögliches Subnetz', type: 'ip', ans: i2ip(last) }
            ];
            sol = splitWay(base, p, n, bits, np, k, subK, last, size);
        } else {
            const h = pick([10, 14, 25, 30, 50, 60, 62, 100, 120, 126, 200, 250, 300, 500, 510, 700, 1000, 1022, 1500, 2000, 3000, 4000]);
            let x = 2;
            while (Math.pow(2, x) - 2 < h) x++;
            const np = 32 - x;
            task = `Ein neues Netzsegment benötigt Platz für mindestens <b>${fmt(h)}</b> Hosts. Ermittle das kleinstmögliche passende Präfix, die Subnetzmaske und die Anzahl tatsächlich verfügbarer Host-Adressen.`;
            f = [
                { label: 'Präfix (z. B. 24)', type: 'num', ans: np, show: '/' + np },
                { label: 'Subnetzmaske', type: 'ip', ans: i2ip(maskI(np)) },
                { label: 'Nutzbare Hosts in diesem Netz', type: 'num', ans: hostsOf(np), show: fmt(hostsOf(np)) }
            ];
            sol = hostsWay(h, x, np);
        }

        S.fields = f;
        $('stask').innerHTML = task;
        buildForm($('sform'), f, 'sf');
        $('ssolbox').innerHTML = sol;
        resetSolBox($('ssol'), $('ssolbox'));
        $('sfb').textContent = '';
    }

    function newZ() {
        const cfg = pick([[16, 19], [16, 20], [17, 20], [18, 21], [18, 21], [18, 22], [19, 22], [20, 23], [20, 24], [22, 25]]);
        const P = cfg[0], Sp = cfg[1];
        let base;
        const t = R(0, 2);
        if (t === 0) base = nw(ip2i(`10.${R(1, 250)}.${R(0, 255)}.0`), P);
        else base = nw(ip2i(`172.${R(16, 31)}.${R(0, 255)}.0`), P);

        const names = pick([
            ['Leipzig', 'Dresden', 'Chemnitz', 'Görlitz'],
            ['Berlin', 'Hamburg', 'München', 'Köln'],
            ['Halle', 'Erfurt', 'Jena', 'Zwickau'],
            ['Frankfurt', 'Stuttgart', 'Nürnberg', 'Augsburg']
        ]);
        const blocks = Math.pow(2, Sp - P), size = Math.pow(2, 32 - Sp);
        const site = i => base + i * size;
        const end = bc(base, P);
        const tr = i => end - 3 - 4 * i;

        Z.fields = [
            { label: 'Maske der Standortnetze', type: 'ip', ans: i2ip(maskI(Sp)) },
            { label: 'Nutzbare Hosts je Standort', type: 'num', ans: hostsOf(Sp), show: fmt(hostsOf(Sp)) },
            { label: `NW-Adresse ${names[1]} (2. Standort)`, type: 'ip', ans: i2ip(site(1)) },
            { label: `Broadcast ${names[1]}`, type: 'ip', ans: i2ip(site(1) + size - 1) },
            { label: `Router-IP ${names[2]} (letzte nutzbare)`, type: 'ip', ans: i2ip(site(2) + size - 2) },
            { label: `NW-Adresse ${names[3]} (4. Standort)`, type: 'ip', ans: i2ip(site(3)) },
            { label: 'Maske der Transfernetze', type: 'ip', ans: '255.255.255.252' },
            { label: 'NW-Adresse 1. Transfernetz', type: 'ip', ans: i2ip(tr(0)) },
            { label: 'Router-IP im 1. Transfernetz (kleinere)', type: 'ip', ans: i2ip(tr(0) + 1) },
            { label: 'NW-Adresse 4. Transfernetz', type: 'ip', ans: i2ip(tr(3)) },
            { label: 'Max. Anzahl Standorte', type: 'num', ans: blocks - 1 }
        ];

        $('ztask').innerHTML = `Die Firma erhält den Gesamtblock <code>${i2ip(base)}/${P}</code>. Die Standorte <b>${names.join(', ')}</b> erhalten jeweils ein <b>/${Sp}</b> (in dieser Reihenfolge, ab Anfang des Bereichs). Die vier Router werden im Ring über /30-Transfernetze verbunden. Das 1. Transfernetz liegt ganz am Ende des Bereichs, jedes weitere direkt davor.`;
        buildForm($('zform'), Z.fields, 'zf');
        $('zsolbox').innerHTML = scenarioWay(base, P, Sp, names, blocks, size, end, tr);
        resetSolBox($('zsol'), $('zsolbox'));
        $('zfb').textContent = '';
    }

    // --- Trace-Trainer Helfer & Generator ---
    function parseFrame(b) {
        const reg = new Array(b.length).fill('d');
        for (let i = 0; i < 14 && i < b.length; i++) reg[i] = 'e';
        if (b[12] === 0x08 && b[13] === 0x00 && b.length >= 34) {
            const ihl = (b[14] & 15) * 4;
            for (let i = 14; i < 14 + ihl && i < b.length; i++) reg[i] = 'i';
            const l4 = 14 + ihl, pr = b[23];
            let l4len = 0;
            if (pr === 6 && b.length >= l4 + 13) l4len = (b[l4 + 12] >> 4) * 4;
            else if (pr === 17) l4len = 8;
            else if (pr === 1) l4len = 8;
            for (let i = l4; i < l4 + l4len && i < b.length; i++) reg[i] = 't';
        }
        return reg;
    }

    function renderDump(bytes) {
        const reg = parseFrame(bytes);
        let out = '';
        for (let r = 0; r < bytes.length; r += 16) {
            let line = `<span class="off">${r.toString(16).padStart(4, '0')}</span>`;
            let asc = '';
            for (let c = 0; c < 16; c++) {
                const i = r + c;
                if (i < bytes.length) {
                    line += `<b class="${reg[i]}">${hex2(bytes[i])}</b>${c < 15 && i + 1 < bytes.length && reg[i + 1] === reg[i] ? `<b class="${reg[i]}"> </b>` : ' '}`;
                    const v = bytes[i];
                    asc += (v >= 32 && v < 127) ? (v === 60 ? '&lt;' : v === 62 ? '&gt;' : v === 38 ? '&amp;' : String.fromCharCode(v)) : '.';
                } else {
                    line += '   ';
                }
            }
            out += line + `<span class="asc">${asc}</span>\n`;
        }
        return out;
    }

    const hexToBytes = s => s.trim().split(/\s+/).map(h => parseInt(h, 16));

    function randMac() {
        const m = [R(0, 255) & 0xfc];
        for (let i = 0; i < 5; i++) m.push(R(0, 255));
        return m;
    }
    const macStr = m => m.map(hex2).join(':');

    function ipCsum(h) {
        let s = 0;
        for (let i = 0; i < h.length; i += 2) s += (h[i] << 8) + h[i + 1];
        while (s >> 16) s = (s & 0xffff) + (s >> 16);
        return (~s) & 0xffff;
    }

    const u16 = n => [(n >> 8) & 255, n & 255];
    const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const txt = s => Array.from(s).map(c => c.charCodeAt(0));
    const FLAGNAMES = { 0x02: 'SYN', 0x12: 'SYN, ACK', 0x10: 'ACK', 0x18: 'PSH, ACK', 0x11: 'FIN, ACK' };

    function newT() {
        let kind = $('tkind').value;
        if (kind === 'mix') kind = pick(['tcpdata', 'tcpdata', 'tcpsyn', 'udp', 'icmp']);
        const net = pick([[10, R(0, 255), R(0, 255)], [192, 168, R(0, 255)], [172, R(16, 31), R(0, 255)]]);
        const cIP = [...net, R(2, 253)];
        let sIP = [...net, R(2, 253)];
        while (sIP[3] === cIP[3]) sIP = [...net, R(2, 253)];
        const cMAC = randMac(), sMAC = randMac();
        const cPort = R(49152, 65535);

        let svc, payload = [], l4 = [], proto, flags = null, toServer = true, text = '', ttl = pick([64, 64, 128, 128, 255]);

        if (kind === 'tcpdata' || kind === 'tcpsyn') {
            proto = 6;
            svc = pick([
                { p: 7, n: 'Echo', t: ['Hallo Welt\r\n', 'Test 123\r\n', 'Ping Pong\r\n'] },
                { p: 23, n: 'Telnet', t: ['admin\r\n', 'ls -l\r\n'] },
                { p: 21, n: 'FTP', t: ['USER max\r\n', 'PASS geheim\r\n'] },
                { p: 80, n: 'HTTP', t: ['GET / HTTP/1.1\r\n', 'GET /index.html\r\n'] },
                { p: 25, n: 'SMTP', t: ['HELO bfw.de\r\n'] },
                { p: 110, n: 'POP3', t: ['USER anna\r\n'] }
            ]);
            const opts = kind === 'tcpsyn' ? [0x02, 0x04, 0x05, 0xb4] : (Math.random() < .6 ? [1, 1, 8, 10, ...u32(R(1, 2e9)), ...u32(R(1, 2e9))] : []);
            const doff = (20 + opts.length) / 4;
            if (kind === 'tcpsyn') {
                flags = 0x02;
                toServer = true;
            } else {
                flags = 0x18;
                text = pick(svc.t);
                payload = txt(text);
                toServer = svc.p === 7 ? Math.random() < .5 : true;
            }
            const sp = toServer ? cPort : svc.p, dp = toServer ? svc.p : cPort;
            l4 = [...u16(sp), ...u16(dp), ...u32(R(1, 4e9)), ...u32(kind === 'tcpsyn' ? 0 : R(1, 4e9)), (doff << 4), flags, ...u16(R(200, 65000)), ...u16(R(0, 65535)), 0, 0, ...opts];
        } else if (kind === 'udp') {
            proto = 17;
            svc = pick([
                { p: 7, n: 'Echo', t: ['Hallo Welt', 'UDP Test'] },
                { p: 514, n: 'Syslog', t: ['<34>login failed', '<13>backup ok'] },
                { p: 69, n: 'TFTP', t: [] }
            ]);
            if (svc.p === 69) {
                text = '\u0000\u0001config.txt\u0000octet\u0000';
                payload = txt(text);
                text = 'config.txt (RRQ)';
            } else {
                text = pick(svc.t);
                payload = txt(text);
            }
            toServer = true;
            l4 = [...u16(cPort), ...u16(svc.p), ...u16(8 + payload.length), ...u16(R(0, 65535))];
        } else {
            proto = 1;
            svc = { p: null, n: 'Ping' };
            text = 'abcdefghijklmnopqrstuvwabcdefghi';
            payload = txt(text);
            toServer = true;
            ttl = pick([64, 128]);
            l4 = [8, 0, ...u16(R(0, 65535)), ...u16(R(1, 20)), ...u16(R(1, 200))];
        }

        const srcIP = toServer ? cIP : sIP, dstIP = toServer ? sIP : cIP;
        const srcMAC = toServer ? cMAC : sMAC, dstMAC = toServer ? sMAC : cMAC;
        const tos = pick([0, 0, 0x10]);
        const total = 20 + l4.length + payload.length;
        let iph = [0x45, tos, ...u16(total), ...u16(R(0, 65535)), 0x40, 0, ttl, proto, 0, 0, ...srcIP, ...dstIP];
        const cs = ipCsum(iph);
        iph[10] = cs >> 8;
        iph[11] = cs & 255;
        const bytes = [...dstMAC, ...srcMAC, 0x08, 0x00, ...iph, ...l4, ...payload];
        T.bytes = bytes;

        const protoName = { 1: 'ICMP', 6: 'TCP', 17: 'UDP' }[proto];
        const sp = proto === 1 ? null : (l4[0] << 8) + l4[1];
        const dp = proto === 1 ? null : (l4[2] << 8) + l4[3];
        const textShow = proto === 1 ? text : (text === '' ? '– (keine Daten)' : text.replace(/\r/g, '\\r').replace(/\n/g, '\\n'));

        T.fields = [
            { label: 'Ziel-MAC', type: 'mac', ans: macStr(dstMAC), ph: 'aa:bb:cc:dd:ee:ff' },
            { label: 'Quell-MAC', type: 'mac', ans: macStr(srcMAC) },
            { label: 'Quell-IP', type: 'ip', ans: srcIP.join('.') },
            { label: 'Ziel-IP', type: 'ip', ans: dstIP.join('.') },
            { label: 'TTL (dezimal)', type: 'num', ans: ttl },
            { label: 'Transportprotokoll', type: 'sel', opts: ['TCP', 'UDP', 'ICMP'], ans: protoName },
            { label: 'Quell-Port', type: 'num', ans: sp ?? '', disabled: proto === 1 },
            { label: 'Ziel-Port', type: 'num', ans: dp ?? '', disabled: proto === 1 },
            { label: 'Dienst / Anwendung', type: 'sel', opts: ['Echo', 'Telnet', 'FTP', 'HTTP', 'SMTP', 'POP3', 'Syslog', 'TFTP', 'Ping'], ans: svc.n },
            { label: 'TCP-Flags', type: 'sel', opts: ['SYN', 'SYN, ACK', 'ACK', 'PSH, ACK', 'FIN, ACK'], ans: flags !== null ? FLAGNAMES[flags] : '', disabled: proto !== 6 },
            { label: 'Nutzdaten als Text', type: 'text', ans: (kind === 'tcpsyn' ? '' : (svc.p === 69 ? 'config.txt' : text)), show: textShow, disabled: kind === 'tcpsyn', ph: 'ohne \\r\\n' }
        ];

        T.fields.forEach(f => { if (f.type === 'sel' && f.ans === '') f.disabled = true; });
        buildForm($('tform'), T.fields, 'tf');
        T.fields.forEach((f, i) => {
            if (f.disabled && f.type === 'sel') {
                const el = $('tf_' + i);
                el.disabled = true;
                el.innerHTML = '<option>entfällt</option>';
            }
        });
        T.colored = false;
        drawT();

        const l4s = 34;
        $('tsolbox').innerHTML = traceWay(dstMAC, srcMAC, total, ttl, proto, protoName, srcIP, dstIP, sp, dp, svc, flags, textShow, payload, l4, l4s);
        resetSolBox($('tsol'), $('tsolbox'));
        $('tfb').textContent = '';
    }

    function drawT() {
        const d = $('tdump');
        d.innerHTML = renderDump(T.bytes);
        d.classList.toggle('colored', T.colored);
        $('tcolor').textContent = T.colored ? 'Ausblenden' : '🎨 Bereiche zeigen';
    }

    // =========================================================================
    // TEIL B: Barrierefreie Tab- & Segmented Control Steuerung
    // =========================================================================
    function initAccessibleTabs() {
        const tabList = document.querySelector('.tabs-nav-scrollable') || document.querySelector('.tabs-nav');
        if (!tabList) return;

        const tabs = tabList.querySelectorAll('.tab-btn');
        const panes = document.querySelectorAll('.tab-pane');

        function switchTab(btn, updateHash = true) {
            const targetId = btn.getAttribute('data-tab');
            if (!targetId) return;

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });
            panes.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('hidden', 'true');
            });

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            btn.setAttribute('tabindex', '0');

            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.removeAttribute('hidden');
            }

            if (updateHash) {
                try {
                    history.replaceState(null, null, '#' + targetId);
                } catch (e) {}
            }
        }

        tabs.forEach((tab, index) => {
            tab.setAttribute('role', 'tab');
            const targetId = tab.getAttribute('data-tab');
            tab.setAttribute('aria-controls', targetId);
            tab.setAttribute('id', 'tab-btn-' + targetId);

            const pane = document.getElementById(targetId);
            if (pane) {
                pane.setAttribute('role', 'tabpanel');
                pane.setAttribute('aria-labelledby', 'tab-btn-' + targetId);
            }

            tab.addEventListener('click', () => switchTab(tab, true));

            tab.addEventListener('keydown', e => {
                let nextIndex = null;
                if (e.key === 'ArrowRight') {
                    nextIndex = (index + 1) % tabs.length;
                } else if (e.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                } else if (e.key === 'Home') {
                    nextIndex = 0;
                } else if (e.key === 'End') {
                    nextIndex = tabs.length - 1;
                }

                if (nextIndex !== null) {
                    e.preventDefault();
                    tabs[nextIndex].focus();
                    switchTab(tabs[nextIndex], true);
                }
            });
        });

        // Hash-Verlinkung beim Laden prüfen
        const initialHash = (location.hash || '').replace('#', '');
        let matchedTab = null;
        if (initialHash) {
            matchedTab = Array.from(tabs).find(t => t.getAttribute('data-tab') === initialHash);
        }
        if (matchedTab) {
            switchTab(matchedTab, false);
        } else if (tabs.length > 0) {
            const activeTab = Array.from(tabs).find(t => t.classList.contains('active')) || tabs[0];
            switchTab(activeTab, false);
        }
    }

    // Segmented Control im Üben-Bereich
    window.showPracticeSub = function (paneId, btnId) {
        const segNav = document.querySelector('.segmented-nav');
        if (segNav) {
            segNav.querySelectorAll('.segmented-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
        }
        document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'));

        const btn = document.getElementById(btnId);
        const pane = document.getElementById(paneId);
        if (btn) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        }
        if (pane) {
            pane.classList.add('active');
        }
    };

    // =========================================================================
    // TEIL B3: Interaktiver CIDR-Schieberegler
    // =========================================================================
    function initCidrSlider() {
        const slider = $('cidr-range');
        if (!slider) return;

        function updateSlider() {
            const p = parseInt(slider.value, 10);
            const m = maskI(p);
            const maskStr = i2ip(m);
            const oi = octetInfo(p);
            const block = oi ? oi.block : (p >= 32 ? 1 : 256);
            const hosts = hostsOf(p);

            $('slider-val-prefix').textContent = '/' + p;
            $('slider-val-mask').textContent = maskStr;
            $('slider-val-block').textContent = block;
            $('slider-val-hosts').textContent = p === 31 ? '2 (RFC 3021)' : (p === 32 ? '1 Host' : fmt(hosts));

            // Bit-Leiste im Widget aktualisieren
            const widgetBitBar = $('slider-bit-bar');
            if (widgetBitBar) {
                let html = '';
                for (let o = 0; o < 4; o++) {
                    html += '<div class="bit-octet">';
                    for (let b = 0; b < 8; b++) {
                        const bitNum = o * 8 + b + 1;
                        const isNet = bitNum <= p;
                        const isBound = bitNum === p && p < 32;
                        html += `<div class="bit-cell ${isNet ? 'net' : 'host'}${isBound ? ' bit-boundary' : ''}">${isNet ? '1' : '0'}</div>`;
                    }
                    html += '</div>';
                    if (o < 3) html += '<span class="bit-dot">.</span>';
                }
                widgetBitBar.innerHTML = html;
            }
        }

        slider.addEventListener('input', updateSlider);
        updateSlider();
    }

    // =========================================================================
    // TEIL B4: Feste Übungsaufgaben mit toleranter Prüfung & Fortschritt
    // =========================================================================
    const fixedSolved = { 1: false, 2: false, 3: false, 4: false };

    function updateFixedProgress() {
        const solvedCount = Object.values(fixedSolved).filter(Boolean).length;
        const total = 4;
        const fillEl = $('fixed-prog-fill');
        const textEl = $('fixed-prog-text');
        if (fillEl) fillEl.style.width = ((solvedCount / total) * 100) + '%';
        if (textEl) textEl.textContent = `${solvedCount} von ${total} Aufgaben gelöst`;
    }

    // Tolerante IPv6 Normalisierung
    function normIPv6(s) {
        if (!s) return '';
        let clean = String(s).trim().toLowerCase();
        let prefix = '';
        if (clean.includes('/')) {
            const parts = clean.split('/');
            clean = parts[0];
            prefix = '/' + parts[1].trim();
        }
        let hextets;
        if (clean.includes('::')) {
            const sides = clean.split('::');
            const left = sides[0] ? sides[0].split(':') : [];
            const right = sides[1] ? sides[1].split(':') : [];
            const missing = 8 - (left.length + right.length);
            const zeros = new Array(missing).fill('0');
            hextets = [...left, ...zeros, ...right];
        } else {
            hextets = clean.split(':');
        }
        hextets = hextets.map(h => h.replace(/^0+/, '') || '0');
        return hextets.join(':') + prefix;
    }

    window.checkFixed1 = function () {
        const p1 = $('fixed1-p1').value.trim().replace(/^\//, '');
        const p2 = $('fixed1-p2').value.trim();
        const fb = $('fixed1-fb');

        const p1Ok = (p1 === '62');
        const p2Ok = (p2 === '4');

        if (p1Ok && p2Ok) {
            fb.className = 'fixed-feedback ok';
            fb.textContent = '✓ Hervorragend! Neues Präfix /62 und 4 Subnetze je Standort sind vollkommen richtig.';
            fixedSolved[1] = true;
        } else if (p1Ok) {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Präfix /62 stimmt! Die Anzahl der /64-Subnetze (64 − 62 = 2 Bits → 2² = 4) stimmt noch nicht.';
        } else {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Noch nicht ganz richtig. Tipp: 4 Standorte brauchen 2 Bits (2²=4) → 60 + 2 = /62.';
        }
        updateFixedProgress();
    };

    window.checkFixed2 = function () {
        const p = $('fixed2-p').value.trim().replace(/^\//, '');
        const n1 = normIPv6($('fixed2-n1').value);
        const n2 = normIPv6($('fixed2-n2').value);
        const fb = $('fixed2-fb');

        const pOk = (p === '53');
        const n1Expected = normIPv6('2a00:1450:4001:0000::/53');
        const n2Expected = normIPv6('2a00:1450:4001:0800::/53');

        const n1Ok = (n1 === n1Expected || n1 === normIPv6('2a00:1450:4001::/53'));
        const n2Ok = (n2 === n2Expected);

        if (pOk && n1Ok && n2Ok) {
            fb.className = 'fixed-feedback ok';
            fb.textContent = '✓ Perfekt! Präfix /53 und die Schrittweite +0800 hexadezimal im 4. Hextett stimmen exakt.';
            fixedSolved[2] = true;
        } else {
            let msg = [];
            if (!pOk) msg.push('Präfix /53 (49+4)');
            if (!n1Ok) msg.push('Netz 1 (...:0000::/53)');
            if (!n2Ok) msg.push('Netz 2 (...:0800::/53)');
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Überprüfe: ' + msg.join(', ');
        }
        updateFixedProgress();
    };

    window.checkFixed3 = function () {
        const v1 = $('fixed3-v1').value.trim();
        const v2 = $('fixed3-v2').value.trim();
        const fb = $('fixed3-fb');

        // v1 prüfen: 10.50.0.0, 10.50.16.0, 10.50.32.0
        const v1Ok = v1.includes('10.50.0.0') && v1.includes('10.50.16.0') && v1.includes('10.50.32.0');
        const v2Clean = v2.replace(/\s+/g, '');
        const v2Ok = v2Clean.startsWith('10.50.64.0');

        if (v1Ok && v2Ok) {
            fb.className = 'fixed-feedback ok';
            fb.textContent = '✓ Exzellent! Die 16er-Schritte der /20-Netze und das anschließende /30-Koppelnetz bei 10.50.64.0 stimmen genau.';
            fixedSolved[3] = true;
        } else if (v1Ok) {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Teil 1 stimmt! Das vierte Netz endet bei 10.50.63.255. Das nächste freie Netz für Koppelnetze ist 10.50.64.0/30.';
        } else {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Maske /20 ist 255.255.240.0 → Blockgröße 16 im 3. Oktett (.0.0, .16.0, .32.0).';
        }
        updateFixedProgress();
    };

    window.checkFixed4 = function () {
        const mac = normMac($('fixed4-mac').value);
        const ips = $('fixed4-ip').value.trim();
        const fb = $('fixed4-fb');

        const macExpected = normMac('bc:5f:f4:8a:12:34');
        const macOk = (mac === macExpected);
        const ipsOk = ips.includes('192.168.1.10') && ips.includes('8.8.8.8');

        if (macOk && ipsOk) {
            fb.className = 'fixed-feedback ok';
            fb.textContent = '✓ Richtig! Ziel-MAC (die ersten 6 Bytes) und Quell-IP 192.168.1.10 nach Ziel-IP 8.8.8.8 wurden korrekt ausgelesen.';
            fixedSolved[4] = true;
        } else if (macOk) {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ MAC stimmt! IPs: c0 a8 01 0a = 192.168.1.10 und 08 08 08 08 = 8.8.8.8.';
        } else {
            fb.className = 'fixed-feedback bad';
            fb.textContent = '→ Ziel-MAC steht in den ersten 6 Bytes: bc:5f:f4:8a:12:34.';
        }
        updateFixedProgress();
    };

    // =========================================================================
    // INITIALISIERUNG
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Barrierefreie Tabs
        initAccessibleTabs();

        // 2. CIDR Schieberegler
        initCidrSlider();

        // 3. Trainer Event-Bindings
        $('snew').onclick = newS;
        $('stype').onchange = newS;
        $('scheck').onclick = () => checkForm(S.fields, 'sf', S.score, $('sscore'), $('sfb'));
        $('ssol').onclick = () => toggleSolBox($('ssol'), $('ssolbox'));

        $('znew').onclick = newZ;
        $('zcheck').onclick = () => checkForm(Z.fields, 'zf', Z.score, $('zscore'), $('zfb'));
        $('zsol').onclick = () => toggleSolBox($('zsol'), $('zsolbox'));

        $('tnew').onclick = newT;
        $('tkind').onchange = newT;
        $('tcolor').onclick = () => { T.colored = !T.colored; drawT(); };
        $('tcheck').onclick = () => checkForm(T.fields, 'tf', T.score, $('tscore'), $('tfb'));
        $('tsol').onclick = () => toggleSolBox($('tsol'), $('tsolbox'));

        // 4. AB07 Traces im Unterricht-Tab rendern
        const AB07 = [
            `01 00 5e 7f ff fa 24 7d 4d 82 f4 9c 08 00 45 00 01 4c 00 00 40 00 01 11 74 54 0a 02 0a 51 ef ff ff fa b7 a2 c8 00 01 38 fe 78 d9 90 2a d3 2f 7e 3f 1e 6b 8d ff 51 30 98 1d ac 9b 80 07 13 f4 dd 52 d1 14 58 db c2 62 66 e3 c9 c5 6e 03 f6 97 cd 99 80 89 d9 b5 5d 93 91 98 75 ae 76 3f ce 83 5a 22 42 52 85 a0 9c e8 ec ad 5c 98 55 c0 45 19 1b 18 b0 ea fd de 17 85 76 cb 8e bf ab 4d a3 e2 4c b9 f3 d8 2d 80 02 92 a0 0f 7e cd 4f d6 6b 22 80 42 39 64 e8 95 dd 1f c3 6a 87 b9 56 ae 4f 37 d2 5e 6c 12 47 a4 43 87 d2 cd 1f 6b 61 ae 8e 78 ee bf 92 81 86 e5 37 2c b3 0e bc 44 45 dc ac f9 34 12 fa 6e eb 4e 70 36 07 ab fb b6 1c d7 11 96 41 70 8f c7 93 e8 de c1 af 73 26 98 fc e2 42 d2 30 d6 ee 1f 10 ef e2 11 0e 41 c2 85 5b 5e 52 94 c0 bf aa a0 39 07 cc e6 75 5d 54 30 48 73 51 a7 32 ef ea be 66 29 12 a7 5c de 7b 6d ff 3e 5d 54 5a cf e2 82 28 26 d4 33 5b 43 6c 6d 55 ba 51 08 81 5b 75 d0 56 25 29 c2 a7 ac a3 6b 53 08 68 45 90 41 83 f2 81 6d 8e d4 f0 bf 89 f8 35 d2 8c 62 0d dc ee 99 a2 74 bc 46 78 89 ac 8e 26 20 1b de be 14 69 84 98 7d 51 1c 74 c7 34`,
            `9c 4e 36 de 2c 3c 8c 73 6e ff 2c 67 08 00 45 10 00 40 f3 bd 40 00 40 06 1e 35 0a 02 0a 5c 0a 02 0a 56 9b ac 00 07 65 42 5c ca 68 e7 09 60 80 18 01 f6 28 e8 00 00 01 01 08 0a e8 e6 9f 34 de d1 9e 61 48 61 6c 6c 6f 20 57 65 6c 74 0d 0a`,
            `8c 73 6e ff 2c 67 9c 4e 36 de 2c 3c 08 00 45 00 00 34 f6 28 40 00 40 06 1b e6 0a 02 0a 56 0a 02 0a 5c 00 07 9b ac 68 e7 09 60 65 42 5c d6 80 10 01 fd 64 fa 00 00 01 01 08 0a de d6 b0 0a e8 e6 9f 34`,
            `8c 73 6e ff 2c 67 9c 4e 36 de 2c 3c 08 00 45 00 00 40 f6 29 40 00 40 06 1b d9 0a 02 0a 56 0a 02 0a 5c 00 07 9b ac 68 e7 09 60 65 42 5c d6 80 18 01 fd 70 14 00 00 01 01 08 0a de d6 b0 0a e8 e6 9f 34 48 61 6c 6c 6f 20 57 65 6c 74 0d 0a`,
            `9c 4e 36 de 2c 3c 8c 73 6e ff 2c 67 08 00 45 10 00 34 f3 be 40 00 40 06 1e 40 0a 02 0a 5c 0a 02 0a 56 9b ac 00 07 65 42 5c d6 68 e7 09 6c 80 10 01 f6 28 dc 00 00 01 01 08 0a e8 e6 9f 40 de d6 b0 0a`
        ];
        const ab07El = $('ab07');
        if (ab07El) {
            ab07El.innerHTML = AB07.map((h, i) =>
                `<div style="margin: 12px 0 4px;"><span class="pill-badge">Frame ${i + 1}</span></div><div class="dump-box colored">${renderDump(hexToBytes(h))}</div>`
            ).join('');
        }

        // 5. Präfixtabelle /8 bis /32 im Spickzettel dynamisch generieren
        const ptabEl = $('ptab-lernzettel');
        if (ptabEl) {
            let pt = '';
            for (let p = 8; p <= 32; p++) {
                const oi = octetInfo(p);
                let blockStr = '';
                if (p === 32) blockStr = '1 (Einzelhost)';
                else if (oi) blockStr = oi.isBoundary ? `1 im ${oi.boundaryOctet}. (Grenze)` : `${oi.block} im ${oi.k}.`;
                else blockStr = '–';

                let hostStr = '';
                if (p === 31) hostStr = '2 (RFC 3021 P2P)';
                else if (p === 32) hostStr = '1 (Host-Route)';
                else hostStr = fmt(hostsOf(p));

                pt += `<tr><td class="mono">/${p}</td><td class="mono">${i2ip(maskI(p))}</td><td class="mono">${blockStr}</td><td class="mono">${hostStr}</td></tr>`;
            }
            ptabEl.insertAdjacentHTML('beforeend', pt);
        }

        // 6. Initiale Aufgaben generieren
        newS();
        newZ();
        newT();
    });
})();

