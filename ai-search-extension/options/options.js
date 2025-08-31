// Default settings
const defaultSettings = {
  apiKey: '',
  theme: 'light',
  position: 'right',
  autoShow: 'always',
  opacity: 0.95,
  fontSize: 'medium',
  animations: true,
  soundEffects: false,
  maxTokens: 300,
  cacheResults: true
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  checkIfFirstInstall();
  applyTheme();
});

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get(defaultSettings);
  
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('theme').value = settings.theme;
  document.getElementById('position').value = settings.position;
  document.getElementById('autoShow').value = settings.autoShow;
  document.getElementById('opacity').value = settings.opacity;
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('animations').checked = settings.animations;
  document.getElementById('soundEffects').checked = settings.soundEffects;
  document.getElementById('maxTokens').value = settings.maxTokens;
  document.getElementById('cacheResults').checked = settings.cacheResults;
  
  updateOpacityDisplay();
}

// Setup event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
  
  // Test API button
  document.getElementById('testBtn').addEventListener('click', testAPI);
  
  // Close welcome banner
  document.getElementById('closeBanner').addEventListener('click', () => {
    document.getElementById('welcomeBanner').classList.add('hidden');
    chrome.storage.sync.set({ firstInstall: false });
  });
  
  // Theme change
  document.getElementById('theme').addEventListener('change', applyTheme);
  
  // Opacity slider
  document.getElementById('opacity').addEventListener('input', updateOpacityDisplay);
}

// Save settings
async function saveSettings(e) {
  e.preventDefault();
  
  const settings = {
    apiKey: document.getElementById('apiKey').value.trim(),
    theme: document.getElementById('theme').value,
    position: document.getElementById('position').value,
    autoShow: document.getElementById('autoShow').value,
    opacity: parseFloat(document.getElementById('opacity').value),
    fontSize: document.getElementById('fontSize').value,
    animations: document.getElementById('animations').checked,
    soundEffects: document.getElementById('soundEffects').checked,
    maxTokens: parseInt(document.getElementById('maxTokens').value),
    cacheResults: document.getElementById('cacheResults').checked
  };
  
  if (!settings.apiKey) {
    showStatus('Please enter your Fireworks API key', 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set(settings);
    showStatus('✅ Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('❌ Failed to save settings', 'error');
  }
}

// Reset to default settings
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    await chrome.storage.sync.clear();
    await loadSettings();
    showStatus('🔄 Settings reset to defaults', 'success');
  }
}

// Test API connection
async function testAPI() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('❌ Please enter your API key first', 'error');
    return;
  }
  
  const testBtn = document.getElementById('testBtn');
  testBtn.textContent = '🧪 Testing...';
  testBtn.disabled = true;
  
  try {
    const response = await fetch('https://your-vercel-app.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hello, this is a test.',
        apiKey: apiKey,
        maxTokens: 50
      })
    });
    
    if (response.ok) {
      showStatus('✅ API connection successful!', 'success');
    } else {
      showStatus('❌ API test failed. Check your API key.', 'error');
    }
  } catch (error) {
    showStatus('❌ Network error. Check your connection.', 'error');
  } finally {
    testBtn.textContent = '🧪 Test API';
    testBtn.disabled = false;
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message show ${type}`;
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 5000);
}

// Check if first install
async function checkIfFirstInstall() {
  const { firstInstall } = await chrome.storage.sync.get({ firstInstall: true });
  
  if (!firstInstall) {
    document.getElementById('welcomeBanner').classList.add('hidden');
  }
}

// Apply theme
function applyTheme() {
  const theme = document.getElementById('theme').value;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (theme === 'dark' || (theme === 'auto' && systemDark)) {
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

// Update opacity display
function updateOpacityDisplay() {
  const opacity = document.getElementById('opacity').value;
  document.getElementById('opacityValue').textContent = Math.round(opacity * 100) + '%';
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);