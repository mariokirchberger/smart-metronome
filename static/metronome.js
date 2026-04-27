'use strict';

// ── State ──────────────────────────────────────────────────────────────────

let audioContext   = null;
let schedulerTimer = null;
let rafId          = null;
let isPlaying      = false;
let currentBeat    = 0;
let nextNoteTime   = 0.0;

// Notes scheduled but not yet drawn; each entry: { beat, time }
const notesInQueue    = [];
// Queued dynamic display updates; each entry: { barCount, bpm, time }
const dynDisplayQueue = [];

// Dynamic mode state
let dynamicBPM            = 120;
let dynamicBarCount       = 0;
let dynamicNextAdjustTime = 0;   // used in Zeit mode: AudioContext time of next BPM step

// Stored input values per sub-mode so switching back restores the last entry
let dynRepsStored = 4;
let dynZeitStored = 8;

// Tap tempo state
const tapTimes   = [];
const TAP_RESET  = 2000; // ms — gap that resets the tap history

// ── Config ─────────────────────────────────────────────────────────────────

const LOOKAHEAD      = 25.0;  // ms  — scheduler interval
const SCHEDULE_AHEAD = 0.1;   // sec — how far ahead to schedule audio
const CLICK_DURATION = 0.04;  // sec
const FREQ_ACCENT    = 1000;  // Hz — Zählzeit 1
const FREQ_NORMAL    = 600;   // Hz — andere Zählzeiten

// ── DOM helpers ────────────────────────────────────────────────────────────

const bpmInput       = () => document.getElementById('bpm');
const numeratorInput = () => document.getElementById('numerator');
const denominatorSel = () => document.getElementById('denominator');
const playBtn        = () => document.getElementById('play-pause-btn');
const beatContainer  = () => document.getElementById('beat-indicators');

function getBPM()        { return Math.max(20, Math.min(300, parseInt(bpmInput().value)         || 120)); }
function getNumerator()  { return Math.max(1,  Math.min(16,  parseInt(numeratorInput().value)   || 4));   }
function getDenominator(){ return parseInt(denominatorSel().value) || 4; }

function getDynStart()  { return Math.max(20, Math.min(300, parseInt(document.getElementById('dyn-start').value)  || 80));  }
function getDynTarget() { return Math.max(20, Math.min(300, parseInt(document.getElementById('dyn-target').value) || 160)); }
function getDynReps()    { return Math.max(1,   Math.min(999, parseInt(document.getElementById('dyn-reps').value) || 4));  }
function getDynSeconds() { return Math.max(1,   Math.min(999, parseInt(document.getElementById('dyn-reps').value) || 8));  }
function getDynStep()    { return Math.max(1,   Math.min(100, parseInt(document.getElementById('dyn-step').value) || 5));  }

function isZeitMode() {
    return document.querySelector('.mode-btn.active')?.dataset.mode === 'zeit';
}

function getAccentVolume() {
    return Math.max(0.001, parseInt(document.getElementById('vol-accent').value) / 100);
}

function getNormalVolume() {
    return Math.max(0.001, parseInt(document.getElementById('vol-normal').value) / 100);
}

function isDynamicMode() {
    return document.getElementById('tab-dynamik').classList.contains('active');
}

function getActiveBPM() {
    return isDynamicMode() ? dynamicBPM : getBPM();
}

function getBeatDuration() {
    return (60.0 / getActiveBPM()) * (4.0 / getDenominator());
}

// ── Dynamic tempo logic ────────────────────────────────────────────────────

// Shared: advance BPM by one step and queue a display update at scheduledTime.
function stepDynamicTempo(scheduledTime) {
    dynamicBPM += getDynStep();
    if (dynamicBPM >= getDynTarget()) {
        dynamicBPM = getDynStart();
    }
    dynDisplayQueue.push({
        barCount: isZeitMode() ? null : dynamicBarCount,
        bpm:      dynamicBPM,
        time:     scheduledTime,
    });
}

// Wiederholungen mode: called when the beat counter wraps (bar complete).
// nextNoteTime already points to the first beat of the new bar.
function onBarComplete() {
    dynamicBarCount++;

    if (dynamicBarCount >= getDynReps()) {
        dynamicBarCount = 0;
        stepDynamicTempo(nextNoteTime);
    } else {
        dynDisplayQueue.push({ barCount: dynamicBarCount, bpm: dynamicBPM, time: nextNoteTime });
    }
}

function updateDynDisplay() {
    const bpmEl = document.getElementById('dyn-current-bpm');
    const repEl = document.getElementById('dyn-rep-count');
    if (bpmEl) bpmEl.textContent = dynamicBPM + ' BPM';
    if (repEl) repEl.textContent = isZeitMode() ? '—' : (dynamicBarCount + 1) + ' / ' + getDynReps();
}

function resetDynDisplay() {
    const bpmEl = document.getElementById('dyn-current-bpm');
    const repEl = document.getElementById('dyn-rep-count');
    if (bpmEl) bpmEl.textContent = '—';
    if (repEl) repEl.textContent = '—';
}

// ── Audio scheduling ───────────────────────────────────────────────────────

function scheduleClick(beat, time) {
    const osc  = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.type            = 'sine';
    osc.frequency.value = beat === 0 ? FREQ_ACCENT : FREQ_NORMAL;

    const volume = beat === 0 ? getAccentVolume() : getNormalVolume();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION);

    osc.start(time);
    osc.stop(time + CLICK_DURATION);

    notesInQueue.push({ beat, time });
}

function scheduler() {
    const limit = audioContext.currentTime + SCHEDULE_AHEAD;
    while (nextNoteTime < limit) {
        const noteTime = nextNoteTime;

        scheduleClick(currentBeat, noteTime);
        nextNoteTime += getBeatDuration();
        currentBeat = (currentBeat + 1) % getNumerator();

        if (isDynamicMode()) {
            if (isZeitMode()) {
                if (noteTime >= dynamicNextAdjustTime) {
                    dynamicNextAdjustTime += getDynSeconds();
                    stepDynamicTempo(noteTime);
                }
            } else if (currentBeat === 0) {
                onBarComplete();
            }
        }
    }
}

// ── Visual update (requestAnimationFrame) ──────────────────────────────────

function drawLoop() {
    const threshold = audioContext.currentTime + 0.02;

    while (notesInQueue.length && notesInQueue[0].time <= threshold) {
        highlightBeat(notesInQueue[0].beat);
        notesInQueue.shift();
    }

    while (dynDisplayQueue.length && dynDisplayQueue[0].time <= threshold) {
        const { barCount, bpm } = dynDisplayQueue.shift();
        const bpmEl = document.getElementById('dyn-current-bpm');
        const repEl = document.getElementById('dyn-rep-count');
        if (bpmEl) bpmEl.textContent = bpm + ' BPM';
        if (repEl) repEl.textContent = barCount === null ? '—' : (barCount + 1) + ' / ' + getDynReps();
    }

    rafId = requestAnimationFrame(drawLoop);
}

function highlightBeat(beat) {
    beatContainer().querySelectorAll('.beat-indicator').forEach(el => {
        el.classList.remove('active', 'accent');
    });
    const target = beatContainer().querySelectorAll('.beat-indicator')[beat];
    if (target) {
        target.classList.add('active');
        if (beat === 0) target.classList.add('accent');
    }
}

function clearHighlights() {
    beatContainer().querySelectorAll('.beat-indicator').forEach(el => {
        el.classList.remove('active', 'accent');
    });
}

// ── Play / Pause ───────────────────────────────────────────────────────────

function play() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (isDynamicMode()) {
        dynamicBPM      = getDynStart();
        dynamicBarCount = 0;
        if (isZeitMode()) {
            dynamicNextAdjustTime = audioContext.currentTime + 0.05 + getDynSeconds();
        }
        updateDynDisplay();
    }

    isPlaying    = true;
    currentBeat  = 0;
    nextNoteTime = audioContext.currentTime + 0.05;
    notesInQueue.length    = 0;
    dynDisplayQueue.length = 0;

    schedulerTimer = setInterval(scheduler, LOOKAHEAD);
    rafId = requestAnimationFrame(drawLoop);

    updatePlayButton();
}

function pause() {
    isPlaying = false;
    clearInterval(schedulerTimer);
    cancelAnimationFrame(rafId);
    schedulerTimer = null;
    rafId = null;
    notesInQueue.length    = 0;
    dynDisplayQueue.length = 0;
    clearHighlights();
    updatePlayButton();
}

function togglePlayPause() {
    if (isPlaying) pause(); else play();
}

function updatePlayButton() {
    const btn = playBtn();
    btn.textContent = isPlaying ? 'Pause' : 'Play';
    btn.classList.toggle('playing', isPlaying);
}

// ── Dynamik sub-mode (Wiederholungen / Zeit) ───────────────────────────────

function switchDynMode(mode) {
    if (isPlaying) pause();

    const input = document.getElementById('dyn-reps');
    const label = document.getElementById('dyn-reps-label');
    const repEl = document.getElementById('dyn-rep-count');

    if (mode === 'zeit') {
        dynRepsStored  = parseInt(input.value) || dynRepsStored;
        input.value    = dynZeitStored;
        label.textContent = 'Sekunden';
        if (repEl) repEl.textContent = '—';
    } else {
        dynZeitStored  = parseInt(input.value) || dynZeitStored;
        input.value    = dynRepsStored;
        label.textContent = 'Wiederholungen';
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

// ── Tab switching ──────────────────────────────────────────────────────────

function switchTab(tabName) {
    if (isPlaying) pause();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });

    if (tabName === 'metronom') resetDynDisplay();
    if (tabName === 'analyse') loadSongs();
}

// ── Beat indicator DOM ─────────────────────────────────────────────────────

function rebuildBeatIndicators() {
    const container = beatContainer();
    container.innerHTML = '';
    for (let i = 0; i < getNumerator(); i++) {
        const dot = document.createElement('div');
        dot.className = 'beat-indicator';
        container.appendChild(dot);
    }
}

// ── Tap Tempo ──────────────────────────────────────────────────────────────

function tap() {
    const now = performance.now();

    // Reset history if the user paused too long
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > TAP_RESET) {
        tapTimes.length = 0;
    }

    tapTimes.push(now);

    // Flash the button for visual feedback
    const btn = document.getElementById('tap-btn');
    btn.classList.remove('flash');
    void btn.offsetWidth; // force reflow to restart the class transition
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 150);

    // Need at least 2 taps to derive an interval
    if (tapTimes.length < 2) return;

    // Keep only the last 8 taps for a stable rolling average
    if (tapTimes.length > 8) tapTimes.shift();

    let total = 0;
    for (let i = 1; i < tapTimes.length; i++) {
        total += tapTimes[i] - tapTimes[i - 1];
    }
    const bpm = Math.round(60000 / (total / (tapTimes.length - 1)));
    bpmInput().value = Math.max(20, Math.min(300, bpm));
}

function restartIfPlaying() {
    if (isPlaying) {
        pause();
        setTimeout(play, 50);
    }
}

// ── Event listeners ────────────────────────────────────────────────────────

playBtn().addEventListener('click', togglePlayPause);

document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
    if (e.code === 'KeyT')  { e.preventDefault(); tap(); }
});

document.getElementById('tap-btn').addEventListener('click', tap);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchDynMode(btn.dataset.mode));
});

numeratorInput().addEventListener('change', () => {
    numeratorInput().value = getNumerator();
    rebuildBeatIndicators();
    restartIfPlaying();
});

denominatorSel().addEventListener('change', restartIfPlaying);

document.getElementById('bpm-minus').addEventListener('click', () => {
    const el = bpmInput();
    el.value = Math.max(20, parseInt(el.value) - 1);
});

document.getElementById('bpm-plus').addEventListener('click', () => {
    const el = bpmInput();
    el.value = Math.min(300, parseInt(el.value) + 1);
});

bpmInput().addEventListener('change', () => {
    bpmInput().value = getBPM();
});

document.getElementById('vol-accent').addEventListener('input', e => {
    document.getElementById('vol-accent-val').textContent = e.target.value + '%';
});

document.getElementById('vol-normal').addEventListener('input', e => {
    document.getElementById('vol-normal-val').textContent = e.target.value + '%';
});

// ── Analyse ────────────────────────────────────────────────────────────────

let allSongs     = [];
let searchResult = null;   // last result from /api/search

async function loadSongs() {
    try {
        const res = await fetch('/api/songs');
        allSongs = await res.json();
        renderSongList();
    } catch (e) {
        console.error('Songs laden fehlgeschlagen:', e);
    }
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── Song list ──────────────────────────────────────────────────────────────

function renderSongList() {
    const container = document.getElementById('song-list');
    if (!container) return;

    const query    = (document.getElementById('song-search')?.value || '').trim().toLowerCase();
    const filtered = query
        ? allSongs.filter(s =>
            `${s.artist} ${s.title} ${s.bpm}`.toLowerCase().includes(query))
        : allSongs;

    if (filtered.length === 0) {
        container.innerHTML = `<p class="song-list-empty">${
            allSongs.length === 0 ? 'Noch keine Songs gespeichert.' : 'Keine Ergebnisse.'
        }</p>`;
        return;
    }

    container.innerHTML = filtered.map(song =>
        `<div class="song-item" data-id="${song.id}" data-bpm="${song.bpm}">
            <div class="song-info">
                <span class="song-name">
                    <span class="song-artist">${esc(song.artist)}</span>
                    <span class="song-sep"> — </span>
                    <span class="song-title">${esc(song.title)}</span>
                </span>
                <span class="song-bpm">${song.bpm} BPM</span>
            </div>
            <button class="song-delete" data-id="${song.id}" title="Entfernen">&#215;</button>
        </div>`
    ).join('');

    container.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', e => {
            if (e.target.closest('.song-delete')) return;
            useSongBpm(parseInt(item.dataset.bpm));
        });
    });
    container.querySelectorAll('.song-delete').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            deleteSong(btn.dataset.id);
        });
    });
}

function useSongBpm(bpm) {
    bpmInput().value = Math.max(20, Math.min(300, bpm));
    switchTab('metronom');
}

async function deleteSong(id) {
    try {
        await fetch(`/api/songs/${id}`, { method: 'DELETE' });
        allSongs = allSongs.filter(s => s.id !== id);
        renderSongList();
    } catch (e) {
        console.error('Löschen fehlgeschlagen:', e);
    }
}

// ── Search ─────────────────────────────────────────────────────────────────

function setResultState(state, html) {
    const el = document.getElementById('search-result');
    el.className = `search-result ${state}`;
    el.innerHTML = html;
}

function showSearchResult(result) {
    searchResult = result;
    const fromList = result.source === 'list';
    const sourceHtml = fromList
        ? '<span class="result-source source-list">In Liste</span>'
        : '<span class="result-source source-getsongbpm">GetSongBPM</span>';
    const confirmHtml = fromList ? '' :
        `<button id="confirm-btn" class="confirm-btn">&#10003; Bestätigen &amp; Speichern</button>`;

    setResultState('found', `
        <div class="result-top">
            ${sourceHtml}
            <div class="result-info">
                <span class="result-name">
                    <span class="result-artist">${esc(result.artist)}</span> — ${esc(result.title)}
                </span>
                <span class="result-bpm">${result.bpm} BPM</span>
            </div>
        </div>
        <div class="result-actions">
            ${confirmHtml}
            <button id="use-result-btn" class="use-btn">Im Metronom verwenden</button>
        </div>
    `);
}

async function searchSong() {
    const artist = document.getElementById('search-artist').value.trim();
    const title  = document.getElementById('search-title').value.trim();
    if (!artist || !title) return;

    const btn = document.getElementById('search-btn');
    btn.disabled = true;
    setResultState('loading', '<span class="spinner"></span> Suche auf GetSongBPM…');

    try {
        const res  = await fetch(
            `/api/search?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
        );
        const data = await res.json();
        if (!res.ok || data.error) {
            setResultState('error', data.error || 'Unbekannter Fehler');
            searchResult = null;
        } else {
            showSearchResult(data);
        }
    } catch (e) {
        setResultState('error', e.message);
        searchResult = null;
    } finally {
        btn.disabled = false;
    }
}

async function confirmSong() {
    if (!searchResult) return;
    const btn = document.getElementById('confirm-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '…';

    try {
        const res  = await fetch('/api/songs', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                artist:     searchResult.artist,
                title:      searchResult.title,
                bpm:        searchResult.bpm,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            btn.textContent = '✓ Gespeichert';
            btn.classList.add('confirmed');
            allSongs.push(data);
            renderSongList();
        } else {
            btn.disabled = false;
            btn.textContent = '✓ Bestätigen & Speichern';
        }
    } catch (e) {
        btn.disabled = false;
        btn.textContent = '✓ Bestätigen & Speichern';
    }
}

// Event delegation on the result box (buttons are dynamic)
document.getElementById('search-result').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'confirm-btn')    confirmSong();
    if (btn.id === 'use-result-btn') useSongBpm(searchResult?.bpm);
});

document.getElementById('search-btn').addEventListener('click', searchSong);

['search-artist', 'search-title'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') searchSong();
    });
});

document.getElementById('song-search').addEventListener('input', renderSongList);


// ── Init ───────────────────────────────────────────────────────────────────

rebuildBeatIndicators();
