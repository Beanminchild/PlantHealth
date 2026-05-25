const plantForm = document.getElementById('plant-form');
const plantList = document.getElementById('plant-list');
const plantModal = document.getElementById('plant-modal');
const addPlantBtn = document.getElementById('add-plant-btn');
const closeModalBtn = document.getElementById('close-modal');
const STORAGE_KEY = 'plantHealthPlants';

function loadPlants() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function savePlants(plants) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

function formatRelativeTime(hours) {
  if (hours < 1) return 'just now';
  if (hours < 2) return 'an hour ago';
  return `${Math.round(hours)} hours ago`;
}

function getPlantMood(lastWatered, intervalHours) {
  const now = Date.now();
  const elapsed = (now - lastWatered) / (1000 * 60 * 60);
  const ratio = elapsed / intervalHours;

  if (ratio <= 0.8) return 'happy';
  if (ratio <= 1.3) return 'ok';
  if (ratio <= 2) return 'thirsty';
  return 'sad';
}

function getMoodLabel(mood) {
  switch (mood) {
    case 'happy': return 'Happy';
    case 'ok': return 'Okay';
    case 'thirsty': return 'Thirsty';
    default: return 'Sad';
  }
}

function createPlantCard(plant, updatePlants) {
  const card = document.createElement('article');
  card.className = 'plant-card';

  const mood = getPlantMood(plant.lastWatered, plant.intervalHours);
  const elapsedHours = (Date.now() - plant.lastWatered) / (1000 * 60 * 60);
  const timeText = formatRelativeTime(elapsedHours);

  const meta = document.createElement('div');
  meta.className = 'plant-meta';
  meta.innerHTML = `
    <h3>${plant.name}</h3>
    <p class="small-note">Last watered ${timeText}</p>
    <p>Needs watering every <strong>${plant.intervalHours} hour${plant.intervalHours === 1 ? '' : 's'}</strong>.</p>
    <span class="mood-label">${getMoodLabel(mood)}</span>
  `;

  const faceWrapper = document.createElement('div');
  faceWrapper.className = 'face-preview mood-' + mood;
  faceWrapper.style.background = plant.bgColor;

  const face = document.createElement('div');
  face.className = 'face-shell';
  face.style.background = plant.faceColor;

  face.appendChild(document.createElement('div')).className = 'face-eyes';
  face.querySelector('.face-eyes').innerHTML = `
    <span class="face-eye"></span>
    <span class="face-eye"></span>
  `;

  const mouth = document.createElement('span');
  mouth.className = 'face-mouth';
  face.appendChild(mouth);
  faceWrapper.appendChild(face);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'water-button';
  button.textContent = 'Water plant';
  button.addEventListener('click', () => {
    plant.lastWatered = Date.now();
    savePlants(updatePlants());
    renderPlants();
  });

  card.appendChild(meta);
  card.appendChild(faceWrapper);
  card.appendChild(button);

  return card;
}

function renderPlants() {
  plantList.innerHTML = '';
  const plants = loadPlants();
  if (!plants.length) {
    plantList.innerHTML = '<p class="small-note">No plants yet. Add one to begin growing!</p>';
    return;
  }

 plants.forEach((plant) => {
  const card = createPlantCard(plant, () => plants);
  plantList.appendChild(card);
  // attach personality after it's in the DOM
  addPersonalityToCard(card, plant);
});
}
// Open modal
addPlantBtn.addEventListener('click', () => {
  plantModal.showModal();
});

// Close modal
closeModalBtn.addEventListener('click', () => {
  plantModal.close();
});

// Close modal when clicking outside (on backdrop)
plantModal.addEventListener('click', (e) => {
  if (e.target === plantModal) {
    plantModal.close();
  }
});

// Form submission
plantForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('plant-name').value.trim() || 'Plant';
  const interval = Math.max(1, Number(document.getElementById('water-interval').value) + Number(document.getElementById('water-interval-days').value * 24));
  console.log(interval)
  const faceColor = document.getElementById('face-color').value;
  const bgColor = document.getElementById('bg-color').value;

  const plants = loadPlants();
  plants.unshift({
    id: Date.now().toString(),
    name,
    intervalHours: interval,
    lastWatered: Date.now(),
    faceColor,
    bgColor,
  });

  savePlants(plants);
  plantForm.reset();
  document.getElementById('water-interval').value = '8';
  document.getElementById('face-color').value = '#b1e07c';
  document.getElementById('bg-color').value = '#f7f3d8';
  plantModal.close();
  renderPlants();
});

const detailModal = document.getElementById('plant-detail-modal');
const detailContent = document.getElementById('plant-detail-content');

function formatTimeRemaining(lastWatered, intervalHours) {
  const elapsed = (Date.now() - lastWatered) / (1000 * 60 * 60);
  const remaining = Math.max(0, intervalHours - elapsed);

  if (remaining === 0) return 'NOW!';
  if (remaining < 1) {
    const minutes = Math.round(remaining * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (remaining < 2) return '1 hour';
  return `${Math.round(remaining)} hours`;
}

// helper used by the detail view
function formatDurationSeconds(seconds) {
  if (seconds <= 0) return 'NOW';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

function getHealthBarColor(percent) {
  if (percent >= 80) return '#10b981'; // green
  if (percent >= 60) return '#84cc16';
  if (percent >= 40) return '#f59e0b';
  if (percent >= 20) return '#f97316';
  return '#ef4444';
}

// Watering animation modal + jingle
let __wateringOverlayActive = false;

/**
 * showWateringAnimation(plantId)
 * - plantId: id string of plant to water (must exist in storage)
 *
 * Behavior:
 * - calculates previous health %
 * - sets lastWatered = Date.now() and saves immediately
 * - shows overlay with watering can + animated progress fill from prev -> 100%
 * - plays short jingle via WebAudio
 * - cleans up and calls renderPlants() when done
 */
function showWateringAnimation(plantId) {
  if (__wateringOverlayActive) return; // single instance guard
  const plants = loadPlants();
  const idx = plants.findIndex(p => p.id === plantId);
  if (idx === -1) return;
  const plant = plants[idx];

  // compute previous percent (0..100)
  const now = Date.now();
  const elapsedHoursPrev = (now - plant.lastWatered) / (1000 * 60 * 60);
  const prevPercent = Math.max(0, Math.min(100, ((plant.intervalHours - elapsedHoursPrev) / plant.intervalHours) * 100));

  // update model immediately so other UI sees water happened
  plants[idx].lastWatered = Date.now();
  savePlants(plants);

  // create overlay
  __wateringOverlayActive = true;
  const overlay = document.createElement('div');
  overlay.className = 'watering-overlay';
  overlay.innerHTML = `
    <div class="watering-card" role="dialog" aria-live="polite">
      <div class="watering-visual">
        <div class="watering-can" aria-hidden="true">
          <svg class="can" viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg" fill="none">
            <rect x="6" y="22" width="36" height="24" rx="4" fill="#374151"/>
            <path d="M42 26c5 0 12-2 16-8 0 0-4 16-16 16v-8z" fill="#4b5563"/>
            <rect x="40" y="10" width="18" height="6" rx="3" fill="#374151"/>
          </svg>
          <span class="watering-drop"></span>
          <span class="watering-drop drop2"></span>
          <span class="watering-drop drop3"></span>
        </div>

        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
          <div style="font-weight:800; font-size:1rem; color:#0f172a">Watering...</div>
          <div style="font-size:0.9rem; color:#475569">ahhhh much better.</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; flex:1; margin-left:12px;">
        <div class="watering-progress" aria-hidden="true">
          <div class="watering-progress-fill" id="watering-progress-fill" style="width:${prevPercent}%"></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
          <div style="font-size:0.9rem; color:#334155">Health</div>
          <div style="display:flex; align-items:center;">
            <div class="watering-check" id="watering-check">✓</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // animate progress fill from prevPercent -> 100
  const fillEl = overlay.querySelector('#watering-progress-fill');
  const checkEl = overlay.querySelector('#watering-check');

  // small jingle
  playWateringJingle();

  // animate: wait tiny bit then set to 100% (CSS transition takes care)
  requestAnimationFrame(() => {
    // two frames to ensure transition triggers reliably
    requestAnimationFrame(() => {
      fillEl.style.width = '100%';
    });
  });

  // show check after animation
  const ANIM_DURATION = 1400; // ms, matches CSS timing / feel
  setTimeout(() => {
    checkEl.classList.add('show');
  }, ANIM_DURATION - 250);

  // after animation ends, fade out overlay and cleanup
  setTimeout(() => {
    overlay.style.transition = 'opacity 260ms ease, transform 260ms ease';
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(0.995)';
    setTimeout(() => {
      try { document.body.removeChild(overlay); } catch(e) {}
      __wateringOverlayActive = false;
      renderPlants(); // ensure UI shows refreshed state
    }, 260);
  }, ANIM_DURATION + 420);
}

/**
 * playWateringJingle()
 * - plays a small, pleasant jingle using Web Audio API
 * - no external files required
 */
function playWateringJingle() {

    try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // short chord arpeggio
    function playNote(freq, when, dur, type='sine') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.12, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when);
      o.stop(when + dur + 0.02);
    }

    // simple pleasant frequencies (major-ish)
    const base = 440; // A4
    playNote(base * 0.75, now + 0.0, 0.42, 'sine'); // slightly lower
    playNote(base * 1.0, now + 0.12, 0.48, 'triangle');
    playNote(base * 1.5, now + 0.26, 0.42, 'sine');

    // small bell enhancement using noise-ish oscillator
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.value = base * 2.0;
    bellGain.gain.value = 0;
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    bell.start(now);
    bell.stop(now + 0.9);

    // close the audio context after a second to release resources
    setTimeout(() => {
      try { ctx.close(); } catch(e) {}
    }, 1200);
  } catch (e) {
    // web audio not supported — ignore silently
    console.warn('Audio not available:', e && e.message);
  }
}

function openPlantDetail(plant) {
  const detailModal = document.getElementById('plant-detail-modal');
  const detailContent = document.getElementById('plant-detail-content');

  // compute values (seconds precision)
  const now = Date.now();
  const elapsedHours = (now - plant.lastWatered) / (1000 * 60 * 60);
  const remainingHours = Math.max(0, plant.intervalHours - elapsedHours);
  const remainingSeconds = Math.max(0, Math.round(remainingHours * 3600));
  const healthPercent = Math.max(0, Math.min(100, ((plant.intervalHours - elapsedHours) / plant.intervalHours) * 100));

  // build the card HTML (the wrapper background is the plant bg color)
  detailContent.innerHTML = `
    <div class="plant-detail-wrapper" style="background: ${plant.bgColor}; color: ${getForegroundFromBg(plant.bgColor)};">
      <button type="button" class="detail-delete-btn" id="detail-delete" title="Delete plant">🗑️</button>
      <button type="button" class="detail-close-btn" id="detail-close">&times;</button>

      <div class="plant-detail-scroll">
        <div class="plant-detail-face">
          <div class="face-shell" style="background: ${plant.faceColor};">
            <div class="face-eyes">
              <span class="face-eye"></span>
              <span class="face-eye"></span>
            </div>
            <span class="face-mouth"></span>
          </div>
        </div>

        <h2 class="plant-detail-name">${plant.name}</h2>

        <div class="plant-detail-info">
          <div class="detail-stat">
            <div class="detail-label">Mood</div>
            <div class="detail-value">${getMoodLabel(getPlantMood(plant.lastWatered, plant.intervalHours))}</div>
          </div>

          <div class="detail-stat">
            <div class="detail-label">Time Until Watering</div>
            <div class="detail-value" id="detail-time-remaining">${formatDurationSeconds(remainingSeconds)}</div>
          </div>

          <div class="detail-stat">
            <div class="detail-label">Water Interval</div>
            <div class="detail-value">${plant.intervalHours} hour${plant.intervalHours === 1 ? '' : 's'}</div>
          </div>

          <div class="health-bar-container">
            <div class="health-row">
              <div class="detail-label">Plant Health</div>
              <div class="health-percentage" id="detail-health-percent">${Math.round(healthPercent)}%</div>
            </div>
            <div class="health-bar">
              <div class="health-bar-fill" id="detail-health-fill" style="width: ${healthPercent}%; background: ${getHealthBarColor(healthPercent)}"></div>
            </div>
          </div>
        </div>
              <button type="button" class="water-button detail-water-btn" id="detail-water-btn">I watered the lil guy!!</button>
      </div>


    </div>
  `;

  // open modal
  detailModal.showModal();
  addPersonalityToDetail();

  // update function runs every second to keep time + bar in sync
  let tickId = null;
  function tick() {
    const now = Date.now();
    const elapsedHours = (now - plant.lastWatered) / (1000 * 60 * 60);
    const remaining = Math.max(0, plant.intervalHours - elapsedHours);
    const remainingSeconds = Math.max(0, Math.round(remaining * 3600));
    const percent = Math.max(0, Math.min(100, (remaining / plant.intervalHours) * 100));
    const fill = document.getElementById('detail-health-fill');
    const percentText = document.getElementById('detail-health-percent');
    const timeText = document.getElementById('detail-time-remaining');
    if (fill) {
      fill.style.width = `${percent}%`;
      fill.style.background = getHealthBarColor(percent);
    }
    if (percentText) percentText.textContent = `${Math.round(percent)}%`;
    if (timeText) timeText.textContent = formatDurationSeconds(remainingSeconds);
  }

  // small utility to compute readable foreground color for text (black/white) given a background hex
  function getForegroundFromBg(hex) {
    // if hex like "#aabbcc" -> parse r,g,b
    try {
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      // luminance formula
      const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
      return luminance > 0.6 ? '#0f172a' : '#ffffff';
    } catch (e) {
      return '#0f172a';
    }
  }

  // start ticking
  tickId = setInterval(tick, 1000); // every second
  tick(); // immediate update

  document.getElementById('detail-delete').addEventListener('click', () => {
  if (tickId) clearInterval(tickId);

  // Remove plant from storage
  const plants = loadPlants();
  const updatedPlants = plants.filter(p => p.id !== plant.id);
  savePlants(updatedPlants);

  // Close modal and refresh
  detailModal.close();
  renderPlants();
}, { once: true });

  // close handlers (clean up interval)
  document.getElementById('detail-close').addEventListener('click', () => {
    if (tickId) clearInterval(tickId);
    detailModal.close();
  }, { once: true });

  // click outside to close: we attach once so it won't pile up
  detailModal.addEventListener('click', function onBackdrop(e) {
    if (e.target === detailModal) {
      if (tickId) clearInterval(tickId);
      detailModal.close();
    }
  }, { once: true });

  // also ensure we clear on native 'close' event
  detailModal.addEventListener('close', () => {
    if (tickId) clearInterval(tickId);
  }, { once: true });

  document.getElementById('detail-water-btn').addEventListener('click', () => {
  // stop the detail view updater
  if (typeof tickId !== 'undefined' && tickId) {
    clearInterval(tickId);
    tickId = null;
  }

  // close the detail modal so the overlay can appear on top
  detailModal.close();

  // small delay to allow the dialog to finish closing / remove stacking context
  // 100–160ms is usually enough; adjust if you have animations on the dialog
  setTimeout(() => {
    showWateringAnimation(plant.id);
  }, 140);


}, { once: true });


}
// Update createPlantCard to add click handler to face
function createPlantCard(plant, updatePlants) {
  const card = document.createElement('article');
  card.className = 'plant-card';

  const mood = getPlantMood(plant.lastWatered, plant.intervalHours);
  const elapsedHours = (Date.now() - plant.lastWatered) / (1000 * 60 * 60);
  const timeText = formatRelativeTime(elapsedHours);

  const meta = document.createElement('div');
  meta.className = 'plant-meta';
  meta.innerHTML = `
    <h3>${plant.name}</h3>
    <p class="small-note">Last watered ${timeText}</p>
    <p>Needs watering every <strong>${plant.intervalHours} hour${plant.intervalHours === 1 ? '' : 's'}</strong>.</p>
    <span class="mood-label">${getMoodLabel(mood)}</span>
  `;

  const faceWrapper = document.createElement('div');
  faceWrapper.className = 'face-preview mood-' + mood;
  faceWrapper.style.background = plant.bgColor;
  faceWrapper.style.cursor = 'pointer';

  // ADD THIS: Click handler for face
  faceWrapper.addEventListener('click', () => {
    openPlantDetail(plant);
  });

  const face = document.createElement('div');
  face.className = 'face-shell';
  face.style.background = plant.faceColor;

  face.appendChild(document.createElement('div')).className = 'face-eyes';
  face.querySelector('.face-eyes').innerHTML = `
    <span class="face-eye"></span>
    <span class="face-eye"></span>
  `;

  const mouth = document.createElement('span');
  mouth.className = 'face-mouth';
  mouth.className = 'face-mouth mood-' + mood;
  face.appendChild(mouth);
  faceWrapper.appendChild(face);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'water-button';
  button.textContent = 'Plant has been watered';
 button.addEventListener('click', () => {
  showWateringAnimation(plant.id);
});

  card.appendChild(meta);
  card.appendChild(faceWrapper);
  card.appendChild(button);

  return card;
}

// -----------------------------
// Face personality helpers
// -----------------------------
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * addPersonalityToCard(card, plant)
 * - card: the article element returned by createPlantCard(...)
 * - plant: the plant object (optional, used for small choices)
 *
 * Adds CSS variables and small DOM nodes (sprout/sparkle), and toggles animation classes.
 */
function addPersonalityToCard(card, plant) {
  try {
    const faceShell = card.querySelector('.face-shell');
    const faceEyes = card.querySelector('.face-eyes');

    if (!faceShell) return;

    // Randomize timings slightly so plants don't sync
    const bobDur = `${Math.round(randomRange(3800, 5200))}ms`;
    const breatheDur = `${Math.round(randomRange(3600, 5600))}ms`;
    const blinkDelay = `${Math.round(randomRange(800, 3000))}ms`;
    const blinkDur = `${Math.round(randomRange(2200, 4200))}ms`;

    faceShell.style.setProperty('--bob-dur', bobDur);
    faceShell.style.setProperty('--breathe-dur', breatheDur);
    faceShell.style.setProperty('--breathe-delay', `${Math.round(randomRange(0, 1200))}ms`);
    if (faceEyes) {
      faceEyes.style.setProperty('--blink-delay', blinkDelay);
      faceEyes.style.setProperty('--blink-dur', blinkDur);
    }

    // Add idle classes (breathe + bob)
    faceShell.classList.add('idle-bob', 'idle-breathe');

    // Add intermittent peek sometimes
    if (Math.random() < 0.35) faceShell.classList.add('idle-peek');

    // Add blinking to eyes
    if (faceEyes) faceEyes.classList.add('idle-blink');

    // Add a small sprout for some smiley plants (10-30% chance)
    if (Math.random() < 0.28) {
      const sprout = document.createElement('div');
      sprout.className = 'face-sprout';
      // simple SVG leaf — inline keeps it self-contained
      sprout.innerHTML = `
        <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path d="M8 36c12-18 36-28 48-28-2 14-12 34-34 40C18 54 8 36 8 36z" fill="rgba(255,255,255,0.95)"/>
          <path d="M44 20c-6 4-10 14-20 20" stroke="rgba(0,0,0,0.08)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      faceShell.appendChild(sprout);
    }

    // Add a small sparkle sometimes, show it briefly every few seconds
    if (Math.random() < 0.22) {
      const sparkle = document.createElement('div');
      sparkle.className = 'face-sparkle';
      sparkle.innerHTML = `
        <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path d="M12 2l1.9 4.3L18 8l-4.1 1.7L12 14l-1.9-4.3L6 8l4.1-1.7L12 2z" fill="rgba(255,255,255,0.95)"/>
        </svg>`;
      faceShell.appendChild(sparkle);

      // show sparkle occasionally
      const showEveryMs = Math.round(randomRange(3600, 9000));
      setInterval(() => {
        faceShell.classList.add('sparkle-on');
        setTimeout(() => faceShell.classList.remove('sparkle-on'), 550);
      }, showEveryMs);
    }

    // subtle hover enhancement: when hovering the face, increase breathe and stop bob for a little "focus"
    faceShell.addEventListener('mouseenter', () => {
      faceShell.style.setProperty('--breathe-dur', '1600ms');
      faceShell.classList.remove('idle-bob');
    });
    faceShell.addEventListener('mouseleave', () => {
      faceShell.classList.add('idle-bob');
      faceShell.style.setProperty('--breathe-dur', breatheDur);
    });
  } catch (e) {
    // non-fatal if DOM shape differs
    console.warn('personality attach failed', e);
  }
}

/**
 * addPersonalityToDetail(plant)
 * Applies similar animations to the detailed modal face.
 * Call after `openPlantDetail` has set innerHTML and after `detailModal.showModal()` so nodes exist.
 */
function addPersonalityToDetail() {
  try {
    const wrapper = document.querySelector('.plant-detail-wrapper');
    if (!wrapper) return;
    const faceShell = wrapper.querySelector('.face-shell');
    const faceEyes = wrapper.querySelector('.face-eyes');

    if (!faceShell) return;

    // reuse the same variable logic for slightly slower more deliberate motion for detail
    faceShell.style.setProperty('--bob-dur', `${Math.round(randomRange(4800, 7600))}ms`);
    faceShell.style.setProperty('--breathe-dur', `${Math.round(randomRange(4200, 7400))}ms`);
    if (faceEyes) {
      faceEyes.style.setProperty('--blink-delay', `${Math.round(randomRange(900, 2800))}ms`);
      faceEyes.style.setProperty('--blink-dur', `${Math.round(randomRange(2800, 4800))}ms`);
    }

    faceShell.classList.add('idle-bob', 'idle-breathe');
    if (Math.random() < 0.5) faceShell.classList.add('idle-peek');
    if (faceEyes) faceEyes.classList.add('idle-blink');

    // add a sprout in detail if not already present and with small chance
    if (!wrapper.querySelector('.face-sprout') && Math.random() < 0.4) {
      const sprout = document.createElement('div');
      sprout.className = 'face-sprout';
      sprout.innerHTML = `
        <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none">
          <path d="M8 36c12-18 36-28 48-28-2 14-12 34-34 40C18 54 8 36 8 36z" fill="rgba(255,255,255,0.95)"/>
        </svg>`;
      faceShell.appendChild(sprout);
    }

    // occasionally trigger a sparkle in the detailed view
    if (!wrapper.querySelector('.face-sparkle') && Math.random() < 0.5) {
      const sparkle = document.createElement('div');
      sparkle.className = 'face-sparkle';
      sparkle.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="M12 2l1.9 4.3L18 8l-4.1 1.7L12 14l-1.9-4.3L6 8l4.1-1.7L12 2z" fill="rgba(255,255,255,0.95)"/></svg>`;
      faceShell.appendChild(sparkle);

      setInterval(() => {
        faceShell.classList.add('sparkle-on');
        setTimeout(() => faceShell.classList.remove('sparkle-on'), 720);
      }, Math.round(randomRange(4200, 9800)));
    }
  } catch (e) {
    console.warn('detail personality attach failed', e);
  }
}

function getHealthBarColor(percent) {
  if (percent >= 80) return '#10b981'; // Green - healthy
  if (percent >= 60) return '#84cc16'; // Lime - good
  if (percent >= 40) return '#f59e0b'; // Amber - warning
  if (percent >= 20) return '#f97316'; // Orange - urgent
  return '#ef4444'; // Red - critical
}

function sendSlackNotification(message, webhook) {
    const payload = {
        remote_console_log: message
    };

    fetch(webhook, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error('Error sending Slack notification:', error);
    });
}


