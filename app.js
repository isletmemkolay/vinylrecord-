'use strict';

/* ── Mock database ────────────────────────────────────────── */
const playlist = {
  'hit-001': {
    song: 'Blinding Lights',
    artist: 'The Weeknd',
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300',
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    bg: 'linear-gradient(135deg, #111726 0%, #07090e 100%)',
  },
  'hit-002': {
    song: 'Gözlerin Doğuyor Gecelerime',
    artist: 'Zeki Müren',
    // Doğru YouTube Kapak Resmi URL'i:
    cover: 'https://img.youtube.com/vi/_LK4WaaoWHc/maxresdefault.jpg',
    // NOT: HTML5 Audio elementi için doğrudan .mp3 gibi bir kaynak vermelisiniz. 
    // YouTube linkleri doğrudan burada çalışmaz. Örnek bir mp3 koyulmuştur:
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 
    bg: 'linear-gradient(135deg, #2c1a11 0%, #0e0805 100%)',
  }
};

const DEFAULT_ID = 'hit-001';
const TONEARM_REST = -18;
const TONEARM_PLAY = 25;
const ARM_DURATION = 1.2;

/* ── DOM refs ─────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);

const app          = $('#app');
const vinyl        = $('#vinyl');
const tonearm      = $('#tonearm-pivot');
const cover        = $('#cover');
const audio        = $('#audio');
const playBtn      = $('#play-btn');
const btnLabel     = $('#btn-label');
const songTitle    = $('#song-title');
const artistName   = $('#artist-name');
const trackInfo    = $('#track-info');
const trackIdEl    = $('#track-id');
const header       = $('#header');

/* ── State ────────────────────────────────────────────────── */
let currentId = DEFAULT_ID;
let isPlaying = false;
let isAnimating = false;
let armTween = null;

/* ── Routing ──────────────────────────────────────────────── */
function resolveTrackId() {
  const hash = location.hash.replace(/^#\/?/, '').trim();
  if (hash && playlist[hash]) return hash;

  const params = new URLSearchParams(location.search);
  const queryId = params.get('id') || params.get('track');
  if (queryId && playlist[queryId]) return queryId;

  return DEFAULT_ID;
}

function loadTrack(id) {
  const track = playlist[id];
  if (!track) return;

  stopPlayback(true);

  currentId = id;
  if (trackIdEl) trackIdEl.textContent = id;

  cover.src = track.cover;
  cover.alt = `${track.song} cover art`;
  songTitle.textContent = track.song;
  artistName.textContent = track.artist;

  audio.src = track.audio;
  audio.load();

  app.style.background = track.bg;
  document.title = `${track.song} — Pikap`;

  trackInfo.classList.remove('visible');
  songTitle.style.opacity = '0';
  artistName.style.opacity = '0';
  songTitle.style.transform = 'translateY(8px)';
  artistName.style.transform = 'translateY(8px)';
}

/* ── GSAP tonearm ─────────────────────────────────────────── */
function animateTonearm(toDeg, onComplete) {
  if (armTween) armTween.kill();

  isAnimating = true;
  playBtn.disabled = true;

  armTween = gsap.to(tonearm, {
    rotation: toDeg,
    duration: ARM_DURATION,
    ease: 'power2.inOut',
    force3D: true,
    onComplete: () => {
      isAnimating = false;
      playBtn.disabled = false;
      if (onComplete) onComplete();
    },
  });
}

/* ── Playback ─────────────────────────────────────────────── */
function showTrackInfo() {
  trackInfo.classList.add('visible');
  gsap.to([songTitle, artistName], {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power2.out',
  });
}

function hideTrackInfo() {
  gsap.to([songTitle, artistName], {
    opacity: 0,
    y: 8,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: () => trackInfo.classList.remove('visible'),
  });
}

function setPlayingUI(playing) {
  isPlaying = playing;
  playBtn.setAttribute('aria-pressed', String(playing));
  playBtn.setAttribute('aria-label', playing ? 'Stop vinyl' : 'Play vinyl');
  playBtn.classList.toggle('is-playing', playing);
  if (btnLabel) btnLabel.textContent = playing ? 'İğneyi Bırak' : 'Play Vinyl';
  vinyl.classList.toggle('spinning', playing);
}

function startPlayback() {
  animateTonearm(TONEARM_PLAY, () => {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setPlayingUI(true);
          showTrackInfo();
        })
        .catch(() => {
          animateTonearm(TONEARM_REST);
          setPlayingUI(false);
        });
    }
  });
}

function stopPlayback(instant = false) {
  if (armTween) armTween.kill();

  audio.pause();
  audio.currentTime = 0;
  setPlayingUI(false);
  hideTrackInfo();

  if (instant) {
    gsap.set(tonearm, { rotation: TONEARM_REST });
    isAnimating = false;
    playBtn.disabled = false;
    return;
  }

  animateTonearm(TONEARM_REST);
}

function togglePlayback() {
  if (isAnimating) return;

  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

/* ── Events ───────────────────────────────────────────────── */
playBtn.addEventListener('click', togglePlayback);

audio.addEventListener('ended', () => stopPlayback());

window.addEventListener('hashchange', () => {
  const id = resolveTrackId();
  if (id !== currentId) loadTrack(id);
});

/* ── Init ─────────────────────────────────────────────────── */
function init() {
  gsap.set(tonearm, { rotation: TONEARM_REST, transformOrigin: '50% 8%' });

  const id = resolveTrackId();
  loadTrack(id);

  if (!location.hash) {
    history.replaceState(null, '', `#${id}`);
  }

  if (header) gsap.fromTo(header, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 });
  gsap.fromTo('#turntable', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out', delay: 0.1 });
}

init();
