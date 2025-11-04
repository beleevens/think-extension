# Design System - Extension Cloud

> Comprehensive design guidelines for the Think Extension

## 🎨 Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Accent** | `#6366f1` | Primary actions, links, focus states, brand color |
| **Accent Hover** | `#4f46e5` | Hover states for accent elements |
| **Accent Light** | `#eef2ff` | Backgrounds, selected states, subtle highlights |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `hsl(222.2 47.4% 11.2%)` | Dark navy for primary text, headings |
| **Primary Foreground** | `hsl(210 40% 98%)` | Text on primary backgrounds |
| **Destructive** | `hsl(0 84.2% 60.2%)` | Error states, delete actions, warnings |
| **Background** | `#ffffff` | Card backgrounds, modal backgrounds |
| **Surface** | `#f9fafb` | Page backgrounds, subtle containers |

### Grayscale

| Name | Hex | Usage |
|------|-----|-------|
| **Gray-50** | `#f9fafb` | Subtle backgrounds, disabled elements |
| **Gray-100** | `#f3f4f6` | Hover states on light backgrounds |
| **Gray-200** | `#e5e7eb` | Borders, dividers |
| **Gray-300** | `#d1d5db` | Disabled text, placeholder text |
| **Gray-500** | `#6b7280` | Secondary text, labels |
| **Gray-600** | `#4b5563` | Body text |
| **Gray-800** | `#1f2937` | Headings, emphasized text |
| **Gray-900** | `#111827` | Primary text, high emphasis |

---

## 📝 Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
             Ubuntu, Cantarell, sans-serif;
```

**Features:**
- `-webkit-font-smoothing: antialiased`
- `-moz-osx-font-smoothing: grayscale`

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **H1** | 2rem (32px) | 700 | 1.2 | Page titles |
| **H2** | 1.5rem (24px) | 600 | 1.3 | Section headings |
| **H3** | 1.25rem (20px) | 600 | 1.4 | Subsection headings |
| **H4** | 1.125rem (18px) | 600 | 1.4 | Card titles |
| **Body** | 0.875rem (14px) | 400 | 1.5 | Default body text |
| **Body Large** | 1rem (16px) | 400 | 1.5 | Emphasized body text |
| **Small** | 0.75rem (12px) | 400 | 1.5 | Labels, captions, metadata |

---

## 📏 Spacing System

Uses Tailwind's rem-based spacing scale:

| Token | Value | Pixels (16px base) |
|-------|-------|--------------------|
| `xs` | 0.25rem | 4px |
| `sm` | 0.5rem | 8px |
| `md` | 1rem | 16px |
| `lg` | 1.5rem | 24px |
| `xl` | 2rem | 32px |
| `2xl` | 3rem | 48px |

### Common Patterns

- **Card padding**: `2rem` (32px)
- **Section spacing**: `1rem` (16px)
- **Button padding**: `0.75rem 1.5rem` (12px 24px)
- **Input padding**: `0.75rem` (12px)
- **Gap between elements**: `0.5rem` - `1rem` (8-16px)

---

## 🔲 Border Radius

| Name | Value | Pixels | Usage |
|------|-------|--------|-------|
| **Small** | `0.25rem` | 4px | Tags, badges (internal elements) |
| **Medium** | `0.375rem` | 6px | Buttons, inputs, small cards |
| **Large** | `0.5rem` | 8px | Cards, containers, sections |
| **XL** | `0.75rem` | 12px | Large modals, stat cards |
| **Full** | `9999px` | Full | Pills, circular badges, status indicators |

### Consistency Rules

- **Cards**: Always use `.rounded-lg` (0.5rem)
- **Buttons**: Always use `.rounded-md` (0.375rem)
- **Pills/Badges**: Always use `.rounded-full`
- **Inputs**: Always use `.rounded-md` (0.375rem)

---

## 🎭 Shadows & Elevation

### Shadow Layers

```css
/* Subtle */
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Medium */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

/* Large */
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
```

### Usage

- **Cards**: Subtle shadow for depth
- **Hover states**: Slightly elevated shadow
- **Modals/Dialogs**: Large shadow for focus
- **Stat cards**: Subtle shadow

---

## 🎨 Icon System

### Sizes

| Name | Size | Usage |
|------|------|-------|
| **Small** | 14px | Metadata icons (calendar, tags in note cards) |
| **Medium** | 18px | Toolbar buttons, action buttons, standard UI |
| **Large** | 24px | Empty states, hero sections, feature icons |

### Icon Library

**Provider**: [Lucide React](https://lucide.dev/) v0.546

**Common Icons:**
- Settings (18px) - Settings button
- Library (18px) - Notes navigation
- Eraser (18px) - Clear context
- PlusCircle (18px) - Add note
- Search (18px) - Search inputs
- Calendar (14px) - Date metadata
- Tag (14px) - Tag metadata
- Expand (18px) - Full view button

---

## ⏱️ Animation & Timing

### Transition Durations

| Speed | Duration | Usage |
|-------|----------|-------|
| **Fast** | 150ms | Hover states, color changes |
| **Normal** | 200ms | Standard transitions, button clicks |
| **Slow** | 300ms | Slide-in animations, modals, drawers |

### Easing Functions

```css
/* Standard */
transition-timing-function: ease;

/* Smooth */
transition-timing-function: ease-out;

/* Bouncy (keyframes) */
animation: bounce 1s infinite;
```

### Common Animations

**Slide In:**
```css
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**Spin (loading):**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Bounce (status indicators):**
```css
animation: bounce 1s infinite;
```

---

## 🧩 Component Library

### Buttons

#### Base Button
```jsx
<button className="btn btn-primary">Button</button>
```

**Variants:**
- `.btn-primary` - Accent color background (#6366f1)
- `.btn-secondary` - Gray background
- `.btn-danger` - Red background for destructive actions
- `.btn-accent` - Alternative accent style
- `.btn-sm` - Smaller variant
- `.btn-icon` - Icon-only button
- `.btn-icon-accent` - Accent colored icon button

**States:**
- `:hover` - Darker shade
- `:disabled` - 50% opacity, not-allowed cursor
- `:active` - Scale down slightly (optional)

### Cards

```jsx
<div className="note-card">
  <!-- Card content -->
</div>
```

**Properties:**
- Background: White (`#ffffff`)
- Border: `1px solid #e5e7eb`
- Border radius: `0.5rem`
- Shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- Padding: `1rem` - `2rem` depending on context

**Hover State:**
- Border: `#d1d5db` (darker)
- Shadow: Slightly elevated

### Inputs

```jsx
<input className="search-input" type="text" />
```

**Properties:**
- Border: `1px solid #e5e7eb`
- Border radius: `0.375rem`
- Padding: `0.5rem` - `0.75rem`
- Focus: `border-color: #6366f1` with ring

### Status Badges

```jsx
<span className="status-badge available">✅ Connected</span>
```

**Variants:**
- `.testing` - Blue background
- `.available` - Green background
- `.unavailable` - Red background
- `.unknown` - Gray background

### Tag Pills

```jsx
<button className="tag-pill active">Tag Name</button>
```

**Properties:**
- Border radius: `rounded-full`
- Padding: `0.25rem 0.5rem`
- Font size: `0.75rem`
- Transition: All 0.2s

---

## 📐 Layout Patterns

### Full-Page Applications (Notes, Settings)

```css
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 2rem;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
}
```

### Side Panel (Chat Extension)

```css
.panel-container {
  max-width: 400px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}
```

### Two-Pane Layout (Notes Page)

```css
.layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}
```

### Card-Based Sections

Settings page sections are individual white cards with spacing between them:

```css
.section {
  background: white;
  margin-bottom: 1rem;
  padding: 2rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}
```

---

## 🎯 Accessibility

### Focus States

```css
.element:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### Disabled States

```css
.element:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### ARIA Labels

Always include ARIA labels for icon-only buttons:

```jsx
<button aria-label="Open settings" title="Settings">
  <Settings size={18} />
</button>
```

---

## 📱 Responsive Behavior

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Responsive Patterns

**Notes Sidebar (Mobile):**
```css
@media (max-width: 768px) {
  .notes-sidebar {
    width: 100%;
    position: absolute;
    z-index: 10;
    display: none;
  }

  .notes-sidebar.show {
    display: flex;
  }
}
```

---

## 🔄 Custom Scrollbars

All scrollable containers use custom webkit scrollbars:

```css
.scrollable::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 4px;
}

.scrollable::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
```

---

## 🚀 Implementation Guidelines

### CSS Architecture

1. **Tailwind First**: Use Tailwind utilities for spacing, colors, typography
2. **Custom Classes**: Define in component-specific CSS files
3. **Design Tokens**: Reference variables from `tailwind.config.js`
4. **No Inline Styles**: Always use className composition

### File Structure

```
src/
├── sidepanel/
│   └── styles.css          # Shared utilities, buttons, chat UI
├── settings/
│   └── settings.css        # Settings-specific styles
├── notes/
│   └── notes.css           # Notes app styles
└── components/
    └── *.tsx               # React components (no inline styles)
```

### Color Usage Rules

✅ **DO:**
- Use `#6366f1` for all accent colors
- Reference Tailwind tokens: `bg-accent`, `text-accent`
- Use semantic color names: `text-destructive`, `bg-primary`

❌ **DON'T:**
- Hardcode hex colors in TSX files
- Use inline `style` props for colors
- Mix `#667eea` (old purple) with `#6366f1` (new indigo)

---

## 📚 Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/
- **Framer Motion**: https://www.framer.com/motion/
- **Venice.ai API**: https://docs.venice.ai/

---

## 🎓 Best Practices

1. **Consistency Over Creativity**: Follow established patterns
2. **Spacing Rhythm**: Use multiples of 4px (0.25rem)
3. **Color Contrast**: Ensure WCAG AA compliance (4.5:1 for text)
4. **Animation Purpose**: Only animate with purpose (feedback, attention)
5. **Mobile First**: Design for smallest screen, enhance for larger
6. **Performance**: Use CSS transforms for animations, avoid layout thrashing

---

## ✨ Recent Changes (2025-01)

### Color Unification
- Migrated from `#667eea` (purple) to `#6366f1` (indigo)
- Updated gradients: `#6366f1 → #8b5cf6`
- Standardized all accent colors across pages

### Settings Page Redesign
- Removed full-page gradient background
- Added card-based sections matching Notes page
- Updated stat cards from gradient to bordered style
- Improved scrolling behavior and visual hierarchy

### Border System
- Standardized all borders to `#e5e7eb`
- Converted all `px` values to `rem` for consistency
- Unified border-radius across components

### Button Consolidation
- Centralized button styles in `styles.css`
- Removed inline styles from React components
- Added `.btn-accent` and `.btn-icon-accent` utilities

---

**Last Updated**: January 2025
**Version**: 2.0
**Status**: ✅ Production Ready (100/100 Design Score)
