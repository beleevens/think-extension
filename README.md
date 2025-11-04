# Think - AI Memories Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/beleevens/think-extension/releases)

> AI-powered memory taking Chrome extension with Venice.ai, Claude, and Ollama (local). No account required - all memories stored locally in your browser.

## What is Think Extension?

Think Extension is a Chrome extension that brings AI-powered memory-taking directly to your browser. Capture memories from any webpage, chat with AI, get automatic summaries and tags, and keep everything organized locally.

## Key Features

- **AI Chat** - Real-time streaming chat with Venice.ai, Claude, or Ollama (local)
- **Smart Memory Taking** - Save any webpage with automatic summaries and smart tagging
- **Custom Plugins** - Extensible plugin system for processing memories with AI
- **100% Local Storage** - All memories stored in your browser (no cloud sync)
- **Export/Import** - Backup memories as JSON or export as Markdown

---

## Installation

### Option 1: Install from GitHub Releases (Recommended)

**For users who just want to install and use the extension:**

1. Go to the [Releases page](https://github.com/beleevens/think-extension/releases)
2. Download the latest `think-better-extension-vX.X.X.zip` file
3. Extract the ZIP file to a folder on your computer
4. Open Chrome and navigate to: `chrome://extensions/`
5. Enable **"Developer mode"** using the toggle in the top-right corner
6. Click **"Load unpacked"** button
7. Navigate to and select the **`dist`** folder inside the extracted folder
8. The extension should now appear in your extensions list

**Pin the Extension (Optional):**
1. Click the extensions icon (puzzle piece) in your Chrome toolbar
2. Find "Think - AI Memories"
3. Click the pin icon to keep it visible in your toolbar

### Option 2: Build from Source

**For developers who want to modify or contribute:**

1. Clone the repository:
   ```bash
   git clone https://github.com/beleevens/think-extension.git
   cd think-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable **"Developer mode"**
   - Click **"Load unpacked"**
   - Select the `dist` folder from the project directory

---

**Questions or Issues?** Open an issue on GitHub or contact the development team.
