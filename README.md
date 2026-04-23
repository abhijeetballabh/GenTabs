# GenTabs

A modern Chrome extension to save, organize, and restore browser sessions without tab chaos.

GenTabs helps you capture your current browsing context, create reusable tab groups, and restore everything when you need it.

## Highlights

- Save tabs from the current window or all windows
- Restore sessions in one click
- Create custom groups for recurring workflows
- Drag and drop tabs between saved areas
- Search across session and group content
- Quick actions (mute/unmute, find playing tabs, close tabs, etc.)
- Clean dashboard UI for high-volume tab management

## Install

### Option 1: Install from release ZIP (recommended)

- Latest release page: https://github.com/abhijeetballabh/GenTabs/releases/latest
- Direct ZIP link: https://github.com/abhijeetballabh/GenTabs/releases/latest/download/GenTabs.zip

If the direct ZIP link returns 404, open the latest release page above and download the ZIP asset from the release assets list.

### How to load in Chrome from ZIP

1. Download the extension ZIP.
2. Extract it to a local folder.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** (top-right).
5. Click **Load unpacked**.
6. Select the extracted extension folder.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Chrome (latest)

### Local setup

```bash
npm install
npm run build
```

After build, load the generated output folder in `chrome://extensions` using **Load unpacked**.

## Usage

1. Open the extension popup.
2. Choose:
   - **Save Window** to capture current window tabs
   - **Save All Windows** to capture all windows
3. Open the dashboard to:
   - Browse saved sessions
   - Create and manage custom groups
   - Restore sessions or groups into windows

## Project Structure

```text
src/
  api/          Chrome API wrappers (storage, tabs)
  background/   Service worker logic
  core/         Domain and sweep logic
  dashboard/    Main dashboard app
  popup/        Extension popup UI
  types/        Type definitions
  utils/        Shared utilities
```

## Tech Stack

- TypeScript
- React
- Vite
- Chrome Extension Manifest V3

## Privacy

GenTabs stores session/group data in Chrome extension storage. It is designed for local browser usage and does not require a backend service for core functionality.

## Contributing

Issues and PRs are welcome.

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

MIT
