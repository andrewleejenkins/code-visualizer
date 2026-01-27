# Code Visualizer

An interactive tool for exploring and understanding codebases visually. Point it at any project and get instant insights into the architecture, dependencies, and structure.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Visual Exploration
- **Dependency Graph** - See how files import and depend on each other
- **Component Tree** - Browse React components organized by directory
- **Route Map** - Visualize API routes and pages with HTTP method indicators
- **Model Diagram** - View database models and relationships (Prisma)

### Smart Insights
- **Start Here Guide** - Identifies the best files to read first when learning a codebase
- **Feature Detection** - Automatically groups files by feature (auth, API, UI, etc.)
- **Tech Stack Analysis** - Detects frameworks, libraries, and tools in use
- **Health Dashboard** - Shows codebase metrics, hub files, and largest files
- **Glossary** - Explains technical terms found in the code

### Developer Experience
- **Plain English Mode** - Toggle technical jargon for beginner-friendly explanations
- **Code Viewer** - Read source code with smart file descriptions
- **Search & Filter** - Quickly find files, components, and routes
- **File Importance Badges** - Visual indicators for critical files (⭐ Start Here, 🔥 Hub, 🏷️ Feature)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/andrewleejenkins/code-visualizer.git
cd code-visualizer

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click **"Choose a Folder"** or enter a project path
2. The visualizer analyzes the codebase structure automatically
3. Use the sidebar to browse files and components
4. Click items to see details, descriptions, and source code
5. Switch to the **Insights** tab for architecture overview
6. Toggle **"Plain English"** mode for beginner-friendly descriptions

## What Gets Analyzed

| Feature | Detection |
|---------|-----------|
| API Routes | Next.js App Router (`app/api/**/route.ts`) and Pages Router (`pages/api/**`) |
| Components | `.tsx` and `.jsx` files with React component patterns |
| Models | Prisma schema (`prisma/schema.prisma`) |
| Dependencies | ES module imports (relative and `@/` alias) |
| Config Files | `*.config.*`, `.*rc`, environment files |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Diagrams**: Mermaid.js
- **State**: Zustand
- **Language**: TypeScript

## Design

Uses the Styline design system:
- Dark mode optimized UI
- Red-based brand palette (#f91a1a, #8b0000)
- Sharp corners for containers, pill buttons
- Typography: Outfit (headings), Inter Tight (body), JetBrains Mono (code)

## Project Structure

```
code-visualizer/
├── app/
│   ├── api/                 # Analysis API routes
│   │   ├── analyze/         # Codebase analyzer
│   │   ├── insights/        # Smart insights generator
│   │   └── read-file/       # File reader with descriptions
│   ├── globals.css          # Styline design tokens
│   └── page.tsx             # Main entry point
├── components/architecture/
│   ├── ExplorerLayout.tsx   # Main layout with header
│   ├── TreeSidebar.tsx      # File tree navigation
│   ├── DetailPanel.tsx      # File details & insights
│   ├── CodeViewer.tsx       # Source code modal
│   ├── FolderPicker.tsx     # Project selector
│   └── ...                  # Diagram components
└── lib/
    ├── store.ts             # Zustand state
    └── types.ts             # TypeScript definitions
```

## License

MIT
