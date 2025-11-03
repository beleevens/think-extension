# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Think Better seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**Please do NOT create a public GitHub issue for security vulnerabilities.**

Instead, report security issues by:

1. **Creating a private security advisory** on GitHub:
   - Go to the [Security tab](https://github.com/beleevens/think-extension/security)
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Or email the maintainers** with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (if you have them)

### What to Include

Please provide as much information as possible:

- Type of vulnerability (e.g., XSS, injection, unauthorized access)
- Location of the affected code (file path, line numbers)
- Steps to reproduce the vulnerability
- Proof-of-concept or exploit code (if applicable)
- Impact of the vulnerability
- Any suggested mitigations

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Status Updates**: At least every 2 weeks
- **Fix Timeline**: Varies based on severity and complexity

### Disclosure Policy

- We will work with you to understand and resolve the issue
- We ask that you do not publicly disclose the vulnerability until we've had a chance to address it
- Once fixed, we will publish a security advisory crediting you (unless you prefer to remain anonymous)
- We aim to release patches within 30 days for critical vulnerabilities

## Security Considerations

### API Keys

- Never hardcode API keys in the extension code
- API keys are stored in `chrome.storage.local` (encrypted by Chrome)
- Users must provide their own API keys
- Keys are never transmitted except to the configured AI provider

### Data Storage

- All notes and data are stored locally in the browser
- No cloud sync or external storage by default
- Data is stored using Chrome's storage API (sandboxed per extension)

### Network Requests

- The extension only makes requests to:
  - User-configured AI providers (Venice.ai, Anthropic, Ollama)
  - Current webpage for content extraction
- All API requests use HTTPS
- Ollama connections are restricted to localhost:11434 only

### Content Security Policy

The extension uses a strict Content Security Policy (CSP) defined in `manifest.json`:
- No inline scripts or eval()
- Only allows connections to approved AI provider domains
- No external script loading

### Permissions

The extension requests minimal permissions:
- `storage` - For local data storage
- `tabs` - To access current tab information
- `activeTab` - To extract webpage content
- `scripting` - To inject content scripts
- `sidePanel` - For the side panel UI
- `contextMenus` - For right-click menu options

### Known Security Features

1. **Port Restriction**: Ollama connections are restricted to port 11434 only to prevent access to other local services
2. **Input Sanitization**: All user content is sanitized before display using DOMPurify
3. **Markdown Rendering**: Uses secure markdown-it configuration
4. **No External Dependencies at Runtime**: All code is bundled, no CDN dependencies

## Security Best Practices for Users

- Keep the extension updated to the latest version
- Only install from official sources (GitHub Releases)
- Review extension permissions before installing
- Use API keys with minimal required permissions
- Regularly review saved notes for sensitive information
- Be cautious when installing custom plugins

## Security Best Practices for Developers

- Never commit API keys or secrets
- Always sanitize user input
- Use TypeScript for type safety
- Follow secure coding guidelines
- Test with various inputs including malicious payloads
- Keep dependencies updated
- Review third-party code before adding dependencies

## Vulnerability Disclosure Examples

Examples of vulnerabilities we'd want to know about:

- Cross-Site Scripting (XSS) in note content
- API key exposure or leakage
- Unauthorized access to local storage
- Content injection vulnerabilities
- Insecure API communication
- Plugin system security bypasses
- Privilege escalation issues

## Out of Scope

The following are generally not considered vulnerabilities:

- Vulnerabilities in third-party AI providers (Venice.ai, Anthropic, Ollama)
- Social engineering attacks
- Attacks requiring physical access to the user's device
- Attacks requiring the user to install malicious software
- Denial of service attacks

## Attribution

We appreciate security researchers and will acknowledge contributors who report valid security issues in:

- Security advisories
- Release notes
- A SECURITY_ACKNOWLEDGMENTS.md file (if/when created)

## Questions?

If you have questions about this security policy, please open a general issue (not for vulnerabilities) or contact the maintainers.

Thank you for helping keep Think Better and its users safe!
