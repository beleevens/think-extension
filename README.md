# Think Better - AI Notes Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/beleevens/think-extension/releases)

> AI-powered note taking Chrome extension with Venice.ai, Claude, and Ollama (local). No account required - all notes stored locally in your browser.

## What is Think Better?

Think Better is a Chrome extension that brings AI-powered note-taking directly to your browser. Capture notes from any webpage, chat with AI, get automatic summaries and tags, and keep everything organized locally.

---

## Key Features

- **AI Chat** - Real-time streaming chat with Venice.ai, Claude, or Ollama (local)
- **Smart Note Taking** - Save any webpage with one click
- **Auto Summaries** - AI-generated summaries for saved notes
- **Smart Tagging** - Automatic tag generation and organization
- **Custom Plugins** - Extensible plugin system with 4 built-in plugins (Tags, Summary, Insights, ELI5)
- **Template Variables** - Reusable static variables accessible in all plugins
- **Master Prompts** - System-level prompts that customize AI behavior globally
- **Content Cleanup** - Remove ads and noise from saved content using AI
- **Full-Text Search** - Find notes instantly by title, content, or tags
- **Export/Import** - Backup notes as JSON or export as Markdown
- **Dark Mode** - Automatic dark mode with system detection
- **100% Local Storage** - All notes stored in your browser (no cloud sync)
- **Context Menus** - Right-click shortcuts for quick actions

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
2. Find "Think Better - AI Notes"
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

For detailed development instructions, see [README_DEV.md](README_DEV.md)

---

## Setup

You can use **Venice.ai**, **Claude**, or **Ollama** (local) as your AI provider.

### Option 1: Venice.ai (Cloud, Default)

1. Visit [venice.ai](https://venice.ai)
2. Sign up for a free account (no credit card required)
3. Navigate to **API settings** or **Developer settings**
4. Generate a new API key and copy it

### Option 2: Claude (Cloud)

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up and navigate to **API Keys**
3. Create a new API key and copy it

### Option 3: Ollama (Local - No API Key Required)

**Privacy-first option:** Run AI models 100% locally on your computer. No API costs, no cloud, complete privacy.

**Requirements:**
1. [Download and install Ollama](https://ollama.com/download)
2. Ollama must run on port **11434** (default, fixed for security)
3. Install at least one model: `ollama pull llama3.2`

**Setup:**
1. Start Ollama with CORS enabled:
   - **macOS/Linux:** `export OLLAMA_ORIGINS="*" && ollama serve`
   - **Windows:** `$env:OLLAMA_ORIGINS="*"; ollama serve`
2. Configure in extension Settings (detailed instructions provided in-app)

**Why port 11434 only?**
For security, the extension only connects to the default Ollama port (11434). This prevents a compromised extension from accessing other local services on arbitrary ports.

### Configure the Extension

1. Click the Think Better extension icon in your toolbar
2. Click the **Settings** icon (gear icon) in the side panel
3. Choose your AI provider:
   - **Venice.ai** or **Claude** - Paste your API key
   - **Ollama** - No API key needed, just ensure Ollama is running
4. Click **"Save Settings"** or **"Connect"** (for Ollama)
5. Wait for the connection status badge to show **"✅ Connected"**

If you see "❌ Not Connected":
- **Venice/Claude:** Verify your API key is correct and you have internet
- **Ollama:** Check that Ollama is running on port 11434 and CORS is enabled (see setup instructions in Settings)

---

## Features

### AI Chat

Open the side panel and chat with AI in real-time. Responses stream as they're generated. Your conversation history is automatically saved.

- **Add Page Context**: Click "Add Page to Context" to include the current webpage in your conversation
- **Clear Context**: Use the eraser icon to start a fresh conversation
- **Switch Providers**: Change between Venice.ai, Claude, and Ollama (local) in Settings

### Save Notes

Click **"Save as Note"** in the side panel to capture the current webpage. The extension intelligently extracts the main content, title, and metadata.

**What gets saved:**
- Page title and URL
- Main content (converted to clean Markdown)
- Date and time
- AI-generated summary (2-3 sentences)
- Auto-generated tags
- Plugin outputs (Insights, ELI5, and any custom plugins)

### Auto-Tagging & Summaries

When you save a note, the built-in AI plugins automatically:
- Generate a concise 2-3 sentence summary
- Create relevant tags (up to 7 per note)
- Extract key insights and takeaways

These are powered by the built-in plugin system and can be customized or disabled in **Settings** → **Plugins**.

### Custom Plugins System

Think Better has a powerful, extensible plugin system that processes your saved notes with AI. No coding required!

#### Built-in Plugins

The extension includes 4 default plugins that run automatically when you save a note:

1. **AI Tag Generator** 🏷️
   - Generates 7 relevant tags with varied granularity
   - Reuses existing tags when relevant for consistency
   - Output: Header tags

2. **AI Summary Generator** 📝
   - Creates a concise 2-3 sentence summary
   - Provides quick overview of main topic and key points
   - Output: Header text

3. **Insights** 💡
   - Extracts 3-5 key insights and takeaways
   - Highlights actionable points and important conclusions
   - Output: "Insights" tab

4. **ELI5** 👶
   - Explains the article like you're 5 years old
   - Simple language, short sentences, concrete examples
   - Output: "ELI5" tab

All built-in plugins can be customized or disabled in **Settings** → **Plugins**.

#### Template Variables

Create reusable static variables accessible in all plugin prompts:

**How it works:**
1. Go to **Settings** → **Variables** tab
2. Create variables like `{{company}}`, `{{focus-area}}`, or `{{writing-style}}`
3. Use them in any plugin prompt template

**Example:** Define `{{company}}` as "Acme Corp", then use it in prompts:
```
Analyze this article from {{company}}'s perspective...
```

**Built-in variables available to all plugins:**
- `{{title}}` - Note title
- `{{content}}` - Note content (Markdown)
- `{{url}}` - Source URL
- `{{domain}}` - Domain name
- `{{existingTags}}` - All tags across your notes (for consistency)

#### Master Prompts

System-level prompts that get attached to every AI request, allowing you to customize AI behavior globally:

**Use cases:**
- Set AI personality/tone (e.g., "Always be concise and technical")
- Define output formatting rules (e.g., "Use bullet points")
- Add domain expertise (e.g., "You are a product manager")
- Set language preferences

**How to create:**
1. Go to **Settings** → **Master Prompts** tab
2. Click **"+ Add Master Prompt"**
3. Give it a title, description, and prompt text
4. Enable/disable anytime

Master prompts apply to AI chat and all plugin executions.

#### Creating Custom Plugins

Plugins are JSON configuration files—no coding required!

**Getting Started:**
1. Go to **Settings** → **Plugins** tab
2. Click **"+ Manage Custom Plugins"**
3. Import a plugin JSON file or create your own
4. Plugins automatically process notes when you save them

**Plugin Components:**
```json
{
  "id": "my-plugin",
  "name": "My Custom Plugin",
  "prompt": "Analyze this content: {{content}}",
  "display": {
    "position": "tab",
    "format": "text",
    "tabName": "My Analysis"
  }
}
```

**Display Options:**
- **Position:** `header` (shows above content) or `tab` (separate tab)
- **Format:** `text` (paragraphs), `tags` (tag list), or `blocks` (multiple sections)
- **Tab Name:** Custom label when position is `tab`

**Example Plugins:**
See the `example-plugins/` directory for ready-to-use plugins:
- **Action Items** - Extract actionable tasks from articles
- **Related Topics** - Generate topic suggestions
- **Learning Perspectives** - Multiple educational perspectives

**Advanced Features:**
- **Plugin Chaining:** Use `dependsOn` to run plugins sequentially
- **Template Variables:** Access custom and built-in variables
- **Import/Export:** Share plugins with others as JSON files

For full documentation, see [`example-plugins/README.md`](./example-plugins/README.md)

### Content Cleanup

Remove navigation menus, ads, and other noise from saved content using AI. The original content is backed up so you can undo if needed.

### View & Manage Notes

Access your notes by clicking the **Library** icon or right-clicking and selecting **"Open My Notes"**.

**Notes page features:**
- View all saved notes with metadata
- Click any note to read full content
- Search by title, content, URL, or tags
- Filter by clicking tags in the sidebar
- Send notes back to chat as context
- Delete individual notes or bulk delete all
- Open the original webpage

### Export & Import

**Export options:**
- **JSON** - Full backup with all metadata
- **Markdown** - Human-readable format for each note

**Import:**
- Restore notes from previously exported JSON files
- All metadata is preserved on import

### Context Menus

Right-click shortcuts available:
- **"Share with Think Better"** - Send selected text to chat
- **"Share Page with Think Better"** - Add current page to chat context
- **"Open My Notes"** - Open the notes management page

### Dark Mode

The extension automatically detects your system's dark mode preference. You can also manually toggle dark/light mode using the theme switcher in the UI.

---

## Troubleshooting

**Extension Icon Not Showing**
- Go to `chrome://extensions/` and ensure the extension is enabled
- Click the extensions puzzle icon and pin "Think Better"

**AI Chat Not Responding**
- Check that your API key is saved correctly in Settings
- Verify the connection status shows "✅ Connected"
- Try clicking "Test Connection" in Settings
- Check if your AI provider is experiencing downtime

**Notes Not Saving**
- Open Chrome DevTools (F12) and check the Console for errors
- Reload the extension from `chrome://extensions/`
- Check storage usage in Settings (Chrome has storage limits)

**Can't Capture Certain Pages**
- Chrome security prevents capturing `chrome://`, `chrome-extension://`, and Chrome Web Store URLs
- This is a browser restriction, not a bug

**Context Menu Not Appearing**
- Reload the webpage
- Reload the extension from `chrome://extensions/`
- Try restarting Chrome

---

## Privacy & Data

**Stored Locally in Your Browser:**
- All your notes (title, content, URL, tags, date, summaries)
- Your API keys (encrypted by Chrome)
- Extension settings and preferences
- Chat history

**Sent to AI Providers:**
- **Venice.ai or Claude (Cloud):**
  - Note content when generating summaries, tags, or ELI blocks
  - Chat messages when you use the AI chat
  - Page content when using auto-tagging or content cleanup
- **Ollama (Local):**
  - All processing happens on your computer (localhost:11434)
  - Nothing sent to external servers - 100% private

**What We DON'T Collect:**
- No analytics or tracking
- No telemetry data
- No server-side storage
- No user accounts or authentication

**Your data never leaves your computer except when you explicitly use cloud AI features.** Cloud AI requests go directly from your browser to Venice.ai or Claude - never through our servers. With Ollama, everything stays on your computer.

---

## Technical Details

- **Version:** 1.0.0
- **Built with:** React, TypeScript, Vite
- **AI Providers:**
  - Venice.ai (llama-3.3-70b) - Cloud
  - Claude (claude-3-5-sonnet) - Cloud
  - Ollama (llama3.2, mistral, etc.) - Local
- **Storage:** Chrome Local Storage API
- **License:** MIT

---

**Questions or Issues?** Open an issue on GitHub or contact the development team.

**Developers:** See [README_DEV.md](README_DEV.md) for build instructions and development setup.
