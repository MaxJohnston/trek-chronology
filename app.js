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
    TNG:  {name:"The Next Generation",   color:"#6C8EFF"},
    DS9:  {name:"Deep Space Nine",       color:"#B18CFF"},
    VOY:  {name:"Voyager",               color:"#3DCCC7"},
    ENT:  {name:"Enterprise",            color:"#E8734A"},
    KEL:  {name:"Kelvin Timeline Films", color:"#F4585F"},
    DSC:  {name:"Discovery",             color:"#C15CFF"},
    "Short Trek":       {name:"Short Treks",        color:"#FFB86B", abbr:"ST"},
    PIC:  {name:"Picard",                color:"#4FA3E3"},
    SNW:  {name:"Strange New Worlds",    color:"#FFD23F"},
    LD:   {name:"Lower Decks",           color:"#7ED957"},
    PRO:  {name:"Prodigy",               color:"#59C9A5"},
    KHA:  {name:"Khan (Audio Drama)",    color:"#D65DB1"},
    SCO:  {name:"Scouts",                color:"#FF7BAC"},
    SA:   {name:"Starfleet Academy",     color:"#00C2CB"},
    "Very Short Treks": {name:"Very Short Treks",   color:"#FFA36B", abbr:"VST"},
    "Short":            {name:"OTOY Shorts",        color:"#B0B0B0", abbr:"OTOY"},
    "Long Trek":        {name:"Long Treks",color:"#9A9A9A", abbr:"LT"},
    Comic: {name:"Comics", color:"#D9A441"}
  };

  // canon codes from the CSV, bucketed for the filter toggle
  var CANON_CODES = { canon: ["Y","YM","Y?","B"], noncanon: ["N","?","M","R"] };

  var ROUTES = { c:'chronological', a:'release', tt:'time-travel' };

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
    if (storageWorks){
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
          if (s.canon === 'canon') state.canon = 'canon';
          if (Array.isArray(s.shows)) state.shows = new Set(s.shows);
        }catch(e){}
      }
    }

    // a shared link like #/time-travel wins over whatever was saved
    var fromHash = orderFromHash();
    if (fromHash) state.order = fromHash;

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

  function orderFromHash(){
    var slug = location.hash.replace(/^#\/?/, '');
    return Object.keys(ROUTES).find(function(k){ return ROUTES[k] === slug; });
  }

  function setOrder(order){
    if (!ROUTES[order]) return;
    state.order = order;
    history.replaceState(null, '', '#/' + ROUTES[order]);
    syncControlsToState();
    saveSettings();
    render();
    mainEl.scrollTop = 0;
  }

  function syncControlsToState(){
    document.body.dataset.order = state.order;
    document.querySelectorAll('.order-btn').forEach(function(b){
      b.setAttribute('aria-pressed', b.dataset.order === state.order);
    });
    document.querySelectorAll('#canonToggle .seg-btn').forEach(function(b){
      b.setAttribute('aria-pressed', b.dataset.canon === state.canon);
    });
  }

  var counts = {};
  DATA.forEach(function(d){ counts[d.s] = (counts[d.s]||0) + 1; });

  function passesFilters(d){
    if (!state.shows.has(d.s)) return false;
    if (state.canon === 'canon' && CANON_CODES.noncanon.includes(d.k)) return false;
    if (state.search){
      var q = state.search.toLowerCase();
      var title = String(d.t || '').toLowerCase();
      var ep = String(d.e || '').toLowerCase();
      if (!title.includes(q) && !ep.includes(q)) return false;
    }
    return true;
  }

  function getFilteredSorted(){
    var out = DATA.filter(passesFilters);
    var field = state.order;

    // entries revisited during the time-travel run get a second slot via tt2;
    // the copy is render-only so totals and per-show tallies stay honest
    if (field === 'tt'){
      out.filter(function(d){ return d.tt2 != null; }).forEach(function(d){
        out.push(Object.assign({}, d, { tt: d.tt2, repeat: true }));
      });
    }

    out.sort(function(a,b){
      var av = a[field], bv = b[field];
      if (av == null && bv == null) return a.i - b.i;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });
    return out;
  }

  function isFiltered(){
    return state.canon !== 'all' || !!state.search || visibleShowCodes().some(function(c){ return !state.shows.has(c); });
  }

  function activeFilterCount(){
    var hidden = visibleShowCodes().filter(function(c){ return !state.shows.has(c); }).length;
    return (hidden ? 1 : 0) + (state.canon !== 'all' ? 1 : 0) + (state.search ? 1 : 0);
  }

  function visibleShowCodes(){
    return Object.keys(SHOWS).filter(function(c){ return counts[c]; });
  }

  var listEl = document.getElementById('list');
  var listHeadEl = document.getElementById('listHead');
  var emptyEl = document.getElementById('emptyState');
  var mainEl = document.getElementById('main');

  listHeadEl.innerHTML = '<span></span><span class="num-head">#</span><span>Series</span><span>Title</span><span>Air Date</span><span>Stardate</span><span>Gregorian Date</span>';

  var CANON_NAMES = { 'Y?':'Probably Canon', M:'Maybe', N:'Non-canon', B:'Branch Timeline', R:'Retconned' };

  function canonLabel(k){
    if (!k || k === 'Y' || k === 'YM') return '';
    return '<span class="canon-tag" title="Canon status: ' + escapeHtml(CANON_NAMES[k] || k) + '">' + escapeHtml(k) + '</span>';
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function metaCell(cls, label, val){
    var text = val == null || val === '' ? '—' : escapeHtml(val);
    return '<span class="' + cls + '" data-label="' + label + '" title="' + text + '">' + text + '</span>';
  }

  function rowHtml(d, nextId){
    var show = SHOWS[d.s] || {name:d.s, color:'#888'};
    var watched = state.watched.has(d.i);
    var orderVal = d[state.order];
    var title = escapeHtml(d.t == null ? '' : d.t);
    var sub = [d.e, d.dist].filter(Boolean).map(escapeHtml).join(' · ') || '—';
    var cls = 'row' + (watched ? ' is-watched' : '') + (!d.repeat && d.i === nextId ? ' is-next' : '');

    return '<div class="' + cls + '" data-id="' + d.i + '" style="--show:' + show.color + '">' +
      '<button class="watch-btn" aria-pressed="' + watched + '" aria-label="' + (watched ? 'Mark unwatched' : 'Mark watched') + '" data-id="' + d.i + '"></button>' +
      '<div class="order-num">' + (orderVal != null ? orderVal : '—') + '</div>' +
      '<div class="show-pill" title="' + escapeHtml(show.name) + '">' + escapeHtml(show.abbr || d.s) + '</div>' +
      '<div class="ep-info">' +
        '<div class="ep-title">' +
          (d.url ? '<a class="ep-link" href="' + escapeHtml(d.url) + '" target="_blank" rel="noopener noreferrer">' + title + '</a>' : title) +
          canonLabel(d.k) +
          (d.repeat ? '<span class="tag tag-repeat" title="Appears again at this point in the timeline">Revisit</span>' : '') +
          '<span class="tag tag-next">Up next</span>' +
        '</div>' +
        '<div class="ep-sub">' + sub + '</div>' +
        (d.n ? '<div class="ep-note">' + escapeHtml(d.n) + '</div>' : '') +
      '</div>' +
      '<div class="ep-meta">' +
        metaCell('ep-date', 'Aired', d.d) +
        metaCell('ep-stardate', 'Stardate', d.sd) +
        metaCell('ep-year', 'Earth date', d.y) +
      '</div>' +
    '</div>';
  }

  var currentList = [];

  function nextUnwatched(){
    return currentList.find(function(d){ return !state.watched.has(d.i); });
  }

  function render(){
    currentList = getFilteredSorted();
    var next = nextUnwatched();

    if (!currentList.length){
      listEl.innerHTML = '';
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      listEl.innerHTML = currentList.map(function(d){ return rowHtml(d, next && next.i); }).join('');
    }

    renderChips();
    renderProgress();
    renderMeta(next);
  }

  function renderMeta(next){
    var unique = new Set(currentList.map(function(d){ return d.i; })).size;
    document.getElementById('resultCount').textContent = isFiltered()
      ? 'Showing ' + unique + ' of ' + DATA.length
      : DATA.length + ' entries';
    document.getElementById('clearFilters').hidden = !isFiltered();

    var n = activeFilterCount();
    var badge = document.getElementById('filterBadge');
    badge.hidden = !n;
    badge.textContent = n;

    var nextBtn = document.getElementById('jumpNext');
    nextBtn.classList.toggle('done', !next);
    document.getElementById('nextTitle').textContent = next
      ? (SHOWS[next.s] ? (SHOWS[next.s].abbr || next.s) : next.s) + ' · ' + String(next.t == null ? '' : next.t)
      : 'All caught up';
  }

  function renderProgress(){
    var total = DATA.length;
    var watchedCount = DATA.filter(function(d){ return state.watched.has(d.i); }).length;
    var pct = total ? Math.round((watchedCount/total)*100) : 0;
    var circumference = 2 * Math.PI * 19;
    document.getElementById('statProgress').textContent = watchedCount + ' / ' + total;
    document.getElementById('ringPct').textContent = pct + '%';
    var ring = document.getElementById('ringFill');
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference * (1 - pct/100);
  }

  function seriesTally(code){
    return DATA.filter(function(d){ return d.s === code && state.watched.has(d.i); }).length;
  }

  function renderChips(){
    var container = document.getElementById('showChips');

    // build once, then just flip states/counts on subsequent renders
    if (!container.dataset.built){
      container.innerHTML = visibleShowCodes().map(function(code){
        var show = SHOWS[code];
        return '<button class="series-item" data-show="' + escapeHtml(code) + '" style="--show:' + show.color + '" title="' + escapeHtml(show.name) + '">' +
          '<span class="dot"></span>' +
          '<span class="series-name">' + escapeHtml(show.name) + '</span>' +
          '<span class="series-count"></span>' +
          '<span class="series-bar"><i></i></span>' +
        '</button>';
      }).join('');
      container.dataset.built = '1';

      container.addEventListener('click', function(e){
        var btn = e.target.closest('.series-item');
        if (!btn) return;
        var code = btn.dataset.show;
        state.shows.has(code) ? state.shows.delete(code) : state.shows.add(code);
        saveSettings();
        render();
      });
    }

    container.querySelectorAll('.series-item').forEach(function(btn){
      var code = btn.dataset.show;
      var seen = seriesTally(code);
      var total = counts[code] || 0;
      btn.setAttribute('aria-pressed', state.shows.has(code));
      btn.querySelector('.series-count').textContent = seen + '/' + total;
      btn.querySelector('.series-bar i').style.width = (total ? seen/total*100 : 0) + '%';
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

  document.querySelectorAll('.seq-nav, .bottom-nav').forEach(function(nav){
    nav.addEventListener('click', function(e){
      var btn = e.target.closest('.order-btn');
      if (btn) setOrder(btn.dataset.order);
    });
  });

  window.addEventListener('hashchange', function(){
    var o = orderFromHash();
    if (o && o !== state.order) setOrder(o);
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

  function resetFilters(){
    state.shows = new Set(Object.keys(SHOWS));
    state.canon = 'all';
    state.search = '';
    searchInput.value = '';
    syncControlsToState();
    saveSettings();
    render();
  }
  document.getElementById('emptyReset').addEventListener('click', resetFilters);
  document.getElementById('clearFilters').addEventListener('click', resetFilters);

  document.getElementById('resetProgress').addEventListener('click', function(){
    if (!confirm('Clear your entire viewing history? This cannot be undone.')) return;
    state.watched = new Set();
    saveWatched();
    render();
    showToast('Viewing history cleared');
  });

  document.getElementById('exportProgress').addEventListener('click', function(){
    var ids = DATA.filter(function(d){ return state.watched.has(d.i); });
    var payload = {
      app: 'trek-chronology',
      version: 1,
      exported: new Date().toISOString(),
      watched: ids.map(function(d){ return d.i; }),
      // titles ride along so the file is readable by a human; import only uses `watched`
      titles: ids.map(function(d){ return d.s + ' ' + (d.e || '') + ' ' + String(d.t == null ? '' : d.t); })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trek-progress-' + payload.exported.slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    showToast('Exported ' + payload.watched.length + ' watched entries');
  });

  var importFile = document.getElementById('importFile');
  document.getElementById('importProgress').addEventListener('click', function(){ importFile.click(); });
  importFile.addEventListener('change', function(){
    var file = importFile.files[0];
    importFile.value = '';
    if (!file) return;
    file.text().then(function(text){
      var parsed = JSON.parse(text);
      var raw = Array.isArray(parsed) ? parsed : parsed && parsed.watched;
      if (!Array.isArray(raw)) throw new Error('no watched list');
      var known = new Set(DATA.map(function(d){ return d.i; }));
      var ids = raw.map(Number).filter(function(id){ return known.has(id); });

      if (state.watched.size && !confirm('Replace your current history (' + state.watched.size + ' watched) with the ' + ids.length + ' entries in this file?')) return;
      state.watched = new Set(ids);
      saveWatched();
      render();
      showToast('Imported ' + ids.length + ' watched entries');
    }).catch(function(){
      showToast('That file isn\'t a valid progress export');
    });
  });

  function jumpToNext(){
    var next = nextUnwatched();
    if (!next){ showToast('All caught up in this view!'); return; }

    var el = listEl.querySelector('.row[data-id="' + next.i + '"]');
    if (!el) return;
    el.classList.add('is-current');
    el.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(function(){ el.classList.remove('is-current'); }, 2400);
  }
  document.getElementById('jumpNext').addEventListener('click', jumpToNext);

  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var openSheetBtn = document.getElementById('openSheet');

  function toggleSheet(open){
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    openSheetBtn.setAttribute('aria-expanded', open);
    document.body.classList.toggle('sheet-open', open);
  }
  openSheetBtn.addEventListener('click', function(){ toggleSheet(!sidebar.classList.contains('open')); });
  document.getElementById('closeSheet').addEventListener('click', function(){ toggleSheet(false); });
  scrim.addEventListener('click', function(){ toggleSheet(false); });

  document.addEventListener('keydown', function(e){
    var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === 'Escape'){
      if (sidebar.classList.contains('open')) toggleSheet(false);
      else if (typing) searchInput.blur();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/'){ e.preventDefault(); searchInput.focus(); }
    else if (e.key === 'n'){ jumpToNext(); }
    else if (e.key === '1'){ setOrder('c'); }
    else if (e.key === '2'){ setOrder('a'); }
    else if (e.key === '3'){ setOrder('tt'); }
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
