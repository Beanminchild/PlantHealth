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
  const interval = Math.max(1, Number(document.getElementById('water-interval').value));
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

function openPlantDetail(plant) {
  const mood = getPlantMood(plant.lastWatered, plant.intervalHours);
  const timeRemaining = formatTimeRemaining(plant.lastWatered, plant.intervalHours);
  const elapsed = (Date.now() - plant.lastWatered) / (1000 * 60 * 60);
  const healthPercent = Math.max(0, Math.min(100, ((plant.intervalHours - elapsed) / plant.intervalHours) * 100));

  const html = `
    <div class="plant-detail-wrapper" style="background-color: ${plant.bgColor};">
      <button type="button" class="detail-close-btn" id="detail-close">&times;</button>

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
          <span class="detail-label">Mood</span>
          <span class="detail-value">${getMoodLabel(mood)}</span>
        </div>

        <div class="detail-stat">
          <span class="detail-label">Time Until Watering</span>
          <span class="detail-value">${timeRemaining}</span>
        </div>

        <div class="detail-stat">
          <span class="detail-label">Water Interval</span>
          <span class="detail-value">${plant.intervalHours} hour${plant.intervalHours === 1 ? '' : 's'}</span>
        </div>

        <div class="health-bar-container">
          <span class="detail-label">Plant Health</span>
          <div class="health-bar">
            <div class="health-bar-fill" style="width: ${healthPercent}%; background-color: ${getHealthBarColor(healthPercent)};"></div>
          </div>
          <span class="health-percentage">${Math.round(healthPercent)}%</span>
        </div>
      </div>

      <button type="button" class="water-button detail-water-btn" id="detail-water-btn">
        Water Plant
      </button>
    </div>
  `;

  detailContent.innerHTML = html;
  detailModal.showModal();

  // Close button handler
  document.getElementById('detail-close').addEventListener('click', () => {
    detailModal.close();
  });

  // Water button handler
  document.getElementById('detail-water-btn').addEventListener('click', () => {
    plant.lastWatered = Date.now();
    const plants = loadPlants();
    const index = plants.findIndex(p => p.id === plant.id);
    if (index !== -1) {
      plants[index] = plant;
      savePlants(plants);
    }
    detailModal.close();
    renderPlants();
  });

  // Close when clicking outside
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      detailModal.close();
    }
  });
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

function getHealthBarColor(percent) {
  if (percent >= 80) return '#10b981'; // Green - healthy
  if (percent >= 60) return '#84cc16'; // Lime - good
  if (percent >= 40) return '#f59e0b'; // Amber - warning
  if (percent >= 20) return '#f97316'; // Orange - urgent
  return '#ef4444'; // Red - critical
}

window.addEventListener('load', renderPlants);