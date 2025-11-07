# PasteMyPrompt

A zero-server, local-first AI prompt manager Chrome Extension with project-based organization.

## Features

- **Project-based organization**: Organize prompts into projects (General, Blogs, X + custom projects)
- **Recently Used**: Quick access to your 3 most recently copied prompts
- **Search**: Real-time search across titles, prompt text, and tags
- **Dark Mode**: Toggle between light and dark themes
- **Export/Import** (Pro): Backup and restore your prompts as JSON
- **Pro Features**: Unlimited projects, export/import, custom tags

## Installation

1. Clone or download this repository
2. Generate icons (see below)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select this folder

## Generating Icons

The extension requires icon files. You have two options:

### Option 1: Using the HTML Generator (Recommended)

1. Open `generate-icons.html` in your browser
2. Click "Download All Icons"
3. Save the downloaded files to the `icons/` folder:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### Option 2: Using Node.js

1. Install dependencies: `npm install canvas`
2. Run: `node generate-icons.js`
3. Icons will be automatically created in the `icons/` folder

## Usage

### Creating Prompts

1. Click "New Prompt" button
2. Fill in the title, select a project, add tags, and write your prompt
3. Click "Save"

### Managing Projects

- Click the "+ New Project" button to create a custom project
- Right-click a project (except default ones) to rename or delete
- Filter prompts by clicking on a project name

### Copying Prompts

- Click the "Copy" button on any prompt card
- The prompt will be copied to your clipboard
- Recently used prompts appear at the top

### Search

- Use the search bar to filter prompts by title, content, or tags
- Search is real-time and case-insensitive

### Dark Mode

- Click the moon/sun icon in the top bar to toggle dark mode
- Preference is saved automatically

### Pro Features

To unlock Pro features:

1. Click "Unlock Pro ($5)" button
2. Complete payment via PayPal
3. Open DevTools (F12) in the extension popup
4. Run: `localStorage.setItem('pro', 'true')`
5. Refresh the extension

Pro features include:
- Unlimited custom projects (free version: 3 max)
- Export/Import functionality
- Custom tags beyond predefined ones

## Export/Import (Pro Only)

### Export

1. Click "Export JSON" button
2. A file named `prompthub-backup.json` will be downloaded

### Import

1. Click "Import JSON" button
2. Select your backup JSON file
3. Data will be merged with existing prompts

## Data Storage

All data is stored locally in `chrome.storage.local`. No data is sent to any server.

## Sample Data

The extension comes with 5 sample prompts across 3 projects to help you get started.

## Development

- **Manifest Version**: 3
- **Framework**: Vanilla JavaScript
- **Styling**: Tailwind CSS (CDN)
- **Storage**: chrome.storage.local

## License

MIT

