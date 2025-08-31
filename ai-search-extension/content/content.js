class AISearchAssistant {
  constructor() {
    this.settings = {};
    this.isLoading = false;
    this.cache = new Map();
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.createUI();
    this.setupEventListeners();
    this.handleAutoShow();
  }

  async loadSettings() {
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
    
    this.settings = await chrome.storage.sync.get(defaultSettings);
  }

  createUI() {
    // Remove existing UI
    const existing = document.querySelector('.ai-search-assistant');
    if (existing) existing.remove();

    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'ai-search-assistant';
    this.container.setAttribute('data-theme', this.getTheme());

    // Create trigger button (for manual mode)
    if (this.settings.autoShow === 'manual') {
      this.createTriggerButton();
    }

    // Create main search box
    this.createSearchBox();

    // Apply positioning
    this.applyPositioning();

    // Add to page
    document.body.appendChild(this.container);
  }

  createTriggerButton() {
    this.triggerBtn = document.createElement('button');
    this.triggerBtn.className = 'ai-search-trigger';
    this.triggerBtn.innerHTML = '🤖';
    this.triggerBtn.title = 'Get AI Answer';
    
    if (this.settings.animations) {
      this.triggerBtn.classList.add('pulse');
    }

    this.triggerBtn.addEventListener('click', () => {
      this.showSearchBox();
      this.getAIResponse();
    });

    this.container.appendChild(this.triggerBtn);
  }

  createSearchBox() {
    this.searchBox = document.createElement('div');
    this.searchBox.className = `ai-search-box font-${this.settings.fontSize}`;
    this.searchBox.style.opacity = this.settings.opacity;
    
    if (this.settings.autoShow === 'manual') {
      this.searchBox.style.display = 'none';
    }

    this.searchBox.innerHTML = `
      <div class="ai-search-content">
        <div class="ai-search-header">
          <div class="ai-search-title">
            🤖 AI Assistant
          </div>
          <div class="ai-search-controls">
            <button class="ai-control-btn" id="aiRefresh" title="Refresh">🔄</button>
            <button class="ai-control-btn" id="aiSettings" title="Settings">⚙️</button>
            <button class="ai-control-btn" id="aiClose" title="Close">×</button>
          </div>
        </div>
        <div class="ai-search-body" id="aiSearchBody">
          <div class="ai-search-loading">
            <div class="ai-loading-spinner"></div>
            <p>Getting AI insights...</p>
          </div>
        </div>
        <div class="ai-search-footer">
          <span class="ai-powered-by">Powered by Dobby 8B</span>
          <a href="#" class="ai-settings-link" id="aiSettingsLink">Settings</a>
        </div>
      </div>
    `;

    this.container.appendChild(this.searchBox);
  }

  setupEventListeners() {
    // Control buttons
    const refreshBtn = this.searchBox.querySelector('#aiRefresh');
    const settingsBtn = this.searchBox.querySelector('#aiSettings');
    const closeBtn = this.searchBox.querySelector('#aiClose');
    const settingsLink = this.searchBox.querySelector('#aiSettingsLink');

    refreshBtn?.addEventListener('click', () => this.getAIResponse(true));
    settingsBtn?.addEventListener('click', () => this.openSettings());
    closeBtn?.addEventListener('click', () => this.hideSearchBox());
    settingsLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });
  }

  applyPositioning() {
    switch (this.settings.position) {
      case 'top':
        this.searchBox.classList.add('position-top');
        this.insertAtTop();
        break;
      case 'overlay':
        this.searchBox.classList.add('position-overlay');
        break;
      case 'right':
      default:
        // Default right positioning
        break;
    }
  }

  insertAtTop() {
    const searchResults = this.getSearchResultsContainer();
    if (searchResults) {
      searchResults.insertBefore(this.container, searchResults.firstChild);
    }
  }

  getSearchResultsContainer() {
    // Google
    if (window.location.hostname.includes('google.com')) {
      return document.querySelector('#search') || document.querySelector('#center_col');
    }
    // Bing
    if (window.location.hostname.includes('bing.com')) {
      return document.querySelector('#b_results');
    }
    // DuckDuckGo
    if (window.location.hostname.includes('duckduckgo.com')) {
      return document.querySelector('#links');
    }
    return document.body;
  }

  getSearchQuery() {
    const url = new URL(window.location.href);
    
    // Google
    if (window.location.hostname.includes('google.com')) {
      return url.searchParams.get('q');
    }
    // Bing
    if (window.location.hostname.includes('bing.com')) {
      return url.searchParams.get('q');
    }
    // DuckDuckGo
    if (window.location.hostname.includes('duckduckgo.com')) {
      return url.searchParams.get('q');
    }
    // Yahoo
    if (window.location.hostname.includes('yahoo.com')) {
      return url.searchParams.get('p');
    }
    
    return null;
  }

  async handleAutoShow() {
    const query = this.getSearchQuery();
    if (!query) return;

    switch (this.settings.autoShow) {
      case 'always':
        this.getAIResponse();
        break;
      case 'keywords':
        if (this.isQuestion(query)) {
          this.getAIResponse();
        }
        break;
      case 'manual':
        // Trigger button already created
        break;
    }
  }

  isQuestion(query) {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'should', 'will', 'is', 'are', 'do', 'does'];
    const lowerQuery = query.toLowerCase();
    return questionWords.some(word => lowerQuery.startsWith(word)) || query.includes('?');
  }

  async getAIResponse(forceRefresh = false) {
    if (this.isLoading) return;
    
    const query = this.getSearchQuery();
    if (!query) return;

    // Check cache first
    if (!forceRefresh && this.settings.cacheResults && this.cache.has(query)) {
      this.displayResult(this.cache.get(query));
      return;
    }

    this.isLoading = true;
    this.showLoading();

    try {
      const response = await this.callAI(query);
      this.displayResult(response);
      
      if (this.settings.cacheResults) {
        this.cache.set(query, response);
      }
    } catch (error) {
      this.displayError('Failed to get AI response. Please check your settings.');
    } finally {
      this.isLoading = false;
    }
  }

  async callAI(query) {
    const response = await fetch('https://1search-assistant.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        apiKey: this.settings.apiKey,
        maxTokens: this.settings.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.response;
  }

  showLoading() {
    const body = this.searchBox.querySelector('#aiSearchBody');
    body.innerHTML = `
      <div class="ai-search-loading">
        <div class="ai-loading-spinner"></div>
        <p>Getting AI insights...</p>
      </div>
    `;
    this.showSearchBox();
  }

  displayResult(result) {
    const body = this.searchBox.querySelector('#aiSearchBody');
    body.innerHTML = `
      <div class="ai-search-result">
        <h4>🧠 AI Insight</h4>
        <p>${result}</p>
      </div>
    `;
    this.showSearchBox();
  }

  displayError(message) {
    const body = this.searchBox.querySelector('#aiSearchBody');
    body.innerHTML = `
      <div class="ai-search-error">
        <p>⚠️ ${message}</p>
      </div>
    `;
    this.showSearchBox();
  }

  showSearchBox() {
    this.searchBox.style.display = 'block';
    if (this.settings.animations) {
      this.searchBox.classList.add('animate');
    }
    if (this.triggerBtn) {
      this.triggerBtn.style.display = 'none';
    }
  }

  hideSearchBox() {
    this.searchBox.style.display = 'none';
    if (this.triggerBtn) {
      this.triggerBtn.style.display = 'block';
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  getTheme() {
    if (this.settings.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.settings.theme;
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AISearchAssistant());
} else {
  new AISearchAssistant();
}

// Handle navigation changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => new AISearchAssistant(), 1000);
  }
}).observe(document, { subtree: true, childList: true });