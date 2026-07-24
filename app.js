(function(){
  "use strict";

  fetch('data.json')
    .then(function(res){
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(init)
    .catch(function(err){
      console.error('Failed to load data.json', err);
      var list = document.getElementById('list');
      if (list){
        list.innerHTML = '<p style="padding:20px;color:var(--rose)">Could not load data.json — make sure it\'s in the same folder as index.html, and that you\'re viewing this over http:// (not file://).</p>';
      }
    });

  function init(DATA){

  var SHOWS = {
    TOS:  {name:"The Original Series",   color:"#FF9F1C"},
    TAS:  {name:"The Animated Series",   color:"#FFC145"},
    KEL:  {name:"Kelvin Timeline Films", color:"#F4585F"},
    TNG:  {name:"The Next Generation",   color:"#6C8EFF"},
    DS9:  {name:"Deep Space Nine",       color:"#B18CFF"},
    VOY:  {name:"Voyager",               color:"#3DCCC7"},
    ENT:  {name:"Enterprise",            color:"#E8734A"},
    DSC:  {name:"Discovery",             color:"#C15CFF"},
    PIC:  {name:"Picard",                color:"#4FA3E3"},
    SNW:  {name:"Strange New Worlds",    color:"#FFD23F"},
    LD:   {name:"Lower Decks",           color:"#7ED957"},
    PRO:  {name:"Prodigy",               color:"#59C9A5"},
    KHA:  {name:"Khan (Audio Drama)",    color:"#D65DB1"},
    SCO:  {name:"Scouts",                color:"#FF7BAC"},
    SA:   {name:"Starfleet Academy",     color:"#00C2CB"},
    "Short Trek":       {name:"Short Treks",        color:"#FFB86B", abbr:"ST"},
    "Very Short Treks": {name:"Very Short Treks",   color:"#FFA36B", abbr:"VST"},
    "Short":            {name:"Fan Shorts",         color:"#B0B0B0", abbr:"OTOY"},
    "Long Trek":        {name:"Long-Form / Feature",color:"#9A9A9A", abbr:"LT"},
    Comic: {name:"Comics & Tie-ins", color:"#D9A441"}
  };

  // canon codes from the CSV, bucketed for the filter toggle
  var CANON_CODES = { canon: ["Y","YM","Y?","B"], noncanon: ["N","?","M","R"] };

  var state = {
    order: 'c',
    canon: 'all',
    search: '',
    shows: new Set(Object.keys(SHOWS)),
    watched: new Set()
  };

  var WATCHED_KEY = 'trek-chronology:watched';
  var SETTINGS_KEY = 'trek-chronology:settings';

  var storageWorks = true;
  try{
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
  }catch(e){
    storageWorks = false;
  }

  function loadStorage(){
    if (!storageWorks){ render(); return; }

    var watchedRaw = localStorage.getItem(WATCHED_KEY);
    if (watchedRaw){
      try{ state.watched = new Set(JSON.parse(watchedRaw)); }
      catch(e){ /* corrupt data, just start fresh */ }
    }

    var settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw){
      try{
        var s = JSON.parse(settingsRaw);
        if (s.order) state.order = s.order;
        if (s.canon) state.canon = s.canon;
        if (Array.isArray(s.shows)) state.shows = new Set(s.shows);
      }catch(e){}
    }

    syncControlsToState();
    render();
  }

  function saveWatched(){
    if (!storageWorks) return;
    localStorage.setItem(WATCHED_KEY, JSON.stringify([...state.watched]));
  }

  function saveSettings(){
    if (!storageWorks) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      order: state.order,
      canon: state.canon,
      shows: [...state.shows]
    }));
  }

  function syncControlsToState(){
    document.querySelectorAll('#orderToggle .seg-btn').forEach(function(b){
      var on = b.dataset.order === state.order;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('#canonToggle .seg-btn').forEach(function(b){
      var on = b.dataset.canon === state.canon;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
  }

  function showCounts(){
    var counts = {};
    DATA.forEach(function(d){ counts[d.s] = (counts[d.s]||0) + 1; });
    return counts;
  }
  var counts = showCounts();

  function passesFilters(d){
    if (!state.shows.has(d.s)) return false;
    if (state.canon === 'canon' && CANON_CODES.noncanon.includes(d.k)) return false;
    if (state.canon === 'noncanon' && CANON_CODES.canon.includes(d.k)) return false;
    if (state.search){
      var q = state.search.toLowerCase();
      if (!d.t.toLowerCase().includes(q) && !d.e.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  function getFilteredSorted(){
    var out = DATA.filter(passesFilters);
    var field = state.order;
    out.sort(function(a,b){
      var av = a[field], bv = b[field];
      if (av === null && bv === null) return a.i - b.i;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    });
    return out;
  }

  var listEl = document.getElementById('list');
  var listHeadEl = document.getElementById('listHead');
  var emptyEl = document.getElementById('emptyState');

  listHeadEl.innerHTML = '<span>#</span><span></span><span>Series</span><span>Title</span><span>Air Date</span><span>Stardate</span><span>Gregorian Date</span><span></span>';

  function canonLabel(k){
    if (k === 'Y' || k === 'YM') return '';
    return '<span class="canon-tag" title="Canon status: ' + k + '">' + k + '</span>';
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function rowHtml(d){
    var show = SHOWS[d.s] || {name:d.s, color:'#888'};
    var watched = state.watched.has(d.i);
    var orderVal = d[state.order];
    var noteHtml = d.n ? '<div class="ep-note">' + escapeHtml(d.n) + '</div>' : '';

    return '<div class="row' + (watched ? ' is-watched' : '') + '" data-id="' + d.i + '">' +
      '<div class="order-num">' + (orderVal !== null ? orderVal : '—') + '</div>' +
      '<div class="conduit" style="color:' + show.color + ';background:' + (watched ? show.color : 'var(--panel3)') + '"></div>' +
      '<div class="show-pill" style="background:' + show.color + '" title="' + escapeHtml(show.name) + '">' + escapeHtml(show.abbr || d.s) + '</div>' +
      '<div class="ep-info">' +
        '<div class="ep-title">' + (d.url ? '<a class="ep-link" href="' + escapeHtml(d.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(d.t) + '</a>' : escapeHtml(d.t)) + canonLabel(d.k) + '</div>' +
        '<div class="ep-sub">' + escapeHtml(d.e || '—') + ' · ' + escapeHtml(d.dist || '') + '</div>' +
        noteHtml +
      '</div>' +
      '<div class="ep-date">' + escapeHtml(d.d || '—') + '</div>' +
      '<div class="ep-stardate">' + escapeHtml(d.sd || '—') + '</div>' +
      '<div class="ep-year">' + escapeHtml(d.y || '—') + '</div>' +
      '<button class="watch-btn' + (watched ? ' checked' : '') + '" aria-label="' + (watched ? 'Mark unwatched' : 'Mark watched') + '" data-id="' + d.i + '"></button>' +
    '</div>';
  }

  var currentList = [];

  function render(){
    currentList = getFilteredSorted();

    if (!currentList.length){
      listEl.innerHTML = '';
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      listEl.innerHTML = currentList.map(rowHtml).join('');
    }

    renderChips();
    renderProgress();
  }

  function renderProgress(){
    var total = DATA.length;
    var watchedCount = state.watched.size;
    var pct = total ? Math.round((watchedCount/total)*100) : 0;
    document.getElementById('statProgress').textContent = watchedCount + ' / ' + total;
    document.getElementById('conduitFill').style.width = pct + '%';
    document.getElementById('conduitPct').textContent = pct + '%';
  }

  function renderChips(){
    var container = document.getElementById('showChips');

    // build once, then just flip classes/counts on subsequent renders
    if (container.dataset.built){
      updateChipStates();
      return;
    }

    var html = Object.keys(SHOWS).map(function(code){
      var show = SHOWS[code];
      var watchedInShow = DATA.filter(function(d){ return d.s === code && state.watched.has(d.i); }).length;
      return '<button class="show-chip active" data-show="' + code + '">' +
        '<span class="dot" style="background:' + show.color + '"></span>' +
        escapeHtml(show.abbr || code) +
        '<span class="count" data-count-for="' + code + '">' + watchedInShow + '/' + (counts[code]||0) + '</span>' +
      '</button>';
    });

    container.innerHTML = html.join('');
    container.dataset.built = '1';
    container.addEventListener('click', function(e){
      var btn = e.target.closest('.show-chip');
      if (!btn) return;
      var code = btn.dataset.show;
      state.shows.has(code) ? state.shows.delete(code) : state.shows.add(code);
      btn.classList.toggle('active');
      saveSettings();
      render();
    });
  }

  function updateChipStates(){
    document.querySelectorAll('.show-chip').forEach(function(btn){
      var code = btn.dataset.show;
      btn.classList.toggle('active', state.shows.has(code));
      var span = btn.querySelector('[data-count-for]');
      if (!span) return;
      var watchedInShow = DATA.filter(function(d){ return d.s === code && state.watched.has(d.i); }).length;
      span.textContent = watchedInShow + '/' + (counts[code]||0);
    });
  }

  listEl.addEventListener('click', function(e){
    var btn = e.target.closest('.watch-btn');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    if (state.watched.has(id)) state.watched.delete(id);
    else state.watched.add(id);
    saveWatched();
    render();
  });

  document.getElementById('orderToggle').addEventListener('click', function(e){
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.order = btn.dataset.order;
    syncControlsToState();
    saveSettings();
    render();
  });

  document.getElementById('canonToggle').addEventListener('click', function(e){
    var btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.canon = btn.dataset.canon;
    syncControlsToState();
    saveSettings();
    render();
  });

  var searchInput = document.getElementById('searchInput');
  var searchTimer;
  searchInput.addEventListener('input', function(){
    clearTimeout(searchTimer);
    var val = searchInput.value;
    searchTimer = setTimeout(function(){
      state.search = val.trim();
      render();
    }, 120); // small debounce so we're not re-rendering on every keystroke
  });

  document.getElementById('selectAllShows').addEventListener('click', function(){
    state.shows = new Set(Object.keys(SHOWS));
    saveSettings();
    render();
  });

  document.getElementById('selectNoneShows').addEventListener('click', function(){
    state.shows = new Set();
    saveSettings();
    render();
  });

  document.getElementById('emptyReset').addEventListener('click', function(){
    state.shows = new Set(Object.keys(SHOWS));
    state.canon = 'all';
    state.search = '';
    searchInput.value = '';
    syncControlsToState();
    saveSettings();
    render();
  });

  document.getElementById('resetProgress').addEventListener('click', function(){
    if (!confirm('Clear your entire viewing history? This cannot be undone.')) return;
    state.watched = new Set();
    saveWatched();
    render();
    showToast('Viewing history cleared');
  });

  document.getElementById('jumpNext').addEventListener('click', function(){
    var next = currentList.find(function(d){ return !state.watched.has(d.i); });
    if (!next){ showToast('All caught up in this view!'); return; }

    document.querySelectorAll('.row.is-current').forEach(function(r){ r.classList.remove('is-current'); });
    var el = listEl.querySelector('[data-id="' + next.i + '"]');
    if (!el) return;
    el.classList.add('is-current');
    el.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(function(){ el.classList.remove('is-current'); }, 2400);
  });

  var mobileToggle = document.getElementById('mobileToggle');
  var sidebar = document.getElementById('sidebar');
  mobileToggle.addEventListener('click', function(){
    var open = sidebar.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', open);
    mobileToggle.textContent = open ? 'CONTROLS ▴' : 'CONTROLS ▾';
  });

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  // rough TNG-era stardate approximation, just for flavor — not meant to be accurate
  function updateStardate(){
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var dayOfYear = Math.floor((now - startOfYear) / 86400000);
    var sd = ((now.getFullYear() - 2323) * 1000) + (dayOfYear / 365) * 1000;
    document.getElementById('liveStardate').textContent = sd.toFixed(1);
  }
  updateStardate();
  setInterval(updateStardate, 60000);

  loadStorage();

  }

})();