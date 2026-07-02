// Minifies every bots/<version>/chatbot.js into a chatbot.min.js alongside it,
// then copies ONE designated stable version to the root chatbot.min.js and to
// bots/latest/.
//
// Two deliberate choices (see README):
//  1. The root/latest bundle is the version named by ROOT_VERSION below — NOT the
//     numerically-highest folder. This stops a new major (e.g. a 2.x) from silently
//     becoming the default @main bundle for every unpinned client. Clients that want
//     a specific major pin to bots/<version>/chatbot.min.js.
//  2. A version is (re)minified when its .min is missing or older than its chatbot.js, so an
//     edit to an existing chatbot.js can never silently ship a stale .min — while untouched
//     released versions are left byte-for-byte as-is (no churn from uglify-version drift).
//
// Override the root at build time with: ROOT_VERSION=2.0.1 node minify.js

const fs = require("fs");
const path = require("path");
const UglifyJS = require("uglify-js");
const fse = require("fs-extra");

const botsDir = path.join(__dirname, "bots");
const rootDir = __dirname;
const latestDir = path.join(botsDir, "latest");
const minifiedFileName = "chatbot.min.js";

// The stable version served at the root / bots/latest. V1 is frozen at 1.18.1;
// V2 (2.0.x) is production but consumed via explicit per-client version pins for now.
const ROOT_VERSION = process.env.ROOT_VERSION || "1.18.1";

if (!fs.existsSync(latestDir)) {
  fs.mkdirSync(latestDir);
}

function getBotDirectories() {
  return fs.readdirSync(botsDir).filter((file) => {
    const isDir = fs.lstatSync(path.join(botsDir, file)).isDirectory();
    return isDir && file !== "latest";
  });
}

// (Re)minify a version's chatbot.js when its .min is missing or older than the source.
// Untouched released versions are left exactly as committed.
function minifyChatbotJS(dir) {
  const chatbotPath = path.join(botsDir, dir, "chatbot.js");
  const minifiedPath = path.join(botsDir, dir, minifiedFileName);
  if (!fs.existsSync(chatbotPath)) {
    console.warn(`No chatbot.js found in ${dir}`);
    return;
  }
  if (fs.existsSync(minifiedPath) &&
      fs.statSync(minifiedPath).mtimeMs >= fs.statSync(chatbotPath).mtimeMs) {
    console.log(`Up to date: ${dir}/${minifiedFileName}`);
    return;
  }
  const result = UglifyJS.minify(fs.readFileSync(chatbotPath, "utf-8"));
  if (result.error) {
    console.error(`Error minifying ${chatbotPath}: ${result.error}`);
    return;
  }
  fs.writeFileSync(minifiedPath, result.code);
  console.log(`Minified ${dir}/chatbot.js -> ${dir}/${minifiedFileName}`);
}

function copyToLatestAndRoot(version) {
  const minifiedPath = path.join(botsDir, version, minifiedFileName);
  if (!fs.existsSync(minifiedPath)) {
    console.error(`ROOT_VERSION ${version} has no ${minifiedFileName} — cannot set root/latest.`);
    process.exit(1);
  }
  fse.copySync(minifiedPath, path.join(latestDir, minifiedFileName), { overwrite: true });
  fse.copySync(minifiedPath, path.join(rootDir, minifiedFileName), { overwrite: true });
  console.log(`Root + bots/latest set to ${version}`);
}

const botDirs = getBotDirectories();
botDirs.forEach(minifyChatbotJS);

if (botDirs.includes(ROOT_VERSION)) {
  copyToLatestAndRoot(ROOT_VERSION);
} else {
  console.error(`ROOT_VERSION ${ROOT_VERSION} is not a bots/ folder; root/latest left unchanged.`);
  process.exit(1);
}
