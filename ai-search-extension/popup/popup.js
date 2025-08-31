class ChatInterface {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.applyTheme();
    this.focusInput();
  }

  async loadSettings() {
    const defaultSettings = {
      apiKey: '',
      theme: 'light',
      maxTokens: 300
    };
    
    this.settings = await chrome.storage.sync.get(defaultSettings);
  }

  setupEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // Send message on button click
    sendBtn.addEventListener('click', () => this.sendMessage());

    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Open settings
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Auto-resize based on content
    chatInput.addEventListener('input', (e) => {
      this.updateSendButton();
    });
  }

  updateSendButton() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    sendBtn.disabled = !chatInput.value.trim();
  }

  async sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) return;

    if (!this.settings.apiKey) {
      this.showError('Please configure your API key in settings first.');
      return;
    }

    // Clear input
    chatInput.value = '';
    this.updateSendButton();

    // Add user message
    this.addMessage(message, 'user');

    // Show typing indicator
    this.showTyping();

    try {
      // Get AI response
      const response = await this.getAIResponse(message);
      this.hideTyping();
      this.addMessage(response, 'dobby');
    } catch (error) {
      this.hideTyping();
      this.showError('Sorry, I couldn\'t process your request. Please try again.');
    }
  }

  addMessage(content, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${this.formatMessage(content)}
        </div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showError(message) {
    this.addMessage(`⚠️ ${message}`, 'dobby');
  }

  showTyping() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    
    typingDiv.className = 'message dobby-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
      <div class="message-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;

    messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  async getAIResponse(message) {
    const response = await fetch('https://1search-assistant.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
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

  formatMessage(content) {
    // Basic text formatting
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  getCurrentTime() {
    // Removed - timestamps not needed
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  focusInput() {
    document.getElementById('chatInput').focus();
  }

  applyTheme() {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (this.settings.theme === 'dark' || (this.settings.theme === 'auto' && systemDark)) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }
}

// Initialize chat interface
document.addEventListener('DOMContentLoaded', () => {
  new ChatInterface();
});