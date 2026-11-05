# Master Chronology: A Star Trek Watch Order

A single-page viewing guide to the whole Star Trek franchise. It lists 995 entries (episodes, films, shorts, an audio drama and a few comics) across 20 series and productions, and lets you watch them in three different orders while keeping track of what you've seen.

It's plain HTML, CSS and JavaScript with no framework, no build step and no backend. Your watch history is stored in your own browser.

## Features

**Three viewing sequences**

| Sequence | URL | What it is |
| --- | --- | --- |
| Chronological | `#/chronological` | In-universe timeline order |
| Release Order | `#/release` | The order things first aired or were released |
| Time Travel | `#/time-travel` | Follows every jump through time, so stories that visit a period are placed there. An entry revisited later in the run (for example *Star Trek Generations*) shows up a second time with a **Revisit** tag |

Each sequence has its own accent color (amber, blue, violet). Switching sequences updates the URL, so you can bookmark or share a link that opens straight into one.

**Filtering and search**

- Series filter: toggle any of the 20 series and productions on or off, with **All** / **None** shortcuts. Each series shows a watched/total count and a small progress bar.
- Canon status: **All** or **Canon** (Canon hides uncertain, maybe, non-canon and retconned entries). Expand **Canon Key** in the sidebar for what the tags on each row mean.
- Search matches titles and episode codes (such as `3x15`) as you type.
- A **Reset filters** link appears whenever anything is filtered, and the result count shows "Showing X of 995".

**Progress tracking**

- Tick the button on any row to mark it watched. Progress shows in the header as a ring and a "Logged X / 995" count.
- The floating **Up next** button jumps to the first unwatched entry in the current sequence and filters.
- History and settings (sequence, canon filter, selected series) are saved in `localStorage`, so they survive reloads. They stay in that one browser on that one device. **Clear viewing history** at the bottom of the sidebar wipes it.

**Everything else**

- Episode titles link to their Memory Alpha (or Memory Beta / YouTube) page.
- Each row shows air date, stardate and Earth date, plus any notes.
- A live "stardate" readout in the header, just for flavor.
- Keyboard shortcuts:

  | Key | Action |
  | --- | --- |
  | `/` | Focus search |
  | `n` | Jump to next unwatched |
  | `1` `2` `3` | Chronological / Release / Time Travel |
  | `Esc` | Close the filter sheet or leave search |

**Mobile layout**

On narrow screens (860px and below) the sequence tabs move to a bottom navigation bar, the filters open as a bottom sheet from the **Filters** button (with a badge showing how many filters are active), and each row stacks its details vertically instead of scrolling sideways.

## Running it

The site loads `data.json` with `fetch()`, which browsers block for pages opened directly from disk (`file://`). Serve the folder over `http://` instead. Any static server works; run one of these from inside the folder:

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>. If you see "Could not load data.json", you're either on `file://` or `data.json` isn't next to `index.html`.

In VS Code, the Live Server extension does the same job.

### Deploying

Because it's all static files, the folder can go as-is onto any static host, such as GitHub Pages, Netlify or Cloudflare Pages. There's nothing to build.

## File layout

```
trek-chronology/
├── index.html   Page structure: header with sequence tabs and readouts, filter sidebar,
│                list, mobile bottom nav, "Up next" button, toast
├── style.css    LCARS-inspired styling, per-sequence accent colors, responsive breakpoints
│                (1180px, 860px, 420px) and reduced-motion support
├── app.js       Loads data.json, then handles filtering, sorting, rendering, watch tracking,
│                localStorage, URL routing and keyboard shortcuts
├── data.json    Every entry in the guide (the canonical data source)
└── README.md
```

Fonts (Antonio, IBM Plex Sans, IBM Plex Mono) load from Google Fonts. Nothing else is external.

## data.json format

`data.json` is a JSON array with one object per entry. Keys are kept short to keep the file small:

```json
{
  "i": 0,
  "s": "ENT",
  "e": "1x01/02",
  "t": "Broken Bow",
  "c": 1,
  "a": 629,
  "tt": 28,
  "k": "Y",
  "d": "2001-09-26",
  "dist": "UPN",
  "sd": "4/16/2151",
  "y": "2151-04-16",
  "n": "",
  "url": "https://memory-alpha.fandom.com/wiki/Broken_Bow_(episode)"
}
```

| Key | Meaning | Notes |
| --- | --- | --- |
| `i` | Unique ID | Integer. This is what watch history stores, so **never renumber existing entries** or people's history will point at the wrong episodes |
| `s` | Series code | Must match a key in `SHOWS` in `app.js` (see below) |
| `e` | Episode code | Such as `1x03`, `Movie 7`. Searchable |
| `t` | Title | Searchable |
| `c` | Position in Chronological order | Integer |
| `a` | Position in Release order | Integer |
| `tt` | Position in Time Travel order | Unique integer, 1 to 995 |
| `tt2` | Optional second Time Travel position | Only for entries that are revisited; adds a "Revisit" row at that slot |
| `k` | Canon code | See below |
| `d` | Original air/release date | `YYYY-MM-DD` |
| `dist` | Network or distributor | Such as `NBC`, `UPN`, `Paramount Plus`, `Theatrical`. Shown next to the episode code |
| `sd` | Stardate | Free text: a number, a range, or `Unknown` |
| `y` | In-universe Earth date | Either a year (number) or a `YYYY-MM-DD` string |
| `n` | Note | Optional, shown under the title when not empty |
| `url` | Link for the title | Usually Memory Alpha |

Entries with a missing sort value for the current sequence are placed at the end, in `i` order.

**Canon codes (`k`)**

| Code | Meaning | Shown under Canon |
| --- | --- | --- |
| `Y` | Canon | Yes |
| `YM` | Canon (minor caveat) | Yes |
| `Y?` | Probably canon | Yes |
| `B` | Branch timeline | Yes |
| `?` | Uncertain | No |
| `M` | Maybe | No |
| `N` | Non-canon | No |
| `R` | Retconned | No |

Rows show a small tag for every code except `Y` and `YM`.

**Series codes (`s`)**

| Code | Series | Code | Series |
| --- | --- | --- | --- |
| `TOS` | The Original Series | `PIC` | Picard |
| `TAS` | The Animated Series | `SNW` | Strange New Worlds |
| `TNG` | The Next Generation | `LD` | Lower Decks |
| `DS9` | Deep Space Nine | `PRO` | Prodigy |
| `VOY` | Voyager | `KHA` | Khan (Audio Drama) |
| `ENT` | Enterprise | `SCO` | Scouts |
| `KEL` | Kelvin Timeline Films | `SA` | Starfleet Academy |
| `DSC` | Discovery | `Very Short Treks` | Very Short Treks |
| `Short Trek` | Short Treks | `Short` | OTOY Shorts |
| `Comic` | Comics | `Long Trek` | Long Treks |

### Adding or editing entries

1. Add an object to `data.json` with a new, unused `i`.
2. Give it `c`, `a` and `tt` positions, shifting later entries in each order if you're slotting it in between. Keep `tt` values unique.
3. To add a new series, add it to `SHOWS` at the top of `app.js` with a display `name`, a `color`, and optionally a short `abbr` for the row pill. A series only appears in the filter list when it has at least one entry.

## Storage keys

| Key | Contents |
| --- | --- |
| `trek-chronology:watched` | Array of watched entry IDs (`i`) |
| `trek-chronology:settings` | `{ order, canon, shows }` |

If `localStorage` is unavailable (some private browsing modes), the site still works but won't remember anything between visits.
