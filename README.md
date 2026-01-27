# Code Visualizer

Interactive architecture dashboard for visualizing codebases.

## Features

- **API Routes**: HTTP endpoints organized by feature with auth indicators
- **Components**: React components with client/server type detection
- **Database Models**: Prisma schema visualization with ER diagrams
- **Dependencies**: Import relationships between files

## Quick Start

```bash
# Install dependencies
npm install

# Analyze a codebase (CLI)
npm run analyze /path/to/your/project

# Start the dashboard
npm run dev
```

Then open http://localhost:3000

## Usage

### CLI Analysis

Generate analysis data for instant dashboard loading:

```bash
npm run analyze /path/to/project
```

This creates JSON files in `public/data/` that the dashboard loads instantly.

### Web UI Analysis

1. Start the dev server: `npm run dev`
2. Enter a folder path in the web interface
3. Click "Analyze Codebase"

## What Gets Analyzed

| Feature | Detection |
|---------|-----------|
| API Routes | Next.js App Router (`app/api/**/route.ts`) and Pages Router (`pages/api/**`) |
| Components | `.tsx` and `.jsx` files starting with uppercase |
| Models | Prisma schema (`prisma/schema.prisma`) |
| Dependencies | ES module imports (relative and `@/` alias) |

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS 4
- Mermaid.js (diagrams)
- Zustand (state)
