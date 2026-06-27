'use strict';

const playlist = {
  '8f2c91a4b6d0e3f5': {
    song: 'Hileli',
    artist: 'Manifest',
    youtube: 'kXKhNI4DLHM',
    bg: 'linear-gradient(135deg, #1B263B 0%, #0D1B2A 100%)',
  },
  'a7b4e2d9c1f850b6': {
    song: 'Saki',
    artist: 'Sıla',
    youtube: 'y035E2kzLYM',
    bg: 'linear-gradient(135deg, #27384d 0%, #111927 100%)',
  },
  '3c6e9a1f5b8d2e4b': {
    song: 'Ölüyorum',
    artist: 'Hayko Çepkin',
    youtube: 'Coh96WC6Mc4',
    bg: 'linear-gradient(135deg, #223246 0%, #0d1622 100%)',
  },
  'd5f0e8b2a4c793f1': {
    song: 'Satmışım Anasını',
    artist: 'Ferdi Özbeğen',
    youtube: 'cqkQWu1CZl0',
    bg: 'linear-gradient(135deg, #314761 0%, #152132 100%)',
  },
  '61b9d4e3f5a2c8e7': {
    song: 'Sultan Süleyman',
    artist: 'Sezen Aksu',
    youtube: '89PepdEhKCM',
    bg: 'linear-gradient(135deg, #3a5471 0%, #172131 100%)',
  },
};

const DEFAULT_ID = '8f2c91a4b6d0e3f5';
const TONEARM_REST = -18;
const TONEARM_PLAY = 25;
const ARM_DURATION = 1.2;

const $ = (sel) => document.querySelector(sel);

const app = $('#app');
const vinyl = $('#vinyl');
const tonearm = $('#tonearm-pivot');
const cover = $('#cover');
const songTitle = $('#song-title');
const artistName = $('#artist-name');

let currentId = DEFAULT_ID;
let currentVideoId = null;
let isPlaying = false;
let isAnimating = false;
let armTween = null;
let ytPlayer = null;
let ytReady = false;
let ytScriptLoaded = false;
let pendingVideoId = null;
let userInteracted = false;
let playRequested = false;
let unlockRequested = false;

function parseYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|img\.youtube\.com\/vi\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function coverFromYoutube(id) {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

function resolveTrackId() {
  const hash = location.hash.replace(/^#\/?/, '').trim();
  if (hash && playlist[hash]) return hash;

  const params = new URLSearchParams(location.search);
  const queryId = params.get('id') || params.get('track');
  if (queryId && playlist[queryId]) return queryId;

  return DEFAULT_ID;
}

function setPlayingUI(playing) {
  isPlaying = playing;
  tonearm.setAttribute('aria-pressed', String(playing));
  tonearm.setAttribute('aria-label', playing ? 'İğneyi kaldır' : 'Plak iğnesine dokun');
  tonearm.classList.toggle('is-playing', playing);
  vinyl.classList.toggle('spinning', playing);
}

function animateTonearm(toDeg, onComplete) {
  if (armTween) armTween.kill();
  isAnimating = true;

  armTween = gsap.to(tonearm, {
    rotation: toDeg,
    duration: ARM_DURATION,
    ease: 'power2.inOut',
    force3D: true,
    onComplete: () => {
      isAnimating = false;
      if (onComplete) onComplete();
    },
  });
}

function pauseYoutube() {
  if (ytReady && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    ytPlayer.pauseVideo();
  }
}

function tryPlayCurrent() {
  if (!playRequested || !currentVideoId || !ytReady || !ytPlayer || !userInteracted) return;

  try {
    if (typeof ytPlayer.loadVideoById === 'function') {
      ytPlayer.loadVideoById(currentVideoId);
    } else if (typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
  } catch (error) {
    pendingVideoId = currentVideoId;
  }
}

function primePlayback() {
  userInteracted = true;
  playRequested = true;

  if (!ytScriptLoaded) {
    initYouTube();
  }

  if (ytReady && ytPlayer && currentVideoId) {
    tryPlayCurrent();
  } else {
    pendingVideoId = currentVideoId;
    unlockRequested = true;
  }
}

function loadTrack(id, preservePlayback = false) {
  const track = playlist[id];
  if (!track) return;

  if (ytReady && !preservePlayback) {
    pauseYoutube();
    setPlayingUI(false);
    gsap.set(tonearm, { rotation: TONEARM_REST });
  }

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
    if (preservePlayback && isPlaying) {
      ytPlayer.loadVideoById(videoId);
    } else {
      ytPlayer.cueVideoById(videoId);
    }
  } else {
    pendingVideoId = videoId;
  }
}

function startPlaybackFromGesture() {
  if (!currentVideoId || isAnimating) return;

  primePlayback();

  animateTonearm(TONEARM_PLAY, () => {
    tryPlayCurrent();
  });
}

function stopPlayback(instant = false) {
  if (armTween) armTween.kill();

  playRequested = false;
  unlockRequested = false;
  pauseYoutube();
  setPlayingUI(false);

  if (instant) {
    gsap.set(tonearm, { rotation: TONEARM_REST });
    isAnimating = false;
    return;
  }

  animateTonearm(TONEARM_REST);
}

function togglePlaybackFromGesture(event) {
  event.preventDefault();

  if (isAnimating) return;

  if (isPlaying) {
    stopPlayback();
  } else {
    startPlaybackFromGesture();
  }
}

function onPlayerReady() {
  ytReady = true;

  if (pendingVideoId) {
    ytPlayer.cueVideoById(pendingVideoId);
  }

  if (unlockRequested && playRequested) {
    tryPlayCurrent();
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setPlayingUI(true);
    unlockRequested = false;
  }

  if (event.data === YT.PlayerState.PAUSED && playRequested) {
    setPlayingUI(false);
  }

  if (event.data === YT.PlayerState.ENDED) {
    stopPlayback();
  }
}

function initYouTube() {
  if (ytScriptLoaded) return;
  ytScriptLoaded = true;

  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('yt-player', {
      height: '0',
      width: '0',
      videoId: currentVideoId || undefined,
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
  tag.async = true;
  document.head.appendChild(tag);
}

['pointerdown', 'touchstart', 'click'].forEach((type) => {
  tonearm.addEventListener(type, togglePlaybackFromGesture, { passive: false });
});

window.addEventListener('hashchange', () => {
  const id = resolveTrackId();
  if (id !== currentId) loadTrack(id, isPlaying);
});

function init() {
  gsap.set(tonearm, { rotation: TONEARM_REST, transformOrigin: '50% 8%' });

  const id = resolveTrackId();
  currentId = id;
  loadTrack(id);

  if (!location.hash) {
    history.replaceState(null, '', `#${id}`);
  }

  if ($('#turntable')) {
    gsap.fromTo('#turntable', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' });
  }

  if ($('#track-info')) {
    gsap.fromTo('#track-info', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 });
  }
}

init();
