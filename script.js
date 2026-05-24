const plantForm = document.getElementById('plant-form');
const plantList = document.getElementById('plant-list');
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
  renderPlants();
});

window.addEventListener('load', renderPlants);
