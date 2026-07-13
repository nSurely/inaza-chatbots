// Regression tests for bots/2.0.5 — zero-dependency (no jsdom): a minimal DOM
// shim is enough because the methods under test only touch a handful of nodes.
//
// Run: node test/widget-2.0.5.test.js
//
// Covers:
//   (a) minimize -> reopen replays stored messages WITHOUT re-POSTing user turns
//   (b) rapid double-send swaps the placeholder to wait-text then restores the
//       ORIGINAL configured placeholder after the cooldown window
//   (c) overlapping cooldown triggers still end on the configured placeholder
//       (the pre-fix snapshot bug would leave wait-text stuck)
//   (d) the close-reset behaviour (resetSessionState) from 1.18.1 / 2.0.1 still holds

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
    this._attrs = {};
    this._selectorMap = {}; // selector -> node, populated by test setup
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
  querySelector(sel) { return this._selectorMap[sel] || null; }
  querySelectorAll() { return []; }
  addEventListener() {}
}

function makeDocument() {
  return {
    createElement: (tag) => new FakeNode(tag),
    getElementById: () => null,
  };
}

// ---------------------------------------------------------------------------
// Load the widget class. The source is a trusted, source-controlled file in
// this repo; we strip its trailing ESM `export default` line and evaluate it
// with injected globals so it can run under plain CommonJS `node` (no jsdom,
// no package.json "type" change). Input is the repo's own chatbot.js — never
// external data.
// ---------------------------------------------------------------------------

function loadChatbotClass() {
  const src = fs
    .readFileSync(path.join(__dirname, "..", "bots", "2.0.5", "chatbot.js"), "utf8")
    .replace(/export default[^\n]*\n?/, "");
  const win = {};
  const doc = makeDocument();
  const fn = new Function("window", "document", "console", "navigator", src);
  fn(win, doc, console, {});
  return win.Chatbot; // DecoderChatV2 (extends the V1 base that owns the methods under test)
}

const Chatbot = loadChatbotClass();

// ---------------------------------------------------------------------------
// Test registry + async runner
// ---------------------------------------------------------------------------

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

// Build a fake instance with just the fields the methods under test read.
function makeBot() {
  const bot = Object.create(Chatbot.prototype);

  const chatBody = new FakeNode("div");
  const inputField = new FakeNode("input");
  const sendButton = new FakeNode("button");

  const root = new FakeNode("div");
  root._selectorMap[".chat-body"] = chatBody;
  root._selectorMap['.chat-input input[type="text"]'] = inputField;
  root._selectorMap[".chat-input button"] = sendButton;

  bot.target = root;
  bot.style = {};
  bot.config = {};
  bot.phrases = { ph: "Type a message..." };
  bot.messages = [];
  bot.collectedInputs = {};
  bot.isFirstMessage = false;
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

  return { bot, chatBody, inputField, sendButton };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // This is the reopen replay loop from renderChatWindow():
  bot.messages.forEach((msg) => bot.addMessage(msg.content, msg.sender, false));

  assert.strictEqual(sendCalls, 0, `expected 0 sends on replay, got ${sendCalls}`);
  assert.strictEqual(fetchCalls, 0, `expected 0 fetches on replay, got ${fetchCalls}`);
});

test("(a2) a genuinely new user message (store=true) DOES send exactly once", () => {
  const { bot } = makeBot();
  let sendCalls = 0;
  bot.sendUserMessage = () => { sendCalls++; };

  bot.addMessage("brand new message", "user"); // store defaults to true

  assert.strictEqual(sendCalls, 1, `expected 1 send for a new message, got ${sendCalls}`);
});

// ---------------------------------------------------------------------------
// (b) rapid double-send: placeholder swaps to wait-text, then restores config ph
// ---------------------------------------------------------------------------

test("(b) cooldown swaps placeholder to wait-text then restores configured ph", async () => {
  const { bot, inputField } = makeBot();
  inputField.placeholder = bot.phrases.ph;

  // Force a short remaining window: last message 2950ms ago, 3000ms cooldown -> ~50ms.
  bot.lastMessageTime = Date.now() - 2950;

  await bot.sendUserMessage("second message fast");

  assert.ok(
    /Please wait \d+ seconds/.test(inputField.placeholder),
    `expected wait-text during cooldown, got "${inputField.placeholder}"`
  );
  assert.strictEqual(inputField.disabled, true, "input should be disabled during cooldown");

  await delay(250);

  assert.strictEqual(
    inputField.placeholder,
    bot.phrases.ph,
    `expected restore to configured ph, got "${inputField.placeholder}"`
  );
  assert.strictEqual(inputField.disabled, false, "input should be re-enabled");
});

// ---------------------------------------------------------------------------
// (c) overlapping cooldown triggers still end on the configured placeholder
// ---------------------------------------------------------------------------

test("(c) overlapping cooldown triggers still restore configured ph (no stuck wait-text)", async () => {
  const { bot, inputField } = makeBot();
  inputField.placeholder = bot.phrases.ph;
  bot.lastMessageTime = Date.now() - 2850; // ~150ms remaining

  await bot.sendUserMessage("msg one"); // fires cooldown: wait-text + timer #1
  await delay(30);
  // Second attempt WHILE wait-text is showing. Pre-fix this snapshotted the
  // already-"Please wait..." placeholder and restored it back permanently.
  await bot.sendUserMessage("msg two");

  await delay(400);

  assert.strictEqual(
    inputField.placeholder,
    bot.phrases.ph,
    `expected configured ph after overlapping cooldowns, got "${inputField.placeholder}"`
  );
  assert.strictEqual(inputField.disabled, false, "input should be re-enabled");
});

// ---------------------------------------------------------------------------
// (d) close-reset (resetSessionState) from 1.18.1 / 2.0.1 still holds
// ---------------------------------------------------------------------------

test("(d) resetSessionState restores per-session fields to defaults", () => {
  const { bot } = makeBot();
  bot.sessionId = "sess-123";
  bot.messages = [{ content: "x", sender: "user" }];
  bot.isFirstMessage = false;
  bot.collectedInputs = { "Policy #": "TR-1" };
  bot.seenMessageIds = new Set(["a", "b"]);

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
