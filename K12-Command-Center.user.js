// ==UserScript==
// @name         K12 Command Center — Radial Menu & Power Tools
// @namespace    https://github.com/veothm/K12-upgrades
// @version      1.0.0
// @description  A fresh Violentmonkey command center for home.k12.com: radial menu, command search, themes, focus mode, notes, shortcuts, and page tools.
// @match        https://home.k12.com/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const ID = 'k12cc';
  if (document.getElementById(ID + '-root')) return;

  const DEFAULTS = {
    accent: '#67e8f9',
    theme: 'midnight',
    focusMode: false,
    showClock: true,
    radialKey: 'c',
    commandKey: '/',
    notes: '',
    favorites: [],
    customLabel: 'K12 Command Center'
  };

  const THEMES = [
    { id: 'midnight', name: 'Midnight', bg: '#0b1020', panel: '#121a2b', text: '#eef4ff', muted: '#9aa9c3', accent: '#67e8f9' },
    { id: 'violet', name: 'Violet Pulse', bg: '#160e26', panel: '#211438', text: '#fff5ff', muted: '#c1afd9', accent: '#c4b5fd' },
    { id: 'forest', name: 'Forest', bg: '#0b1915', panel: '#122820', text: '#eafff3', muted: '#9bc5b0', accent: '#6ee7b7' },
    { id: 'ember', name: 'Ember', bg: '#21120f', panel: '#321c17', text: '#fff3ed', muted: '#d8b2a5', accent: '#fdba74' },
    { id: 'mono', name: 'Monochrome', bg: '#111111', panel: '#202020', text: '#f5f5f5', muted: '#b3b3b3', accent: '#facc15' }
  ];

  let settings = loadSettings();
  let radialOpen = false;
  let paletteOpen = false;
  let toastTimer = null;
  let clockTimer = null;
  let lastFocused = null;

  function loadSettings() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('k12cc-settings') || '{}'));
    } catch (_) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings() {
    localStorage.setItem('k12cc-settings', JSON.stringify(settings));
    applyTheme();
  }

  function currentTheme() {
    return THEMES.find(function (theme) { return theme.id === settings.theme; }) || THEMES[0];
  }

  const style = document.createElement('style');
  style.id = ID + '-styles';
  style.textContent = [
    '#k12cc-root{--cc-bg:#0b1020;--cc-panel:#121a2b;--cc-text:#eef4ff;--cc-muted:#9aa9c3;--cc-accent:#67e8f9;position:fixed;inset:0;z-index:2147483000;pointer-events:none;color:var(--cc-text);font:14px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}',
    '#k12cc-root *{box-sizing:border-box}#k12cc-root button,#k12cc-root input,#k12cc-root textarea,#k12cc-root select{font:inherit}#k12cc-root button{color:inherit;cursor:pointer}#k12cc-root button:focus-visible,#k12cc-root input:focus-visible,#k12cc-root textarea:focus-visible,#k12cc-root select:focus-visible{outline:2px solid var(--cc-accent);outline-offset:3px}',
    '#k12cc-root .cc-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.56);backdrop-filter:blur(5px);opacity:0;transition:opacity .16s}#k12cc-root .cc-visible .cc-backdrop{opacity:1}',
    '#k12cc-root .cc-wheel{position:absolute;width:0;height:0}#k12cc-root .cc-center{position:absolute;left:-43px;top:-43px;width:86px;height:86px;border-radius:50%;display:grid;place-content:center;text-align:center;background:var(--cc-panel);border:1px solid var(--cc-accent);box-shadow:0 0 0 8px color-mix(in srgb,var(--cc-accent) 12%,transparent),0 0 38px color-mix(in srgb,var(--cc-accent) 24%,transparent);cursor:pointer;pointer-events:auto;animation:ccCoreBreathe 3.2s ease-in-out infinite}',
    '#k12cc-root .cc-center strong{font-size:23px;letter-spacing:-1px}#k12cc-root .cc-center small{font-size:9px;color:var(--cc-accent);letter-spacing:1.4px}',
    '#k12cc-root .cc-action{position:absolute;width:108px;min-height:82px;left:-54px;top:-41px;border:1px solid #ffffff20;border-radius:18px;background:var(--cc-panel);box-shadow:0 14px 34px #0005;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0;transform:translateY(16px) scale(.72) rotate(-7deg);filter:blur(3px);transition:opacity .38s cubic-bezier(.16,1,.3,1),transform .55s cubic-bezier(.16,1,.3,1),filter .38s ease,border-color .2s,background .2s;will-change:transform,opacity;pointer-events:none}',
    '#k12cc-root .cc-visible .cc-action{opacity:1;transform:translateY(0) scale(1) rotate(0);filter:blur(0);pointer-events:auto}#k12cc-root .cc-action:hover{border-color:var(--cc-accent);background:color-mix(in srgb,var(--cc-panel) 75%,var(--cc-accent));transform:translateY(-5px) scale(1.07);box-shadow:0 18px 42px #0007,0 0 24px color-mix(in srgb,var(--cc-accent) 16%,transparent)}#k12cc-root .cc-icon{font-size:24px;line-height:1}#k12cc-root .cc-action span:last-child{font-size:11px;font-weight:650;text-align:center}',
    '#k12cc-root .cc-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.97);width:min(560px,calc(100vw - 28px));max-height:min(740px,calc(100vh - 28px));overflow:auto;background:var(--cc-bg);border:1px solid color-mix(in srgb,var(--cc-accent) 35%,#ffffff18);border-radius:22px;box-shadow:0 28px 100px #0009;padding:22px;opacity:0;visibility:hidden;transition:opacity .16s,transform .16s;pointer-events:none}',
    '#k12cc-root .cc-panel.cc-panel-open{opacity:1;visibility:visible;transform:translate(-50%,-50%) scale(1);pointer-events:auto}#k12cc-root .cc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}#k12cc-root .cc-header h2{margin:0;font-size:22px;letter-spacing:-.5px}#k12cc-root .cc-sub{margin:5px 0 0;color:var(--cc-muted);font-size:12px}',
    '#k12cc-root .cc-x{border:1px solid #ffffff22;background:var(--cc-panel);border-radius:10px;padding:7px 10px}#k12cc-root .cc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#k12cc-root .cc-card{background:var(--cc-panel);border:1px solid #ffffff16;border-radius:14px;padding:13px;min-width:0}#k12cc-root .cc-card h3{margin:0 0 7px;font-size:13px}#k12cc-root .cc-muted{color:var(--cc-muted);font-size:12px}',
    '#k12cc-root .cc-btn{border:1px solid #ffffff20;border-radius:11px;padding:9px 12px;background:var(--cc-panel);transition:border-color .15s,transform .15s}#k12cc-root .cc-btn:hover{border-color:var(--cc-accent);transform:translateY(-1px)}#k12cc-root .cc-primary{background:var(--cc-accent);color:#07111c!important;border-color:transparent;font-weight:750}#k12cc-root .cc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0}#k12cc-root .cc-row label{font-size:13px}#k12cc-root input[type=text],#k12cc-root input[type=search],#k12cc-root textarea,#k12cc-root select{width:100%;background:var(--cc-panel);color:var(--cc-text);border:1px solid #ffffff24;border-radius:10px;padding:10px}#k12cc-root textarea{resize:vertical;min-height:110px}',
    '#k12cc-root .cc-palette{position:absolute;left:50%;top:18%;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));background:var(--cc-bg);border:1px solid #ffffff25;border-radius:18px;padding:12px;box-shadow:0 24px 90px #0009;pointer-events:auto}#k12cc-root .cc-result{display:flex;align-items:center;gap:12px;width:100%;padding:11px;border:0;border-radius:11px;background:transparent;text-align:left}#k12cc-root .cc-result:hover,#k12cc-root .cc-result:focus{background:var(--cc-panel)}#k12cc-root .cc-result small{display:block;color:var(--cc-muted);font-size:11px}#k12cc-root .cc-kbd{border:1px solid #ffffff2b;border-radius:6px;padding:2px 6px;color:var(--cc-muted);font-size:11px}',
    '#k12cc-root .cc-toast{position:absolute;bottom:24px;left:50%;transform:translate(-50%,12px);background:var(--cc-panel);border:1px solid color-mix(in srgb,var(--cc-accent) 45%,transparent);border-radius:12px;padding:11px 16px;box-shadow:0 10px 32px #0007;opacity:0;transition:all .18s;max-width:calc(100vw - 24px);text-align:center}#k12cc-root .cc-toast.cc-toast-on{opacity:1;transform:translate(-50%,0)}',
    '#k12cc-root .cc-clock{position:absolute;right:16px;bottom:14px;padding:7px 10px;border-radius:10px;background:var(--cc-panel);border:1px solid #ffffff1b;color:var(--cc-muted);font-size:11px;pointer-events:none}#k12cc-root .cc-clock strong{color:var(--cc-text);font-variant-numeric:tabular-nums}',
    'body.k12cc-focus header,body.k12cc-focus nav,body.k12cc-focus aside{transition:opacity .2s}body.k12cc-focus header:hover,body.k12cc-focus nav:hover,body.k12cc-focus aside:hover{opacity:1}body.k12cc-focus header,body.k12cc-focus nav,body.k12cc-focus aside{opacity:.22}',
    '@media(max-width:540px){#k12cc-root .cc-grid{grid-template-columns:1fr}#k12cc-root .cc-panel{padding:16px}#k12cc-root .cc-action{width:88px;min-height:70px;left:-44px;top:-35px}#k12cc-root .cc-icon{font-size:20px}#k12cc-root .cc-action span:last-child{font-size:10px}}',
    '@media(prefers-reduced-motion:reduce){#k12cc-root *{transition:none!important;animation:none!important}}'
  ].join('');
  style.textContent += [
    '#k12cc-root.cc-visible{pointer-events:auto}',
    '#k12cc-root .cc-backdrop{pointer-events:none;transition:opacity .32s ease,backdrop-filter .32s ease}',
    '#k12cc-root.cc-visible .cc-backdrop{pointer-events:auto}',
    '#k12cc-root .cc-wheel{filter:drop-shadow(0 0 22px color-mix(in srgb,var(--cc-accent) 10%,transparent))}',
    '#k12cc-root .cc-center{transition:box-shadow .35s ease,transform .35s cubic-bezier(.16,1,.3,1)}#k12cc-root .cc-center:hover{transform:scale(1.06);box-shadow:0 0 0 11px color-mix(in srgb,var(--cc-accent) 14%,transparent),0 0 48px color-mix(in srgb,var(--cc-accent) 34%,transparent)}',
    '#k12cc-root .cc-visible .cc-action{transition-delay:var(--cc-delay,0ms)}#k12cc-root .cc-visible .cc-action:nth-of-type(1){--cc-delay:0ms}#k12cc-root .cc-visible .cc-action:nth-of-type(2){--cc-delay:35ms}#k12cc-root .cc-visible .cc-action:nth-of-type(3){--cc-delay:70ms}#k12cc-root .cc-visible .cc-action:nth-of-type(4){--cc-delay:105ms}#k12cc-root .cc-visible .cc-action:nth-of-type(5){--cc-delay:140ms}#k12cc-root .cc-visible .cc-action:nth-of-type(6){--cc-delay:175ms}#k12cc-root .cc-visible .cc-action:nth-of-type(7){--cc-delay:210ms}#k12cc-root .cc-visible .cc-action:nth-of-type(8){--cc-delay:245ms}#k12cc-root .cc-visible .cc-action:nth-of-type(9){--cc-delay:280ms}#k12cc-root .cc-visible .cc-action:nth-of-type(10){--cc-delay:315ms}',
    '#k12cc-root .cc-panel{transition:opacity .28s ease,transform .38s cubic-bezier(.16,1,.3,1),visibility .28s}#k12cc-root .cc-panel.cc-panel-open{animation:ccPanelIn .38s cubic-bezier(.16,1,.3,1) both}',
    '#k12cc-root .cc-toast{transition:opacity .24s ease,transform .38s cubic-bezier(.16,1,.3,1)}',
    '@keyframes ccCoreBreathe{0%,100%{box-shadow:0 0 0 8px color-mix(in srgb,var(--cc-accent) 10%,transparent),0 0 30px color-mix(in srgb,var(--cc-accent) 18%,transparent)}50%{box-shadow:0 0 0 11px color-mix(in srgb,var(--cc-accent) 15%,transparent),0 0 48px color-mix(in srgb,var(--cc-accent) 30%,transparent)}}',
    '@keyframes ccPanelIn{from{opacity:0;transform:translate(-50%,-47%) scale(.96);filter:blur(4px)}to{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0)}}',
    '@media(prefers-reduced-motion:reduce){#k12cc-root .cc-center{animation:none!important}#k12cc-root .cc-visible .cc-action{transition-delay:0ms!important}}'
  ].join('');
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = ID + '-root';
  root.innerHTML = '<div class="cc-backdrop"></div><div class="cc-wheel" role="menu" aria-label="K12 quick actions"><div class="cc-center" tabindex="0" role="button" aria-label="Close quick menu"><strong> K12 </strong><small>COMMAND</small></div></div><section class="cc-panel" role="dialog" aria-modal="true" aria-labelledby="k12cc-title"></section><div class="cc-toast" role="status" aria-live="polite"></div><div class="cc-clock"></div>';
  document.body.appendChild(root);

  const wheel = root.querySelector('.cc-wheel');
  const panel = root.querySelector('.cc-panel');
  const toast = root.querySelector('.cc-toast');
  const clock = root.querySelector('.cc-clock');
  const backdrop = root.querySelector('.cc-backdrop');
  const center = root.querySelector('.cc-center');

  const actions = [
    { icon: '⚙️', title: 'Settings', detail: 'Themes and preferences', run: openSettings },
    { icon: '⌕', title: 'Command search', detail: 'Find an action fast', run: openPalette },
    { icon: '📝', title: 'Quick notes', detail: 'Saved locally in this browser', run: openNotes },
    { icon: '🎨', title: 'Next theme', detail: 'Cycle the color palette', run: nextTheme },
    { icon: '🎯', title: 'Focus mode', detail: 'Dim page navigation chrome', run: toggleFocus },
    { icon: '🔝', title: 'Back to top', detail: 'Smoothly scroll to the top', run: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); toastMessage('Back to top'); } },
    { icon: '🔎', title: 'Find on page', detail: 'Use the browser page search', run: function () { closeAll(); toastMessage('Use Ctrl+F or ⌘F to find text on this page.'); } },
    { icon: '💾', title: 'Export settings', detail: 'Download a JSON backup', run: exportSettings },
    { icon: '⬇️', title: 'Go to bottom', detail: 'Smoothly scroll to the bottom', run: function () { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); toastMessage('Bottom of page'); } },
    { icon: '🔄', title: 'Reload page', detail: 'Refresh this page', run: function () { if (window.confirm('Reload this page now? Unsaved page changes may be lost.')) location.reload(); } }
  ];

  const actionButtons = actions.map(function (action, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cc-action';
    button.setAttribute('role', 'menuitem');
    button.innerHTML = '<span class="cc-icon" aria-hidden="true"></span><span></span>';
    button.children[0].textContent = action.icon;
    button.children[1].textContent = action.title;
    button.title = action.detail;
    button.addEventListener('click', function () {
      closeAll();
      try { action.run(); } catch (error) { console.error('[K12 Command Center]', error); toastMessage('That action failed. See console for details.'); }
    });
    button.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); actionButtons[(index + 1) % actionButtons.length].focus(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); actionButtons[(index + actionButtons.length - 1) % actionButtons.length].focus(); }
    });
    wheel.appendChild(button);
    return button;
  });

  function applyTheme() {
    const theme = currentTheme();
    root.style.setProperty('--cc-bg', theme.bg);
    root.style.setProperty('--cc-panel', theme.panel);
    root.style.setProperty('--cc-text', theme.text);
    root.style.setProperty('--cc-muted', theme.muted);
    root.style.setProperty('--cc-accent', /^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : theme.accent);
    document.body.classList.toggle('k12cc-focus', Boolean(settings.focusMode));
    clock.style.display = settings.showClock ? 'block' : 'none';
  }

  function toastMessage(message) {
    toast.textContent = message;
    toast.classList.add('cc-toast-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('cc-toast-on'); }, 2400);
  }

  function closeRadial() {
    radialOpen = false;
    root.classList.remove('cc-visible');
    document.removeEventListener('keydown', onOverlayKeydown, true);
  }

  function closeAll() {
    closeRadial();
    paletteOpen = false;
    panel.classList.remove('cc-panel-open');
    root.querySelector('.cc-palette')?.remove();
    document.removeEventListener('keydown', onOverlayKeydown, true);
  }

  function openRadial(x, y) {
    closeAll();
    radialOpen = true;
    const radius = Math.min(210, Math.max(142, Math.min(innerWidth, innerHeight) * 0.30));
    const cx = Math.max(118, Math.min(innerWidth - 118, Number.isFinite(x) && x > 0 ? x : innerWidth / 2));
    const cy = Math.max(112, Math.min(innerHeight - 112, Number.isFinite(y) && y > 0 ? y : innerHeight / 2));
    wheel.style.left = cx + 'px';
    wheel.style.top = cy + 'px';
    actionButtons.forEach(function (button, index) {
      const angle = (-90 + index * 360 / actionButtons.length) * Math.PI / 180;
      const dist = innerWidth < 540 ? radius * 0.76 : radius;
      button.style.left = (Math.cos(angle) * dist - (innerWidth < 540 ? 44 : 54)) + 'px';
      button.style.top = (Math.sin(angle) * dist - (innerWidth < 540 ? 35 : 41)) + 'px';
      button.style.transitionDelay = (index * 12) + 'ms';
    });
    root.classList.add('cc-visible');
    document.addEventListener('keydown', onOverlayKeydown, true);
    actionButtons[0].focus({ preventScroll: true });
  }

  function openPanel(title, subtitle, bodyHTML, afterRender) {
    closeAll();
    panel.innerHTML = '<div class="cc-header"><div><h2 id="k12cc-title"></h2><p class="cc-sub"></p></div><button class="cc-x" type="button" aria-label="Close dialog">✕</button></div><div class="cc-content"></div>';
    panel.querySelector('h2').textContent = title;
    panel.querySelector('.cc-sub').textContent = subtitle;
    panel.querySelector('.cc-content').innerHTML = bodyHTML;
    panel.querySelector('.cc-x').addEventListener('click', closeAll);
    panel.classList.add('cc-panel-open');
    document.addEventListener('keydown', onOverlayKeydown, true);
    if (afterRender) afterRender(panel.querySelector('.cc-content'));
    const first = panel.querySelector('button,input,textarea,select');
    if (first) first.focus({ preventScroll: true });
  }

  function openSettings() {
    const themeOptions = THEMES.map(function (theme) {
      return '<option value="' + theme.id + '"' + (settings.theme === theme.id ? ' selected' : '') + '>' + theme.name + '</option>';
    }).join('');
    openPanel('Command Center settings', 'Personalize your quick menu. Preferences are saved on this device.', [
      '<div class="cc-grid">',
      '<div class="cc-card"><h3>Appearance</h3><div class="cc-row"><label for="cc-theme">Theme</label></div><select id="cc-theme">' + themeOptions + '</select><div class="cc-row"><label for="cc-accent">Accent color</label><input id="cc-accent" type="color" value="' + escapeHTML(settings.accent) + '" style="width:52px;height:34px;padding:2px"></div></div>',
      '<div class="cc-card"><h3>Keyboard</h3><p class="cc-muted">Open radial menu</p><div class="cc-row"><label for="cc-radial-key">Shortcut key</label><input id="cc-radial-key" type="text" maxlength="1" value="' + escapeHTML(settings.radialKey) + '" style="width:54px;text-align:center;text-transform:uppercase"></div><p class="cc-muted">Command search uses /</p></div>',
      '<div class="cc-card"><h3>Comfort</h3><div class="cc-row"><label for="cc-clock-toggle">Show clock</label><input id="cc-clock-toggle" type="checkbox" ' + (settings.showClock ? 'checked' : '') + '></div><div class="cc-row"><label for="cc-focus-toggle">Enable focus mode</label><input id="cc-focus-toggle" type="checkbox" ' + (settings.focusMode ? 'checked' : '') + '></div></div>',
      '<div class="cc-card"><h3>Backup</h3><p class="cc-muted">Export or restore your local preferences.</p><div class="cc-row"><button class="cc-btn" id="cc-export">Export JSON</button><button class="cc-btn" id="cc-import">Import JSON</button></div><input id="cc-import-file" type="file" accept="application/json,.json" hidden></div>',
      '</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="cc-btn" id="cc-reset">Reset settings</button><button class="cc-btn cc-primary" id="cc-save">Save settings</button></div>'
    ].join(''), function (content) {
      content.querySelector('#cc-save').addEventListener('click', function () {
        settings.theme = content.querySelector('#cc-theme').value;
        settings.accent = content.querySelector('#cc-accent').value;
        settings.radialKey = (content.querySelector('#cc-radial-key').value || 'c').toLowerCase().slice(0, 1);
        settings.showClock = content.querySelector('#cc-clock-toggle').checked;
        settings.focusMode = content.querySelector('#cc-focus-toggle').checked;
        saveSettings(); closeAll(); toastMessage('Settings saved');
      });
      content.querySelector('#cc-reset').addEventListener('click', function () {
        if (!confirm('Reset Command Center preferences? Your saved notes will also be cleared.')) return;
        settings = Object.assign({}, DEFAULTS); saveSettings(); closeAll(); toastMessage('Settings reset');
      });
      content.querySelector('#cc-export').addEventListener('click', exportSettings);
      content.querySelector('#cc-import').addEventListener('click', function () { content.querySelector('#cc-import-file').click(); });
      content.querySelector('#cc-import-file').addEventListener('change', async function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          const imported = JSON.parse(await file.text());
          if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid settings object');
          settings = Object.assign({}, DEFAULTS, imported);
          saveSettings(); closeAll(); toastMessage('Settings imported');
        } catch (_) { toastMessage('Could not import that JSON file'); }
      });
    });
  }

  function openNotes() {
    openPanel('Quick notes', 'Notes stay in this browser and are not sent anywhere.', '<textarea id="cc-notes" aria-label="Your notes" placeholder="Write a reminder, checklist, or idea…"></textarea><div class="cc-row"><span class="cc-muted">Autosaved when you press Save</span><button class="cc-btn cc-primary" id="cc-notes-save">Save notes</button></div>', function (content) {
      const textarea = content.querySelector('#cc-notes');
      textarea.value = settings.notes || '';
      content.querySelector('#cc-notes-save').addEventListener('click', function () {
        settings.notes = textarea.value.slice(0, 20000);
        saveSettings(); closeAll(); toastMessage('Notes saved on this device');
      });
    });
  }

  function nextTheme() {
    const index = THEMES.findIndex(function (theme) { return theme.id === settings.theme; });
    settings.theme = THEMES[(index + 1 + THEMES.length) % THEMES.length].id;
    settings.accent = currentTheme().accent;
    saveSettings();
    toastMessage('Theme: ' + currentTheme().name);
  }

  function toggleFocus() {
    settings.focusMode = !settings.focusMode;
    saveSettings();
    toastMessage(settings.focusMode ? 'Focus mode on — hover page chrome to reveal it' : 'Focus mode off');
  }

  function exportSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'k12-command-center-settings.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toastMessage('Settings backup downloaded');
  }

  function openPalette() {
    closeAll();
    paletteOpen = true;
    const palette = document.createElement('div');
    palette.className = 'cc-palette';
    palette.innerHTML = '<input type="search" placeholder="Search actions…" aria-label="Search commands" style="margin-bottom:8px"><div class="cc-results"></div><div class="cc-muted" style="padding:8px 4px">↑ ↓ to move · Enter to run · Esc to close</div>';
    root.appendChild(palette);
    const input = palette.querySelector('input');
    const results = palette.querySelector('.cc-results');
    let selected = 0;
    const commands = actions.concat([
      { icon: '🕒', title: 'Show current time', detail: 'Display a toast with date and time', run: function () { toastMessage(new Date().toLocaleString()); } },
      { icon: '📋', title: 'Copy page title', detail: 'Copy this page title to clipboard', run: async function () { try { await navigator.clipboard.writeText(document.title); toastMessage('Page title copied'); } catch (_) { toastMessage(document.title); } } }
    ]);
    function render() {
      const query = input.value.trim().toLowerCase();
      const filtered = commands.filter(function (item) { return (item.title + ' ' + item.detail).toLowerCase().includes(query); });
      results.innerHTML = '';
      filtered.forEach(function (item, index) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'cc-result';
        if (index === selected) button.style.background = 'var(--cc-panel)';
        const icon = document.createElement('span'); icon.textContent = item.icon; icon.style.fontSize = '22px';
        const labels = document.createElement('span');
        const strong = document.createElement('strong'); strong.textContent = item.title;
        const small = document.createElement('small'); small.textContent = item.detail;
        labels.append(strong, small); button.append(icon, labels);
        button.addEventListener('click', function () { closeAll(); item.run(); });
        results.appendChild(button);
      });
      if (!filtered.length) results.innerHTML = '<p class="cc-muted" style="padding:12px">No matching commands.</p>';
      palette.dataset.count = String(filtered.length);
    }
    input.addEventListener('input', function () { selected = 0; render(); });
    input.addEventListener('keydown', function (event) {
      const count = Number(palette.dataset.count || 0);
      if (event.key === 'ArrowDown') { event.preventDefault(); selected = (selected + 1) % Math.max(1, count); render(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); selected = (selected - 1 + Math.max(1, count)) % Math.max(1, count); render(); }
      if (event.key === 'Enter') { event.preventDefault(); const button = results.querySelectorAll('button')[selected]; if (button) button.click(); }
    });
    render(); input.focus();
    document.addEventListener('keydown', onOverlayKeydown, true);
  }

  function onOverlayKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); closeAll(); return; }
    if (radialOpen && /^[1-9]$/.test(event.key)) {
      const button = actionButtons[Number(event.key) - 1];
      if (button) { event.preventDefault(); button.click(); }
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  center.addEventListener('click', closeAll);
  backdrop.addEventListener('click', closeAll);
  window.addEventListener('resize', function () { if (radialOpen) closeRadial(); });
  window.addEventListener('scroll', function () { if (radialOpen) closeRadial(); }, { passive: true });

  document.addEventListener('keydown', function (event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === 'Escape' && (radialOpen || paletteOpen || panel.classList.contains('cc-panel-open'))) { closeAll(); return; }
    if (typing) return;
    if (event.key.toLowerCase() === settings.radialKey.toLowerCase()) {
      event.preventDefault();
      if (radialOpen) closeAll();
      else openRadial(event.clientX || innerWidth / 2, event.clientY || innerHeight / 2);
    } else if (event.key === settings.commandKey && !event.shiftKey) {
      event.preventDefault();
      if (paletteOpen) closeAll();
      else openPalette();
    }
  });

  function updateClock() {
    if (!settings.showClock) { clock.style.display = 'none'; return; }
    clock.style.display = 'block';
    clock.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ';
    const time = document.createElement('strong');
    time.textContent = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    clock.append(label, time);
  }

  applyTheme();
  updateClock();
  clockTimer = setInterval(updateClock, 15000);
  window.addEventListener('pagehide', function () { clearInterval(clockTimer); });
  console.info('[K12 Command Center] Ready. Press ' + settings.radialKey.toUpperCase() + ' for the radial menu or / for command search.');
})();