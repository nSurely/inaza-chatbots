const phrases = {
  en: {
    ph: "Type a message...",
    attach: "Attach a file",
    send: "Send",
    close: "Close",
    maximize: "Maximize",
    restore: "Restore",
    file: "File",
    thinking: "Thinking",
    minimize: "Minimize",
  },
  es: {
    ph: "Escribe un mensaje...",
    attach: "Adjuntar un archivo",
    send: "Enviar",
    close: "Cerrar",
    maximize: "Maximizar",
    restore: "Restaurar",
    file: "Archivo",
    thinking: "Pensando",
    minimize: "Minimizar",
  },
  fr: {
    ph: "Tapez un message...",
    attach: "Attacher un fichier",
    send: "Envoyer",
    close: "Fermer",
    maximize: "Maximiser",
    restore: "Restaurer",
    file: "Fichier",
    thinking: "Penser",
    minimize: "Minimiser",
  },
};

export default class Chatbot {
  constructor({
    id,
    assistant,
    server,
    target = undefined,
    type = "bubble",
    style = {},
    config = {},
  }) {
    this.target = target || document.getElementById("chat-container");
    this.id = id;
    this.type = type;
    this.assistant = assistant;
    if (!this.assistant) {
      throw new Error("Assistant ID is required");
    }
    this.server = server;
    if (!this.server) {
      throw new Error("Server URL is required");
    }
    
    this.style = {
      color: style.color || "#0078d4",
      font: style.font || "Arial, sans-serif",
      bubblePosition: style.bubblePosition || "right", // Default: right
      bubbleSize: style.bubbleSize || "60px", // Size of the chat bubble
      chatWidth: style.chatWidth || (type === "embed" ? "100%" : "400px"), // Width of the chat window
      chatHeight: style.chatHeight || (type === "embed" ? "100%" : "500px"), // Height of the chat window
      secondaryFontColor: style.secondaryFontColor || "white", // Secondary font color
      
      // Font configuration
      fontFamily: style.fontFamily || "system", // "system", "google", or custom font family
      googleFont: style.googleFont || "Inter", // "Inter" or "Merriweather"
      fontWeight: style.fontWeight || "400", // Font weight (300, 400, 500, 600, 700)
      
      // Image customization
      chatAvatar: style.chatAvatar || null, // URL to chat avatar image
      favicon: style.favicon || null, // URL to favicon image
      bubbleIcon: style.bubbleIcon || "💬", // Custom bubble icon (emoji or text)
      bubbleIconImage: style.bubbleIconImage || null, // URL to bubble icon image
      
      ...style, // Include any additional styles
    };

    this.config = {
      ...config, // Include any additional config options
      lang: config.lang || "en", // Language code
      
      // Session management options
      askForCookies: config.askForCookies !== false, // Default: true (ask for permission)
      enableCookies: config.enableCookies !== false, // Default: true (enable cookie functionality)
      autoSaveSession: config.autoSaveSession !== false, // Default: true (auto-save session data)
      
      // Sharing and history options
      enableSharing: config.enableSharing !== false, // Default: true (show share button)
      enableViewHistory: config.enableViewHistory !== false, // Default: true (show conversation history)
      maxStoredMessages: config.maxStoredMessages || 50, // Default: 50 messages stored in cookies
      
      // Session expiry options
      sessionExpiryMinutes: config.sessionExpiryMinutes || 720, // Default: 12 hours (720 minutes)
      cookieExpiryMinutes: config.cookieExpiryMinutes || 20160, // Default: 14 days (20160 minutes)
    };

    // will be set to the language phrases
    this.phrases = {};
    if (this.config.lang && phrases[this.config.lang]) {
      this.phrases = phrases[this.config.lang];
    } else {
      throw new Error("Language not supported");
    }

    if (this.config.placeholder) {
      this.phrases.ph = this.config.placeholder;
    }

    this.isMaximized = false; // Track maximized state
    this.messages = []; // Store chat messages
    this.files = {}; // Store uploaded files, key: file name, value: file object
    this.loadingTimeout = null; // Track loading bubble timeout
    this.conversationId = null; // Track current conversation ID
    this.cookiesEnabled = false; // Track if cookies are enabled
    this.sessionData = null; // Store session data from cookies
    this.isMobile = this.detectMobile(); // Detect if user is on mobile device

    if (!this.target) {
      throw new Error("Target element not found");
    }
    if (!this.id) {
      throw new Error("Chatbot ID is required");
    }

    this.injectStyles();

    if (this.type === "embed") {
      this.renderEmbed();
      this.initializeConversation(); // Initialize conversation immediately for embed type
    } else {
      this.renderBubble();
    }
    
    // Load fonts and set favicon
    this.loadFontsAndAssets();
  }

  loadFontsAndAssets() {
    // Load Google Fonts if specified
    if (this.style.fontFamily === "google" && this.style.googleFont) {
      this.loadGoogleFont(this.style.googleFont, this.style.fontWeight);
    }
    
    // Set favicon if specified
    if (this.style.favicon) {
      this.setFavicon(this.style.favicon);
    }
  }

  loadGoogleFont(fontName, weight) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weight}&display=swap`;
    document.head.appendChild(link);
  }

  setFavicon(faviconUrl) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    
    // Remove existing favicon if any
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    document.head.appendChild(link);
  }

  injectStyles() {
    const bubblePosition =
      this.style.bubblePosition === "left" ? "left" : "right";

    // Determine font family
    let fontFamily = this.style.font;
    if (this.style.fontFamily === "google") {
      fontFamily = `"${this.style.googleFont}", sans-serif`;
    } else if (this.style.fontFamily === "system") {
      fontFamily = this.style.font;
    }

    const styles = `
          .chat-bubble {
            position: fixed;
            bottom: 20px;
            ${bubblePosition}: 20px;
            width: ${this.style.bubbleSize};
            height: ${this.style.bubbleSize};
            background-color: ${this.style.color};
            border-radius: 50%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-bubble:hover {
            transform: scale(1.1);
          }
          .chat-bubble-icon {
            font-size: 24px;
            color: ${this.style.secondaryFontColor};
          }
          .chat-bubble-icon-image {
            width: 32px;
            height: 32px;
            object-fit: contain;
          }
          .chat-container {
            position: fixed;
            bottom: 20px;
            ${bubblePosition}: 20px;
            width: ${this.style.chatWidth};
            height: ${this.style.chatHeight};
            background-color: #f5f5f5;
            display: flex;
            flex-direction: column;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            z-index: 1000;
            transition: all 0.3s ease;
          }
          .chat-container.maximized {
            bottom: 2.5%;
            ${bubblePosition}: 2.5%;
            width: 95%;
            height: 95%;
            border-radius: 10px;
          }
          .chat-container.maximized.mobile {
            bottom: 0;
            ${bubblePosition}: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
          }
          .chat-header {
            background-color: ${this.style.color};
            color: ${this.style.secondaryFontColor};
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            border-radius: 10px 10px 0 0;
          }
          .chat-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .chat-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
          }
          .chat-header p {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
          }
          .chat-header button {
            background: none;
            border: none;
            color: ${this.style.secondaryFontColor};
            cursor: pointer;
            font-size: 20px;
            transition: background-color 0.3s ease;
            border-radius: 5px;
          }
          .chat-header button:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
          .chat-body {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 14px;
            color: #333;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-message {
            padding: 8px 12px;
            border-radius: 10px;
            max-width: 70%;
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }
          .chat-message.bot {
            background-color: ${this.style.color};
            color: ${this.style.secondaryFontColor};
            align-self: flex-start;
          }
          .chat-message.user {
            background-color: #e1e1e1;
            color: black;
            align-self: flex-end;
            flex-direction: row-reverse;
          }
          .message-avatar {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
          }
          .message-content {
            flex: 1;
          }
          .chat-input {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
          }
          .chat-input input[type="text"] {
            flex: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 10px;
            font-size: 14px;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-input button {
            padding: 8px 16px;
            background-color: ${this.style.color};
            color: ${this.style.secondaryFontColor};
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-input input[type="file"] {
            display: none;
          }
          .chat-input label {
            background-color: #e1e1e1;
            color: black;
            padding: 8px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-loading {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #777;
            font-style: italic;
            opacity: 0.7;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
          }
          .chat-loading::after {
            content: " ";
            display: inline-block;
            width: 0.8em;
            text-align: left;
            animation: loading-dots 1.5s infinite steps(3, end);
          }

          @keyframes loading-dots {
            0% {
              content: "";
            }
            33% {
              content: ".";
            }
            66% {
              content: "..";
            }
            100% {
              content: "...";
            }
          }
          
          /* Mobile-specific styles */
          @media (max-width: 768px) {
            .chat-bubble {
              width: 70px;
              height: 70px;
              bottom: 15px;
              ${bubblePosition}: 15px;
            }
            .chat-bubble-icon {
              font-size: 28px;
            }
            .chat-bubble-icon-image {
              width: 40px;
              height: 40px;
            }
            .chat-container {
              bottom: 15px;
              ${bubblePosition}: 15px;
              width: calc(100vw - 30px);
              height: calc(100vh - 30px);
              max-width: 400px;
              max-height: 600px;
            }
            .chat-header button {
              font-size: 24px;
              padding: 8px;
              min-width: 44px;
              min-height: 44px;
            }
            .chat-input input[type="text"] {
              padding: 12px;
              font-size: 16px;
            }
            .chat-input button {
              padding: 12px 20px;
              font-size: 16px;
              min-height: 44px;
            }
            .chat-input label {
              padding: 12px 16px;
              min-height: 44px;
              display: flex;
              align-items: center;
            }
          }
        `;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  renderBubble() {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    
    if (this.style.bubbleIconImage) {
      // Use custom image as bubble icon
      const iconImage = document.createElement("img");
      iconImage.src = this.style.bubbleIconImage;
      iconImage.alt = "Chat";
      iconImage.className = "chat-bubble-icon-image";
      bubble.appendChild(iconImage);
    } else {
      // Use text/emoji as bubble icon
      bubble.innerHTML = `<span class="chat-bubble-icon">${this.style.bubbleIcon}</span>`;
    }
    
    bubble.addEventListener("click", () => this.renderChatWindow());
    this.target.appendChild(bubble);
  }

  async renderChatWindow() {
    this.target.innerHTML = ""; // Clear existing content

    // Initialize conversation when chat window is opened
    if (!this.conversationId) {
      await this.initializeConversation();
    }

    const chatWindow = document.createElement("div");
    chatWindow.className = "chat-container";

    const chatHeader = document.createElement("div");
    chatHeader.className = "chat-header";

    const minimizeButton = document.createElement("button");
    minimizeButton.textContent = "➖";
    minimizeButton.title = this.phrases.minimize;
    minimizeButton.addEventListener("click", () => {
      this.target.innerHTML = ""; // Clear chat window
      this.renderBubble(); // Re-render bubble
    });

    const closeButton = document.createElement("button");
    closeButton.textContent = "✖";
    closeButton.title = this.phrases.close;
    closeButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to close the chat? The conversation will be lost.")) {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        this.messages = []; // Clear message history
        this.conversationId = null; // Clear conversation ID
        
        // Clear session data from cookies
        if (this.cookiesEnabled) {
          this.deleteCookie(`chatbot_${this.id}_session`);
        }
        
        this.target.innerHTML = ""; // Clear chat window
        this.renderBubble(); // Re-render bubble
      }
    });

    const maximizeButton = document.createElement("button");
    maximizeButton.textContent = "🔼";
    maximizeButton.title = this.phrases.maximize;
    maximizeButton.addEventListener("click", () => {
      this.isMaximized = !this.isMaximized;
      maximizeButton.textContent = this.isMaximized ? "🔽" : "🔼";
      maximizeButton.title = this.isMaximized
        ? this.phrases.restore
        : this.phrases.maximize;
      chatWindow.classList.toggle("maximized");
      
      // Add mobile-specific styling for full-screen experience
      if (this.isMobile) {
        chatWindow.classList.toggle("mobile");
      }
    });

    const shareButton = document.createElement("button");
    shareButton.textContent = "🔗";
    shareButton.title = "Share Conversation";
    shareButton.addEventListener("click", () => this.copyConversationURL());

    chatHeader.appendChild(minimizeButton);
    chatHeader.appendChild(maximizeButton);
    chatHeader.appendChild(closeButton);
    chatHeader.appendChild(shareButton);

    const chatBody = this.createChatBody();

    const chatInput = this.createChatInput();

    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(chatBody);
    chatWindow.appendChild(chatInput);

    this.target.appendChild(chatWindow);

    // Restore previous messages if they exist
    if (this.messages.length > 0) {
      this.messages.forEach(msg => {
        this.addMessage(msg.content, msg.sender, false);
      });
    } else if (this.config.welcomeMessage) {
      // Only show welcome message if there are no previous messages
      this.addMessage(this.config.welcomeMessage, "bot", true);
    }
  }

  createChatBody() {
    const chatBody = document.createElement("div");
    chatBody.className = "chat-body";
    return chatBody;
  }

  createChatInput() {
    const chatInput = document.createElement("div");
    chatInput.className = "chat-input";

    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.placeholder = this.phrases.ph;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileInput";

    const fileLabel = document.createElement("label");
    fileLabel.textContent = "📎";
    fileLabel.title = this.phrases.attach;
    fileLabel.htmlFor = "fileInput";

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        this.addMessage(`📎 ${this.phrases.file}: ${file.name}`, "user");
        this.files[file.name] = file; // Store the file
        fileInput.value = ""; // Clear the file input
      }
    });

    const sendButton = document.createElement("button");
    sendButton.textContent = this.phrases.send;
    sendButton.title = this.phrases.send;
    sendButton.addEventListener("click", () => {
      const message = inputField.value.trim();
      if (message) {
        this.addMessage(message, "user");
        inputField.value = "";
      }
    });

    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const message = inputField.value.trim();
        if (message) {
          this.addMessage(message, "user");
          inputField.value = "";
        }
      }
    });

    chatInput.appendChild(inputField);
    chatInput.appendChild(fileInput);
    chatInput.appendChild(fileLabel);
    chatInput.appendChild(sendButton);

    return chatInput;
  }

  async renderEmbed() {
    this.target.innerHTML = ""; // Clear any existing content

    const chatContainer = document.createElement("div");
    chatContainer.className = "chat-container";

    const chatBody = this.createChatBody();
    chatBody.classList.add("embed");

    const chatInput = this.createChatInput();

    chatContainer.appendChild(chatBody);
    chatContainer.appendChild(chatInput);
    
    this.target.appendChild(chatContainer);

    // Initialize conversation for embed - this will add the initial bot message
    await this.initializeConversation();
  }

  addMessage(content, sender, store = true) {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${sender}`;
    messageElement.textContent = content;

    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Store the message in memory if store flag is true
    if (store) {
      this.messages.push({ content, sender });
      
      // Update session data in cookies if enabled and auto-save is on
      if (this.cookiesEnabled && this.config.autoSaveSession && this.conversationId) {
        this.updateLastMessageTime();
      }
    }

    if (sender === "user") {
      // Send the user's message over the WebSocket with session_id
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.conversationId) {
        const message = {
          message: content,
          session_id: this.conversationId
        };
        this.ws.send(JSON.stringify(message));
      } else {
        console.error("WebSocket is not open or no session ID");
      }
    }
  }

  async initializeConversation() {
    try {
      // Handle cookie permissions based on configuration
      if (this.config.enableCookies) {
        if (this.config.askForCookies && !this.cookiesEnabled) {
          const cookieAccepted = await this.askForCookiePermission();
          if (!cookieAccepted) {
            console.log('Cookies declined, starting new conversation');
          }
        } else if (!this.config.askForCookies) {
          // Auto-enable cookies without asking (for regions where permission is not required)
          this.cookiesEnabled = true;
          console.log('Cookies auto-enabled based on configuration');
        }
      } else {
        // Cookies disabled by configuration
        this.cookiesEnabled = false;
        console.log('Cookies disabled by configuration');
      }

      // Check for conversation ID in URL query parameters (highest priority)
      const urlConversationId = this.getConversationIdFromURL();
      if (urlConversationId) {
        console.log(`Resuming conversation from URL: ${urlConversationId}`);
        this.conversationId = urlConversationId;
        this.initializeWebSocket();
        return;
      }

      // Check for existing session in cookies (if cookies enabled)
      if (this.cookiesEnabled) {
        this.sessionData = this.loadSessionData();
        if (this.sessionData) {
          console.log(`Resuming conversation from cookies: ${this.sessionData.conversationId}`);
          this.conversationId = this.sessionData.conversationId;
          
          // Try to restore messages from server history first
          if (this.config.enableViewHistory) {
            try {
              const historyResponse = await fetch(`${this.server}/api/v1/public/sessions/${this.conversationId}/history`);
              if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                if (historyData.events && historyData.events.length > 0) {
                  // Restore messages from server history
                  this.messages = [];
                  historyData.events.forEach(event => {
                    if (event.event_type === 'message') {
                      if (event.user_message) {
                        this.messages.push({ content: event.user_message, sender: 'user' });
                      }
                      if (event.bot_response) {
                        this.messages.push({ content: event.bot_response, sender: 'bot' });
                      }
                    }
                  });
                  
                  // Display the messages in the chat
                  this.messages.forEach(msg => {
                    this.addMessage(msg.content, msg.sender, false);
                  });
                  
                  console.log(`Restored ${this.messages.length} messages from server history`);
                  this.initializeWebSocket();
                  return;
                }
              }
            } catch (error) {
              console.warn('Failed to fetch server history, falling back to cookie data:', error);
            }
          }
          
          // Fallback to cookie data if server history failed
          if (this.config.enableViewHistory && this.sessionData.messages && this.sessionData.messages.length > 0) {
            this.messages = this.sessionData.messages;
            // Display the messages in the chat
            this.messages.forEach(msg => {
              this.addMessage(msg.content, msg.sender, false);
            });
          }
          
          this.initializeWebSocket();
          return;
        }
      }

      // No existing conversation found, start a new one
      console.log('Starting new conversation');
      await this.startNewConversation();

    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      // Fallback: try to start a new conversation
      await this.startNewConversation();
    }
  }

  async startNewConversation() {
    try {
      // Start a new conversation via REST API using the new secure endpoint
      const response = await fetch(`${this.server}/api/v1/public/${this.assistant}/start_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Hello" // Initial greeting message
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();
      this.conversationId = data.session_id;
      
      console.log(`New conversation started: ${this.conversationId}`);

      // Add the initial bot response to the chat
      this.addMessage(data.response, "bot", false);

      // Save session data to cookies if enabled
      if (this.cookiesEnabled && this.config.autoSaveSession) {
        this.saveSessionData();
      }

      // Now initialize WebSocket connection
      this.initializeWebSocket();

    } catch (error) {
      console.error('Failed to start new conversation:', error);
      // Fallback: try to initialize WebSocket anyway
      this.initializeWebSocket();
    }
  }

  triggerLoadingBubble() {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }

    this.loadingTimeout = setTimeout(() => {
      this.addLoadingBubble();
    }, 3000);
  }

  addLoadingBubble() {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    if (chatBody.querySelector(".chat-loading")) return; // Prevent duplicate loading bubbles

    const loadingElement = document.createElement("div");
    loadingElement.className = "chat-loading";
    loadingElement.textContent = "Thinking"; // Base text (dots animated with CSS)

    chatBody.appendChild(loadingElement);
    chatBody.scrollTop = chatBody.scrollHeight; // Ensure it's visible
  }

  resetLoadingBubble() {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    const loadingElement = chatBody.querySelector(".chat-loading");
    if (loadingElement) {
      chatBody.removeChild(loadingElement);
    }

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  // Cookie management methods
  setCookie(name, value, minutes = 10080) { // Default: 7 days (10080 minutes)
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (minutes * 60 * 1000)); // Convert minutes to milliseconds
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
      this.cookiesEnabled = true;
      return true;
    } catch (e) {
      console.warn('Cookies not supported:', e);
      this.cookiesEnabled = false;
      return false;
    }
  }

  getCookie(name) {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          this.cookiesEnabled = true;
          return c.substring(nameEQ.length, c.length);
        }
      }
      return null;
    } catch (e) {
      console.warn('Cookies not accessible:', e);
      this.cookiesEnabled = false;
      return null;
    }
  }

  deleteCookie(name) {
    try {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      return true;
    } catch (e) {
      console.warn('Could not delete cookie:', e);
      return false;
    }
  }

  // Session management methods
  saveSessionData() {
    if (!this.cookiesEnabled || !this.conversationId || !this.config.autoSaveSession) return false;
    
    const sessionData = {
      conversationId: this.conversationId,
      startTime: Date.now(),
      lastMessageTime: Date.now(),
      assistant: this.assistant,
      messages: this.config.enableViewHistory ? this.messages.slice(-this.config.maxStoredMessages) : []
    };
    
    return this.setCookie(`chatbot_${this.id}_session`, JSON.stringify(sessionData), this.config.cookieExpiryMinutes);
  }

  loadSessionData() {
    const sessionCookie = this.getCookie(`chatbot_${this.id}_session`);
    if (!sessionCookie) return null;
    
    try {
      const sessionData = JSON.parse(sessionCookie);
      
      // Check if session is still valid (within configured hours)
      const now = Date.now();
      const sessionAge = now - sessionData.startTime;
      const maxSessionAge = this.config.sessionExpiryMinutes * 60 * 1000; // Convert minutes to milliseconds
      
      if (sessionAge > maxSessionAge) {
        // Session expired, remove cookie
        this.deleteCookie(`chatbot_${this.id}_session`);
        return null;
      }
      
      // Check if this is the same assistant
      if (sessionData.assistant !== this.assistant) {
        // Different assistant, remove cookie
        this.deleteCookie(`chatbot_${this.id}_session`);
        return null;
      }
      
      return sessionData;
    } catch (e) {
      console.warn('Invalid session data in cookie:', e);
      this.deleteCookie(`chatbot_${this.id}_session`);
      return null;
    }
  }

  updateLastMessageTime() {
    if (!this.cookiesEnabled || !this.conversationId || !this.config.autoSaveSession) return;
    
    const sessionCookie = this.getCookie(`chatbot_${this.id}_session`);
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie);
        sessionData.lastMessageTime = Date.now();
        sessionData.messages = this.config.enableViewHistory ? this.messages.slice(-this.config.maxStoredMessages) : [];
        this.setCookie(`chatbot_${this.id}_session`, JSON.stringify(sessionData), this.config.cookieExpiryMinutes);
      } catch (e) {
        console.warn('Could not update session data:', e);
      }
    }
  }

  // Check for conversation ID in URL query parameters
  getConversationIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('conversation_id');
  }

  // Ask user for cookie permission
  askForCookiePermission() {
    return new Promise((resolve) => {
      const cookieDialog = document.createElement('div');
      cookieDialog.className = 'cookie-permission-dialog';
      cookieDialog.innerHTML = `
        <div class="cookie-dialog-content">
          <h3>Enable Chat History</h3>
          <p>Would you like to enable cookies to save your chat history? This will allow you to continue conversations even after closing your browser.</p>
          <div class="cookie-buttons">
            <button class="cookie-accept">Accept</button>
            <button class="cookie-decline">Decline</button>
          </div>
        </div>
      `;
      
      // Add styles for the dialog
      const styles = `
        .cookie-permission-dialog {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .cookie-dialog-content {
          background: white;
          padding: 20px;
          border-radius: 10px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .cookie-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }
        .cookie-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }
        .cookie-accept {
          background-color: ${this.style.color};
          color: white;
        }
        .cookie-decline {
          background-color: #e1e1e1;
          color: #333;
        }
      `;
      
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      
      document.body.appendChild(cookieDialog);
      
      cookieDialog.querySelector('.cookie-accept').addEventListener('click', () => {
        document.body.removeChild(cookieDialog);
        this.cookiesEnabled = true;
        resolve(true);
      });
      
      cookieDialog.querySelector('.cookie-decline').addEventListener('click', () => {
        document.body.removeChild(cookieDialog);
        this.cookiesEnabled = false;
        resolve(false);
      });
    });
  }

  initializeWebSocket() {
    if (this.ws) {
      // If there's an existing connection, close it
      this.ws.close();
    }

    // Establish a WebSocket connection (no token required)
    const wsUrl = this.server.replace('http://', 'ws://').replace('https://', 'wss://');
    this.ws = new WebSocket(`${wsUrl}/api/v1/public/${this.assistant}/ws`);

    // WebSocket event handlers
    this.ws.onopen = () => {
      console.log("WebSocket connected");
      
      // No need to send join message - session is already established via REST API
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
          this.addMessage(data.content, data.role === "user" ? "user" : "bot", false);
        } else if (data.type === "error") {
          console.error("WebSocket error:", data.content);
          this.addMessage(`Error: ${data.content}`, "bot", false);
        } else if (data.response) {
          // Handle direct response format
          this.addMessage(data.response, "bot", false);
          
          // Update session data in cookies if this is a new conversation
          if (this.cookiesEnabled && this.conversationId && !this.sessionData) {
            this.saveSessionData();
          }
        }
      } catch (e) {
        // If the message is plain text (fallback)
        this.addMessage(event.data, "bot");
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Add page visibility change listener to save session data
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.cookiesEnabled && this.conversationId) {
        // Page is hidden (user switched tabs or minimized), save session data
        this.saveSessionData();
      }
    });

    // Add beforeunload listener to save session data when leaving the page
    window.addEventListener('beforeunload', () => {
      if (this.cookiesEnabled && this.conversationId) {
        this.saveSessionData();
      }
    });
  }

  // Generate shareable conversation URL
  generateShareableURL() {
    if (!this.conversationId) return null;
    
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('conversation_id', this.conversationId);
    return currentUrl.toString();
  }

  // Copy conversation URL to clipboard
  async copyConversationURL() {
    const shareableURL = this.generateShareableURL();
    if (!shareableURL) {
      alert('No conversation to share');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(shareableURL);
      alert('Conversation URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Conversation URL copied to clipboard!');
    }
  }

  detectMobile() {
    const toMatch = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i
    ];
    return toMatch.some((toMatchItem) => {
      return navigator.userAgent.match(toMatchItem);
    });
  }
}
