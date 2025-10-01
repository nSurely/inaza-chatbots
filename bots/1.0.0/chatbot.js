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
      bubblePosition: style.bubblePosition || "right",
      bubbleSize: style.bubbleSize || "60px",
      chatWidth: style.chatWidth || (type === "embed" ? "100%" : "400px"),
      chatHeight: style.chatHeight || (type === "embed" ? "100%" : "500px"),
      secondaryFontColor: style.secondaryFontColor || "white",

      fontFamily: style.fontFamily || "system",
      googleFont: style.googleFont || "Inter",
      fontWeight: style.fontWeight || "400",

      chatAvatar: style.chatAvatar || null,
      favicon: style.favicon || null,
      bubbleIcon: style.bubbleIcon || "💬",
      bubbleIconImage: style.bubbleIconImage || null,

      ...style,
    };

    this.config = {
      ...config,
      lang: config.lang || "en",

      askForCookies: config.askForCookies !== false,
      enableCookies: config.enableCookies !== false,
      autoSaveSession: config.autoSaveSession !== false,

      enableSharing: config.enableSharing !== false,
      enableViewHistory: config.enableViewHistory !== false,
      maxStoredMessages: config.maxStoredMessages || 50,

      sessionExpiryMinutes: config.sessionExpiryMinutes || 720,
      cookieExpiryMinutes: config.cookieExpiryMinutes || 20160,

      newChatButton: config.newChatButton || false,
      pollingInterval: config.pollingInterval || 5000, // Poll every 5 seconds by default
    };

    this.phrases = {};
    if (this.config.lang && phrases[this.config.lang]) {
      this.phrases = phrases[this.config.lang];
    } else {
      throw new Error("Language not supported");
    }

    if (this.config.placeholder) {
      this.phrases.ph = this.config.placeholder;
    }

    this.isMaximized = false;
    this.messages = [];
    this.files = {};
    this.loadingTimeout = null;
    this.conversationId = null;
    this.cookiesEnabled = false;
    this.sessionData = null;
    this.isMobile = this.detectMobile();
    this.pollingTimer = null;
    this.lastMessageCount = 0;

    if (!this.target) {
      throw new Error("Target element not found");
    }
    if (!this.id) {
      throw new Error("Chatbot ID is required");
    }

    this.injectStyles();

    if (this.type === "embed") {
      this.renderEmbed();
      this.initializeConversation();
    } else {
      this.renderBubble();
    }

    this.loadFontsAndAssets();
  }

  loadFontsAndAssets() {
    if (this.style.fontFamily === "google" && this.style.googleFont) {
      this.loadGoogleFont(this.style.googleFont, this.style.fontWeight);
    }

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

    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }

    document.head.appendChild(link);
  }

  injectStyles() {
    const bubblePosition = this.style.bubblePosition === "left" ? "left" : "right";
    const isEmbed = this.type === "embed";

    let fontFamily = this.style.font;
    if (this.style.fontFamily === "google") {
      fontFamily = `"${this.style.googleFont}", sans-serif`;
    } else if (this.style.fontFamily === "system") {
      fontFamily = this.style.font;
    }

    const styles = `
          /* Chat Bubble - only for bubble mode */
          .chat-bubble {
            position: fixed;
            bottom: 20px;
            ${bubblePosition}: 20px;
            width: ${this.style.bubbleSize};
            height: ${this.style.bubbleSize};
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 20)} 100%);
            border-radius: 50%;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            z-index: 999;
          }
          .chat-bubble:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .chat-bubble:active {
            transform: translateY(-2px) scale(1.02);
          }
          .chat-bubble-icon {
            font-size: 28px;
            color: ${this.style.secondaryFontColor};
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          }
          .chat-bubble-icon-image {
            width: 36px;
            height: 36px;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          }

          /* Chat Container */
          .chat-container {
            ${isEmbed ? `
              position: relative;
              width: 100%;
              height: 100%;
              bottom: auto;
              ${bubblePosition}: auto;
            ` : `
              position: fixed;
              bottom: 20px;
              ${bubblePosition}: 20px;
              width: ${this.style.chatWidth};
              height: ${this.style.chatHeight};
            `}
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
            display: flex;
            flex-direction: column;
            border-radius: ${isEmbed ? '0' : '16px'};
            box-shadow: ${isEmbed ? 'none' : '0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)'};
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            backdrop-filter: blur(10px);
          }
          .chat-container.maximized {
            bottom: 2.5%;
            ${bubblePosition}: 2.5%;
            width: 95%;
            height: 95%;
            border-radius: 16px;
          }
          .chat-container.maximized.mobile {
            bottom: 0;
            ${bubblePosition}: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
          }

          /* Chat Header */
          .chat-header {
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 15)} 100%);
            color: ${this.style.secondaryFontColor};
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            border-radius: ${isEmbed ? '0' : '16px 16px 0 0'};
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 10;
          }
          .chat-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
          }
          .chat-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 18px;
          }
          .chat-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          .chat-header p {
            margin: 0;
            font-size: 13px;
            opacity: 0.9;
          }
          .chat-header button {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: ${this.style.secondaryFontColor};
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s ease;
            border-radius: 8px;
            padding: 6px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .chat-header button:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: scale(1.05);
          }
          .chat-header button:active {
            transform: scale(0.95);
          }

          /* Chat Body */
          .chat-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            font-size: 15px;
            color: #2c3e50;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            background: #ffffff;
          }
          .chat-body::-webkit-scrollbar {
            width: 6px;
          }
          .chat-body::-webkit-scrollbar-track {
            background: transparent;
          }
          .chat-body::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
          }
          .chat-body::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
          }

          /* Chat Messages */
          .chat-message {
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 75%;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
            animation: messageSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          @keyframes messageSlideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .chat-message.bot {
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 10)} 100%);
            color: ${this.style.secondaryFontColor};
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }
          .chat-message.user {
            background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%);
            color: #2c3e50;
            align-self: flex-end;
            flex-direction: row-reverse;
            border-bottom-right-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .message-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .message-content {
            flex: 1;
            font-size: 14px;
          }

          /* Chat Input */
          .chat-input {
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            background: #ffffff;
            border-top: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.03);
          }
          .chat-input input[type="text"] {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e8e8e8;
            border-radius: 24px;
            font-size: 14px;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            transition: all 0.2s ease;
            background: #f8f9fa;
            color: #2c3e50;
          }
          .chat-input input[type="text"]:focus {
            outline: none;
            border-color: ${this.style.color};
            background: #ffffff;
            box-shadow: 0 0 0 4px ${this.hexToRgba(this.style.color, 0.1)};
          }
          .chat-input input[type="text"]::placeholder {
            color: #95a5a6;
          }
          .chat-input button {
            padding: 12px 20px;
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 10)} 100%);
            color: ${this.style.secondaryFontColor};
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-family: ${fontFamily};
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px ${this.hexToRgba(this.style.color, 0.3)};
          }
          .chat-input button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px ${this.hexToRgba(this.style.color, 0.4)};
          }
          .chat-input button:active {
            transform: translateY(0);
          }
          .chat-input button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          .chat-input input[type="file"] {
            display: none;
          }
          .chat-input label {
            background: #f0f0f0;
            color: #2c3e50;
            padding: 10px 14px;
            border-radius: 20px;
            cursor: pointer;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .chat-input label:hover {
            background: #e0e0e0;
            transform: scale(1.05);
          }

          /* Loading Animation */
          .chat-loading {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 75%;
            align-self: flex-start;
            font-size: 14px;
            color: #7f8c8d;
            font-style: italic;
            background: #f8f9fa;
            border-bottom-left-radius: 4px;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            animation: messageSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .chat-loading::before {
            content: '';
            width: 8px;
            height: 8px;
            background: ${this.style.color};
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
          .chat-loading::after {
            content: "";
            display: inline-block;
            width: 1em;
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

          /* Mobile Responsive */
          @media (max-width: 768px) {
            .chat-bubble {
              width: 64px;
              height: 64px;
              bottom: 16px;
              ${bubblePosition}: 16px;
            }
            .chat-bubble-icon {
              font-size: 32px;
            }
            .chat-bubble-icon-image {
              width: 42px;
              height: 42px;
            }
            .chat-container:not(.maximized) {
              bottom: 16px;
              ${bubblePosition}: 16px;
              width: calc(100vw - 32px);
              height: calc(100vh - 32px);
              max-width: 420px;
              max-height: 640px;
            }
            .chat-header {
              padding: 14px 16px;
            }
            .chat-header h3 {
              font-size: 16px;
            }
            .chat-header button {
              font-size: 22px;
              width: 36px;
              height: 36px;
            }
            .chat-body {
              padding: 16px;
            }
            .chat-input {
              padding: 12px 16px;
            }
            .chat-input input[type="text"] {
              padding: 14px 18px;
              font-size: 16px;
            }
            .chat-input button {
              padding: 14px 22px;
              font-size: 16px;
            }
            .chat-input label {
              padding: 12px 16px;
            }
          }
        `;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  darkenColor(color, percentage) {
    // Convert hex to RGB
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    // Darken by percentage
    r = Math.floor(r * (1 - percentage / 100));
    g = Math.floor(g * (1 - percentage / 100));
    b = Math.floor(b * (1 - percentage / 100));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  hexToRgba(hex, alpha) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  renderBubble() {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (this.style.bubbleIconImage) {
      const iconImage = document.createElement("img");
      iconImage.src = this.style.bubbleIconImage;
      iconImage.alt = "Chat";
      iconImage.className = "chat-bubble-icon-image";
      bubble.appendChild(iconImage);
    } else {
      bubble.innerHTML = `<span class="chat-bubble-icon">${this.style.bubbleIcon}</span>`;
    }

    bubble.addEventListener("click", () => this.renderChatWindow());
    this.target.appendChild(bubble);
  }

  async renderChatWindow() {
    this.target.innerHTML = "";

    // Ensure conversation is initialized before rendering
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
      this.stopPolling();
      this.target.innerHTML = "";
      this.renderBubble();
    });

    const closeButton = document.createElement("button");
    closeButton.textContent = "✖";
    closeButton.title = this.phrases.close;
    closeButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to close the chat? The conversation will be lost.")) {
        this.stopPolling();
        this.messages = [];
        this.conversationId = null;

        if (this.cookiesEnabled) {
          this.deleteCookie(`chatbot_${this.id}_session`);
        }

        this.target.innerHTML = "";
        this.renderBubble();
      }
    });

    const maximizeButton = document.createElement("button");
    maximizeButton.textContent = "🔼";
    maximizeButton.title = this.phrases.maximize;
    maximizeButton.addEventListener("click", () => {
      this.isMaximized = !this.isMaximized;
      maximizeButton.textContent = this.isMaximized ? "🔽" : "🔼";
      maximizeButton.title = this.isMaximized ? this.phrases.restore : this.phrases.maximize;
      chatWindow.classList.toggle("maximized");

      if (this.isMobile) {
        chatWindow.classList.toggle("mobile");
      }
    });

    const shareButton = document.createElement("button");
    shareButton.textContent = "🔗";
    shareButton.title = "Share Conversation";
    shareButton.addEventListener("click", () => this.copyConversationURL());

    if (this.config.newChatButton) {
      const newChatButton = document.createElement("button");
      newChatButton.textContent = "💬";
      newChatButton.title = "New Chat";
      newChatButton.addEventListener("click", () => this.startNewChat());
      chatHeader.appendChild(newChatButton);
    }

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

    if (this.messages.length > 0) {
      this.messages.forEach(msg => {
        this.addMessage(msg.content, msg.sender, false);
      });
    } else if (this.config.welcomeMessage) {
      this.addMessage(this.config.welcomeMessage, "bot", true);
    }

    // Start polling for new messages
    this.startPolling();
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
        this.files[file.name] = file;
        fileInput.value = "";
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
    this.target.innerHTML = "";

    const chatContainer = document.createElement("div");
    chatContainer.className = "chat-container";

    const chatBody = this.createChatBody();
    chatBody.classList.add("embed");

    const chatInput = this.createChatInput();

    chatContainer.appendChild(chatBody);
    chatContainer.appendChild(chatInput);

    this.target.appendChild(chatContainer);

    await this.initializeConversation();

    // Start polling for embed mode too
    this.startPolling();
  }

  addMessage(content, sender, store = true) {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${sender}`;
    messageElement.textContent = content;

    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (store) {
      this.messages.push({ content, sender });

      if (this.cookiesEnabled && this.config.autoSaveSession && this.conversationId) {
        this.updateLastMessageTime();
      }
    }

    if (sender === "user") {
      this.sendUserMessage(content);
    }
  }

  async sendUserMessage(message) {
    // Wait for conversation ID to be available (max 10 seconds)
    let attempts = 0;
    while (!this.conversationId && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!this.conversationId) {
      console.error("No conversation ID available after waiting");
      this.addMessage("Failed to initialize conversation. Please refresh and try again.", "bot", false);
      return;
    }

    this.triggerLoadingBubble();

    try {
      const response = await fetch(`${this.server}/api/v1/chat/${this.assistant}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: this.conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      this.resetLoadingBubble();

      this.addMessage(data.response, "bot", true);

    } catch (error) {
      console.error("Failed to send message:", error);
      this.resetLoadingBubble();
      this.addMessage("Sorry, I'm having trouble responding right now. Please try again.", "bot", false);
    }
  }

  async initializeConversation() {
    try {
      if (this.config.enableCookies) {
        if (this.config.askForCookies && !this.cookiesEnabled) {
          const cookieAccepted = await this.askForCookiePermission();
          if (!cookieAccepted) {
            console.log('Cookies declined, starting new conversation');
          }
        } else if (!this.config.askForCookies) {
          this.cookiesEnabled = true;
          console.log('Cookies auto-enabled based on configuration');
        }
      } else {
        this.cookiesEnabled = false;
        console.log('Cookies disabled by configuration');
      }

      const urlConversationId = this.getConversationIdFromURL();
      if (urlConversationId) {
        console.log(`Resuming conversation from URL: ${urlConversationId}`);
        this.conversationId = urlConversationId;
        await this.loadConversationHistory();
        return;
      }

      if (this.cookiesEnabled) {
        this.sessionData = this.loadSessionData();
        if (this.sessionData) {
          console.log(`Resuming conversation from cookies: ${this.sessionData.conversationId}`);
          this.conversationId = this.sessionData.conversationId;
          await this.loadConversationHistory();
          return;
        }
      }

      console.log('Starting new conversation');
      await this.startNewConversation();

    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      await this.startNewConversation();
    }
  }

  async loadConversationHistory() {
    try {
      const response = await fetch(`${this.server}/api/v1/chat/sessions/${this.conversationId}/history`);
      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        this.messages = data.messages.map(msg => ({
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : 'bot'
        }));

        this.messages.forEach(msg => {
          this.addMessage(msg.content, msg.sender, false);
        });

        this.lastMessageCount = this.messages.length;
        console.log(`Restored ${this.messages.length} messages from history`);
      }
    } catch (error) {
      console.warn('Failed to load conversation history:', error);
    }
  }

  async startNewConversation() {
    try {
      const response = await fetch(`${this.server}/api/v1/chat/${this.assistant}/start_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Hello"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();
      this.conversationId = data.session_id;

      console.log(`New conversation started: ${this.conversationId}`);

      this.addMessage(data.response, "bot", false);
      this.lastMessageCount = 1;

      if (this.cookiesEnabled && this.config.autoSaveSession) {
        this.saveSessionData();
      }

    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  }

  startPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    this.pollingTimer = setInterval(async () => {
      await this.pollForNewMessages();
    }, this.config.pollingInterval);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async pollForNewMessages() {
    if (!this.conversationId) return;

    try {
      const response = await fetch(`${this.server}/api/v1/chat/sessions/${this.conversationId}/history`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.messages && data.messages.length > this.lastMessageCount) {
        // New messages available
        const newMessages = data.messages.slice(this.lastMessageCount);

        newMessages.forEach(msg => {
          const sender = msg.role === 'user' ? 'user' : 'bot';
          // Only add if not already in our local messages
          if (!this.messages.some(m => m.content === msg.content && m.sender === sender)) {
            this.addMessage(msg.content, sender, true);
          }
        });

        this.lastMessageCount = data.messages.length;
      }
    } catch (error) {
      // Silent fail - don't spam console
    }
  }

  triggerLoadingBubble() {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }

    this.loadingTimeout = setTimeout(() => {
      this.addLoadingBubble();
    }, 1000);
  }

  addLoadingBubble() {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    if (chatBody.querySelector(".chat-loading")) return;

    const loadingElement = document.createElement("div");
    loadingElement.className = "chat-loading";
    loadingElement.textContent = "Thinking";

    chatBody.appendChild(loadingElement);
    chatBody.scrollTop = chatBody.scrollHeight;
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

  setCookie(name, value, minutes = 10080) {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (minutes * 60 * 1000));
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

      const now = Date.now();
      const sessionAge = now - sessionData.startTime;
      const maxSessionAge = this.config.sessionExpiryMinutes * 60 * 1000;

      if (sessionAge > maxSessionAge) {
        this.deleteCookie(`chatbot_${this.id}_session`);
        return null;
      }

      if (sessionData.assistant !== this.assistant) {
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

  getConversationIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('conversation_id');
  }

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

  generateShareableURL() {
    if (!this.conversationId) return null;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('conversation_id', this.conversationId);
    return currentUrl.toString();
  }

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
      const textArea = document.createElement('textarea');
      textArea.value = shareableURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Conversation URL copied to clipboard!');
    }
  }

  async startNewChat() {
    if (confirm("Start a new chat? The current conversation will be lost.")) {
      this.stopPolling();

      this.messages = [];
      this.conversationId = null;
      this.sessionData = null;
      this.lastMessageCount = 0;

      if (this.cookiesEnabled) {
        this.deleteCookie(`chatbot_${this.id}_session`);
      }

      const chatBody = this.target.querySelector(".chat-body");
      if (chatBody) {
        chatBody.innerHTML = "";
      }

      await this.startNewConversation();
      this.startPolling();
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

if (typeof window !== 'undefined') {
  window.Chatbot = Chatbot;
}
