// Tests for bots/2.0.6 — zero-dependency (no jsdom): a minimal DOM shim, extended
// from the 2.0.5 harness with event-listener capture + descendant querySelectorAll so
// the pre-chat gate and quick-action overlay can actually be rendered and clicked.
//
// Run: node test/widget-2.0.6.test.js
//
// Covers the 2.0.6 localization feature:
//   (L1) picking a start_inputs option carrying locale:"es" switches this.phrases and
//        the already-rendered chrome (placeholder + tooltips) to Spanish
//   (L2) the collected value sent to the agent is UNCHANGED by the locale switch
//        ("Preferred Language: Spanish" regardless of widget locale)
//   (L3) per-locale start_questions labels render Spanish after Español, English after
//        English; per-locale placeholder resolves per active locale
//   (L4) plain-string config renders byte-identically at en and es (back-compat)
//   (L5) applyLocale with no placeholder override falls back to the locale's phrases.ph
// and ports the 2.0.5 regressions against 2.0.6:
//   (a) minimize -> reopen replays stored messages WITHOUT re-POSTing user turns
//   (b) cooldown swaps placeholder to wait-text then restores the configured ph
//   (c) overlapping cooldown triggers still restore the configured ph
//   (d) resetSessionState restores per-session fields to defaults

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// ---------------------------------------------------------------------------
// Minimal DOM shim
// ---------------------------------------------------------------------------

class FakeClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  contains(c) { return this._set.has(c); }
}

class FakeNode {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this._className = "";
    this.style = {};
    this.textContent = "";
    this.innerHTML = "";
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.disabled = false;
    this.placeholder = "";
    this.value = "";
    this.title = "";
    this.id = "";
    this._attrs = {};
    this._listeners = {};
    this._selectorMap = {}; // explicit selector -> node overrides, set by test setup
  }
  set className(v) { this._className = v; }
  get className() { return this._className; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
    return child;
  }
  setAttribute(k, v) { this._attrs[k] = v; }
  getAttribute(k) { return this._attrs[k]; }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  fire(type, ev = {}) { (this._listeners[type] || []).forEach((fn) => fn(ev)); }
  focus() {}
  _matches(sel) {
    if (sel[0] === ".") return this._className.split(/\s+/).includes(sel.slice(1));
    return this.tagName === sel;
  }
  querySelector(sel) {
    if (this._selectorMap[sel]) return this._selectorMap[sel];
    return this._find(sel);
  }
  _find(sel) {
    for (const child of this.children) {
      if (child._matches(sel)) return child;
      const nested = child._find(sel);
      if (nested) return nested;
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (node) => node.children.forEach((c) => { if (c._matches(sel)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
}

function makeDocument() {
  return {
    createElement: (tag) => new FakeNode(tag),
    getElementById: () => null,
  };
}

// ---------------------------------------------------------------------------
// Load the widget class (strip the trailing ESM export, eval under injected globals).
// Input is the repo's own source-controlled chatbot.js — never external data.
// ---------------------------------------------------------------------------

function loadChatbotClass() {
  const src = fs
    .readFileSync(path.join(__dirname, "..", "bots", "2.0.6", "chatbot.js"), "utf8")
    .replace(/export default[^\n]*\n?/, "");
  const win = {};
  const doc = makeDocument();
  const fn = new Function("window", "document", "console", "navigator", src);
  fn(win, doc, console, { userAgent: "node" });
  return win.Chatbot; // DecoderChatV2 (extends the V1 base that owns the methods under test)
}

const Chatbot = loadChatbotClass();

// Known Spanish chrome phrases (from the module-level `phrases.es` table — not exported).
const ES = { ph: "Escribe un mensaje...", send: "Enviar", attach: "Adjuntar un archivo", skip: "Omitir", continue: "Continuar" };
const EN = { ph: "Type a message...", send: "Send", attach: "Attach a file" };

// ---------------------------------------------------------------------------
// Test registry + async runner
// ---------------------------------------------------------------------------

const tests = [];
function test(name, fn) { tests.push([name, fn]); }
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Build a fake instance with the composer + header chrome wired into target, so
// refreshChromeStrings() has real nodes to update.
function makeBot(config = {}) {
  const bot = Object.create(Chatbot.prototype);

  const chatBody = new FakeNode("div"); chatBody.className = "chat-body";
  const chatInput = new FakeNode("div"); chatInput.className = "chat-input";
  const inputField = new FakeNode("input"); inputField.className = "";
  const sendButton = new FakeNode("button");
  const attachLabel = new FakeNode("label"); attachLabel.className = "file-upload-label";
  const minimizeBtn = new FakeNode("button"); minimizeBtn.className = "chat-minimize-btn";
  const closeBtn = new FakeNode("button"); closeBtn.className = "chat-close-btn";
  const maximizeBtn = new FakeNode("button"); maximizeBtn.className = "chat-maximize-btn";

  const root = new FakeNode("div");
  root._selectorMap[".chat-body"] = chatBody;
  root._selectorMap[".chat-input"] = chatInput;
  root._selectorMap['.chat-input input[type="text"]'] = inputField;
  root._selectorMap[".chat-input button"] = sendButton;
  root._selectorMap[".file-upload-label"] = attachLabel;
  root._selectorMap[".chat-minimize-btn"] = minimizeBtn;
  root._selectorMap[".chat-close-btn"] = closeBtn;
  root._selectorMap[".chat-maximize-btn"] = maximizeBtn;

  bot.target = root;
  bot.style = {};
  bot.config = config;
  bot.messages = [];
  bot.collectedInputs = {};
  bot.isFirstMessage = false;
  bot.isMaximized = false;
  bot.maxFiles = 10;
  bot.lastMessageCount = 0;
  bot.cookiesEnabled = false;
  bot.sessionId = null;
  bot.contextVariables = null;
  bot.messageCooldown = 3000;
  bot.cooldownTimer = null;
  bot.lastMessageTime = 0;
  bot.showError = () => {};
  bot.triggerLoadingBubble = () => {};
  bot.stripContextFromMessage = (t) => t;
  bot.parseMarkdown = (t) => t;
  bot.setComposerVisible = () => {};

  // Seed locale/phrases the way the constructor does.
  bot.locale = config.lang || "en";
  bot.applyLocale(bot.locale);
  inputField.placeholder = bot.phrases.ph;
  sendButton.title = bot.phrases.send;
  attachLabel.title = `${bot.phrases.attach} (up to ${bot.maxFiles} files)`;

  return { bot, chatBody, inputField, sendButton, attachLabel, minimizeBtn, closeBtn, maximizeBtn };
}

// Recursively find the first rendered node whose textContent matches.
function findByText(node, text) {
  if (node.textContent === text) return node;
  for (const child of node.children) {
    const hit = findByText(child, text);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------------------
// (L1) gate option with locale:"es" switches phrases + rendered chrome
// ---------------------------------------------------------------------------

test('(L1) picking the "Español" gate option switches chrome to the es phrases', () => {
  const { bot, inputField, sendButton, attachLabel } = makeBot({
    lang: "en",
    placeholder: { en: "Type your message here...", es: "Escriba su mensaje aquí..." },
    start_inputs: [
      {
        display: "Language / Idioma",
        required: true,
        type: "buttons",
        prompt: "Preferred Language: ",
        options: [
          { display: "English", value: "English", locale: "en" },
          { display: "Español", value: "Spanish", locale: "es" },
        ],
      },
    ],
  });

  assert.strictEqual(inputField.placeholder, "Type your message here...", "starts English");

  const overlay = bot.renderStartInputs();
  const esButton = findByText(overlay, "Español");
  assert.ok(esButton, "Español option rendered");
  esButton.fire("click");

  assert.strictEqual(bot.locale, "es", "locale switched to es");
  assert.strictEqual(inputField.placeholder, "Escriba su mensaje aquí...", "placeholder -> es (localized override)");
  assert.strictEqual(sendButton.title, ES.send, "send tooltip -> es phrase");
  assert.strictEqual(attachLabel.title, `${ES.attach} (up to 10 files)`, "attach tooltip -> es phrase");
});

// ---------------------------------------------------------------------------
// (L2) the value sent to the agent is unchanged by the locale switch
// ---------------------------------------------------------------------------

test('(L2) collected value stays "Spanish" after switching locale', () => {
  const { bot } = makeBot({
    lang: "en",
    start_inputs: [
      {
        display: "Language / Idioma",
        required: true,
        type: "buttons",
        prompt: "Preferred Language: ",
        options: [
          { display: "English", value: "English", locale: "en" },
          { display: "Español", value: "Spanish", locale: "es" },
        ],
      },
    ],
  });

  const overlay = bot.renderStartInputs();
  findByText(overlay, "Español").fire("click");
  // Continue commits the collected inputs synchronously before the fade-out timer.
  overlay.querySelector(".start-inputs-submit").fire("click");

  assert.strictEqual(bot.locale, "es", "widget locale switched");
  assert.strictEqual(
    bot.collectedInputs["Preferred Language: "],
    "Spanish",
    "agent-facing value is unchanged by the widget-side locale switch"
  );
});

// ---------------------------------------------------------------------------
// (L3) per-locale start_questions labels + placeholder resolve per active locale
// ---------------------------------------------------------------------------

test("(L3) per-locale start_questions render es after Español, en after English", () => {
  const config = {
    lang: "en",
    start_questions_title: { en: "How can I help?", es: "¿Cómo puedo ayudarle?" },
    start_questions: [
      { display: { en: "Upload Documents", es: "Subir documentos" }, prompt: "upload" },
      { display: { en: "Reinstatement", es: "Reinstalación de póliza" }, prompt: "reinstate" },
    ],
  };

  const es = makeBot(config).bot;
  es.locale = "es"; es.applyLocale("es");
  const esOverlay = es.renderStartQuestions();
  const esLabels = esOverlay.querySelectorAll(".start-question-button").map((b) => b.textContent);
  assert.deepStrictEqual(esLabels, ["Subir documentos", "Reinstalación de póliza"], "es labels");
  assert.strictEqual(findByText(esOverlay, "¿Cómo puedo ayudarle?") != null, true, "es title");
  assert.strictEqual(esOverlay.querySelector(".start-questions-skip").textContent, ES.skip, "es Skip");

  const en = makeBot(config).bot;
  const enOverlay = en.renderStartQuestions();
  const enLabels = enOverlay.querySelectorAll(".start-question-button").map((b) => b.textContent);
  assert.deepStrictEqual(enLabels, ["Upload Documents", "Reinstatement"], "en labels");
});

// ---------------------------------------------------------------------------
// (L4) plain-string config is byte-identical at en and es (back-compat)
// ---------------------------------------------------------------------------

test("(L4) plain-string start_questions render identically regardless of locale", () => {
  const config = {
    lang: "en",
    placeholder: "Type your message here...",
    start_questions: [
      { display: "Upload Documents", prompt: "upload" },
      { display: "Reinstatement", prompt: "reinstate" },
    ],
  };

  const en = makeBot(config).bot;
  const enLabels = en.renderStartQuestions().querySelectorAll(".start-question-button").map((b) => b.textContent);

  const es = makeBot(config).bot;
  es.locale = "es"; es.applyLocale("es");
  const esLabels = es.renderStartQuestions().querySelectorAll(".start-question-button").map((b) => b.textContent);

  assert.deepStrictEqual(esLabels, enLabels, "plain-string labels are locale-independent");
  assert.deepStrictEqual(enLabels, ["Upload Documents", "Reinstatement"], "labels verbatim");
  // Plain-string placeholder is used for every locale.
  assert.strictEqual(es.phrases.ph, "Type your message here...", "plain placeholder unchanged after es switch");
});

// ---------------------------------------------------------------------------
// (L5) applyLocale with no placeholder override falls back to the locale phrases.ph
// ---------------------------------------------------------------------------

test("(L5) with no placeholder override, es switch yields the built-in es placeholder", () => {
  const { bot } = makeBot({ lang: "en" });
  assert.strictEqual(bot.phrases.ph, EN.ph, "en default placeholder");
  bot.switchLocale("es");
  assert.strictEqual(bot.phrases.ph, ES.ph, "es built-in placeholder");
  assert.strictEqual(bot.locale, "es");
});

// ---------------------------------------------------------------------------
// (a) minimize -> reopen: replay must not re-POST user messages
// ---------------------------------------------------------------------------

test("(a) reopen replay of stored user+bot messages triggers no send / no fetch", () => {
  const { bot } = makeBot();
  let sendCalls = 0;
  bot.sendUserMessage = () => { sendCalls++; };
  let fetchCalls = 0;
  global.fetch = () => { fetchCalls++; return Promise.resolve({ ok: true, json: async () => ({}) }); };

  bot.messages = [
    { content: "hi there", sender: "user" },
    { content: "Hello! How can I help?", sender: "bot" },
    { content: "another question", sender: "user" },
  ];
  bot.messages.forEach((msg) => bot.addMessage(msg.content, msg.sender, false));

  assert.strictEqual(sendCalls, 0, `expected 0 sends on replay, got ${sendCalls}`);
  assert.strictEqual(fetchCalls, 0, `expected 0 fetches on replay, got ${fetchCalls}`);
});

test("(a2) a genuinely new user message (store=true) DOES send exactly once", () => {
  const { bot } = makeBot();
  let sendCalls = 0;
  bot.sendUserMessage = () => { sendCalls++; };
  bot.addMessage("brand new message", "user");
  assert.strictEqual(sendCalls, 1, `expected 1 send for a new message, got ${sendCalls}`);
});

// ---------------------------------------------------------------------------
// (b) rapid double-send: placeholder swaps to wait-text, then restores config ph
// ---------------------------------------------------------------------------

test("(b) cooldown swaps placeholder to wait-text then restores configured ph", async () => {
  const { bot, inputField } = makeBot({ lang: "en", placeholder: "Type your message here..." });
  inputField.placeholder = bot.phrases.ph;
  bot.lastMessageTime = Date.now() - 2950;

  await bot.sendUserMessage("second message fast");

  assert.ok(
    /Please wait \d+ seconds/.test(inputField.placeholder),
    `expected wait-text during cooldown, got "${inputField.placeholder}"`
  );
  assert.strictEqual(inputField.disabled, true, "input should be disabled during cooldown");

  await delay(250);

  assert.strictEqual(inputField.placeholder, bot.phrases.ph, `expected restore to configured ph, got "${inputField.placeholder}"`);
  assert.strictEqual(inputField.disabled, false, "input should be re-enabled");
});

// ---------------------------------------------------------------------------
// (c) overlapping cooldown triggers still end on the configured placeholder
// ---------------------------------------------------------------------------

test("(c) overlapping cooldown triggers still restore configured ph (no stuck wait-text)", async () => {
  const { bot, inputField } = makeBot({ lang: "en", placeholder: "Type your message here..." });
  inputField.placeholder = bot.phrases.ph;
  bot.lastMessageTime = Date.now() - 2850;

  await bot.sendUserMessage("msg one");
  await delay(30);
  await bot.sendUserMessage("msg two");

  await delay(400);

  assert.strictEqual(inputField.placeholder, bot.phrases.ph, `expected configured ph after overlapping cooldowns, got "${inputField.placeholder}"`);
  assert.strictEqual(inputField.disabled, false, "input should be re-enabled");
});

// ---------------------------------------------------------------------------
// (c2) a cooldown that starts in English restores the es placeholder after switch
// (locale is read live from this.phrases.ph, exactly like the 2.0.5 restore path)
// ---------------------------------------------------------------------------

test("(c2) cooldown restore follows a mid-cooldown locale switch", async () => {
  const { bot, inputField } = makeBot({ lang: "en" });
  inputField.placeholder = bot.phrases.ph;
  bot.lastMessageTime = Date.now() - 2900;

  await bot.sendUserMessage("english cooldown");
  assert.ok(/Please wait/.test(inputField.placeholder), "wait-text shown");

  bot.switchLocale("es"); // input is disabled -> placeholder not overwritten yet
  assert.ok(/Please wait/.test(inputField.placeholder), "still wait-text while disabled");

  await delay(250);
  assert.strictEqual(inputField.placeholder, ES.ph, "restores to the es placeholder after switch");
});

// ---------------------------------------------------------------------------
// (d) close-reset (resetSessionState) still holds
// ---------------------------------------------------------------------------

test("(d) resetSessionState restores per-session fields to defaults", () => {
  const { bot } = makeBot();
  bot.stopPolling = () => {};
  bot.sessionId = "sess-123";
  bot.messages = [{ content: "x", sender: "user" }];
  bot.isFirstMessage = false;
  bot.collectedInputs = { "Policy #": "TR-1" };
  bot.seenMessageIds = new Set(["a", "b"]);
  bot.files = { a: 1 };
  bot.selectedFiles = [1];

  bot.resetSessionState();

  assert.strictEqual(bot.sessionId, null, "sessionId should reset to null");
  assert.deepStrictEqual(bot.messages, [], "messages should reset to []");
  assert.strictEqual(bot.isFirstMessage, true, "isFirstMessage should reset to true");
  assert.deepStrictEqual(bot.collectedInputs, {}, "collectedInputs should reset to {}");
  assert.strictEqual(bot.seenMessageIds.size, 0, "seenMessageIds should reset to empty");
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

(async () => {
  let passed = 0;
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok   - ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL - ${name}\n         ${err.message}`);
    }
  }
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exitCode = failed > 0 ? 1 : 0;
})();
