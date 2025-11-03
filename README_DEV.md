# Think Better - Developer Documentation

This guide is for developers who want to build, modify, or contribute to the Think Better extension.

**End users:** See [README.md](README.md) for installation and usage instructions.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Packaging for Distribution](#packaging-for-distribution)
- [Architecture](#architecture)
- [Adding Features](#adding-features)

---

## Project Overview

Think Better is a Chrome Manifest V3 extension built with React, TypeScript, and Vite. It provides AI-powered note-taking with local storage, supporting both Venice.ai and Claude as AI providers.

**Key Technologies:**
- **Frontend:** React 18, TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3, Framer Motion
- **Chrome APIs:** Manifest V3 (service worker, side panel, storage)
- **AI Providers:** Venice.ai (llama-3.3-70b), Claude (claude-3-5-sonnet)

---

## Tech Stack

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0"
}
```

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animations and transitions
- **Lucide React** - Icon library
- **clsx + tailwind-merge** - Conditional class names

### Content Processing
- **Turndown** - HTML to Markdown conversion
- **Markdown-it** - Markdown rendering
- **JSZip** - Export/import functionality

---

## Project Structure

```
extension-cloud/
├── src/
│   ├── background/           # Service worker (background script)
│   │   └── index.ts
│   ├── sidepanel/            # Side panel (main chat UI)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── settings/             # Settings page (options)
│   │   ├── settings.html
│   │   ├── settings.tsx
│   │   └── App.tsx
│   ├── notes/                # Notes management page
│   │   ├── notes.html
│   │   ├── notes.tsx
│   │   └── App.tsx
│   ├── components/           # Reusable React components
│   │   ├── ChatPanel.tsx
│   │   ├── NotesPanel.tsx
│   │   ├── NoteDetailViewer.tsx
│   │   ├── NotesSidebar.tsx
│   │   ├── SaveNoteDialog.tsx
│   │   └── ThemeToggle.tsx
│   ├── lib/                  # Business logic & utilities
│   │   ├── venice-client.ts      # Venice.ai API client
│   │   ├── claude-client.ts      # Claude API client
│   │   ├── page-capture.ts       # Content extraction
│   │   ├── local-notes.ts        # Note storage/management
│   │   ├── tag-generator.ts      # Auto-tagging
│   │   ├── eli-processor.ts      # ELI blocks
│   │   ├── content-cleanup.ts    # Content cleanup
│   │   ├── theme.ts              # Dark mode
│   │   └── types.ts              # TypeScript interfaces
│   └── hooks/                # Custom React hooks
├── public/
│   └── icons/                # Extension icons (16, 32, 48, 128)
├── dist/                     # Build output (created by Vite)
├── scripts/
│   └── package.js            # Packaging script
├── manifest.json             # Chrome extension manifest
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # npm scripts and dependencies
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Chrome** browser (latest version)
- **API Key** from Venice.ai or Claude (for testing AI features)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

---

## Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Type checking (no emit)
npm run type-check

# Preview production build
npm run preview

# Package for distribution (builds + creates ZIP)
npm run package
```

### Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```
   This starts Vite in development mode with hot module replacement (HMR).

2. **Load extension in Chrome**
   - Load the `dist/` folder as unpacked extension
   - Vite will rebuild on file changes

3. **Reload extension after changes**
   - **Content changes (UI):** Refresh the extension page (side panel, settings, notes)
   - **Background script changes:** Go to `chrome://extensions/` and click the reload icon
   - **Manifest changes:** Reload the extension from `chrome://extensions/`

### Development Tips

- **Chrome DevTools:** Press F12 in any extension page (side panel, settings, notes) to debug
- **Background Service Worker:** Inspect via `chrome://extensions/` → "Inspect views: service worker"
- **Console Logs:** Use `console.log()` in background script - appears in service worker inspector
- **Storage Inspection:** View `chrome.storage.local` via DevTools → Application → Storage

---

## Building for Production

### Build Process

The build process uses Vite and TypeScript:

```bash
npm run build
```

**What happens:**
1. TypeScript compilation (`tsc`)
2. Vite bundles and optimizes:
   - `src/sidepanel/index.html` → `dist/sidepanel/index.html` + JS/CSS
   - `src/settings/settings.html` → `dist/settings/settings.html` + JS/CSS
   - `src/notes/notes.html` → `dist/notes/notes.html` + JS/CSS
   - `src/background/index.ts` → `dist/background.js`
3. Static assets copied:
   - `manifest.json` → `dist/manifest.json`
   - `public/icons/*` → `dist/icons/`
   - `README.md` → `dist/README.md`

### Build Configuration

**Vite Config:** `vite.config.ts`

```typescript
build: {
  outDir: 'dist',
  rollupOptions: {
    input: {
      'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
      'settings/settings': resolve(__dirname, 'src/settings/settings.html'),
      'notes/notes': resolve(__dirname, 'src/notes/notes.html'),
      background: resolve(__dirname, 'src/background/index.ts'),
    }
  }
}
```

### Output Structure

```
dist/
├── manifest.json
├── background.js              # Service worker
├── sidepanel/
│   ├── index.html
│   ├── index.js
│   └── index.css
├── settings/
│   ├── settings.html
│   ├── settings.js
│   └── settings.css
├── notes/
│   ├── notes.html
│   ├── notes.js
│   └── notes.css
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── [chunked JS modules]
```

---

## Packaging for Distribution

### Create Distribution ZIP

```bash
npm run package
```

**What it does:**
1. Runs `npm run build` to create production build
2. Creates `packages/` directory
3. Zips the `dist/` folder contents
4. Outputs: `packages/think-better-extension-v1.0.0.zip`

**Output:**
```
packages/
└── think-better-extension-v1.0.0.zip
```

### Distribution Options

1. **Chrome Web Store**
   - Upload the ZIP file to Chrome Developer Dashboard
   - See [CHROME_WEBSTORE_GUIDE.md](CHROME_WEBSTORE_GUIDE.md) for publishing steps

2. **Manual Distribution**
   - Share the ZIP file with users
   - Users extract and load the `dist/` folder

---

## Architecture

### Chrome Extension Architecture (Manifest V3)

```
┌─────────────────────────────────────────┐
│  Background Service Worker              │
│  (background.js)                        │
│  - Handles context menus                │
│  - Manages extension lifecycle          │
│  - Coordinates between pages            │
└─────────────────────────────────────────┘
           ↕ chrome.runtime
┌─────────────────────────────────────────┐
│  Side Panel (React SPA)                 │
│  - AI chat interface                    │
│  - Page capture controls                │
│  - Save note dialog                     │
└─────────────────────────────────────────┘
           ↕ chrome.storage.local
┌─────────────────────────────────────────┐
│  Notes Page (React SPA)                 │
│  - Notes list & search                  │
│  - Note detail viewer                   │
│  - Export/import controls               │
└─────────────────────────────────────────┘
           ↕ chrome.storage.local
┌─────────────────────────────────────────┐
│  Settings Page (React SPA)              │
│  - API key management                   │
│  - AI provider selection                │
│  - ELI blocks configuration             │
└─────────────────────────────────────────┘
```

### Data Flow

1. **User saves note:**
   ```
   Side Panel → page-capture.ts → local-notes.ts
             → venice-client.ts/claude-client.ts (AI summaries)
             → chrome.storage.local
   ```

2. **User chats with AI:**
   ```
   ChatPanel.tsx → venice-client.ts/claude-client.ts
               → Streaming response → UI update
   ```

3. **Background script:**
   ```
   Context menu click → background/index.ts
                     → Inject content script or open side panel
   ```

### Storage Schema

**chrome.storage.local keys:**
```typescript
{
  // Notes
  notes: Record<string, LocalNote>           // UUID → note object
  notesIndex: { lastModified, count }        // Index metadata

  // AI Settings
  activeProvider: 'venice' | 'claude' | 'ollama'  // Current AI provider
  veniceApiKey: string                       // Venice.ai key
  claudeApiKey: string                       // Claude key
  veniceModel: string                        // Venice model (default: llama-3.3-70b)
  claudeModel: string                        // Claude model (default: claude-3-5-sonnet-20241022)
  ollamaModel: string                        // Ollama model (default: llama3.2)
  ollamaUrl: string                          // Ollama server URL (default: http://localhost:11434)

  // Plugin System
  plugins: ConfigPlugin[]                    // Installed plugins (built-in + custom)
  pluginStates: Record<string, {             // Plugin enable/disable states
    enabled: boolean;
    config: any;
  }>
  staticVariables: StaticVariable[]          // User-defined template variables
  masterPrompts: MasterPrompt[]              // System-level prompts

  // Features
  autoTaggingEnabled: boolean                // Auto-tagging toggle (deprecated, use pluginStates)
  theme: 'light' | 'dark'                    // Theme preference

  // Conversation History
  conversationHistory: Message[]             // Chat message history
}
```

### TypeScript Interfaces

**Core Types** (`src/lib/types.ts`):
```typescript
interface LocalNote {
  id: string;                    // UUID
  title: string;
  content: string;               // Markdown
  url: string;
  domain: string;
  timestamp: number;
  tags: string[];
  summary?: string;              // AI-generated
  ogImage?: string;              // Open Graph image URL
  plugins?: Record<string, any>; // Plugin outputs by plugin ID
  originalContent?: string;      // Backup before cleanup
}
```

**Plugin System Types** (`src/plugins/plugin-types.ts`):
```typescript
interface StaticVariable {
  id: string;                    // Variable identifier (used as {{id}})
  title: string;                 // Display label
  content: string;               // The static text content
}

interface MasterPrompt {
  id: string;                    // Unique identifier
  title: string;                 // Display name
  description: string;           // Explanation
  prompt: string;                // The system prompt text
  enabled: boolean;              // Whether active
}

interface PluginContext {
  // Note data
  title: string;
  content: string;
  url: string;
  domain: string;
  ogImage?: string;

  // App-level context
  existingTags: string[];        // All tags across notes
  noteCount: number;             // Total notes

  // Plugin outputs (for chaining)
  plugins: Record<string, any>;  // Previous plugin results
}

interface DisplayRule {
  dataSource: string;            // Plugin ID providing data
  position: 'header' | 'tab';    // Display location
  format: 'text' | 'tags' | 'blocks';  // Output format
  tabName?: string;              // Tab label (if position='tab')
}

interface ConfigPlugin {
  type: 'config';

  // Metadata
  id: string;
  name: string;
  description: string;
  icon: string;

  // Behavior
  prompt: string;                // Template with {{variables}}
  outputType: 'text' | 'tags' | 'blocks';

  // Display configuration
  display: DisplayRule;

  // Optional settings
  maxItems?: number;             // For tags (default: 7)
  blocks?: Array<{               // For blocks type
    id?: string;
    name: string;
    prompt: string;
  }>;

  // Dependencies
  dependsOn?: string[];          // Plugin IDs to run first
}
```

---

## Plugin System Architecture

### Overview

The extension uses a configuration-based plugin system (not code-based). Plugins are JSON files that define AI prompts to process notes. No coding required.

**Key Components:**
- `src/plugins/plugin-types.ts` - TypeScript interfaces
- `src/plugins/plugin-executor.ts` - Executes plugin prompts via AI
- `src/plugins/plugin-manager.ts` - Manages plugin lifecycle
- `src/plugins/registry.ts` - Plugin registration and storage
- `src/plugins/default-plugins.ts` - Built-in plugin definitions
- `src/components/PluginManager.tsx` - UI for managing plugins
- `src/settings/VariablesSection.tsx` - UI for managing variables
- `src/settings/MasterPromptsSection.tsx` - UI for managing master prompts
- `example-plugins/` - Example plugin configurations

### Default Built-in Plugins

Four plugins ship with the extension (`src/plugins/default-plugins.ts`):

1. **tag-generator** - AI Tag Generator
   - Generates 7 tags with varied granularity
   - Reuses existing tags for consistency
   - Display: header, format: tags

2. **summary-generator** - AI Summary Generator
   - Creates 2-3 sentence summaries
   - Display: header, format: text

3. **insights** - Insights
   - Extracts 3-5 key insights as bullet points
   - Display: tab (Insights), format: text

4. **eli5** - ELI5
   - Explains content simply (like for a 5-year-old)
   - Display: tab (ELI5), format: text

All default plugins are enabled on first install and can be customized or disabled by users.

### Variables System

Static variables allow users to define reusable template values accessible in all plugin prompts.

**Storage:** `chrome.storage.local.staticVariables` (array of `StaticVariable`)

**Usage in prompts:**
```typescript
// User defines: { id: 'company', title: 'Company Name', content: 'Acme Corp' }
// Plugin prompt: "Analyze from {{company}}'s perspective..."
// Resolved: "Analyze from Acme Corp's perspective..."
```

**Built-in variables always available:**
- `{{title}}` - Note title
- `{{content}}` - Note content (Markdown)
- `{{url}}` - Source URL
- `{{domain}}` - Domain name
- `{{existingTags}}` - Comma-separated list of all tags
- `{{noteCount}}` - Total number of notes

**Template resolution order:**
1. Check static variables (user-defined)
2. Check built-in variables (note context)
3. Check plugin context (previous plugin outputs)

### Master Prompts System

Master prompts are system-level instructions attached to every AI request, allowing global customization of AI behavior.

**Storage:** `chrome.storage.local.masterPrompts` (array of `MasterPrompt`)

**How it works:**
1. User creates master prompts in Settings (e.g., "Always be concise", "Use technical language")
2. When any AI request is made (chat or plugin), enabled master prompts are prepended
3. Applies to both chat messages and plugin executions

**Use cases:**
- Set AI personality/tone
- Define output formatting rules
- Add domain expertise context
- Set language preferences

**Example:**
```typescript
{
  id: 'concise-technical',
  title: 'Concise Technical Writing',
  description: 'Forces concise, technical responses',
  prompt: 'Always respond concisely using technical terminology. Use bullet points when appropriate.',
  enabled: true
}
```

### Plugin Execution Flow

When a user saves a note, plugins execute in this sequence:

```
1. Page Capture
   ↓
2. Build Plugin Context
   - Note data (title, content, url, domain)
   - existingTags (all tags from all notes)
   - noteCount
   ↓
3. Load Enabled Plugins
   - Filter by pluginStates[id].enabled === true
   - Sort by dependencies (dependsOn)
   ↓
4. Execute Plugins Sequentially
   For each plugin:
   a. Resolve template variables in prompt
      - Replace {{variable}} with values
      - Include static variables
      - Include built-in variables
      - Include previous plugin outputs

   b. Attach master prompts (if any enabled)

   c. Send to AI provider (Venice/Claude/Ollama)

   d. Store result in context.plugins[pluginId]
      - Makes output available to dependent plugins
   ↓
5. Store Results
   - note.plugins = { 'tag-generator': [...], 'summary': "...", ... }
   - note.tags = plugin output from tag-generator
   - note.summary = plugin output from summary-generator
   ↓
6. Save Note to Storage
```

### Plugin Chaining & Dependencies

Plugins can depend on other plugins using the `dependsOn` field:

```typescript
{
  id: 'related-articles',
  name: 'Related Articles',
  dependsOn: ['tag-generator'],  // Waits for tags to be generated
  prompt: `Based on these tags ({{plugins.tag-generator}}), suggest related topics...`
}
```

**Execution guarantees:**
- Dependencies execute before dependent plugins
- Dependency outputs available via `{{plugins.pluginId}}`
- Circular dependencies are prevented

### Display System

Plugins define where and how their output is displayed:

**Display Rules:**
```typescript
{
  dataSource: 'plugin-id',       // Which plugin provides the data
  position: 'header' | 'tab',    // Where to show it
  format: 'text' | 'tags' | 'blocks',  // How to format it
  tabName?: 'Custom Tab Name'    // Tab label (if position='tab')
}
```

**Rendering:**
- **header + text** → Displayed as paragraph above note content
- **header + tags** → Displayed as tag chips above note content
- **tab + text** → Separate tab with text content
- **tab + blocks** → Separate tab with multiple sections

### Creating Custom Plugins

Users create plugins via the Settings UI or by importing JSON files:

**Minimal plugin:**
```json
{
  "type": "config",
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "What this plugin does",
  "icon": "🔧",
  "prompt": "Process this content: {{content}}",
  "outputType": "text",
  "display": {
    "dataSource": "my-plugin",
    "position": "tab",
    "format": "text",
    "tabName": "My Analysis"
  }
}
```

**With variables and dependencies:**
```json
{
  "id": "custom-analysis",
  "prompt": "Analyze from {{company}}'s perspective using tags: {{plugins.tag-generator}}",
  "dependsOn": ["tag-generator"],
  "display": { "position": "tab", "format": "text", "tabName": "Analysis" }
}
```

For user documentation, see [`example-plugins/README.md`](./example-plugins/README.md)

---

## Adding Features

### Add a New AI Feature

1. **Create API client method** (e.g., in `venice-client.ts`):
   ```typescript
   export async function generateFeature(content: string): Promise<string> {
     // Implementation
   }
   ```

2. **Add UI component** (e.g., `NewFeature.tsx`):
   ```typescript
   export function NewFeature() {
     const [result, setResult] = useState('');
     // Component logic
   }
   ```

3. **Integrate in main page** (e.g., `settings/App.tsx`):
   ```typescript
   import { NewFeature } from '@/components/NewFeature';
   ```

### Add a New Storage Field

1. **Update types** in `src/lib/types.ts`:
   ```typescript
   interface LocalNote {
     // ... existing fields
     newField?: string;
   }
   ```

2. **Update storage logic** in `src/lib/local-notes.ts`:
   ```typescript
   export async function saveNote(note: LocalNote) {
     // Handle new field
   }
   ```

3. **Update UI** to display/edit the new field

### Add a New Extension Page

1. **Create HTML file** (e.g., `src/newpage/newpage.html`)
2. **Create React entry** (e.g., `src/newpage/newpage.tsx`)
3. **Update `vite.config.ts`**:
   ```typescript
   input: {
     'newpage/newpage': resolve(__dirname, 'src/newpage/newpage.html'),
   }
   ```
4. **Add to manifest.json** if needed (e.g., as action popup or options page)

### Add a Context Menu Item

**In `src/background/index.ts`:**
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'myNewAction',
    title: 'New Action',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'myNewAction') {
    // Handle action
  }
});
```

### Add a Custom Plugin (Programmatically)

To add a new built-in plugin, edit `src/plugins/default-plugins.ts`:

```typescript
export const DEFAULT_PLUGINS: ConfigPlugin[] = [
  // ... existing plugins
  {
    type: 'config',
    id: 'my-new-plugin',
    name: 'My New Plugin',
    description: 'What it does',
    icon: '🎯',
    prompt: `Your AI prompt here using {{title}} and {{content}}...`,
    outputType: 'text',
    display: {
      dataSource: 'my-new-plugin',
      position: 'tab',
      format: 'text',
      tabName: 'My Tab',
    },
  },
];

// Add to default states
export const DEFAULT_PLUGIN_STATES = {
  // ... existing states
  'my-new-plugin': {
    enabled: true,
    config: {},
  },
};
```

Users can also create plugins via Settings UI or import JSON files.

### Add a Template Variable

Template variables are user-facing, created in Settings UI. To add new built-in variables:

**In `src/plugins/plugin-executor.ts` or similar:**
```typescript
function buildPluginContext(note: NoteInput): PluginContext {
  return {
    // Existing fields
    title: note.title,
    content: note.content,
    url: note.url,
    domain: note.domain,

    // Add new built-in variable
    myNewVariable: computeMyVariable(note),

    // Existing app context
    existingTags: allTags,
    noteCount: totalNotes,
    plugins: {},
  };
}
```

Then document it so users know `{{myNewVariable}}` is available.

### Create a Master Prompt (Programmatically)

Master prompts are user-facing, created in Settings UI. To add defaults:

**In initialization code** (e.g., `src/background/index.ts`):
```typescript
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default master prompts
    await chrome.storage.local.set({
      masterPrompts: [
        {
          id: 'default-tone',
          title: 'Professional Tone',
          description: 'Maintains professional, concise tone',
          prompt: 'Always respond professionally and concisely.',
          enabled: true,
        },
      ],
    });
  }
});
```

Users can then manage master prompts via Settings → Master Prompts tab.

---

## Testing Changes

### Manual Testing Checklist

- [ ] Load extension in Chrome
- [ ] Test all UI pages (side panel, settings, notes)
- [ ] Test AI chat with both Venice.ai and Claude
- [ ] Test note saving and retrieval
- [ ] Test search and filtering
- [ ] Test export/import
- [ ] Test dark mode toggle
- [ ] Check console for errors (F12)
- [ ] Verify background service worker logs

### Common Issues

**Build errors:**
- Run `npm run type-check` to find TypeScript errors
- Check `vite.config.ts` for misconfigured paths

**Extension not loading:**
- Ensure `manifest.json` is valid (check permissions, paths)
- Reload extension from `chrome://extensions/`

**Background script not working:**
- Check service worker inspector for errors
- Service workers have limited lifetime - test thoroughly

**npm audit vulnerability (esbuild/vite):**
- `npm audit` reports a moderate severity issue with esbuild <=0.24.2
- **This only affects the development server** (when running `npm run dev`)
- The built extension is NOT affected - end users are safe
- Fix requires upgrading to Vite 7 (breaking change)
- Until upgraded, developers should avoid exposing the dev server to untrusted websites
- See: https://github.com/advisories/GHSA-67mh-4wv8-2f99

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Commit with clear messages: `git commit -m "feat: add new feature"`
5. Push and create a pull request

---

## Design System

For UI components and styling guidelines, see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## Resources

- [Chrome Extension Docs (Manifest V3)](https://developer.chrome.com/docs/extensions/mv3/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Venice.ai API Docs](https://venice.ai/docs)
- [Anthropic Claude API Docs](https://docs.anthropic.com/)

---

**Questions?** Open an issue on GitHub or contact the development team.
