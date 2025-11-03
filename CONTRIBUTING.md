# Contributing to Think Better

Thank you for your interest in contributing to Think Better! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your browser version and OS
- Screenshots if applicable
- Any relevant console errors

### Suggesting Features

We love feature suggestions! Please create an issue with:

- A clear description of the feature
- Why this feature would be useful
- Any implementation ideas you have
- Examples of similar features in other tools (if applicable)

### Pull Requests

We actively welcome pull requests!

1. **Fork the repository** and create your branch from `main`
2. **Set up your development environment** (see below)
3. **Make your changes** following our code standards
4. **Test your changes** thoroughly
5. **Update documentation** if needed (README.md, comments, etc.)
6. **Submit a pull request** with a clear description of your changes

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Chrome browser

### Getting Started

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/think-extension.git
   cd think-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

For detailed development instructions, see [README_DEV.md](README_DEV.md).

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` types when possible
- Add JSDoc comments for public APIs

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use meaningful component and prop names
- Add comments for complex logic

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- Ensure dark mode compatibility
- Test responsive layouts

### File Organization

- Keep related files together
- Use clear, descriptive file names
- Export components from index files when appropriate
- Follow existing project structure

## Testing

While we don't currently have automated tests, please:

- Test your changes manually in Chrome
- Test with different AI providers (Venice.ai, Claude, Ollama)
- Test edge cases and error scenarios
- Verify both light and dark modes
- Test on different screen sizes

## Plugin Development

If you're contributing a new plugin:

- Follow the plugin template in `example-plugins/`
- Include clear documentation
- Provide example use cases
- Test with various types of content

## Commit Messages

Write clear, descriptive commit messages:

```
Add feature: Brief description

Longer explanation of what changed and why, if needed.
Fixes #123
```

Good examples:
- `Fix: Resolve API key validation error`
- `Add: Support for custom Ollama models`
- `Update: Improve tag generation prompt`
- `Docs: Add plugin development guide`

## Pull Request Process

1. **Update the README.md** with details of changes if applicable
2. **Update version numbers** if needed (following semver)
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Squash commits** if requested before merging

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style and standards
- [ ] All changes are tested manually
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Works with all AI providers
- [ ] Dark mode compatibility verified
- [ ] No sensitive data (API keys, tokens) in code

## Project Structure

```
think-extension/
├── src/
│   ├── background/     # Service worker / background script
│   ├── components/     # Reusable React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core libraries (API clients, storage, types)
│   ├── notes/          # Notes page UI
│   ├── plugins/        # Plugin system (manager, executor, registry)
│   ├── settings/       # Settings page UI
│   └── sidepanel/      # Side panel UI (chat interface)
├── public/             # Static assets (icons, manifest.json)
├── example-plugins/    # Plugin examples and templates
└── scripts/            # Build and packaging scripts
```

## Getting Help

- Check existing issues and discussions
- Read [README_DEV.md](README_DEV.md) for technical details
- Ask questions in GitHub issues
- Be respectful and patient

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes (for significant contributions)

## License

By contributing to Think Better, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing to Think Better!
