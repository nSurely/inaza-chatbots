# inaza-chatbots

Public repo for the client-side chat widget, served to client sites via jsDelivr.

## Versions

- **V2 (`bots/2.0.x`) is the production line.** It is the V1 base plus SSE real-time delivery,
  proactive messages, multimodal (image) rendering, and sub-agent task indicators. All new work
  lands here.
- **V1 (`bots/1.x`) is frozen at `1.18.1`** (final: includes the close/reopen session-state reset).
  No new features; security/critical fixes only.

## Embedding

Pin to an explicit version — do not rely on the moving root:

```html
<script src="https://cdn.jsdelivr.net/gh/nSurely/inaza-chatbots@main/bots/2.0.1/chatbot.min.js" type="module"></script>
<script type="module">
  import Chatbot from "https://cdn.jsdelivr.net/gh/nSurely/inaza-chatbots@main/bots/2.0.1/chatbot.min.js";
  // new Chatbot({ id, assistant, server, authToken, config })
</script>
```

The root `chatbot.min.js` (what `@main/chatbot.min.js` resolves to) is the **frozen V1 `1.18.1`**,
kept for existing unpinned embeds. It will be moved to V2 only as a deliberate, separately-validated
step — not automatically.

## Building

```bash
node minify.js
```

- (Re)minifies each `bots/<version>/chatbot.js` whose `.min` is missing or older than the source
  (untouched released versions are left as-is).
- Copies **`ROOT_VERSION`** (default `1.18.1`) to the root `chatbot.min.js` and `bots/latest/` —
  the root is an explicit choice, **not** the numerically-highest folder, so a new major can't
  silently become every unpinned client's bundle. Override with `ROOT_VERSION=2.0.1 node minify.js`.
