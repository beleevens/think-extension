# Changelog

All notable changes to Think Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-03

### Added
- **AI-Powered Note Taking** - Save webpages with one click, automatically processed by AI
- **Multi-Provider Support** - Works with Venice.ai, Claude (Anthropic), and Ollama (local)
- **Plugin System** - Extensible plugin architecture with 4 built-in plugins:
  - AI Tag Generator - Automatically generates relevant tags
  - AI Summary Generator - Creates concise 2-3 sentence summaries
  - Insights - Extracts key takeaways and insights
  - ELI5 - Explains content in simple terms
- **Custom Plugin Support** - Import/export custom JSON-based plugins
- **Template Variables** - Reusable static variables accessible in all plugins
- **Master Prompts** - System-level prompts that customize AI behavior globally
- **Content Cleanup** - Remove ads and noise from saved content using AI
- **Local Storage** - All notes stored locally in browser, no cloud sync required
- **Full-Text Search** - Find notes instantly by title, content, or tags
- **Export/Import** - Backup notes as JSON or export individual notes as Markdown
- **Dark Mode** - Automatic dark mode with system detection
- **Context Menus** - Right-click shortcuts for quick actions
- **Side Panel UI** - Chrome side panel for chat and note-taking interface
- **Real-Time Streaming** - Streaming responses from AI providers
- **Conversation History** - Automatic chat history saving
- **Page Context** - Include current webpage in chat conversations

### Security
- API keys stored securely in chrome.storage.local (encrypted by Chrome)
- Content Security Policy (CSP) restricts external connections
- Ollama connections restricted to localhost:11434 only
- No hardcoded credentials or API keys in code

### Documentation
- Comprehensive README with installation and usage instructions
- Plugin development guide with examples
- Design system documentation
- Contributing guidelines (CONTRIBUTING.md)
- Code of Conduct (CODE_OF_CONDUCT.md)

### Technical
- Built with React 18, TypeScript, and Vite
- Chrome Manifest V3 extension
- Tailwind CSS for styling
- Framer Motion for animations
- Full TypeScript type safety
- Modular plugin architecture
- Local-first data storage

---

## Future Releases

Future changes will be documented here. See [releases page](https://github.com/beleevens/think-extension/releases) for release notes.

---

**Note:** This is the initial release. For detailed feature information, see [README.md](README.md).
