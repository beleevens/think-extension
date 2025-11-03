# Release Guide

This guide explains how to create and publish new releases of Think Better.

## Version Numbering

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (1.x.x): Breaking changes, incompatible API changes
- **MINOR** (x.1.x): New features, backwards-compatible
- **PATCH** (x.x.1): Bug fixes, backwards-compatible

Examples:
- `1.0.0` → `1.0.1`: Bug fix
- `1.0.1` → `1.1.0`: New feature added
- `1.1.0` → `2.0.0`: Breaking change

## Pre-Release Checklist

Before creating a release, ensure:

- [ ] All tests pass (manual testing with all AI providers)
- [ ] Documentation is up to date (README.md, README_DEV.md)
- [ ] CHANGELOG updated with all changes since last release
- [ ] No console errors or warnings
- [ ] Dark mode works correctly
- [ ] All AI providers tested (Venice.ai, Claude, Ollama)
- [ ] Plugin system tested
- [ ] Import/Export functionality works
- [ ] Security review completed (no exposed secrets)
- [ ] Dependencies audited (`npm audit`)

## Release Process

### 1. Update Version Numbers

Update version in **three places**:

**package.json:**
```json
{
  "version": "1.1.0"
}
```

**manifest.json:**
```json
{
  "version": "1.1.0"
}
```

**README.md badge:**
```markdown
[![Version](https://img.shields.io/badge/version-1.1.0-green.svg)](https://github.com/beleevens/think-extension/releases)
```

### 2. Update CHANGELOG.md

Add release notes to `CHANGELOG.md`:

```markdown
## [1.1.0] - 2025-01-15

### Added
- New feature: Custom plugin templates
- Support for additional Ollama models

### Changed
- Improved tag generation algorithm
- Updated UI for settings panel

### Fixed
- Fixed API key validation bug
- Resolved dark mode rendering issue

### Security
- Updated dependencies to fix CVE-XXXX-XXXX
```

### 3. Commit Version Changes

```bash
git add package.json manifest.json README.md CHANGELOG.md
git commit -m "chore: Bump version to 1.1.0"
git push origin main
```

### 4. Build the Extension

Clean build from scratch:

```bash
# Clean previous builds
rm -rf dist packages

# Install dependencies (ensure latest)
npm install

# Build the extension
npm run build

# Package the extension
npm run package
```

This creates a ZIP file: `packages/think-better-extension-v1.1.0.zip`

### 5. Test the Built Extension

Before releasing, test the built extension:

1. Load `packages/think-better-extension-v1.1.0.zip` in Chrome
2. Test all major features
3. Verify version number shows correctly
4. Check that no development files are included

### 6. Create Git Tag

```bash
# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0 - Brief description"

# Push tag to GitHub
git push origin v1.1.0
```

### 7. Create GitHub Release

#### Option A: Using GitHub Web Interface

1. Go to: https://github.com/beleevens/think-extension/releases
2. Click "Draft a new release"
3. Fill in the form:
   - **Tag**: Select `v1.1.0` (the tag you just pushed)
   - **Release title**: `v1.1.0 - Brief Description`
   - **Description**: Copy from CHANGELOG.md, format as:
     ```markdown
     ## What's New in v1.1.0

     ### Added
     - New feature: Custom plugin templates
     - Support for additional Ollama models

     ### Changed
     - Improved tag generation algorithm
     - Updated UI for settings panel

     ### Fixed
     - Fixed API key validation bug
     - Resolved dark mode rendering issue

     ## Installation

     Download `think-better-extension-v1.1.0.zip` below and follow the [installation instructions](https://github.com/beleevens/think-extension#installation).

     ## Full Changelog

     See [CHANGELOG.md](https://github.com/beleevens/think-extension/blob/main/CHANGELOG.md) for complete history.
     ```

4. **Attach the ZIP file**:
   - Click "Attach binaries by dropping them here"
   - Upload `packages/think-better-extension-v1.1.0.zip`

5. **Set as latest release** (check the box)

6. Click "Publish release"

#### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if needed: https://cli.github.com/

# Create release with attached file
gh release create v1.1.0 \
  packages/think-better-extension-v1.1.0.zip \
  --title "v1.1.0 - Brief Description" \
  --notes-file release-notes.md
```

### 8. Verify Release

After publishing:

1. Check release page: https://github.com/beleevens/think-extension/releases
2. Download the ZIP from the release
3. Verify it extracts correctly
4. Test installation from the downloaded ZIP
5. Confirm version badge in README updates automatically

### 9. Announce (Optional)

Consider announcing new releases:

- GitHub Discussions (if enabled)
- Project README (add "Latest Release" section)
- Social media
- Relevant communities

## Hotfix Releases

For critical bugs in production:

1. Create a hotfix branch from the tag:
   ```bash
   git checkout -b hotfix/1.1.1 v1.1.0
   ```

2. Fix the bug and commit:
   ```bash
   git commit -am "fix: Critical bug description"
   ```

3. Update version to `1.1.1` in all three files

4. Merge to main:
   ```bash
   git checkout main
   git merge hotfix/1.1.1
   ```

5. Follow normal release process from step 4

## Release Types

### Patch Release (1.0.x)
- Bug fixes only
- No new features
- No breaking changes
- Can be released anytime

### Minor Release (1.x.0)
- New features
- Backwards-compatible
- May include bug fixes
- Released when features are ready

### Major Release (x.0.0)
- Breaking changes
- API changes
- Requires migration guide
- Plan carefully, communicate well

## Post-Release Tasks

After releasing:

- [ ] Monitor GitHub issues for bug reports
- [ ] Update documentation if needed
- [ ] Plan next release milestones
- [ ] Thank contributors

## Rollback Procedure

If a release has critical issues:

1. **Mark release as pre-release** on GitHub (edit release)
2. **Create hotfix** following hotfix process above
3. **Release fixed version** as soon as possible
4. **Update issue tracker** to track the problem
5. **Communicate** to users about the issue and fix

## Common Issues

### ZIP file too large
- Check that `node_modules` is not included
- Verify only `dist` folder contents are packaged
- Review `scripts/package.js` for packaging logic

### Extension won't load
- Ensure manifest.json is valid
- Check that all required files are in `dist/`
- Verify permissions in manifest.json

### Version mismatch
- Ensure version is updated in all three files
- Clear browser cache
- Reload the extension

## Tools

Useful commands:

```bash
# Check current version
cat package.json | grep version

# List all tags
git tag -l

# View commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Audit dependencies
npm audit

# Check for outdated packages
npm outdated

# Update dependencies
npm update
```

## Resources

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Chrome Extension Publishing](https://developer.chrome.com/docs/extensions/mv3/publish/)

## Questions?

If you have questions about the release process, please:
- Check this guide first
- Review previous releases for examples
- Open an issue for clarification
- Contact the maintainers

---

**Remember**: Quality over speed. It's better to delay a release than to ship broken software.
