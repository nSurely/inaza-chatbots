const SVG_ICONS = {
  chat: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  minimize: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>',
  maximize: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  restore: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  share: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>',
  send: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  attach: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>',
};

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
    contextVariables = null,
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

    this.contextVariables = contextVariables;

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
      bubbleIcon: style.bubbleIcon || null,
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

      start_questions: config.start_questions || null, // Array of {display: string, prompt: string}
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
    this.sessionId = null;
    this.cookiesEnabled = false;
    this.sessionData = null;
    this.isMobile = this.detectMobile();
    this.pollingTimer = null;
    this.lastMessageCount = 0;
    this.seenMessageIds = new Set(); // Track message IDs to avoid duplicates
    this.lastMessageTime = 0; // For rate limiting
    this.messageCooldown = 3000; // 3 seconds cooldown
    this.pollingFailures = 0;
    this.maxPollingFailures = 10;
    this.isFirstMessage = true; // Track if this is the first user message

    if (!this.target) {
      throw new Error("Target element not found");
    }
    if (!this.id) {
      throw new Error("Chatbot ID is required");
    }

    this.injectStyles();

    if (this.type === "embed") {
      this.renderEmbed();
      this.initializeSession();
    } else {
      this.renderBubble();
    }

    this.loadFontsAndAssets();
  }

  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 15)} 100%);
            border-radius: 50%;
            box-shadow: 0 4px 20px ${this.hexToRgba(this.style.color, 0.4)}, 0 8px 32px rgba(0, 0, 0, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            z-index: 999;
            border: 2px solid rgba(255, 255, 255, 0.2);
          }
          .chat-bubble::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 50%;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), transparent);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0.5;
          }
          .chat-bubble:hover {
            transform: translateY(-4px) scale(1.08);
            box-shadow: 0 8px 28px ${this.hexToRgba(this.style.color, 0.5)}, 0 12px 40px rgba(0, 0, 0, 0.18);
          }
          .chat-bubble:active {
            transform: translateY(-2px) scale(1.04);
          }
          .chat-bubble-icon {
            width: 32px;
            height: 32px;
            color: ${this.style.secondaryFontColor};
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          }
          .chat-bubble-icon svg {
            width: 100%;
            height: 100%;
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
            background: #ffffff;
            display: flex;
            flex-direction: column;
            border-radius: ${isEmbed ? '0' : '12px'};
            box-shadow: ${isEmbed ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08)'};
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            z-index: 1000;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }
          .chat-container.maximized {
            bottom: 2.5%;
            ${bubblePosition}: 2.5%;
            width: 95%;
            height: 95%;
            border-radius: 12px;
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
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 10)} 100%);
            color: ${this.style.secondaryFontColor};
            padding: 18px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            border-radius: ${isEmbed ? '0' : '12px 12px 0 0'};
            position: relative;
            z-index: 10;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          }
          .chat-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(0, 0, 0, 0.05);
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
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
            transition: all 0.2s ease;
            border-radius: 6px;
            padding: 6px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .chat-header button svg {
            width: 20px;
            height: 20px;
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
            padding: 24px 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            font-size: 15px;
            color: #2c3e50;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
          }
          .chat-body::-webkit-scrollbar {
            width: 6px;
          }
          .chat-body::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px 0;
          }
          .chat-body::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.08);
            border-radius: 3px;
          }
          .chat-body::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.14);
          }

          /* Chat Messages */
          .chat-message {
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 75%;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.6;
            animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          @keyframes messageSlideIn {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .chat-message.bot {
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 8)} 100%);
            color: ${this.style.secondaryFontColor};
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 12px ${this.hexToRgba(this.style.color, 0.15)};
          }
          .chat-message.user {
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            color: #2c3e50;
            align-self: flex-end;
            flex-direction: row-reverse;
            border-bottom-right-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.04);
          }
          .message-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
            border: 1.5px solid rgba(255, 255, 255, 0.8);
          }
          .message-content {
            flex: 1;
            font-size: 14px;
            line-height: 1.6;
          }
          .message-content strong {
            font-weight: 700;
          }
          .message-content em {
            font-style: italic;
          }
          .message-content ul,
          .message-content ol {
            margin: 8px 0;
            padding-left: 24px;
          }
          .message-content ul {
            list-style-type: disc;
          }
          .message-content ol {
            list-style-type: decimal;
          }
          .message-content li {
            margin: 4px 0;
            line-height: 1.5;
          }
          .message-content br {
            display: block;
            content: "";
            margin: 4px 0;
          }

          /* Chat Input */
          .chat-input {
            padding: 16px 20px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            border-top: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.02);
          }
          .chat-input input[type="text"] {
            flex: 1;
            padding: 13px 18px;
            border: 1.5px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            background: #f9fafb;
            color: #2c3e50;
          }
          .chat-input input[type="text"]:focus {
            outline: none;
            border-color: ${this.style.color};
            background: #ffffff;
            box-shadow: 0 0 0 3px ${this.hexToRgba(this.style.color, 0.08)}, 0 2px 8px rgba(0, 0, 0, 0.04);
            transform: translateY(-1px);
          }
          .chat-input input[type="text"]::placeholder {
            color: #9ca3af;
          }
          .chat-input button {
            padding: 13px 20px;
            background: linear-gradient(135deg, ${this.style.color} 0%, ${this.darkenColor(this.style.color, 8)} 100%);
            color: ${this.style.secondaryFontColor};
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-family: ${fontFamily};
            font-weight: 600;
            font-size: 14px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 14px ${this.hexToRgba(this.style.color, 0.25)};
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          .chat-input button svg {
            width: 18px;
            height: 18px;
          }
          .chat-input button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px ${this.hexToRgba(this.style.color, 0.35)};
          }
          .chat-input button:active {
            transform: translateY(-1px);
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
            border-radius: 10px;
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
            padding: 14px 18px;
            border-radius: 12px;
            max-width: 75%;
            align-self: flex-start;
            font-size: 14px;
            color: #6b7280;
            font-style: italic;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-bottom-left-radius: 4px;
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }
          .chat-loading::before {
            content: '';
            width: 10px;
            height: 10px;
            background: ${this.style.color};
            border-radius: 50%;
            animation: pulse 1.4s ease-in-out infinite;
            box-shadow: 0 0 8px ${this.hexToRgba(this.style.color, 0.4)};
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 0.4;
              transform: scale(0.85);
            }
            50% {
              opacity: 1;
              transform: scale(1.15);
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

          /* Start Questions Overlay */
          .start-questions-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(8px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 32px 24px;
            z-index: 10;
            animation: fadeIn 0.3s ease-in-out;
            overflow-y: auto;
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes fadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }
          .start-questions-overlay.fade-out {
            animation: fadeOut 0.3s ease-in-out;
          }
          .start-questions-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
            text-align: center;
            font-family: ${fontFamily};
          }
          .start-questions-subtitle {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
            text-align: center;
            font-family: ${fontFamily};
          }
          .start-questions-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 340px;
          }
          .start-question-button {
            padding: 16px 20px;
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            border: 2px solid ${this.hexToRgba(this.style.color, 0.2)};
            border-radius: 12px;
            color: #2c3e50;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: ${fontFamily};
            font-weight: ${this.style.fontWeight};
            font-size: 14px;
            text-align: left;
            line-height: 1.5;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }
          .start-question-button:hover {
            background: linear-gradient(135deg, ${this.hexToRgba(this.style.color, 0.08)} 0%, ${this.hexToRgba(this.style.color, 0.04)} 100%);
            border-color: ${this.style.color};
            transform: translateY(-2px);
            box-shadow: 0 6px 20px ${this.hexToRgba(this.style.color, 0.15)}, 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          .start-question-button:active {
            transform: translateY(-1px);
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
            .start-questions-overlay {
              padding: 24px 16px;
            }
            .start-questions-title {
              font-size: 16px;
            }
            .start-questions-subtitle {
              font-size: 13px;
            }
            .start-questions-container {
              max-width: 100%;
            }
            .start-question-button {
              padding: 14px 16px;
              font-size: 14px;
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

  parseMarkdown(text) {
    // Escape HTML to prevent XSS
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    // Split into lines for list processing
    const lines = text.split('\n');
    const parsed = [];
    let inList = null; // 'ul' or 'ol' or null
    let listItems = [];

    const flushList = () => {
      if (inList && listItems.length > 0) {
        const tag = inList;
        const items = listItems.map(item => `<li>${item}</li>`).join('');
        parsed.push(`<${tag}>${items}</${tag}>`);
        listItems = [];
        inList = null;
      }
    };

    lines.forEach((line, index) => {
      // Check for unordered list (- or *)
      const ulMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
      if (ulMatch) {
        if (inList !== 'ul') {
          flushList();
          inList = 'ul';
        }
        listItems.push(this.parseInlineMarkdown(escapeHtml(ulMatch[1])));
        return;
      }

      // Check for ordered list (1. 2. etc)
      const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
      if (olMatch) {
        if (inList !== 'ol') {
          flushList();
          inList = 'ol';
        }
        listItems.push(this.parseInlineMarkdown(escapeHtml(olMatch[1])));
        return;
      }

      // Not a list item, flush any pending list
      flushList();

      // Parse inline markdown for regular lines
      if (line.trim() === '') {
        parsed.push('<br>');
      } else {
        parsed.push(this.parseInlineMarkdown(escapeHtml(line)));
      }
    });

    // Flush any remaining list
    flushList();

    return parsed.join('\n');
  }

  parseInlineMarkdown(text) {
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    // Match * or _ that are either at word boundaries or surrounded by spaces/punctuation
    text = text.replace(/(\s|^)\*([^\*\s].*?[^\*\s]|\S)\*(\s|$|[,.!?;:])/g, '$1<em>$2</em>$3');
    text = text.replace(/(\s|^)_([^_\s].*?[^_\s]|\S)_(\s|$|[,.!?;:])/g, '$1<em>$2</em>$3');

    return text;
  }

  formatContextVariables() {
    // If no context variables are set, return empty string
    if (!this.contextVariables || typeof this.contextVariables !== 'object' || Object.keys(this.contextVariables).length === 0) {
      return '';
    }

    const contextLines = ['\n\n###START_CONTEXT###\n', '\nThe following context variables are set by the system, and are hidden from the user:\n'];

    let index = 1;
    for (const [key, config] of Object.entries(this.contextVariables)) {
      if (!config || typeof config !== 'object') continue;

      const value = config.value !== undefined ? config.value : '';
      const description = config.description || '';

      contextLines.push(`${index}. ${key}`);
      contextLines.push(`    - value: ${value}`);
      if (description) {
        contextLines.push(`    - description: "${description}"`);
      }

      index++;
    }

    contextLines.push('\n###END_CONTEXT###');

    return contextLines.join('\n');
  }

  stripContextFromMessage(text) {
    // Remove everything between ###START_CONTEXT### and ###END_CONTEXT### including the markers
    if (!text) return text;
    return text.replace(/###START_CONTEXT###[\s\S]*?###END_CONTEXT###/g, '').trim();
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
    } else if (this.style.bubbleIcon) {
      bubble.innerHTML = `<span class="chat-bubble-icon">${this.style.bubbleIcon}</span>`;
    } else {
      bubble.innerHTML = `<span class="chat-bubble-icon">${SVG_ICONS.chat}</span>`;
    }

    bubble.addEventListener("click", () => this.renderChatWindow());
    this.target.appendChild(bubble);
  }

  async renderChatWindow() {
    this.target.innerHTML = "";

    // Don't initialize session yet - wait for first user message (lazy loading)
    // This prevents creating sessions that are never used
    if (!this.sessionId) {
      // Try to resume from URL or cookies
      const urlSessionId = this.getSessionIdFromURL();
      if (urlSessionId) {
        console.log(`Resuming session from URL: ${urlSessionId}`);
        this.sessionId = urlSessionId;
        await this.loadSessionHistory();
      } else if (this.config.enableCookies && this.cookiesEnabled) {
        this.sessionData = this.loadSessionData();
        if (this.sessionData) {
          console.log(`Resuming session from cookies: ${this.sessionData.sessionId}`);
          this.sessionId = this.sessionData.sessionId;
          await this.loadSessionHistory();
        }
      }
    }

    const chatWindow = document.createElement("div");
    chatWindow.className = "chat-container";

    const chatHeader = document.createElement("div");
    chatHeader.className = "chat-header";

    // Create header title with optional avatar
    const headerTitle = document.createElement("h3");

    if (this.style.chatAvatar) {
      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = this.style.chatAvatar;
      avatar.alt = "Chat Assistant";
      headerTitle.appendChild(avatar);
    }

    const titleText = document.createTextNode(this.config.headerTitle || "Chat Assistant");
    headerTitle.appendChild(titleText);
    chatHeader.appendChild(headerTitle);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";

    const minimizeButton = document.createElement("button");
    minimizeButton.innerHTML = SVG_ICONS.minimize;
    minimizeButton.title = this.phrases.minimize;
    minimizeButton.addEventListener("click", () => {
      this.stopPolling();
      this.target.innerHTML = "";
      this.renderBubble();
    });

    const closeButton = document.createElement("button");
    closeButton.innerHTML = SVG_ICONS.close;
    closeButton.title = this.phrases.close;
    closeButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to close the chat? The session will be lost.")) {
        this.stopPolling();
        this.messages = [];
        this.sessionId = null;

        if (this.cookiesEnabled) {
          this.deleteCookie(`chatbot_${this.id}_session`);
        }

        this.target.innerHTML = "";
        this.renderBubble();
      }
    });

    const maximizeButton = document.createElement("button");
    maximizeButton.innerHTML = SVG_ICONS.maximize;
    maximizeButton.title = this.phrases.maximize;
    maximizeButton.addEventListener("click", () => {
      this.isMaximized = !this.isMaximized;
      maximizeButton.innerHTML = this.isMaximized ? SVG_ICONS.restore : SVG_ICONS.maximize;
      maximizeButton.title = this.isMaximized ? this.phrases.restore : this.phrases.maximize;
      chatWindow.classList.toggle("maximized");

      if (this.isMobile) {
        chatWindow.classList.toggle("mobile");
      }
    });

    const shareButton = document.createElement("button");
    shareButton.innerHTML = SVG_ICONS.share;
    shareButton.title = "Share Session";
    shareButton.addEventListener("click", () => this.copySessionURL());

    if (this.config.newChatButton) {
      const newChatButton = document.createElement("button");
      newChatButton.innerHTML = SVG_ICONS.chat;
      newChatButton.title = "New Chat";
      newChatButton.addEventListener("click", () => this.startNewChat());
      buttonContainer.appendChild(newChatButton);
    }

    buttonContainer.appendChild(minimizeButton);
    buttonContainer.appendChild(maximizeButton);
    buttonContainer.appendChild(closeButton);
    buttonContainer.appendChild(shareButton);

    chatHeader.appendChild(buttonContainer);

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
      // Store welcome message so it's tracked in message count
      this.addMessage(this.config.welcomeMessage, "bot", true);
    }

    // Render start questions overlay if configured and no messages
    const startQuestionsOverlay = this.renderStartQuestions();
    if (startQuestionsOverlay) {
      chatBody.appendChild(startQuestionsOverlay);
    }

    // Only start polling if we have a session (resumed from URL or cookies)
    // For new chats, polling will start after first message is sent
    if (this.sessionId) {
      this.startPolling();
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

    // TODO: File upload feature - implement later
    // const fileInput = document.createElement("input");
    // fileInput.type = "file";
    // fileInput.id = "fileInput";

    // const fileLabel = document.createElement("label");
    // fileLabel.textContent = "📎";
    // fileLabel.title = this.phrases.attach;
    // fileLabel.htmlFor = "fileInput";

    // fileInput.addEventListener("change", () => {
    //   const file = fileInput.files[0];
    //   if (file) {
    //     this.addMessage(`📎 ${this.phrases.file}: ${file.name}`, "user");
    //     this.files[file.name] = file;
    //     fileInput.value = "";
    //   }
    // });

    const sendButton = document.createElement("button");
    sendButton.innerHTML = SVG_ICONS.send;
    sendButton.title = this.phrases.send;
    sendButton.setAttribute("aria-label", this.phrases.send);
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
    // chatInput.appendChild(fileInput);
    // chatInput.appendChild(fileLabel);
    chatInput.appendChild(sendButton);

    return chatInput;
  }

  renderStartQuestions() {
    // Only show if configured and no messages exist yet
    if (!this.config.start_questions || !Array.isArray(this.config.start_questions) || this.config.start_questions.length === 0) {
      return null;
    }

    if (this.messages.length > 0) {
      return null;
    }

    const overlay = document.createElement("div");
    overlay.className = "start-questions-overlay";

    const title = document.createElement("div");
    title.className = "start-questions-title";
    title.textContent = "How can we help you today?";
    overlay.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "start-questions-subtitle";
    subtitle.textContent = "Choose a question to get started quickly";
    overlay.appendChild(subtitle);

    const container = document.createElement("div");
    container.className = "start-questions-container";

    this.config.start_questions.forEach((question) => {
      if (!question.display || !question.prompt) {
        console.warn("Invalid start_question configuration:", question);
        return;
      }

      const button = document.createElement("button");
      button.className = "start-question-button";
      button.textContent = question.display;
      button.setAttribute("type", "button");

      button.addEventListener("click", () => {
        const inputField = this.target.querySelector('.chat-input input[type="text"]');
        if (inputField) {
          // Fill the input with the prompt
          inputField.value = question.prompt;

          // Trigger the message send
          this.addMessage(question.prompt, "user");

          // Clear the input
          inputField.value = "";
        }

        // Remove the overlay with fade-out animation
        overlay.classList.add("fade-out");
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      });

      container.appendChild(button);
    });

    overlay.appendChild(container);
    return overlay;
  }

  async renderEmbed() {
    this.target.innerHTML = "";

    const chatContainer = document.createElement("div");
    chatContainer.className = "chat-container";

    // Create header for embed mode
    const chatHeader = document.createElement("div");
    chatHeader.className = "chat-header";

    // Create header title with optional avatar
    const headerTitle = document.createElement("h3");

    if (this.style.chatAvatar) {
      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.src = this.style.chatAvatar;
      avatar.alt = "Chat Assistant";
      headerTitle.appendChild(avatar);
    }

    const titleText = document.createTextNode(this.config.headerTitle || "Chat Assistant");
    headerTitle.appendChild(titleText);
    chatHeader.appendChild(headerTitle);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";

    const shareButton = document.createElement("button");
    shareButton.innerHTML = SVG_ICONS.share;
    shareButton.title = "Share Session";
    shareButton.addEventListener("click", () => this.copySessionURL());

    if (this.config.newChatButton) {
      const newChatButton = document.createElement("button");
      newChatButton.innerHTML = SVG_ICONS.chat;
      newChatButton.title = "New Chat";
      newChatButton.addEventListener("click", () => this.startNewChat());
      buttonContainer.appendChild(newChatButton);
    }

    buttonContainer.appendChild(shareButton);
    chatHeader.appendChild(buttonContainer);

    const chatBody = this.createChatBody();
    chatBody.classList.add("embed");

    const chatInput = this.createChatInput();

    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(chatBody);
    chatContainer.appendChild(chatInput);

    this.target.appendChild(chatContainer);

    // Initialize session (handles cookie permissions, URL/cookie session resuming)
    await this.initializeSession();

    // Render start questions overlay if configured and no messages
    const startQuestionsOverlay = this.renderStartQuestions();
    if (startQuestionsOverlay) {
      chatBody.appendChild(startQuestionsOverlay);
    }

    // Only start polling if we have a session
    if (this.sessionId) {
      this.startPolling();
    }
  }

  addMessage(content, sender, store = true) {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    // Remove start questions overlay if it exists and user is sending a message
    if (sender === "user") {
      const overlay = chatBody.querySelector(".start-questions-overlay");
      if (overlay) {
        overlay.classList.add("fade-out");
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      }
    }

    // Strip context variables from displayed content
    const displayContent = this.stripContextFromMessage(content);

    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${sender}`;

    // Add avatar for bot messages if configured
    if (sender === "bot" && this.style.chatAvatar) {
      const avatar = document.createElement("img");
      avatar.className = "message-avatar";
      avatar.src = this.style.chatAvatar;
      avatar.alt = "Bot";
      messageElement.appendChild(avatar);
    }

    // Create message content wrapper
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    // Parse markdown for bot messages, plain text for user messages
    if (sender === "bot") {
      messageContent.innerHTML = this.parseMarkdown(displayContent);
    } else {
      messageContent.textContent = displayContent;
    }

    messageElement.appendChild(messageContent);

    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (store) {
      this.messages.push({ content, sender });
      this.lastMessageCount = this.messages.length;

      if (this.cookiesEnabled && this.config.autoSaveSession && this.sessionId) {
        this.updateLastMessageTime();
      }
    }

    if (sender === "user") {
      this.sendUserMessage(content);
    }
  }

  async sendUserMessage(message) {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    if (timeSinceLastMessage < this.messageCooldown) {
      const remainingTime = Math.ceil((this.messageCooldown - timeSinceLastMessage) / 1000);
      this.addMessage(`Please wait ${remainingTime} seconds before sending another message.`, "bot", false);
      return;
    }
    this.lastMessageTime = now;

    // Append context variables to the first user message
    let messageToSend = message;
    if (this.isFirstMessage && this.contextVariables) {
      const contextFormatted = this.formatContextVariables();
      if (contextFormatted) {
        messageToSend = message + contextFormatted;
        console.log('Appending context variables to first message');
      }
      this.isFirstMessage = false;
    }

    this.triggerLoadingBubble();

    try {
      let data;

      // If no session exists, this is the first message - use start_chat endpoint
      if (!this.sessionId) {
        console.log("Starting new session with user's first message");
        data = await this.retryWithBackoff(async () => {
          const response = await fetch(`${this.server}/api/v1/chat/${this.assistant}/start_chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: messageToSend
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to start chat: ${response.statusText}`);
          }

          return await response.json();
        });

        this.sessionId = data.session_id;
        console.log(`New session started: ${this.sessionId}`);

        // Save session data if cookies enabled
        if (this.cookiesEnabled && this.config.autoSaveSession) {
          this.saveSessionData();
        }

        // Start polling now that we have a session
        this.startPolling();
      } else {
        // Continue existing conversation
        data = await this.retryWithBackoff(async () => {
          const response = await fetch(`${this.server}/api/v1/chat/${this.assistant}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: messageToSend,
              session_id: this.sessionId
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to send message: ${response.statusText}`);
          }

          return await response.json();
        });
      }

      this.resetLoadingBubble();

      this.addMessage(data.response, "bot", true);

    } catch (error) {
      console.error("Failed to send message after retries:", error);
      this.resetLoadingBubble();
      this.addMessage("Sorry, I'm having trouble responding right now. Please try again.", "bot", false);
    }
  }

  async initializeSession() {
    try {
      // Handle cookie permissions
      if (this.config.enableCookies) {
        if (this.config.askForCookies && !this.cookiesEnabled) {
          const cookieAccepted = await this.askForCookiePermission();
          if (!cookieAccepted) {
            console.log('Cookies declined');
          }
        } else if (!this.config.askForCookies) {
          this.cookiesEnabled = true;
          console.log('Cookies auto-enabled based on configuration');
        }
      } else {
        this.cookiesEnabled = false;
        console.log('Cookies disabled by configuration');
      }

      // Try to resume from URL
      const urlSessionId = this.getSessionIdFromURL();
      if (urlSessionId) {
        console.log(`Resuming session from URL: ${urlSessionId}`);
        this.sessionId = urlSessionId;
        await this.loadSessionHistory();
        return;
      }

      // Try to resume from cookies
      if (this.cookiesEnabled) {
        this.sessionData = this.loadSessionData();
        if (this.sessionData) {
          console.log(`Resuming session from cookies: ${this.sessionData.sessionId}`);
          this.sessionId = this.sessionData.sessionId;
          await this.loadSessionHistory();
          return;
        }
      }

      // No existing session - don't start new one yet
      // Session will be created when user sends first message (lazy loading)
      console.log('No existing session found - will create on first user message');

    } catch (error) {
      console.error('Failed to initialize session:', error);
      this.showInitializationError();
    }
  }

  showInitializationError() {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    const errorElement = document.createElement("div");
    errorElement.className = "initialization-error";
    errorElement.style.cssText = `
      padding: 16px;
      margin: 20px;
      background: #fee;
      border: 2px solid #fcc;
      border-radius: 8px;
      color: #c33;
      text-align: center;
      font-size: 14px;
    `;
    errorElement.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Failed to Initialize Chat</div>
      <div style="margin-bottom: 12px;">Unable to connect to the chat service. Please try again.</div>
      <button onclick="location.reload()" style="
        padding: 8px 16px;
        background: #c33;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Retry</button>
    `;

    chatBody.appendChild(errorElement);
  }

  async loadSessionHistory() {
    try {
      const response = await fetch(`${this.server}/api/v1/chat/sessions/${this.sessionId}/history`);
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
      console.warn('Failed to load session history:', error);
    }
  }

  async startNewSession() {
    try {
      const data = await this.retryWithBackoff(async () => {
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
          throw new Error(`Failed to start session: ${response.statusText}`);
        }

        return await response.json();
      });

      this.sessionId = data.session_id;

      console.log(`New session started: ${this.sessionId}`);

      // Store the initial message so it's tracked properly
      this.addMessage(data.response, "bot", true);
      this.lastMessageCount = 1;

      if (this.cookiesEnabled && this.config.autoSaveSession) {
        this.saveSessionData();
      }

    } catch (error) {
      console.error('Failed to start new session after retries:', error);
      throw error; // Re-throw to trigger error UI in initializeSession
    }
  }

  startPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    // Re-enable input field if it was disabled due to polling errors
    const inputField = this.target.querySelector('.chat-input input[type="text"]');
    const sendButton = this.target.querySelector('.chat-input button');
    if (inputField && inputField.disabled) {
      inputField.disabled = false;
      inputField.placeholder = this.phrases.ph;
    }
    if (sendButton && sendButton.disabled) {
      sendButton.disabled = false;
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
    if (!this.sessionId) return;

    try {
      const response = await fetch(`${this.server}/api/v1/chat/sessions/${this.sessionId}/history`);
      if (!response.ok) {
        throw new Error(`Failed to poll: ${response.statusText}`);
      }

      const data = await response.json();

      // Reset failure counter on successful poll
      this.pollingFailures = 0;

      if (data.messages && data.messages.length > 0) {
        // Check for new messages using message IDs
        data.messages.forEach(msg => {
          // Skip if we've already seen this message ID
          if (msg.id && this.seenMessageIds.has(msg.id)) {
            return;
          }

          // Skip if this message is already in our local array (for messages without IDs)
          const alreadyExists = this.messages.some(
            m => m.content === msg.content && m.sender === (msg.role === 'user' ? 'user' : 'bot')
          );

          if (!alreadyExists) {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            this.addMessage(msg.content, sender, true);

            // Mark this message as seen
            if (msg.id) {
              this.seenMessageIds.add(msg.id);
            }
          }
        });

        this.lastMessageCount = data.messages.length;
      }
    } catch (error) {
      this.pollingFailures++;
      console.warn(`Polling failure ${this.pollingFailures}/${this.maxPollingFailures}:`, error.message);

      if (this.pollingFailures >= this.maxPollingFailures) {
        this.stopPolling();
        this.showPollingError();
      }
    }
  }

  showPollingError() {
    const chatBody = this.target.querySelector(".chat-body");
    if (!chatBody) return;

    const existingError = chatBody.querySelector(".polling-error");
    if (existingError) return;

    const errorElement = document.createElement("div");
    errorElement.className = "polling-error";
    errorElement.style.cssText = `
      padding: 12px;
      margin: 10px 0;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      color: #c33;
      text-align: center;
      font-size: 14px;
    `;
    errorElement.innerHTML = `
      <div>Connection lost. Unable to receive new messages.</div>
      <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
        <button class="retry-polling-btn" style="
          padding: 6px 12px;
          background: #0078d4;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Retry Connection</button>
        <button onclick="location.reload()" style="
          padding: 6px 12px;
          background: #c33;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Refresh Page</button>
      </div>
    `;

    const retryBtn = errorElement.querySelector('.retry-polling-btn');
    retryBtn.addEventListener('click', () => {
      // Reset failure count and restart polling
      this.pollingFailures = 0;
      chatBody.removeChild(errorElement);
      this.startPolling();
    });

    chatBody.appendChild(errorElement);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Disable input field to prevent sending messages that won't get responses
    const inputField = this.target.querySelector('.chat-input input[type="text"]');
    const sendButton = this.target.querySelector('.chat-input button');
    if (inputField) {
      inputField.disabled = true;
      inputField.placeholder = "Connection lost...";
    }
    if (sendButton) {
      sendButton.disabled = true;
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
    if (!this.cookiesEnabled || !this.sessionId || !this.config.autoSaveSession) return false;

    const sessionData = {
      sessionId: this.sessionId,
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
    if (!this.cookiesEnabled || !this.sessionId || !this.config.autoSaveSession) return;

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

  getSessionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session_id');
  }

  askForCookiePermission() {
    return new Promise((resolve) => {
      const cookieDialog = document.createElement('div');
      cookieDialog.className = 'cookie-permission-dialog';
      cookieDialog.innerHTML = `
        <div class="cookie-dialog-content">
          <h3>Enable Chat History</h3>
          <p>Would you like to enable cookies to save your chat history? This will allow you to continue sessions even after closing your browser.</p>
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
      styleSheet.id = "cookie-dialog-styles";
      document.head.appendChild(styleSheet);

      document.body.appendChild(cookieDialog);

      const cleanup = () => {
        document.body.removeChild(cookieDialog);
        const existingStyles = document.getElementById("cookie-dialog-styles");
        if (existingStyles) {
          document.head.removeChild(existingStyles);
        }
      };

      cookieDialog.querySelector('.cookie-accept').addEventListener('click', () => {
        cleanup();
        this.cookiesEnabled = true;
        resolve(true);
      });

      cookieDialog.querySelector('.cookie-decline').addEventListener('click', () => {
        cleanup();
        this.cookiesEnabled = false;
        resolve(false);
      });
    });
  }

  generateShareableURL() {
    if (!this.sessionId) return null;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('session_id', this.sessionId);
    return currentUrl.toString();
  }

  async copySessionURL() {
    const shareableURL = this.generateShareableURL();
    if (!shareableURL) {
      alert('No session to share');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareableURL);
      alert('Session URL copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareableURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Session URL copied to clipboard!');
    }
  }

  async startNewChat() {
    if (confirm("Start a new chat? The current session will be lost.")) {
      this.stopPolling();

      this.messages = [];
      this.sessionId = null;
      this.sessionData = null;
      this.lastMessageCount = 0;
      this.seenMessageIds.clear(); // Clear seen message IDs
      this.lastMessageTime = 0; // Reset rate limiting
      this.pollingFailures = 0; // Reset polling failures

      if (this.cookiesEnabled) {
        this.deleteCookie(`chatbot_${this.id}_session`);
      }

      const chatBody = this.target.querySelector(".chat-body");
      if (chatBody) {
        chatBody.innerHTML = "";
      }

      // Show welcome message if configured (lazy initialization - session created on first user message)
      if (this.config.welcomeMessage) {
        this.addMessage(this.config.welcomeMessage, "bot", true);
      }

      // Don't start a new session here - let it be created lazily when user sends first message
      // Don't start polling either - it will start when session is created
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
