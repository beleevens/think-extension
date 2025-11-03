# Example Custom Plugins

This directory contains example configuration-based plugins that you can import into Think Extension to extend its functionality.

## What Are Plugins?

Think Extension's plugin system allows you to add custom AI-powered processing to your saved notes. Plugins can:
- Extract specific information (action items, key points, etc.)
- Generate alternative perspectives (beginner guides, technical deep-dives)
- Create custom tags and categories
- Transform content in any way you can prompt an AI

## Built-in Plugins

Think Extension ships with **4 built-in plugins** that are already installed and enabled:

1. **AI Tag Generator** 🏷️ - Automatically generates 7 relevant tags (displayed in header)
2. **AI Summary Generator** 📝 - Creates 2-3 sentence summaries (displayed in header)
3. **Insights** 💡 - Extracts key insights and takeaways (displayed in "Insights" tab)
4. **ELI5** 👶 - Explains the article in simple terms (displayed in "ELI5" tab)

The example plugins in this directory show you how to create **additional custom plugins** beyond these built-ins.

---

## Example Plugins in This Directory

### 1. Action Items (`action-items-plugin.json`)
- **Description:** Extracts 3-5 actionable steps and tasks from articles
- **Output Format:** Text (bulleted list)
- **Display:** New tab labeled "Action Items"
- **Use Case:** Project planning, meeting notes, learning roadmaps

### 2. Related Topics (`related-topics-plugin.json`)
- **Description:** Suggests 5-7 related topics to explore next
- **Output Format:** Tags
- **Display:** Header (tag badges)
- **Use Case:** Research, knowledge graph building, topic exploration

### 3. Learning Perspectives (`learning-perspectives-plugin.json`)
- **Description:** Multiple educational perspectives at different complexity levels
- **Output Format:** Blocks (3 separate sections)
  - **Beginner Guide** - Simple explanations for newcomers
  - **Deep Dive** - Advanced technical analysis
  - **Critical Analysis** - Critical thinking and alternative viewpoints
- **Display:** New tab labeled "Learning" with 3 sub-sections
- **Use Case:** Education, comprehensive learning, research

---

## How to Import Example Plugins

1. Open Think and click the **Settings** icon (⚙️)
2. Navigate to the **Plugins** section
3. Click **"Manage Custom Plugins"**
4. Click **"Import JSON File"**
5. Select one of the example plugin files from this directory
6. The plugin will be added to your plugin list
7. Enable the plugin using the toggle switch
8. Save settings and reload to see the plugin in action

---

## Creating Your Own Custom Plugins

### Plugin Schema (New Format)

```json
{
  "type": "config",
  "id": "unique-plugin-id",
  "name": "Display Name",
  "description": "Brief description of what this plugin does",
  "icon": "🔌",
  "prompt": "Your AI prompt with {{title}} and {{content}} variables",
  "outputType": "text|tags|blocks",
  "display": {
    "dataSource": "unique-plugin-id",
    "position": "header|tab",
    "format": "text|tags|blocks",
    "tabName": "Tab Label (only if position is 'tab')"
  }
}
```

### Required Fields

- **type**: Always `"config"` for config-based plugins
- **id**: Unique identifier (lowercase, hyphens, e.g., `"my-plugin"`)
- **name**: Display name shown in plugin manager
- **description**: Brief explanation of plugin functionality
- **icon**: Emoji icon (e.g., `"🔌"`, `"✅"`, `"💡"`)
- **prompt**: AI prompt template (see "Available Variables" below)
- **outputType**: Output data type - `"text"`, `"tags"`, or `"blocks"`
- **display**: Object defining how/where output is displayed

### Display Object

The `display` object controls where and how the plugin output appears:

```json
"display": {
  "dataSource": "your-plugin-id",  // Must match plugin id
  "position": "header|tab",         // Where to show output
  "format": "text|tags|blocks",     // How to format output
  "tabName": "Optional Tab Name"    // Required if position is "tab"
}
```

**Position Options:**
- `"header"` - Displays below the note title/metadata (for summaries, tags)
- `"tab"` - Creates a new tab in the note view (for longer content)

**Format Options:**
- `"text"` - Single text/markdown output
- `"tags"` - Array of tag badges
- `"blocks"` - Multiple sections with separate prompts (requires `blocks` array)

### Output Types in Detail

#### 1. Text Output (`"outputType": "text"`)

Single text/markdown response from AI.

**Example:**
```json
{
  "id": "key-points",
  "outputType": "text",
  "prompt": "List 5 key points from this article:\n\n{{content}}",
  "display": {
    "dataSource": "key-points",
    "position": "tab",
    "format": "text",
    "tabName": "Key Points"
  }
}
```

#### 2. Tags Output (`"outputType": "tags"`)

Array of string tags. Prompt must return JSON format: `{"tags": ["tag1", "tag2", ...]}`.

**Example:**
```json
{
  "id": "categories",
  "outputType": "tags",
  "prompt": "Categorize this article into 5 categories. Return JSON: {\"tags\": [\"cat1\", \"cat2\", ...]}\n\n{{content}}",
  "display": {
    "dataSource": "categories",
    "position": "header",
    "format": "tags"
  }
}
```

#### 3. Blocks Output (`"outputType": "blocks"`)

Multiple separate AI responses, each in its own section/tab.

**Required field:** `"blocks"` array with objects containing `name` and `prompt`

**Example:**
```json
{
  "id": "analysis",
  "outputType": "blocks",
  "prompt": "Not used for blocks type",
  "display": {
    "dataSource": "analysis",
    "position": "tab",
    "format": "blocks",
    "tabName": "Analysis"
  },
  "blocks": [
    {
      "name": "Strengths",
      "prompt": "What are the strengths of this argument?\n\n{{content}}"
    },
    {
      "name": "Weaknesses",
      "prompt": "What are the weaknesses?\n\n{{content}}"
    }
  ]
}
```

### Available Variables

Use these template variables in your prompts:

- **{{title}}** - Article title
- **{{content}}** - Article content (cleaned, max ~3000 characters)
- **{{url}}** - Article URL
- **{{domain}}** - Article domain (e.g., "example.com")
- **{{existingTags}}** - Comma-separated list of existing tags (useful for tag plugins)

### Advanced: Plugin Dependencies

Plugins can depend on other plugins using the `dependsOn` field:

```json
{
  "id": "expanded-summary",
  "dependsOn": ["summary-generator"],
  "prompt": "Expand this summary into 3 paragraphs:\n\nOriginal summary: {{summary-generator}}\n\nFull content: {{content}}"
}
```

This ensures `summary-generator` runs first, and its output is available as `{{summary-generator}}`.

---

## Best Practices

### 1. Write Clear, Specific Prompts
❌ Bad: "Analyze this article"
✅ Good: "Identify 3 main arguments and 2 supporting examples from this article. Format as a bulleted list."

### 2. Specify Output Format
Include formatting instructions in your prompt:
- "Format as a bulleted list using '- ' prefix"
- "Return JSON: {\"tags\": [...]}"
- "Use markdown headings and formatting"

### 3. Keep Prompts Focused
Each plugin should do one thing well. For multiple perspectives, use blocks format rather than cramming everything into one prompt.

### 4. Test with Different Content
Try your plugin on various article types (short/long, technical/simple) to ensure it works consistently.

### 5. Choose Appropriate Position
- **Header** - For short outputs (summaries, tags, key stats)
- **Tab** - For longer content (detailed analysis, multiple sections)

### 6. Use Descriptive Names and Icons
Make it easy to identify what each plugin does at a glance.

---

## Migrating Old Plugins (Schema v1 → v2)

If you have old plugins that use the previous schema format, you need to update them:

### Old Format (v1):
```json
{
  "id": "my-plugin",
  "outputType": "text",
  "position": "tab",
  "tabName": "My Tab"
}
```

### New Format (v2):
```json
{
  "id": "my-plugin",
  "outputType": "text",
  "display": {
    "dataSource": "my-plugin",
    "position": "tab",
    "format": "text",
    "tabName": "My Tab"
  }
}
```

**Migration Steps:**
1. Create a `display` object
2. Move `position` and `tabName` inside `display`
3. Add `dataSource` field (same value as `id`)
4. Add `format` field (same value as `outputType`)
5. Remove old top-level `position` and `tabName` fields

---

## Exporting and Sharing Plugins

### To Export:
1. Go to Settings → Plugins → Manage Custom Plugins
2. Click the download icon (↓) next to your plugin
3. Save the JSON file

### To Share:
- Share the JSON file directly
- Post on GitHub, forums, or communities
- Include usage instructions and example outputs

---

## Troubleshooting

### Plugin Import Fails
- **Cause:** Invalid JSON or missing required fields
- **Fix:** Validate JSON syntax, ensure all required fields are present, check that `display.dataSource` matches `id`

### Plugin Doesn't Appear
- **Cause:** Plugin not enabled or needs reload
- **Fix:** Enable plugin toggle in settings, save, and reload the page

### Output Not Displaying Correctly
- **Cause:** Wrong `display.format` for `outputType`
- **Fix:** Ensure `display.format` matches `outputType` (e.g., `"outputType": "tags"` needs `"format": "tags"`)

### Tags Plugin Returns Text Instead of Tags
- **Cause:** Prompt doesn't return JSON format
- **Fix:** Update prompt to explicitly request: `Return JSON: {"tags": ["tag1", "tag2", ...]}`

### Blocks Don't Show Up
- **Cause:** Missing `blocks` array or wrong display format
- **Fix:** Add `blocks` array with `name` and `prompt` for each block, set `"format": "blocks"`

---

## Example Use Cases

- **📋 Meeting Notes** - Extract decisions, action items, and attendees
- **📚 Research** - Identify key concepts, methodologies, and references
- **🎓 Learning** - Generate study guides, flashcards, and quizzes
- **📱 Content Creation** - Create social media summaries and post ideas
- **🔬 Analysis** - Compare perspectives, identify biases, evaluate arguments
- **💼 Professional Development** - Extract career lessons and skills mentioned
- **🌐 Translation/Simplification** - Convert technical jargon to plain language

---

## Plugin Ideas

Need inspiration? Try creating plugins for:

- Technical term definitions
- Historical context
- Counterarguments
- Real-world applications
- Discussion questions
- Citation extraction
- Sentiment analysis
- Reading time estimates
- Expertise level rating
- Follow-up resources

---

## Questions or Issues?

- Check the main [README.md](../README.md) for general extension help
- Open an issue on GitHub for bug reports or feature requests

---

**Happy plugin building!** 🎉
