
# Create the final app.js file
app_js = """'use strict';

const playlist = {
  '8f2c91a4b6d0e3f5': {
    song: 'Hileli',
    artist: 'Manifest',
    audio: 'https://example.com/audio/hileli.mp3',
    youtube: 'kXKhNI4DLHM',
    bg: 'linear-gradient(135deg, #1B263B 0%, #0D1B2A 100%)'
  },
  'a7b4e2d9c1f850b6': {
    song: 'Saki',
    artist: 'Sıla',
    audio: 'https://example.com/audio/saki.mp3',
    youtube: 'y035E2kzLYM',
    bg: 'linear-gradient(135deg, #27384d 0%, #111927 100%)'
  },
  '3c6e9a1f5b8d2e4b': {
    song: 'Ölüyorum',
    artist: 'Hayko Çepkin',
    audio: 'https://example.com/audio/oluyorum.mp3',
    youtube: 'Coh96WC6Mc4',
    bg: 'linear-gradient(135deg, #223246 0%, #0d1622 100%)'
  },
  'd5f0e8b2a4c793f1': {
    song: 'Satmışım Anasını',
    artist: 'Ferdi Özbeğen',
    audio: 'https://example.com/audio/satmisim.mp3',
    youtube: 'cqkQWu1CZl0',
    bg: 'linear-gradient(135deg, #314761 0%, #152132 100%)'
  },
  '61b9d4e3f5a2c8e7': {
    song: 'Sultan Süleyman',
    artist: 'Sezen Aksu',
    audio: 'https://example.com/audio/sultan.mp3',
    youtube: '89PepdEhKCM',
    bg: 'linear-gradient(135deg, #3a5471 0%, #172131 100%)'
  }
};

const DEFAULT_ID = '8f2c91a4b6d0e3f5';
const TONEARM_REST = -18;
const TONEARM_PLAY = 25;
const ARM_DURATION = 1.15;

const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const vinyl = $('#vinyl');
const tonearm = $('#tonearm-pivot');
const cover = $('#cover');
const songTitle = $('#song-title');
const artistName = $('#artist-name');
const turntable = $('#turntable');
const trackInfo = $('#track-info');
const audioPlayer = $('#audio-player');

let currentId = DEFAULT_ID;
let isPlaying = false;
let isAnimating = false;
let armTween = null;
let interactionLock = false;

if (!app || !vinyl || !tonearm || !cover || !songTitle || !artistName || !audioPlayer) {
  console.error('Eksik DOM elemanı var. index.html içindeki id değerlerini kontrol et.');
} else {
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
        if (typeof onComplete === 'function') onComplete();
      }
    });
  }

  function loadTrack(id) {
    const track = playlist[id];
    if (!track) return;

    currentId = id;

    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = track.audio || '';
    audioPlayer.load();

    if (track.youtube) {
      cover.src = coverFromYoutube(track.youtube);
      cover.alt = `${track.song} — ${track.artist}`;
    }

    songTitle.textContent = track.song;
    artistName.textContent = track.artist;
    app.style.background = track.bg;
    document.title = `${track.song} — ${track.artist}`;

    setPlayingUI(false);
    gsap.set(tonearm, { rotation: TONEARM_REST });
  }

  function startPlayback(event) {
    if (event) event.preventDefault();
    if (isAnimating || isPlaying || interactionLock) return;

    const track = playlist[currentId];
    if (!track || !track.audio) return;

    interactionLock = true;

    const playPromise = audioPlayer.play();

    animateTonearm(TONEARM_PLAY, () => {
      setPlayingUI(true);
      setTimeout(() => {
        interactionLock = false;
      }, 300);
    });

    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Audio play failed:', err);
        setPlayingUI(false);
        animateTonearm(TONEARM_REST, () => {
          interactionLock = false;
        });
      });
    }
  }

  function stopPlayback(event) {
    if (event) event.preventDefault();
    if (isAnimating || !isPlaying || interactionLock) return;

    interactionLock = true;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    setPlayingUI(false);
    animateTonearm(TONEARM_REST, () => {
      setTimeout(() => {
        interactionLock = false;
      }, 300);
    });
  }

  function togglePlayback(event) {
    if (isPlaying) {
      stopPlayback(event);
    } else {
      startPlayback(event);
    }
  }

  tonearm.addEventListener('pointerup', togglePlayback, { passive: false });

  audioPlayer.addEventListener('ended', () => {
    setPlayingUI(false);
    gsap.to(tonearm, {
      rotation: TONEARM_REST,
      duration: ARM_DURATION,
      ease: 'power2.inOut'
    });
  });

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

    if (turntable) {
      gsap.fromTo(turntable, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' });
    }

    if (trackInfo) {
      gsap.fromTo(trackInfo, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 });
    }
  }

  init();
}"""

with open('/mnt/agents/output/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("app.js created successfully")
