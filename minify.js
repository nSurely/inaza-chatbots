// checks for all chatbot.js files in the /bots directory and minifies them
// into chatbot.min.js files in the same directory, if not already present
// It also finds the latest version of chatbot.js from the /bots directory
// and copies the minified version to the root directory and to the /bots/latest directory

const fs = require("fs");
const path = require("path");
const UglifyJS = require("uglify-js");
const fse = require("fs-extra");

const botsDir = path.join(__dirname, "bots");
const rootDir = __dirname;
const latestDir = path.join(botsDir, "latest");
const minifiedFileName = "chatbot.min.js";

// Ensure latest directory exists
if (!fs.existsSync(latestDir)) {
  fs.mkdirSync(latestDir);
}

// lists all subdirectories in the /bots directory
// orders them by version number (assuming version numbers are in the format x.y.z)
// returns an array of directory names
// the last one is the latest version
function getBotDirectories() {
  const dirs = fs.readdirSync(botsDir).filter((file) => {
    return fs.lstatSync(path.join(botsDir, file)).isDirectory();
  });

  // Sort directories by version number
  dirs.sort((a, b) => {
    const versionA = a.split("-").pop();
    const versionB = b.split("-").pop();
    return versionA.localeCompare(versionB, undefined, { numeric: true });
  });

  return dirs;
}

function minifyChatbotJS(dir) {
  const chatbotPath = path.join(botsDir, dir, "chatbot.js");
  const minifiedPath = path.join(botsDir, dir, minifiedFileName);
  if (fs.existsSync(chatbotPath)) {
    if (!fs.existsSync(minifiedPath)) {
      const code = fs.readFileSync(chatbotPath, "utf-8");
      const result = UglifyJS.minify(code);
      if (result.error) {
        console.error(`Error minifying ${chatbotPath}: ${result.error}`);
      } else {
        fs.writeFileSync(minifiedPath, result.code);
        console.log(`Minified ${chatbotPath} to ${minifiedPath}`);
      }
    }
  } else {
    console.warn(`No chatbot.js found in ${dir}`);
  }
}

function copyToLatestAndRoot(dir) {
  const minifiedPath = path.join(botsDir, dir, minifiedFileName);
  const latestPath = path.join(latestDir, minifiedFileName);
  const rootPath = path.join(rootDir, minifiedFileName);
  if (fs.existsSync(minifiedPath)) {
    fse.copySync(minifiedPath, latestPath);
    fse.copySync(minifiedPath, rootPath);
    console.log(`Copied ${minifiedPath} to ${latestPath} and ${rootPath}`);
  } else {
    console.warn(`No minified file found in ${dir} to copy`);
  }
}

const botDirs = getBotDirectories();
botDirs.forEach((dir) => {
  minifyChatbotJS(dir);
  copyToLatestAndRoot(dir);
});
