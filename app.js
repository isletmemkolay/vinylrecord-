'use strict';

/* ── Mock database (YouTube video ID veya tam URL) ────────── */
const playlist = {
  'hit-001': {
    song: 'Daha İyi',
    artist: 'Manifest',
    youtube: 'JiDIJ5CMJw0',
    bg: 'linear-gradient(135deg, #111726 0%, #07090e 100%)',
  },
  'hit-002': {
    song: 'Gözlerin Doğuyor Gecelerime',
    artist: 'Zeki Müren',
    youtube: '_LK4WaaoWHc',
    bg: 'linear-gradient(135deg, #2c1a11 0%, #0e0805 100%)',
  },
};

const DEFAULT_ID = 'hit-001';
const TONEARM_REST = -18;
const TONEARM_PLAY = 25;
const ARM_DURATION = 1.2;

const $ = (sel) => document.querySelector(sel);

const app        = $('#app');
const vinyl      = $('#vinyl');
const tonearm    = $('#tonearm-pivot');
const cover      = $('#cover');
const songTitle  = $('#song-title');
const artistName = $('#artist-name');

let currentId = DEFAULT_ID;
let currentVideoId = null;
let isPlaying = false;
let isAnimating = false;
let armTween = null;
let ytPlayer = null;
let ytReady = false;
let pendingVideoId = null;

function parseYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|img\.youtube\.com\/vi\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

function coverFromYoutube(id) {
  return `https://img.youtube.com/vi/${JiDIJ5CMJw0}/hqdefault.jpg`;
}

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

  const videoId = parseYoutubeId(track.youtube);
  currentId = id;
  currentVideoId = videoId;

  if (videoId) {
    cover.src = coverFromYoutube(videoId);
    cover.alt = `${track.song} — ${track.artist}`;
  }

  songTitle.textContent = track.song;
  artistName.textContent = track.artist;
  app.style.background = track.bg;
  document.title = `${track.song} — ${track.artist}`;

  if (ytReady && ytPlayer && videoId) {
    ytPlayer.cueVideoById(videoId);
  } else {
    pendingVideoId = videoId;
  }
}

function animateTonearm(toDeg, onComplete) {
  if (armTween) armTween.kill();

  isAnimating = true;
  tonearm.disabled = true;

  armTween = gsap.to(tonearm, {
    rotation: toDeg,
    duration: ARM_DURATION,
    ease: 'power2.inOut',
    force3D: true,
    onComplete: () => {
      isAnimating = false;
      tonearm.disabled = false;
      if (onComplete) onComplete();
    },
  });
}

function setPlayingUI(playing) {
  isPlaying = playing;
  tonearm.setAttribute('aria-pressed', String(playing));
  tonearm.setAttribute('aria-label', playing ? 'İğneyi kaldır' : 'Plak iğnesine dokun');
  tonearm.classList.toggle('is-playing', playing);
  vinyl.classList.toggle('spinning', playing);
}

function playYoutube(videoId) {
  if (!videoId) return;

  if (ytReady && ytPlayer) {
    ytPlayer.loadVideoById(videoId);
    return;
  }

  pendingVideoId = videoId;
}

function pauseYoutube() {
  if (ytReady && ytPlayer) {
    ytPlayer.pauseVideo();
    ytPlayer.seekTo(0, true);
  }
}

function startPlayback() {
  if (!currentVideoId) return;

  playYoutube(currentVideoId);
  animateTonearm(TONEARM_PLAY);
}

function stopPlayback(instant = false) {
  if (armTween) armTween.kill();

  pauseYoutube();
  setPlayingUI(false);

  if (instant) {
    gsap.set(tonearm, { rotation: TONEARM_REST });
    isAnimating = false;
    tonearm.disabled = false;
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

function onPlayerReady() {
  ytReady = true;
  const id = resolveTrackId();
  loadTrack(id);

  if (pendingVideoId) {
    ytPlayer.cueVideoById(pendingVideoId);
    pendingVideoId = null;
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setPlayingUI(true);
  }

  if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    if (event.data === YT.PlayerState.ENDED) {
      stopPlayback();
    }
  }
}

function initYouTube() {
  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('yt-player', {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });
  };

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

tonearm.addEventListener('click', togglePlayback);

window.addEventListener('hashchange', () => {
  const id = resolveTrackId();
  if (id !== currentId) loadTrack(id);
});

function init() {
  gsap.set(tonearm, { rotation: TONEARM_REST, transformOrigin: '50% 8%' });

  const id = resolveTrackId();
  currentId = id;
  loadTrack(id);

  if (!location.hash) {
    history.replaceState(null, '', `#${id}`);
  }

  gsap.fromTo('#turntable', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' });
  gsap.fromTo('#track-info', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 });

  initYouTube();
}

init();
