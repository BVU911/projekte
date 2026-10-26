/* Jarvis · Vorstellungsseite. Orb-Zustand steht in window.JARVIS_ORB, die Kugel selbst zeichnet das Modul in index.html. */
window.JARVIS_ORB = { ziel: { x: .5, y: .05, s: 1, m: 0, o: .95, h: 0 }, puls: 0, hoer: 0 };

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ORB = window.JARVIS_ORB;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobil = matchMedia('(max-width: 800px)');
  const maus = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ================= Konsole (läuft auch ohne GSAP) ================= */
  (() => {
    const verlauf = $('#verlauf'), feld = $('#eingabeFeld'), kopf = $('#hKopf'), status = $('#hStatus');
    if (!verlauf || !feld) return;
    const Z = { todos: [], geld: 0, sachen: {}, wuensche: 0, timer: null, quiz: null };
    const eur = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    const wahl = (a) => a[Math.floor(Math.random() * a.length)];
    const zahlDe = (v) => String(+v.toFixed(1)).replace('.', ',');
    const dauer = (min) => (Math.round(min * 60) < 60 ? Math.round(min * 60) + ' Sekunden' : min === 1 ? '1 Minute' : zahlDe(min) + ' Minuten');

    function msg(text, wer) {
      const d = document.createElement('div');
      d.className = 'msg ' + wer; d.textContent = text;
      verlauf.appendChild(d);
      while (verlauf.children.length > 40) verlauf.firstChild.remove();
      verlauf.scrollTop = verlauf.scrollHeight;
      return d;
    }
    function tippe(d, text, fertig) {
      if (ruhig) { d.textContent = text; fertig && fertig(); return; }
      let i = 0; d.textContent = '';
      const iv = setInterval(() => {
        i += 2; d.textContent = text.slice(0, i); ORB.puls = Math.max(ORB.puls, .55); verlauf.scrollTop = verlauf.scrollHeight;
        if (i >= text.length) { clearInterval(iv); fertig && fertig(); }
      }, 18);
    }
    function widgets() {
      $('#wTodo b').textContent = Z.todos.length;
      $('#wGeld b').textContent = eur(Z.geld);
      $('#wWunsch b').textContent = Z.wuensche;
      $('#wTodo').classList.toggle('aktiv', Z.todos.length > 0);
      $('#wGeld').classList.toggle('aktiv', Z.geld !== 0);
      $('#wWunsch').classList.toggle('aktiv', Z.wuensche > 0);
    }
    function timerTick() {
      const w = $('#wTimer'), b = $('b', w);
      if (!Z.timer) { b.textContent = '–'; w.classList.remove('aktiv'); return; }
      const rest = Math.max(0, Math.round((Z.timer.end - Date.now()) / 1000));
      b.textContent = String(Math.floor(rest / 60)).padStart(2, '0') + ':' + String(rest % 60).padStart(2, '0');
      w.classList.add('aktiv');
      if (rest <= 0) {
        const l = Z.timer.label; Z.timer = null;
        ORB.puls = 1;
        msg(l === 'Fokus' ? 'Fokus-Runde geschafft. Kurze Pause, dann weiter, Master.' : `Zeit ist um: ${l}, Master.`, 'er');
        b.textContent = '–'; w.classList.remove('aktiv');
      }
    }
    setInterval(timerTick, 1000);

    function antwort(t) {
      const s = t.toLowerCase();
      if (Z.quiz && s.split(/\s+/).length <= 3) {
        const q = Z.quiz; Z.quiz = null;
        return { text: s.includes(q.a) ? wahl(['Richtig. Das war fast zu leicht für dich.', 'Sitzt. Plus drei XP, Master.']) : `Fast. Es heißt „${q.a}“. Beim nächsten Mal sitzt es.` };
      }
      if (/(wie sp[äa]t|uhrzeit)/.test(s)) { const d = new Date(); return { text: `Es ist ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} Uhr. Die Zeit läuft, Master.` }; }
      if (/fokus|pomodoro/.test(s)) {
        const m = s.match(/(\d+)\s*min/), r = s.match(/(\d+)\s*runde/); const min = m ? +m[1] : 25, runden = r ? +r[1] : 3;
        Z.timer = { end: Date.now() + Math.min(min, 120) * 60000, label: 'Fokus' };
        return { text: `Fokus steht: ${min} Minuten, ${runden} Runden, dazwischen Pause. Handy weg, Master.` };
      }
      if (/erinner|timer|weck mich/.test(s)) {
        let min = 20; const m = s.match(/(\d+(?:[.,]\d+)?)\s*(sek|min|stund|std)/);
        if (m) { const v = parseFloat(m[1].replace(',', '.')); min = m[2].startsWith('sek') ? v / 60 : m[2].startsWith('min') ? v : v * 60; }
        else if (/halbe stunde/.test(s)) min = 30;
        min = Math.min(Math.max(min, .1), 180);
        const an = t.match(/\ban\s+(.+)$/i), label = an ? an[1].replace(/[.?!]+$/, '') : 'Timer';
        Z.timer = { end: Date.now() + min * 60000, label };
        return { text: `Läuft. In ${dauer(min)} melde ich mich${an ? ': ' + label : ''}. Schau auf den Timer, ich tick nicht falsch.` };
      }
      const eu = s.match(/(\d+(?:[.,]\d+)?)\s*(euro|€)/);
      if (eu) {
        const v = parseFloat(eu[1].replace(',', '.')), minus = /ausgegeben|bezahlt|gekauft|ausgeb/.test(s);
        Z.geld += minus ? -v : v;
        return { text: `Gebucht: ${minus ? '−' : '+'}${eur(v)}. Stand: ${eur(Z.geld)}. Bei großen Käufen reden wir mit deinem Vater.` };
      }
      const wo = t.match(/wo (?:ist|sind|liegt) (?:mein|meine|meinen|meinem)\s+(.+?)\s*\??$/i);
      if (wo) {
        const k = wo[1].toLowerCase(), treffer = Object.keys(Z.sachen).find((x) => x.includes(k) || k.includes(x));
        return { text: treffer ? `Dein ${treffer} liegt ${Z.sachen[treffer]}. Gern geschehen.` : 'Dazu habe ich nichts gespeichert. Sag mir erst, wo es liegt, ich vergesse danach nichts mehr.' };
      }
      const liegt = t.match(/mein(?:e|en|em)?\s+(.+?)\s+liegt\s+(.+?)[.!]*$/i);
      if (liegt) { Z.sachen[liegt[1].toLowerCase()] = liegt[2]; return { text: `Gemerkt: ${liegt[1]} liegt ${liegt[2]}. Frag mich später, ich vergesse nichts.` }; }
      if (/notier/.test(s) || /^(idee:|to-?do)/.test(s)) {
        const item = t.replace(/^.*?notier(?:e)?(?: dir)?\s*/i, '').replace(/^(idee:|to-?do:?)\s*/i, '').trim() || 'etwas';
        Z.todos.push(item); return { text: `Notiert: „${item}“. Offen sind jetzt ${Z.todos.length}.` };
      }
      if (/vokabel/.test(s)) {
        const w = wahl([['die Herausforderung', 'challenge'], ['der Nachbar', 'neighbour'], ['die Erfahrung', 'experience'], ['zuverlässig', 'reliable']]);
        Z.quiz = { a: w[1] }; return { text: `Eine Frage, Master: Wie heißt „${w[0]}“ auf Englisch?` };
      }
      if (/(fällt|faellt).*aus|ausfall/.test(s)) return { text: 'Notiert. Die Stunde fliegt aus Schultasche, Briefing und Tagesplan. Du gewinnst Zeit, nutz sie.' };
      if (/schule los/.test(s)) return { text: 'Schultasche gecheckt, eine Hausaufgabe fällig, Jacke je nach Wetter. Los, Master.' };
      if (/abend|feierabend|gute nacht/.test(s)) return { text: 'Tagesbilanz: gebaut, gelernt, genervt. Plan für morgen steht. Schlaf sind 8 bis 10 Stunden, nicht verhandelbar.' };
      if (/level|streak/.test(s)) return { text: 'Beispielwerte: Level 7, Streak 12 Tage. Bis zur nächsten Stufe fehlen ein paar erledigte Hausaufgaben.' };
      if (/was kannst du|hilfe|fähigkeiten/.test(s)) return { text: '46 Fähigkeiten in 11 Bereichen: Alltag, Schule, Laptop, Geld, Handy, Sehen, Medien, Bauen, Gesundheit, System. Und ein Tonfall.' };
      if (/danke/.test(s)) return { text: wahl(['Gern geschehen. Dafür bin ich da.', 'Ja, Master. Gern.']) };
      if (/^(hallo|hi|hey|moin|servus)\b/.test(s)) return { text: wahl(['Ja, Master.', 'Was ist denn jetzt schon wieder?', 'Da bist du ja. Was brauchst du?']) };
      Z.wuensche++;
      return { text: 'Das kann ich noch nicht. Ab damit in die Wunschbox. Nachts mache ich daraus einen Bauplan, du gibst frei.' };
    }

    function sende(roh) {
      const t = roh.trim(); if (!t) return;
      msg(t, 'ich'); feld.value = ''; ORB.hoer = 0; ORB.puls = 1;
      kopf.classList.add('denkt'); status.textContent = 'denkt …';
      const a = antwort(t); widgets(); timerTick();
      setTimeout(() => {
        status.textContent = 'antwortet';
        tippe(msg('', 'er'), a.text, () => { kopf.classList.remove('denkt'); status.textContent = 'bereit'; });
      }, ruhig ? 50 : 550);
    }
    $('#eingabe').addEventListener('submit', (e) => { e.preventDefault(); sende(feld.value); });
    feld.addEventListener('input', () => { ORB.hoer = feld.value ? 1 : 0; });
    feld.addEventListener('blur', () => { ORB.hoer = 0; });
    $$('#chips .chip').forEach((c) => c.addEventListener('click', () => sende(c.textContent)));
    msg('Ja, Master. Was brauchst du?', 'er');
    widgets();

    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#konsole').scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => feld.focus({ preventScroll: true }), ruhig ? 0 : 700);
      }
    });
  })();

  /* ================= Kleine Interaktionen (ohne GSAP) ================= */
  (() => {
    const w = $('#wellen');
    if (w) for (let i = 0; i < 36; i++) {
      const b = document.createElement('i');
      b.style.animationDelay = (-Math.random() * 1.6).toFixed(2) + 's';
      b.style.animationDuration = (.7 + Math.random() * 1).toFixed(2) + 's';
      w.appendChild(b);
    }
    const antw = $('#daumenAntwort');
    const hoch = ['Gemerkt. Mehr davon.', 'Notiert. Ich bleibe so.', 'Danke. Das war die Stil-Regel des Tages.'];
    const runter = ['Gemerkt. Ab jetzt kürzer.', 'Gemerkt. Zu brav? Ich werde frecher.', 'Regel gespeichert. Ich werde besser, Master.'];
    let n = 0;
    const gib = (a) => () => { antw.textContent = a[n++ % a.length]; };
    $('#daumenHoch')?.addEventListener('click', gib(hoch));
    $('#daumenRunter')?.addEventListener('click', gib(runter));
    const sch = $('#gehirnSchalter');
    sch?.addEventListener('click', () => {
      const an = sch.getAttribute('aria-checked') !== 'true';
      sch.setAttribute('aria-checked', an);
      $('#gehirnName').textContent = an ? 'Gemini' : 'Claude';
      $('#gehirnText').textContent = an ? 'Claude im Limit? Dann denkt Jarvis kostenlos mit Gemini weiter.' : 'Jarvis denkt mit Claude.';
      ORB.puls = 1;
    });

    const spot = (k) => {
      k.addEventListener('pointermove', (e) => { const r = k.getBoundingClientRect(); k.style.setProperty('--x', e.clientX - r.left + 'px'); k.style.setProperty('--y', e.clientY - r.top + 'px'); });
      k.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') k.classList.add('licht'); });
      k.addEventListener('pointerleave', () => k.classList.remove('licht'));
      const kipp = () => { k.classList.toggle('voll'); ORB.puls = .8; };
      k.addEventListener('click', kipp);
      k.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kipp(); } });
    };
    $$('.ton-karte').forEach(spot);
    // Ohne Maus: Sätze decken sich reihum selbst auf (Tippen kippt weiterhin)
    if (!matchMedia('(hover: hover)').matches && !ruhig) {
      const karten = $$('.ton-karte'); let k = 0;
      const sec = $('#ton'); let sichtbar = false;
      new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }).observe(sec);
      setInterval(() => {
        if (!sichtbar) return;
        karten.forEach((c, i) => c.classList.toggle('auto', i === k % karten.length));
        k++;
      }, 2400);
    }

    // Laufband-Wechselsätze im Hero
    const el = $('#wechsel');
    if (el) {
      const saetze = ['Ja, Master.', 'Was ist denn jetzt schon wieder?', 'Schon erledigt.', 'Mathe wartet nicht.', 'Soll ich das nachts machen?'];
      let i = 0;
      setInterval(() => {
        i = (i + 1) % saetze.length;
        if (window.gsap && !ruhig) gsap.to(el, { autoAlpha: 0, y: -8, duration: .25, onComplete: () => { el.textContent = saetze[i]; gsap.fromTo(el, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .35 }); } });
        else el.textContent = saetze[i];
      }, 3200);
    }

    // Menü (Handy)
    const knopf = $('#menueKnopf'), menue = $('#menue');
    const zu = () => { menue.classList.remove('offen'); knopf.setAttribute('aria-expanded', 'false'); knopf.setAttribute('aria-label', 'Menü öffnen'); document.body.style.overflow = ''; };
    knopf?.addEventListener('click', () => {
      const auf = !menue.classList.contains('offen');
      menue.classList.toggle('offen', auf); knopf.setAttribute('aria-expanded', auf); knopf.setAttribute('aria-label', auf ? 'Menü schließen' : 'Menü öffnen');
      document.body.style.overflow = auf ? 'hidden' : '';
    });
    $$('a', menue).forEach((a) => a.addEventListener('click', zu));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
  })();

  /* ================= Animationen (brauchen GSAP) ================= */
  if (!window.gsap || !window.ScrollTrigger) return;   // ohne GSAP bleibt alles sichtbar und statisch
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('js');

  // Text in Wörter teilen, jedes Wort in einer Maske (behält <em>)
  function teile(el) {
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const geh = (node) => [...node.childNodes].map((n) => {
      if (n.nodeType === 3) return n.textContent.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? ' ' : w ? `<span class="wort" aria-hidden="true"><span>${w}</span></span>` : '')).join('');
      if (n.nodeType === 1) { const t = n.tagName.toLowerCase(); return `<${t}${n.className ? ` class="${n.className}"` : ''}>${geh(n)}</${t}>`; }
      return '';
    }).join('');
    el.innerHTML = geh(el);
    return $$('.wort > span', el);
  }

  // Hero-Intro
  const heroW = teile($('[data-split]'));
  if (!ruhig) {
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .from(heroW, { yPercent: 118, rotate: 5, duration: 1.25, stagger: .09 })
      .from('[data-einblenden]', { y: 24, autoAlpha: 0, duration: .8, stagger: .1 }, '-=.7')
      .from('.nav, .hero-kopf', { y: -14, autoAlpha: 0, duration: .7, stagger: .08 }, '-=.6');
  }

  // Horizontale Galerie zuerst anlegen, damit spätere Trigger ihre Abstände kennen
  if (!ruhig) {
    gsap.matchMedia().add('(min-width: 800px)', () => {
      const sec = $('.horizontal'), spur = $('.spur');
      sec.classList.add('gepinnt');
      const weg = () => spur.scrollWidth - innerWidth + 20;
      gsap.to(spur, { x: () => -weg(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + weg(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
      return () => sec.classList.remove('gepinnt');
    });
  }

  // Navigation verglasen
  ScrollTrigger.create({ start: 80, onToggle: (s) => $('#nav').classList.toggle('verglast', s.isActive) });

  // Navigation übernimmt die Farbe des Abschnitts darunter
  const navEl = $('#nav');
  const navFarbe = () => {
    const menueAuf = $('#menue').classList.contains('offen');
    const sec = document.elementsFromPoint(innerWidth / 2, 30).map((e) => e.closest && e.closest('section')).find(Boolean);
    navEl.classList.toggle('auf-hell', !menueAuf && !!sec && sec.classList.contains('hell'));
  };
  ScrollTrigger.create({ onUpdate: navFarbe, onRefresh: navFarbe });
  $('#menueKnopf')?.addEventListener('click', () => setTimeout(navFarbe, 0));
  navFarbe();

  // Hintergrundwechsel und Kugel-Zustand je Abschnitt
  function setzeOrb(sec) {
    const a = mobil.matches && sec.dataset.orbM ? sec.dataset.orbM : sec.dataset.orb;
    if (!a) return;
    const [x, y, s, m, o, h] = a.split(',').map(Number);
    Object.assign(ORB.ziel, { x, y, s, m, o, h });
  }
  $$('[data-hintergrund]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (s) => { if (!s.isActive) return; gsap.to('body', { backgroundColor: sec.dataset.hintergrund, duration: ruhig ? .01 : .7, overwrite: 'auto' }); setzeOrb(sec); },
    });
  });

  if (!ruhig) {
    // Enthüllungen
    $$('[data-zeilen]').forEach((el) => {
      gsap.from(teile(el), { yPercent: 112, duration: 1.1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('.manifest-text p').forEach((el, i) => {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)', y: 30 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.2, delay: i * .12, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('.drei li').forEach((el) => {
      gsap.from(el, { x: -70, autoAlpha: 0, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('.tile').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    $$('.ton-karte').forEach((el) => {
      gsap.from(el, { yPercent: 18, autoAlpha: .7, duration: .9, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 95%' } });
    });
    gsap.from('.handy', { y: 90, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.handy', start: 'top 90%' } });
    gsap.from('#chips .chip', { y: 20, autoAlpha: 0, stagger: .05, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '#chips', start: 'top 92%' } });
    $$('.zahl-block').forEach((el, i) => {
      gsap.to(el, { yPercent: -[8, 22, 34, 14][i % 4], ease: 'none', scrollTrigger: { trigger: '.zahlen', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-zahl]').forEach((el) => {
      const ziel = +el.dataset.zahl, o = { v: 0 };
      if (!ziel) return;
      el.textContent = '0';
      gsap.to(o, { v: ziel, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('de-DE'); } });
    });

    // Laufband mit Neigung
    const band = $('.band-innen');
    gsap.to(band, { xPercent: -50, repeat: -1, duration: 30, ease: 'none' });
    const neigen = gsap.quickTo(band, 'skewX', { duration: .4, ease: 'power3' });
    ScrollTrigger.create({ onUpdate: (s) => neigen(gsap.utils.clamp(-10, 10, s.getVelocity() / -250)) });
    ScrollTrigger.addEventListener('scrollEnd', () => neigen(0));
  }

  // Ein Tag mit Jarvis: Uhr rattert, Bogen zeichnet sich, aktiver Schritt leuchtet
  (() => {
    const schritte = $$('.schritt'), uhr = $('#uhr'), label = $('#uhrLabel'), weg = $('#bogenWeg'), punkt = $('#bogenPunkt');
    if (!schritte.length || !weg) return;
    const L = weg.getTotalLength(), st = { p: 0 };
    weg.style.strokeDasharray = L;
    const mapP = (z) => { const [h, m] = z.split(':').map(Number); return gsap.utils.clamp(0, 1, (h * 60 + m - 405) / (1350 - 405)); };
    const zeig = () => { const pt = weg.getPointAtLength(st.p * L); punkt.setAttribute('cx', pt.x); punkt.setAttribute('cy', pt.y); weg.style.strokeDashoffset = L * (1 - st.p); };
    zeig();
    function rattle(neu) {
      if (ruhig) { uhr.textContent = neu; return; }
      clearInterval(uhr._iv);
      let n = 0; const fest = [...neu].map((_, i) => 5 + i * 2);
      uhr._iv = setInterval(() => {
        n++;
        uhr.textContent = [...neu].map((c, i) => (c === ':' || n >= fest[i] ? c : Math.floor(Math.random() * 10))).join('');
        if (n >= fest[fest.length - 1]) clearInterval(uhr._iv);
      }, 45);
    }
    let aktuell = schritte[0];
    schritte.forEach((s) => ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive || s === aktuell && uhr.textContent === s.dataset.zeit) return;
        aktuell = s;
        schritte.forEach((x) => x.classList.toggle('jetzt', x === s));
        rattle(s.dataset.zeit); label.textContent = s.dataset.label; ORB.puls = .7;
        gsap.to(st, { p: mapP(s.dataset.zeit), duration: ruhig ? .01 : 1.1, ease: 'power3.out', onUpdate: zeig });
      },
    }));
  })();

  // Cursor, magnetische Knöpfe, 3D-Neigung (nur mit Maus)
  if (maus && !ruhig) {
    const c = $('.cursor');
    const cx = gsap.quickTo(c, 'x', { duration: .25, ease: 'power3' }), cy = gsap.quickTo(c, 'y', { duration: .25, ease: 'power3' });
    addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
    $$('a, button, [data-tilt], .ton-karte, .chip').forEach((el) => {
      el.addEventListener('pointerenter', () => c.classList.add('gross'));
      el.addEventListener('pointerleave', () => c.classList.remove('gross'));
    });
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }));
    });
    $$('[data-tilt]').forEach((el) => {
      const st = el.classList.contains('handy') ? 6 : 10;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(el, { rotateY: x * st, rotateX: -y * st, transformPerspective: 900, duration: .4, overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' }));
    });
  }

  // Partikel-Wort "Jarvis"
  const pc = $('#partikel');
  if (pc) {
    const ctx = pc.getContext('2d');
    let W = 0, H = 0, teilchen = [], sichtbar = false, laeuft = false;
    const m = { x: -1e4, y: -1e4 };
    function aufbauen() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = pc.clientWidth; H = pc.clientHeight; if (!W || !H) return;
      pc.width = W * dpr; pc.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = `italic 400 ${Math.min(W * .34, H * .98)}px "Instrument Serif", serif`;
      o.fillText('Jarvis', W / 2, H / 2 + H * .04);
      const d = o.getImageData(0, 0, W, H).data, schritt = W < 600 ? 3 : 4, alt = teilchen;
      teilchen = [];
      for (let y = 0; y < H; y += schritt) for (let x = 0; x < W; x += schritt) {
        if (d[(y * W + x) * 4 + 3] > 128) { const a = alt[teilchen.length]; teilchen.push({ x: a ? a.x : Math.random() * W, y: a ? a.y : Math.random() * H, zx: x, zy: y, vx: 0, vy: 0 }); }
      }
      if (ruhig) bild(true);
    }
    function bild(einmal) {
      if (!sichtbar && !einmal) { laeuft = false; return; }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ee6a3b';
      for (const t of teilchen) {
        if (ruhig) { ctx.fillRect(t.zx, t.zy, 2.2, 2.2); continue; }
        const dx = t.x - m.x, dy = t.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (9000 - d2) / 9000 * 5, d = Math.sqrt(d2) + .01; t.vx += dx / d * f; t.vy += dy / d * f; }
        t.vx += (t.zx - t.x) * .055; t.vy += (t.zy - t.y) * .055; t.vx *= .82; t.vy *= .82; t.x += t.vx; t.y += t.vy;
        ctx.fillRect(t.x, t.y, 2.2, 2.2);
      }
      if (!einmal) requestAnimationFrame(() => bild());
    }
    new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; if (sichtbar && !laeuft && !ruhig) { laeuft = true; requestAnimationFrame(() => bild()); } }).observe(pc);
    pc.addEventListener('pointermove', (e) => { const r = pc.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; });
    pc.addEventListener('pointerleave', () => { m.x = m.y = -1e4; });
    (document.fonts && document.fonts.load ? document.fonts.load('italic 400 100px "Instrument Serif"') : Promise.resolve()).catch(() => {}).then(aufbauen);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(aufbauen, 200); });
  }

  // Nach Schriften und Bildern alle Positionen neu berechnen
  const neu = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(neu);
  addEventListener('load', neu);
})();
