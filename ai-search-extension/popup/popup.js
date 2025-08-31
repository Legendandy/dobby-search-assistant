class ChatInterface {
  constructor() {
    this.settings = {};
    this.chatHistory = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadChatHistory();
    this.setupEventListeners();
    this.applyTheme();
    this.renderChatHistory();
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

  async loadChatHistory() {
    const stored = await chrome.storage.local.get({ chatHistory: [] });
    this.chatHistory = stored.chatHistory || [];
  }

  async saveChatHistory() {
    await chrome.storage.local.set({ chatHistory: this.chatHistory });
  }

  setupEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const clearBtn = document.getElementById('clearBtn');
    const clearModal = document.getElementById('clearModal');
    const cancelClear = document.getElementById('cancelClear');
    const confirmClear = document.getElementById('confirmClear');

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

    // Show clear confirmation modal
    clearBtn.addEventListener('click', () => this.showClearModal());

    // Cancel clear action
    cancelClear.addEventListener('click', () => this.hideClearModal());

    // Confirm clear action
    confirmClear.addEventListener('click', () => this.confirmClearChat());

    // Close modal when clicking outside
    clearModal.addEventListener('click', (e) => {
      if (e.target === clearModal) {
        this.hideClearModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideClearModal();
      }
    });

    // Auto-resize based on content
    chatInput.addEventListener('input', (e) => {
      this.updateSendButton();
    });
  }

  showClearModal() {
    const clearModal = document.getElementById('clearModal');
    clearModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  hideClearModal() {
    const clearModal = document.getElementById('clearModal');
    clearModal.classList.remove('show');
    document.body.style.overflow = '';
  }

  async confirmClearChat() {
    this.chatHistory = [];
    await this.saveChatHistory();
    
    // Clear the messages container completely
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Add welcome message back
    this.addWelcomeMessage();
    
    // Hide the modal
    this.hideClearModal();
  }

  // Updated clearChat method to use modal
  async clearChat() {
    this.showClearModal();
  }

  addWelcomeMessage() {
    const welcomeMessage = {
      content: '👋 Hi! I\'m Dobby, your AI search assistant. Ask me anything!',
      sender: 'dobby',
      timestamp: Date.now()
    };
    
    this.chatHistory.push(welcomeMessage);
    this.saveChatHistory();
    this.renderMessage(welcomeMessage);
  }

  renderChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    if (this.chatHistory.length === 0) {
      this.addWelcomeMessage();
    } else {
      this.chatHistory.forEach(message => {
        this.renderMessage(message);
      });
      this.scrollToBottom();
    }
  }

  renderMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${message.sender}-message`;
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${this.formatMessage(message.content)}
        </div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
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
    const userMessage = {
      content: message,
      sender: 'user',
      timestamp: Date.now()
    };
    
    this.chatHistory.push(userMessage);
    await this.saveChatHistory();
    this.renderMessage(userMessage);

    // Show typing indicator
    this.showTyping();

    try {
      // Get AI response
      const response = await this.getAIResponse(message);
      this.hideTyping();
      
      const dobbyMessage = {
        content: response,
        sender: 'dobby',
        timestamp: Date.now()
      };
      
      this.chatHistory.push(dobbyMessage);
      await this.saveChatHistory();
      this.renderMessage(dobbyMessage);
    } catch (error) {
      this.hideTyping();
      this.showError('Sorry, I couldn\'t process your request. Please try again.');
    }
  }

  addMessage(content, sender) {
    // This method is now handled by renderMessage
    // Keeping for compatibility but redirecting to new method
    const message = {
      content: content,
      sender: sender,
      timestamp: Date.now()
    };
    this.renderMessage(message);
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