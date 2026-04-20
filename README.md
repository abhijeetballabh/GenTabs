# GenTabs
## The Ultimate Workspace & Session Manager for Chrome

GenTabs is an advanced Chrome Extension engineered to solve a pervasive problem for modern knowledge workers: **tab overload, excessive memory consumption, and cognitive clutter.** 

By treating browser tabs as transient items rather than permanent fixtures, GenTabs introduces a **session-based tab management system** combined with **workspace-like custom grouping**. It allows users to quickly save their current cognitive context, clear out the clutter, and meticulously organize URLs into dedicated, thematic groups for later retrieval.

---

## 2. Complete Feature List

GenTabs provides a comprehensive suite of features designed for speed, organization, and visual clarity.

### A. Session Management
- **Save Current Window:** Instantly aggregates all tabs from the currently active window, saves them as a timestamped "Session", and closes them.
- **Save All Windows:** Gathers tabs from *every* open Chrome window across the OS, organizing them into a unified session.
- **Session Structure:** Sessions are immutable snapshots of your workflow at a specific point in time.
- **Latest Session Section:** Prominently displays the most recently saved session at the top of the dashboard for quick resumption.
- **Restore Session:** Allows restoring a session. Clicking "Restore All" opens the entire session in a clean, newly spawned Chrome window.
- **Session Preview:** Provides a high-density, horizontal strip of tab favicons alongside the total tab count to quickly identify the session's contents without expanding it.

### B. Custom Groups
- **Create Group:** Allows users to manually create named workspaces to hold specific project links, research, or resources.
- **Edit / Rename Group:** Dynamic inline or modal-based editing of the group name, emoji, and accent color.
- **Delete Group:** Permanently removes a custom group. Includes inline confirmation to prevent accidental deletion.
- **Pin Group:** "Stars" a group, elevating it to a high-priority section at the top of the Custom Groups list.
- **Expand / Collapse:** Accordion-style layout that hides or reveals the internal tab grid for better dashboard density.

### C. Floating Group Editor (CRITICAL FEATURE)
The Floating Group Editor acts as an incredibly powerful workspace staging area.
- **Floating Panel (Non-Blocking):** Exists on a high z-index layer (`position: fixed`) allowing the user to continue interacting with the underlying dashboard while editing a group.
- **Draggable Behavior:** The user can grab the panel header and reposition it anywhere on the screen.
- **Resizable Behavior:** Supports dynamic resizing from the bottom, right, and bottom-right edges to accommodate large lists of URLs.
- **Save vs Cancel Logic:** Edits are performed in a temporary localized state. Changes only persist to Chrome Storage when the user clicks "Save Group". Clicking "Cancel" reverts all uncommitted modifications.
- **Drag-and-Drop Integration:** Users can literally drag tabs directly out of the dashboard grid and drop them into the floating panel's dropzone.
- **Multi-Tab Support:** Allows dragging multiple selected tabs simultaneously into the editor.
- **Smart Domain Suggestion inside Empty Group:** When creating a *new* group that has no tabs, the editor scans all existing saved sessions and suggests "Domain Clusters" (e.g., all `github.com` tabs). Clicking a suggestion instantly auto-fills the editor with those tabs.

### D. Drag & Drop + Multi Select
- **Single Select:** Clicking a tab row selects it.
- **Shift-Select Range:** Standard OS-level shift-clicking selects a contiguous range of tabs within a session or group.
- **Multi-Select Drag:** When multiple tabs are selected, dragging any one of them will move the entire selected cluster.
- **Drop into Floating Panel:** The primary destination for dragged tabs. 
- **Duplicate Prevention:** When tabs are dropped, the system verifies URLs to prevent duplicate entries within the target group.

### E. Smart Domain Grouping
- **Domain Detection:** The system automatically parses the root domain from URLs (stripping subdomains and paths).
- **Suggestions Only When Group Empty:** To avoid interfering with manual curation, domain cluster suggestions only appear as a "quick start" mechanism for entirely empty groups.
- **Auto-fill Behavior:** Clicking a domain suggestion aggregates all matching URLs from the dashboard and populates the editor state.
- **Removal After First Tab Added:** Once a tab is manually added to the group, the suggestions instantly disappear to maximize vertical space for the active list.

### F. Dashboard UI
The Dashboard is a full-page (`dashboard.html`) high-density "Control Room" aesthetic.
- **Sections:**
  - **Quick Actions:** A sticky top grid of one-click utility functions.
  - **Latest Session:** A dedicated, highlighted card for the most recent workflow.
  - **Custom Groups:** The persistent, user-defined workspace area.
  - **All Sessions:** A chronological list of historical saved sessions.
- **Expandable Cards:** Clean UI leveraging CSS Grid transitions (`grid-template-rows: 0fr -> 1fr`) for smooth expansion.
- **Tab Display:** Each tab is rendered as a distinct row containing the Favicon, Title, and Domain pill, truncating gracefully on small screens.

### G. Quick Actions Panel
- **Find Playing Tabs:** Scans all active browser tabs using `chrome.tabs.query({audible: true})`. If found, opens a modal listing them with a "Go" button to jump to the tab. If none are playing, displays a lightweight toast.
- **Mute / Unmute All Tabs:** Bulk iterates through all active Chrome tabs and toggles the `muted` property via the Chrome API.
- **Close All Tabs:** Aggressive sweep—closes all tabs except the currently active one (which is usually the dashboard).
- **Restore Latest Session:** Identifies the session with the highest `createdAt` timestamp and spawns a new window with its URLs.
- **Save Current Window / Save All Windows:** Triggers the background service worker to perform the aggregation and closing routine directly from the dashboard.

### H. Search & Filtering
- **Real-Time Filtering:** An instant search bar at the top of the dashboard.
- **Matching Criteria:** As the user types, the system performs a case-insensitive check against:
  - Tab `title`
  - Tab `domain`
  - Group/Session `name`
- The UI dynamically filters out non-matching tabs, and hides entirely empty groups from the view during the search state.

### I. Bulk Actions
When tabs are selected via shift-click:
- A fixed, floating "Action Bar" appears at the bottom of the screen.
- **Open Selected:** Opens the selected batch in a new window.
- **Move to Group:** A dropdown allows routing the selected tabs directly into a specific Custom Group, bypassing the drag-and-drop flow entirely.
- **Remove Selected:** Deletes the specific tabs from their parent session/group permanently.

### J. UX Enhancements
- **Hover States:** Distinct background color changes and icon appearances to indicate interactivity.
- **Animations:** Custom cubic-bezier transitions for layout mounting and staggered fade-ins for cards upon load.
- **Non-Blocking Interactions:** Modals and panels use `pointer-events` trapping specifically so they overlay cleanly without interfering with data beneath them unless intended.
- **Command Palette:** Pressing `Cmd/Ctrl + K` brings up an Omni-search palette for power users.

---

## 3. Data Models

GenTabs utilizes highly flat, optimized data structures stored as JSON objects.

### Tab Interface
```typescript
export interface Tab {
  url: string;         // The full destination URL
  title: string;       // Page title (used for display and search)
  favicon: string;     // URL to the site's favicon (usually base64 or a direct link)
  domain: string;      // The parsed root domain (e.g., 'github.com') - used for clustering
  lastAccessed?: number; // Optional tracking of tab usage
  note?: string;       // User-defined context attached to a tab
  readTime?: number;   // Estimated read time for articles
}
```

### Group Interface (Used for both Sessions and Custom Groups)
```typescript
export interface Group {
  id: string;          // Unique UUID for the group
  name: string;        // The display title ('Session - 12:00 PM' or 'Project X')
  createdAt: number;   // Epoch timestamp for sorting
  tabs: Tab[];         // Array of Tab objects contained within
  
  // Custom Group Specific Modifiers
  windowScope?: 'current' | 'all'; // Whether the session grabbed one or all windows
  isPinned?: boolean;              // "Starred" status to push to the top of the UI
  customName?: boolean;            // Flag indicating the user manually renamed it
  emoji?: string;                  // A visual icon for the Custom Group
  color?: string;                  // Hex code for the left-border accent color
  schedule?: {
    onLaunch?: boolean;
    dailyTime?: string;
  };
}
```

---

## 4. Architecture

The codebase follows a modular React + Vite architecture strictly separated by responsibility.

### Folder Structure
```
src/
├── api/          # Chrome API abstractions (storage.api.ts, tabs.api.ts)
├── background/   # Service Worker scripts (serviceWorker.ts)
├── core/         # Pure logic and data manipulation (sweep.ts)
├── dashboard/    # React UI components (Dashboard.tsx, index.tsx)
├── popup/        # The lightweight extension popup (Popup.tsx)
├── types/        # TypeScript interfaces and type definitions
└── utils/        # Helpers (analytics, toasts, domain parsers)
```

### Layer Responsibilities
- **API Layer (`api/`):** Acts as the bridge. Contains all `chrome.storage.local` read/write operations and `chrome.tabs` queries. Abstracts the asynchronous Chrome APIs into standard Promises.
- **Core Logic (`core/`):** Pure functions that handle the heavy lifting of processing tabs, grouping by domain, and constructing the `Group` data structures.
- **Service Worker (`background/`):** The orchestrator. Listens for messages from the Popup or Dashboard (e.g., `SAVE_CURRENT_SESSION`), executes the `core` logic, updates the `api`, and then triggers the Chrome tab closures. It is stateless and event-driven.
- **UI (`dashboard/`):** A robust React application running in a full-page Chrome tab. Handles local state (drag-and-drop, modals, search) and subscribes to data loaded from the API layer.

---

## 5. Chrome Extension Details

GenTabs is built exclusively on **Manifest V3**.

- **Service Worker (Stateless Nature):** Because V3 requires service workers that spin up and die as needed, GenTabs relies purely on `chrome.storage.local` as the source of truth. No persistent variables are kept in the background script memory.
- **chrome.tabs API:** Heavily utilized to read active tabs (`query`), detect audio (`audible: true`), close tabs (`remove`), and mute/unmute (`update`).
- **chrome.storage.local:** Chosen over `sync` because Tab datasets can easily exceed the strict quota limits of Chrome Sync (which is capped at ~100KB). Local storage allows up to 5MB (or unlimited with the `unlimitedStorage` permission), making it ideal for storing large arrays of URLs and Base64 Favicons.
- **Constraint Handling:** Chrome APIs are asynchronous. The UI handles this by utilizing loading states and optimistic UI updates (updating React state immediately while the Chrome API resolves in the background).

---

## 6. Tech Stack (Detailed)

- **TypeScript:** Critical for type safety across complex JSON structures. Prevents bugs when passing heavily nested `Tab` arrays between the background worker and the React UI.
- **React (18.x):** Chosen for its component-based architecture and robust state management. Perfect for handling complex interactions like drag-and-drop, real-time filtering, and conditional modal rendering.
- **Vite:** An incredibly fast build tool. Because Chrome Extensions require specific output formats (multiple entry points: `popup.html`, `dashboard.html`, `background.js`), Vite's Rollup under-the-hood allows for explicit, highly optimized multi-page bundling.
- **Chrome APIs:** Native browser integrations required for tab manipulation and storage.

---

## 7. Development Journey (Step by Step)

The architecture of GenTabs evolved significantly to solve increasingly complex UX problems:

1. **Basic Tab Sweeping Idea:** The initial prototype was a simple script to close all tabs and save their URLs.
2. **Saving Sessions:** Implemented `chrome.storage.local` to structure the raw URLs into chronological "Sessions".
3. **Removing Auto-Close Behavior:** Originally, the extension forced an auto-close on launch. This was removed to give users manual control over *when* sweeping occurs, improving user trust.
4. **Adding Dashboard:** A full-page React app was introduced because the standard Extension Popup (max 800x600px) was too restrictive to display complex session histories.
5. **Adding Custom Groups:** Realized that chronologically sorting tabs isn't enough; users need thematic workspaces. Custom Groups were added as a distinct entity parallel to Sessions.
6. **Drag-Drop Implementation:** To bridge the gap between "Sessions" (inbox) and "Custom Groups" (organized storage), native HTML5 drag-and-drop was integrated to allow transferring tabs.
7. **Domain Grouping:** Recognizing that organizing 100+ tabs manually is tedious, algorithmic domain clustering was added to suggest groups based on URL roots.
8. **Search & Filtering:** As the database grew, a fast, client-side text filtering system was implemented to parse titles and domains instantly.
9. **Quick Actions:** Added global utilities (Mute all, Find Playing) recognizing that a tab manager should also act as an immediate browser controller.
10. **Floating Group Editor:** *A major architectural pivot.* Instead of routing the user to a separate "Edit Page", a Draggable/Resizable Floating Panel was created. This allows users to view their dashboard data while simultaneously editing a group.
11. **Multi-Select System:** Implemented Shift-Click arrays to allow bulk dragging and bulk deletion, drastically reducing the time needed to organize large sessions.
12. **UX Refinements:** Fixed complex React z-index issues by hoisting modals out of the dashboard layout tree, transitioned buttons to clean SVGs, and reinforced event propagation logic to ensure modals and overlays never conflict with the background.

---

## 8. Design Decisions

- **Why not use native Chrome Tab Groups?** Chrome Tab Groups are ephemeral and tied directly to open windows. GenTabs is designed for *offline memory*—saving tabs into long-term storage and freeing up active RAM.
- **Why a Floating Panel instead of a Modal?** Editing a group requires context. If an opaque modal covers the screen, the user can't see the tabs they want to drag into the group. The floating panel enables side-by-side workflow.
- **Why a Drag-Drop + Button Hybrid?** Drag-and-drop is great for desktop users with a mouse, but bulk-action buttons (the fixed bottom bar) are faster for moving massive amounts of tabs and work better on trackpads.
- **Why is the Storage Structure Flat?** Instead of nesting tabs deeply, keeping standard arrays of objects makes filtering (`Array.filter()`) and React rendering (`.map()`) highly performant.

---

## 9. Edge Cases Handled

- **Duplicate Tabs:** The `Find Dupes` tool specifically parses URLs, strips trailing slashes, and ignores `#hash` fragments to accurately identify genuinely duplicate pages. The Drag-and-Drop system prevents pushing an already-existing URL into a Custom Group.
- **Missing Favicons:** The system detects `undefined` or `chrome://` favicons and provides a default fallback icon to prevent broken `<img>` tags.
- **Undefined URLs:** Standard Chrome new tabs (`chrome://newtab`) or empty pages are filtered out during the sweep process so they don't pollute saved sessions.
- **Large Number of Tabs:** The UI utilizes standard React virtualization concepts, hiding nested tabs behind an accordion (`grid-template-rows: 0fr`) to ensure DOM rendering doesn't freeze when 500+ tabs are stored.
- **Multi-Window Handling:** Distinguishes between `chrome.windows.WINDOW_ID_CURRENT` and `chrome.tabs.query({})` to accurately save either the immediate context or the global OS context.

---

## 10. Future Improvements

- **Cloud Sync Configuration:** Utilizing `chrome.storage.sync` strictly for the *Group Schema* (while keeping the massive Tab arrays local) to allow users to share their workspace definitions across machines.
- **AI Grouping:** Hooking into an LLM API to analyze page titles and categorize tabs by contextual topic (e.g., "React Documentation", "Flight Bookings") instead of just raw domains.
- **Workspace Mode:** The ability to "Swap" workspaces—saving the currently open tabs to a session, and instantly restoring a Custom Group in its place, acting as a complete context-switch.
- **Advanced Command Palette:** Expanding `Cmd+K` beyond simple search to execute commands (e.g., `> mute all`, `> save session`).
