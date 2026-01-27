"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { CodeViewer } from "./CodeViewer";
import type {
  RouteInfo,
  ComponentInfo,
  ModelInfo,
  NodeInfo,
  AnalysisResult,
  InsightsData,
} from "@/lib/types";

// ============================================================================
// HELPER FUNCTIONS (Module-level for reuse across components)
// ============================================================================

// Smart file/component description generator
function getSmartFileDescription(name: string, dir: string, type: string, friendly: boolean): string {
  // Config files
  if (name.includes('config') || name.includes('.config') || name.includes('rc')) {
    const configType = getConfigType(name);
    if (friendly) {
      return `This is a settings file that tells ${configType.what} how to behave. ${configType.friendlyExplain}`;
    }
    return `Configuration file for ${configType.tool}. ${configType.techExplain}`;
  }

  // Service Workers
  if (name.includes('sw') || name.includes('service-worker') || name.includes('serviceworker')) {
    if (friendly) {
      return "This is a background helper that makes the app work offline and load faster. It's like a personal assistant that saves things locally so you don't have to wait for the internet.";
    }
    return "Service Worker for offline functionality and caching. Intercepts network requests and can serve cached responses.";
  }

  // Workbox files
  if (name.includes('workbox')) {
    if (friendly) {
      return "This helps the app work offline by saving things to your device. It's like keeping a copy of a book at home so you don't need the library.";
    }
    return "Workbox configuration for service worker caching strategies and offline support.";
  }

  // Index/barrel files
  if (name === 'index' || name === 'index.ts' || name === 'index.tsx') {
    if (friendly) {
      return "This is like a reception desk - it organizes and exports everything from this folder so other parts of the app can find them easily.";
    }
    return "Barrel file that re-exports module contents for cleaner imports.";
  }

  // App component
  if (name === 'app' || name === 'app.tsx' || name === 'app.jsx') {
    if (friendly) {
      return "This is the main container of the entire application - like the building that holds all the rooms. Everything else lives inside this.";
    }
    return "Root application component. Wraps all other components and typically handles global state/providers.";
  }

  // Error Boundary
  if (name.includes('error') && name.includes('boundary')) {
    if (friendly) {
      return "This is a safety net that catches problems before they crash the whole app. If something breaks, it shows a friendly error message instead of a blank screen.";
    }
    return "Error boundary component for graceful error handling. Catches JavaScript errors in child components.";
  }

  // Modal components
  if (name.includes('modal') || name.includes('dialog')) {
    const modalType = extractFeatureName(name, ['modal', 'dialog']);
    if (friendly) {
      return `This creates a popup window for ${modalType || 'displaying content'}. It appears on top of everything else to get your attention.`;
    }
    return `Modal/dialog component${modalType ? ` for ${modalType}` : ''}. Renders overlay content above the main UI.`;
  }

  // Form components
  if (name.includes('form') || name.includes('input')) {
    const formType = extractFeatureName(name, ['form', 'input']);
    if (friendly) {
      return `This is a form for ${formType || 'collecting information'}. It's where users type in data like filling out a paper form.`;
    }
    return `Form component${formType ? ` for ${formType}` : ''}. Handles user input and form submission.`;
  }

  // Button components
  if (name.includes('button') || name.includes('btn')) {
    const btnType = extractFeatureName(name, ['button', 'btn']);
    if (friendly) {
      return `This is a clickable button${btnType ? ` for ${btnType}` : ''}. When users click it, something happens - like submitting a form or navigating somewhere.`;
    }
    return `Button component${btnType ? ` for ${btnType}` : ''}. Handles click interactions.`;
  }

  // List/Grid components
  if (name.includes('list') || name.includes('grid') || name.includes('table')) {
    const listType = extractFeatureName(name, ['list', 'grid', 'table']);
    if (friendly) {
      return `This displays ${listType || 'items'} in an organized way - like a menu or spreadsheet that's easy to scan.`;
    }
    return `List/Grid component for displaying ${listType || 'collections of items'}. Renders data in a structured layout.`;
  }

  // Card components
  if (name.includes('card')) {
    const cardType = extractFeatureName(name, ['card']);
    if (friendly) {
      return `This is a card that shows ${cardType || 'information'} in a neat box - like a playing card or business card with organized info.`;
    }
    return `Card component for displaying ${cardType || 'content'} in a contained, styled box.`;
  }

  // Navigation components
  if (name.includes('header') || name.includes('navbar') || name.includes('nav') || name.includes('navigation')) {
    if (friendly) {
      return "This is the navigation bar - like a table of contents that helps you get around the app.";
    }
    return "Navigation/header component. Contains site navigation, logo, and possibly user actions.";
  }

  // Sidebar components
  if (name.includes('sidebar') || name.includes('drawer')) {
    if (friendly) {
      return "This is a side panel that can show menus, filters, or extra options - like a sliding drawer in furniture.";
    }
    return "Sidebar/drawer component for secondary navigation or contextual content.";
  }

  // Loading components
  if (name.includes('loading') || name.includes('spinner') || name.includes('skeleton')) {
    if (friendly) {
      return "This shows a loading animation while waiting for something to finish - like a 'please wait' sign.";
    }
    return "Loading state component. Displays placeholder or animation during async operations.";
  }

  // Auth components
  if (name.includes('login') || name.includes('signin') || name.includes('auth')) {
    if (friendly) {
      return "This handles signing into the app - the door with a keyhole that checks who you are.";
    }
    return "Authentication component for user login/signup flow.";
  }

  // Admin components
  if (name.includes('admin')) {
    if (friendly) {
      return "This is for administrators only - a control panel for managing the app behind the scenes.";
    }
    return "Admin component for privileged user management and configuration.";
  }

  // Hooks
  if (name.startsWith('use') || dir.includes('hook')) {
    const hookName = name.replace(/^use/, '').replace(/hook$/i, '');
    if (friendly) {
      return `This is a reusable helper that adds ${hookName || 'special'} functionality to components - like a power-up they can use.`;
    }
    return `Custom React hook${hookName ? ` for ${hookName}` : ''}. Encapsulates reusable stateful logic.`;
  }

  // Store/State
  if (name.includes('store') || name.includes('state') || name.includes('context')) {
    if (friendly) {
      return "This is the app's memory - it stores information that multiple parts of the app need to share and remember.";
    }
    return "State management module. Handles global application state and data flow.";
  }

  // Generator components
  if (name.includes('generator') || name.includes('generate')) {
    const genType = extractFeatureName(name, ['generator', 'generate']);
    if (friendly) {
      return `This creates ${genType || 'something new'} - like a factory that produces ${genType || 'content'}.`;
    }
    return `Generator component/module for creating ${genType || 'dynamic content'}.`;
  }

  // Output/Display components
  if (name.includes('output') || name.includes('display') || name.includes('preview')) {
    const outputType = extractFeatureName(name, ['output', 'display', 'preview']);
    if (friendly) {
      return `This shows ${outputType || 'results'} to the user - like a display screen or output window.`;
    }
    return `Display component for rendering ${outputType || 'output content'}. Read-only content presentation.`;
  }

  // Selector components
  if (name.includes('selector') || name.includes('picker') || name.includes('select')) {
    const selectorType = extractFeatureName(name, ['selector', 'picker', 'select']);
    if (friendly) {
      return `This lets users choose ${selectorType || 'an option'} from a list - like a dropdown menu.`;
    }
    return `Selection component for choosing ${selectorType || 'values'} from available options.`;
  }

  // Counter components
  if (name.includes('count') || name.includes('counter')) {
    const countType = extractFeatureName(name, ['count', 'counter']);
    if (friendly) {
      return `This counts and displays ${countType || 'numbers'} - like a tally or scorekeeper.`;
    }
    return `Counter component for displaying ${countType || 'numeric values'}.`;
  }

  // Image components
  if (name.includes('image') || name.includes('avatar') || name.includes('icon')) {
    if (friendly) {
      return "This displays images or icons on the screen.";
    }
    return "Media component for rendering images. Handles display and optimization.";
  }

  // Default fallback based on type
  if (type === "component") {
    const componentName = name.replace(/\.tsx?$/, '').replace(/component$/i, '');
    if (friendly) {
      return `This is a ${formatComponentName(componentName)} component - a reusable building block that displays something specific in the UI.`;
    }
    return `React component: ${formatComponentName(componentName)}. Part of the application UI.`;
  }

  if (type === "lib") {
    if (friendly) {
      return "This is a utility module from the app's toolbox - it provides helpful functions for other parts of the app.";
    }
    return "Library module providing utility functions and shared logic.";
  }

  if (type === "api") {
    if (friendly) {
      return "This is an API endpoint - a doorway where the app sends and receives data from servers.";
    }
    return "API endpoint handler for server-side request processing.";
  }

  // Ultimate fallback
  if (friendly) {
    return `This is part of the app's code that helps with ${name.replace(/[-_]/g, ' ')} functionality.`;
  }
  return `Source file in the ${dir} directory.`;
}

// Extract feature name from a compound name
function extractFeatureName(name: string, suffixes: string[]): string {
  let cleanName = name.toLowerCase();
  for (const suffix of suffixes) {
    cleanName = cleanName.replace(suffix, '');
  }
  cleanName = cleanName.replace(/[-_]/g, ' ').trim();
  return cleanName ? formatComponentName(cleanName) : '';
}

// Format component name for readability
function formatComponentName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
}

// Get config file type information
function getConfigType(name: string): { tool: string; what: string; friendlyExplain: string; techExplain: string } {
  const lower = name.toLowerCase();

  if (lower.includes('postcss')) {
    return {
      tool: 'PostCSS',
      what: 'the CSS processor',
      friendlyExplain: 'PostCSS transforms your CSS - it can add browser prefixes, optimize styles, and enable modern CSS features.',
      techExplain: 'Configures PostCSS plugins for CSS transformation, including autoprefixer and Tailwind CSS.'
    };
  }
  if (lower.includes('tailwind')) {
    return {
      tool: 'Tailwind CSS',
      what: 'the styling system',
      friendlyExplain: 'Tailwind provides ready-made CSS classes like "text-red-500" so you don\'t have to write custom CSS.',
      techExplain: 'Defines Tailwind CSS configuration including theme customization, plugins, and content paths.'
    };
  }
  if (lower.includes('eslint')) {
    return {
      tool: 'ESLint',
      what: 'the code quality checker',
      friendlyExplain: 'ESLint scans your code for mistakes and bad practices - like a spell-checker for programming.',
      techExplain: 'Configures linting rules for JavaScript/TypeScript code quality and consistency.'
    };
  }
  if (lower.includes('typescript') || lower.includes('tsconfig')) {
    return {
      tool: 'TypeScript',
      what: 'the TypeScript compiler',
      friendlyExplain: 'TypeScript adds type-checking to JavaScript to catch errors before they happen - like a safety net.',
      techExplain: 'Configures TypeScript compiler options including strictness level and module resolution.'
    };
  }
  if (lower.includes('next')) {
    return {
      tool: 'Next.js',
      what: 'the web framework',
      friendlyExplain: 'Next.js is the framework that makes this React app work - it handles routing, optimization, and more.',
      techExplain: 'Configures Next.js build settings, redirects, headers, and runtime behavior.'
    };
  }
  if (lower.includes('babel')) {
    return {
      tool: 'Babel',
      what: 'the JavaScript compiler',
      friendlyExplain: 'Babel translates modern JavaScript into older versions so it works in all browsers.',
      techExplain: 'Configures JavaScript transpilation presets and plugins for browser compatibility.'
    };
  }
  if (lower.includes('webpack')) {
    return {
      tool: 'Webpack',
      what: 'the build tool',
      friendlyExplain: 'Webpack bundles all the code files together into optimized packages for the browser.',
      techExplain: 'Configures module bundling, loaders, and optimization settings.'
    };
  }
  if (lower.includes('vite')) {
    return {
      tool: 'Vite',
      what: 'the build tool',
      friendlyExplain: 'Vite is a fast build tool that makes development quick and smooth.',
      techExplain: 'Configures Vite build settings, plugins, and development server.'
    };
  }

  return {
    tool: 'the application',
    what: 'some part of the app',
    friendlyExplain: 'This configuration controls how a specific feature or tool behaves.',
    techExplain: 'Application-specific configuration settings.'
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface DetailPanelProps {
  type: string | null;
  item: unknown;
  analysis: AnalysisResult;
  onSelectFile?: (file: string) => void;
}

export function DetailPanel({ type, item, analysis, onSelectFile }: DetailPanelProps) {
  const { analogyMode, complexityLevel } = useAppStore();
  const [activeTab, setActiveTab] = useState<"selected" | "insights">("selected");
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Auto-switch to "selected" tab when an item is selected
  useEffect(() => {
    if (type && item) {
      setActiveTab("selected");
    }
  }, [type, item]);

  // Fetch insights when insights tab is active
  const fetchInsights = useCallback(async () => {
    if (!analysis || insights) return;

    setInsightsLoading(true);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [analysis, insights]);

  useEffect(() => {
    if (activeTab === "insights" && !insights && !insightsLoading) {
      fetchInsights();
    }
  }, [activeTab, insights, insightsLoading, fetchInsights]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] flex-shrink-0">
        <button
          onClick={() => setActiveTab("selected")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "selected"
              ? "text-[var(--accent-purple)] border-b-2 border-[var(--accent-purple)] bg-[var(--bg-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {type ? "Selected" : "Details"}
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "insights"
              ? "text-[var(--accent-green)] border-b-2 border-[var(--accent-green)] bg-[var(--bg-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <span>💡</span> Insights
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "selected" ? (
          // Selected Item Content
          !type || !item ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-4xl mb-4">👈</div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {analogyMode ? "Pick something to learn about" : "Select an item"}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                {analogyMode
                  ? "Click on anything in the sidebar to see what it does and how it connects to other parts."
                  : "Click on any item in the sidebar to view its details and relationships."}
              </p>
              <button
                onClick={() => setActiveTab("insights")}
                className="mt-4 px-4 py-2 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded-lg text-sm hover:bg-[var(--accent-green)]/30 transition-colors"
              >
                💡 View Project Insights
              </button>
            </div>
          ) : (
            <>
              {type === "route" && (
                <RouteDetail route={item as RouteInfo} analogyMode={analogyMode} complexity={complexityLevel} />
              )}
              {type === "component" && (
                <ComponentDetail
                  component={item as ComponentInfo}
                  analysis={analysis}
                  analogyMode={analogyMode}
                  complexity={complexityLevel}
                />
              )}
              {type === "model" && (
                <ModelDetail
                  model={item as ModelInfo}
                  analysis={analysis}
                  analogyMode={analogyMode}
                  complexity={complexityLevel}
                />
              )}
              {type === "file" && (
                <FileDetail
                  file={item as NodeInfo}
                  analysis={analysis}
                  analogyMode={analogyMode}
                  complexity={complexityLevel}
                />
              )}
              {type === "module" && (
                <ModuleDetail
                  module={item as ModuleItem}
                  analysis={analysis}
                  analogyMode={analogyMode}
                  complexity={complexityLevel}
                />
              )}
            </>
          )
        ) : (
          // Insights Content
          <InsightsSidebar
            insights={insights}
            loading={insightsLoading}
            analogyMode={analogyMode}
            onSelectFile={onSelectFile}
          />
        )}
      </div>
    </div>
  );
}

// Module item type
interface ModuleItem {
  id: string;
  name: string;
  friendlyName: string;
  items: Array<{ id: string; label: string; data: unknown }>;
  category: string;
}

// Module Detail Component
function ModuleDetail({
  module,
  analysis,
  analogyMode,
  complexity,
}: {
  module: ModuleItem;
  analysis: AnalysisResult;
  analogyMode: boolean;
  complexity: number;
}) {
  // Get module description based on name, category, and contents
  const getModuleDescription = () => {
    const name = module.name.toLowerCase();
    const count = module.items.length;
    const itemNames = module.items.map(i => i.label.toLowerCase());

    // Analyze what's in the folder to generate smart descriptions
    const hasAuth = itemNames.some(n => n.includes('auth') || n.includes('login') || n.includes('signin'));
    const hasForm = itemNames.some(n => n.includes('form') || n.includes('input'));
    const hasButton = itemNames.some(n => n.includes('button') || n.includes('btn'));
    const hasModal = itemNames.some(n => n.includes('modal') || n.includes('dialog'));
    const hasCard = itemNames.some(n => n.includes('card'));
    const hasList = itemNames.some(n => n.includes('list') || n.includes('grid') || n.includes('table'));
    const hasNav = itemNames.some(n => n.includes('nav') || n.includes('header') || n.includes('sidebar'));
    const hasImage = itemNames.some(n => n.includes('image') || n.includes('avatar') || n.includes('icon'));
    const hasLoading = itemNames.some(n => n.includes('loading') || n.includes('spinner') || n.includes('skeleton'));
    const hasError = itemNames.some(n => n.includes('error') || n.includes('boundary'));
    const hasGenerator = itemNames.some(n => n.includes('generator') || n.includes('generate'));
    const hasOutput = itemNames.some(n => n.includes('output') || n.includes('display') || n.includes('preview'));

    // Build a summary of what's in the folder
    const contentTypes: string[] = [];
    if (hasAuth) contentTypes.push(analogyMode ? 'login/security features' : 'authentication');
    if (hasForm) contentTypes.push(analogyMode ? 'forms for user input' : 'form components');
    if (hasButton) contentTypes.push(analogyMode ? 'clickable buttons' : 'button components');
    if (hasModal) contentTypes.push(analogyMode ? 'popup windows' : 'modal dialogs');
    if (hasCard) contentTypes.push(analogyMode ? 'info cards' : 'card components');
    if (hasList) contentTypes.push(analogyMode ? 'lists and tables' : 'list/grid views');
    if (hasNav) contentTypes.push(analogyMode ? 'navigation menus' : 'navigation components');
    if (hasImage) contentTypes.push(analogyMode ? 'images and icons' : 'media components');
    if (hasLoading) contentTypes.push(analogyMode ? 'loading indicators' : 'loading states');
    if (hasError) contentTypes.push(analogyMode ? 'error handling' : 'error boundaries');
    if (hasGenerator) contentTypes.push(analogyMode ? 'content generators' : 'generator utilities');
    if (hasOutput) contentTypes.push(analogyMode ? 'output displays' : 'display components');

    // Smart folder descriptions based on common patterns
    const getFolderDescription = (): string => {
      const key = module.id.replace("comp-dir-", "").replace("route-feature-", "").replace("model-group-", "").replace("file-dir-", "");

      if (analogyMode) {
        // Friendly descriptions for common folder names
        const friendlyFolders: Record<string, string> = {
          // Top-level directories
          "client": `The browser-side code (${count} files). Everything that runs on the user's device - the visual interface they interact with.`,
          "server": `The behind-the-scenes code (${count} files). Runs on the web server, handles data, and keeps things secure.`,
          "public": `Files anyone can access directly (${count} files). Images, fonts, and other assets that browsers can download.`,
          "src": `The main source code (${count} files). Where all the actual application code lives.`,
          "app": `The pages of your app (${count} files). Each file here becomes a page visitors can navigate to.`,
          "pages": `The pages of your app (${count} files). Each file here becomes a page visitors can navigate to.`,
          "api": `The doorways for data (${count} files). These handle requests from the browser to get or save information.`,

          // Component directories
          "components": `Building blocks (${count} pieces). Reusable visual pieces that snap together to create the interface.`,
          "ui": `Basic UI pieces (${count} items). Simple, reusable elements like buttons, inputs, and cards - the LEGO bricks of your app.`,
          "layout": `Page structure (${count} pieces). The frame that holds everything - headers, footers, sidebars, and page layouts.`,
          "common": `Shared pieces (${count} items). Components used in many different places throughout the app.`,
          "shared": `Shared pieces (${count} items). Components used in many different places throughout the app.`,
          "features": `Feature-specific code (${count} items). Each subfolder handles a distinct feature or section of the app.`,

          // Utility directories
          "lib": `The toolbox (${count} tools). Helper code that other parts of the app use - utilities, configurations, and shared logic.`,
          "utils": `Utility functions (${count} helpers). Small, reusable functions for common tasks like formatting dates or validating data.`,
          "helpers": `Helper functions (${count} items). Code that makes other code's job easier - calculations, transformations, shortcuts.`,
          "hooks": `React superpowers (${count} hooks). Reusable behaviors that components can "plug into" - like data fetching or form handling.`,
          "services": `Service workers (${count} services). Code that talks to external APIs, databases, or handles background tasks.`,
          "actions": `Server actions (${count} actions). Functions that run on the server when users do things like submit forms.`,

          // State management
          "store": `The app's memory (${count} files). Where the app stores information that multiple parts need to share.`,
          "state": `Application state (${count} files). The central place that remembers what's happening across the whole app.`,
          "context": `Shared information (${count} contexts). Data that gets passed down through the app without manually threading it everywhere.`,
          "redux": `State management (${count} files). A predictable container for app state using Redux.`,
          "zustand": `State management (${count} files). Lightweight state management using Zustand.`,

          // Styling
          "styles": `Visual styling (${count} files). CSS and style files that control colors, fonts, spacing, and how things look.`,
          "css": `Stylesheets (${count} files). The files that make your app look good - colors, layouts, animations.`,
          "themes": `Theme configurations (${count} files). Different visual styles your app can switch between (like dark mode).`,

          // Types and definitions
          "types": `Type definitions (${count} files). Describes the shape of data so TypeScript can catch mistakes early.`,
          "interfaces": `Data shapes (${count} files). Blueprints that define what properties objects should have.`,
          "models": `Data models (${count} models). Defines how information is structured and stored.`,

          // Testing
          "tests": `Test files (${count} tests). Automated checks that verify the code works correctly.`,
          "__tests__": `Test files (${count} tests). Automated checks that verify the code works correctly.`,
          "spec": `Test specifications (${count} specs). Detailed test cases that document expected behavior.`,

          // Configuration
          "config": `Configuration files (${count} configs). Settings that control how different tools and features behave.`,
          "constants": `Fixed values (${count} items). Values that never change - like color codes, URLs, or magic numbers.`,

          // Assets
          "assets": `Media files (${count} assets). Images, fonts, icons, and other files that aren't code.`,
          "images": `Image files (${count} images). Pictures and graphics used throughout the app.`,
          "icons": `Icon files (${count} icons). Small graphics used for buttons, menus, and visual indicators.`,
          "fonts": `Font files (${count} fonts). Custom typefaces used for text styling.`,

          // Feature-specific
          "auth": `Authentication (${count} files). Everything related to logging in, signing up, and user identity.`,
          "admin": `Admin features (${count} files). Tools and pages only administrators can access.`,
          "dashboard": `Dashboard (${count} files). The main control panel view showing key information at a glance.`,
          "settings": `Settings (${count} files). User preferences and configuration options.`,
          "profile": `User profiles (${count} files). Features for viewing and editing user information.`,
          "chat": `Chat features (${count} files). Real-time messaging functionality.`,
          "notifications": `Notifications (${count} files). Alerts and updates shown to users.`,
          "search": `Search features (${count} files). Finding and filtering content.`,
          "analytics": `Analytics (${count} files). Tracking and displaying usage data and metrics.`,
        };

        if (friendlyFolders[key]) return friendlyFolders[key];
        if (friendlyFolders[name]) return friendlyFolders[name];

        // Generate description from contents
        if (contentTypes.length > 0) {
          const contentList = contentTypes.slice(0, 3).join(', ');
          return `This folder contains ${count} items including ${contentList}. These pieces work together to handle the "${module.friendlyName}" functionality.`;
        }

        return `This folder groups ${count} related pieces for the "${module.friendlyName}" feature of your app.`;
      }

      // Technical descriptions
      const technicalFolders: Record<string, string> = {
        "client": `Client-side code (${count} files). Browser-executed JavaScript/TypeScript for UI and interactivity.`,
        "server": `Server-side code (${count} files). Node.js code for API handlers, middleware, and backend logic.`,
        "public": `Static assets (${count} files). Publicly accessible files served directly by the web server.`,
        "src": `Source directory (${count} files). Main application source code.`,
        "app": `App Router directory (${count} files). Next.js 13+ file-based routing structure.`,
        "pages": `Pages directory (${count} files). Next.js page components and API routes.`,
        "api": `API routes (${count} endpoints). Server-side request handlers for REST/GraphQL endpoints.`,
        "components": `React components (${count} components). Reusable UI building blocks.`,
        "ui": `UI primitives (${count} components). Atomic design components - buttons, inputs, cards, etc.`,
        "layout": `Layout components (${count} components). Page structure, navigation, and wrapper components.`,
        "common": `Common components (${count} components). Shared components used across features.`,
        "shared": `Shared modules (${count} files). Cross-cutting concerns and shared utilities.`,
        "lib": `Library code (${count} modules). Utility functions, configurations, and shared logic.`,
        "utils": `Utilities (${count} functions). Helper functions for common operations.`,
        "hooks": `Custom hooks (${count} hooks). Reusable React hooks for stateful logic.`,
        "services": `Service layer (${count} services). API clients, data fetching, and external integrations.`,
        "actions": `Server actions (${count} actions). Next.js server actions for form handling and mutations.`,
        "store": `State store (${count} files). Global state management configuration.`,
        "context": `React contexts (${count} contexts). Context providers for dependency injection.`,
        "styles": `Stylesheets (${count} files). CSS, SCSS, or CSS-in-JS style definitions.`,
        "types": `Type definitions (${count} types). TypeScript interfaces and type declarations.`,
        "models": `Data models (${count} models). Database schemas or domain model definitions.`,
        "tests": `Test suites (${count} tests). Unit, integration, or e2e test files.`,
        "config": `Configuration (${count} configs). App and tool configuration files.`,
        "assets": `Static assets (${count} assets). Images, fonts, and other media files.`,
        "auth": `Authentication (${count} files). Auth logic, guards, and identity management.`,
        "admin": `Admin module (${count} files). Administrative features and dashboards.`,
      };

      if (technicalFolders[key]) return technicalFolders[key];
      if (technicalFolders[name]) return technicalFolders[name];

      // Generate description from contents
      if (contentTypes.length > 0) {
        const contentList = contentTypes.slice(0, 3).join(', ');
        return `Module containing ${count} items: ${contentList}.`;
      }

      return `Directory containing ${count} files related to ${module.name}.`;
    };

    return getFolderDescription();
  };

  // Get a summary of what types of items are in this module
  const getContentSummary = () => {
    const itemNames = module.items.map(i => i.label);
    const categories: Record<string, string[]> = {};

    for (const name of itemNames) {
      const lower = name.toLowerCase();
      let category = 'Other';

      if (lower.includes('button') || lower.includes('btn')) category = 'Buttons';
      else if (lower.includes('form') || lower.includes('input') || lower.includes('select') || lower.includes('checkbox')) category = 'Forms & Inputs';
      else if (lower.includes('modal') || lower.includes('dialog') || lower.includes('popup')) category = 'Modals & Dialogs';
      else if (lower.includes('card')) category = 'Cards';
      else if (lower.includes('list') || lower.includes('grid') || lower.includes('table')) category = 'Lists & Grids';
      else if (lower.includes('nav') || lower.includes('menu') || lower.includes('header') || lower.includes('footer') || lower.includes('sidebar')) category = 'Navigation';
      else if (lower.includes('image') || lower.includes('avatar') || lower.includes('icon') || lower.includes('logo')) category = 'Media & Icons';
      else if (lower.includes('loading') || lower.includes('spinner') || lower.includes('skeleton') || lower.includes('progress')) category = 'Loading States';
      else if (lower.includes('error') || lower.includes('alert') || lower.includes('toast') || lower.includes('notification')) category = 'Feedback & Alerts';
      else if (lower.includes('auth') || lower.includes('login') || lower.includes('signup') || lower.includes('password')) category = 'Authentication';
      else if (lower.includes('chart') || lower.includes('graph') || lower.includes('analytics')) category = 'Charts & Analytics';
      else if (lower.includes('text') || lower.includes('typography') || lower.includes('heading') || lower.includes('label')) category = 'Typography';
      else if (lower.includes('layout') || lower.includes('container') || lower.includes('wrapper') || lower.includes('section')) category = 'Layout';
      else if (lower.includes('hook') || lower.startsWith('use')) category = 'Hooks';
      else if (lower.includes('util') || lower.includes('helper')) category = 'Utilities';
      else if (lower.includes('api') || lower.includes('service') || lower.includes('fetch')) category = 'API & Services';
      else if (lower.includes('config') || lower.includes('constant')) category = 'Configuration';
      else if (lower.includes('type') || lower.includes('interface')) category = 'Types';
      else if (lower.includes('context') || lower.includes('provider') || lower.includes('store')) category = 'State Management';
      else if (lower.includes('test') || lower.includes('spec')) category = 'Tests';

      if (!categories[category]) categories[category] = [];
      categories[category].push(name);
    }

    return Object.entries(categories)
      .filter(([cat]) => cat !== 'Other' || Object.keys(categories).length === 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
  };

  const contentSummary = getContentSummary();

  // Get icon for content category
  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Buttons': '🔘',
      'Forms & Inputs': '📝',
      'Modals & Dialogs': '💬',
      'Cards': '🃏',
      'Lists & Grids': '📋',
      'Navigation': '🧭',
      'Media & Icons': '🖼️',
      'Loading States': '⏳',
      'Feedback & Alerts': '🔔',
      'Authentication': '🔐',
      'Charts & Analytics': '📊',
      'Typography': '✏️',
      'Layout': '📐',
      'Hooks': '🪝',
      'Utilities': '🔧',
      'API & Services': '🌐',
      'Configuration': '⚙️',
      'Types': '📘',
      'State Management': '🧠',
      'Tests': '🧪',
      'Other': '📄',
    };
    return icons[category] || '📄';
  }

  // Get connections to other modules
  const getModuleConnections = () => {
    const connections: Array<{ targetModule: string; targetFriendly: string; count: number; direction: "out" | "in" }> = [];

    if (!analysis.dependencies) return connections;

    const moduleItemIds = new Set(module.items.map(i => i.id.replace(/^(comp-|file-)/, "")));

    // Find all edges that connect to/from this module's items
    const outgoing = new Map<string, number>();
    const incoming = new Map<string, number>();

    for (const edge of analysis.dependencies.edges) {
      const sourceInModule = moduleItemIds.has(edge.source);
      const targetInModule = moduleItemIds.has(edge.target);

      if (sourceInModule && !targetInModule) {
        // Outgoing connection
        const targetNode = analysis.dependencies.nodes.find(n => n.id === edge.target);
        if (targetNode) {
          const targetDir = targetNode.directory.split("/")[0] || "other";
          outgoing.set(targetDir, (outgoing.get(targetDir) || 0) + 1);
        }
      }

      if (!sourceInModule && targetInModule) {
        // Incoming connection
        const sourceNode = analysis.dependencies.nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          const sourceDir = sourceNode.directory.split("/")[0] || "other";
          incoming.set(sourceDir, (incoming.get(sourceDir) || 0) + 1);
        }
      }
    }

    // Convert to array
    for (const [dir, count] of outgoing) {
      connections.push({
        targetModule: dir,
        targetFriendly: getFriendlyModuleName(dir, analogyMode),
        count,
        direction: "out",
      });
    }

    for (const [dir, count] of incoming) {
      // Don't duplicate if already in outgoing
      if (!outgoing.has(dir)) {
        connections.push({
          targetModule: dir,
          targetFriendly: getFriendlyModuleName(dir, analogyMode),
          count,
          direction: "in",
        });
      }
    }

    return connections.sort((a, b) => b.count - a.count);
  };

  const connections = getModuleConnections();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">📦</span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {analogyMode ? module.friendlyName : module.name}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {analogyMode ? "A group of related pieces" : "Module"} • {module.items.length} items
          </p>
        </div>
      </div>

      {/* Description */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "What this module does" : "Description"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)]">{getModuleDescription()}</p>
        </div>
      </section>

      {/* Content Summary - categorized overview */}
      {contentSummary.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "What's inside" : "Content Breakdown"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
            {contentSummary.map(([category, items], i) => (
              <div
                key={category}
                className={`px-4 py-3 ${i !== 0 ? "border-t border-[var(--border-color)]" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    {getCategoryIcon(category)} {category}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {items.slice(0, complexity >= 3 ? 6 : 3).map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-secondary)]"
                    >
                      {item}
                    </span>
                  ))}
                  {items.length > (complexity >= 3 ? 6 : 3) && (
                    <span className="px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      +{items.length - (complexity >= 3 ? 6 : 3)} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Contents - flat list */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "All items" : "All Contents"} ({module.items.length})
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex flex-wrap gap-2">
            {module.items.slice(0, complexity >= 3 ? undefined : 12).map((item) => (
              <span
                key={item.id}
                className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-secondary)]"
              >
                {item.label}
              </span>
            ))}
            {complexity < 3 && module.items.length > 12 && (
              <span className="px-2 py-1 text-sm text-[var(--text-muted)]">
                +{module.items.length - 12} more
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Connections to other modules */}
      {connections.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Connects to" : "Module Dependencies"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
            {connections.slice(0, 6).map((conn, i) => (
              <div
                key={conn.targetModule}
                className={`px-4 py-3 flex items-center justify-between ${
                  i !== 0 ? "border-t border-[var(--border-color)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{conn.direction === "out" ? "➡️" : "⬅️"}</span>
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {conn.targetFriendly}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {analogyMode
                        ? conn.direction === "out"
                          ? "This module uses pieces from here"
                          : "Uses pieces from this module"
                        : conn.direction === "out"
                          ? "Imports from"
                          : "Imported by"}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-[var(--text-muted)]">
                  {conn.count} {analogyMode ? "connections" : "imports"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {connections.length === 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Connections" : "Dependencies"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)] text-center text-[var(--text-muted)]">
            {analogyMode
              ? "This module works independently"
              : "No cross-module dependencies detected"}
          </div>
        </section>
      )}
    </div>
  );
}

// Helper to get friendly module names
function getFriendlyModuleName(name: string, analogyMode: boolean): string {
  if (!analogyMode) return name;
  const mapping: Record<string, string> = {
    components: "Building Blocks",
    lib: "Toolbox",
    app: "Pages",
    api: "Doorways",
    hooks: "Helpers",
    utils: "Utilities",
    services: "Workers",
    styles: "Appearance",
    store: "Memory",
    context: "Shared Info",
  };
  return mapping[name.toLowerCase()] || name;
}

// Route Detail Component
function RouteDetail({
  route,
  analogyMode,
  complexity,
}: {
  route: RouteInfo;
  analogyMode: boolean;
  complexity: number;
}) {
  const methodColors: Record<string, string> = {
    GET: "text-green-400 bg-green-400/10",
    POST: "text-blue-400 bg-blue-400/10",
    PUT: "text-orange-400 bg-orange-400/10",
    PATCH: "text-yellow-400 bg-yellow-400/10",
    DELETE: "text-red-400 bg-red-400/10",
  };

  const methodExplanations: Record<string, string> = {
    GET: "Retrieves information (like looking something up)",
    POST: "Creates something new (like filling out a form)",
    PUT: "Replaces something completely (like rewriting a document)",
    PATCH: "Updates part of something (like editing a paragraph)",
    DELETE: "Removes something (like throwing away a file)",
  };

  const authExplanations: Record<string, { label: string; friendly: string }> = {
    public: { label: "Public", friendly: "Anyone can use this" },
    protected: { label: "Protected", friendly: "Only logged-in users can use this" },
    admin: { label: "Admin Only", friendly: "Only administrators can use this" },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">🚪</span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {route.path}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {analogyMode ? "A doorway into your app" : "API Endpoint"}
          </p>
        </div>
      </div>

      {/* What it does */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "What it does" : "Description"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${methodColors[route.method]}`}>
              {route.method}
            </span>
            {analogyMode && (
              <span className="text-sm text-[var(--text-secondary)]">
                {methodExplanations[route.method]}
              </span>
            )}
          </div>
          <p className="text-[var(--text-primary)]">
            {analogyMode
              ? `This doorway ${methodExplanations[route.method]?.toLowerCase() || "handles requests"} for the "${route.feature}" feature.`
              : `Handles ${route.method} requests for the ${route.feature} feature.`}
          </p>
        </div>
      </section>

      {/* Access Level */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "Who can use it" : "Access Level"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {route.auth === "public" ? "🌍" : route.auth === "admin" ? "👑" : "🔒"}
            </span>
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {authExplanations[route.auth]?.label || route.auth}
              </div>
              {analogyMode && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {authExplanations[route.auth]?.friendly}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details (collapsible) */}
      {complexity >= 2 && (
        <details className="group">
          <summary className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2 cursor-pointer list-none flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Technical Details
          </summary>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)] mt-2">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">File:</span>
                <span className="text-[var(--text-primary)] font-mono">{route.file}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Feature:</span>
                <span className="text-[var(--text-primary)]">{route.feature}</span>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

// Component Detail - fetches and displays detailed analysis from API
function ComponentDetail({
  component,
  analysis,
  analogyMode,
  complexity,
}: {
  component: ComponentInfo;
  analysis: AnalysisResult;
  analogyMode: boolean;
  complexity: number;
}) {
  const [componentAnalysis, setComponentAnalysis] = useState<{
    summary: string;
    details: string[];
    exports: string[];
    lines?: number;
    language?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const isClient = component.type === "client";

  // Fetch component analysis when component changes
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!analysis.projectPath) return;

      setLoading(true);
      try {
        const response = await fetch("/api/read-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: component.path,
            projectPath: analysis.projectPath,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setComponentAnalysis({
            summary: data.description?.summary || "",
            details: data.description?.details || [],
            exports: data.description?.exports || [],
            lines: data.lines,
            language: data.language,
          });
        }
      } catch (err) {
        console.error("Failed to fetch component analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [component.path, component.name, analysis.projectPath]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">{isClient ? "🎨" : "⚙️"}</span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {component.name}
          </h2>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>
              {analogyMode
                ? isClient
                  ? "Interactive component"
                  : "Server component"
                : `${component.type === "client" ? "Client" : "Server"} Component`}
            </span>
            {componentAnalysis?.lines && (
              <>
                <span>•</span>
                <span>{componentAnalysis.lines} lines</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description - from API analysis */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "What this component does" : "Description"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent-purple)] border-t-transparent"></div>
              <span>Analyzing component...</span>
            </div>
          ) : (
            <p className="text-[var(--text-primary)] leading-relaxed">
              {componentAnalysis?.summary || "Loading analysis..."}
            </p>
          )}
        </div>
      </section>

      {/* Technical Details from analysis */}
      {componentAnalysis && componentAnalysis.details.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Key Features" : "Technical Details"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="space-y-2">
              {componentAnalysis.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[var(--accent-purple)] mt-1">•</span>
                  <span className="text-[var(--text-secondary)] text-sm">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Exports */}
      {componentAnalysis && componentAnalysis.exports.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "What it provides" : "Exports"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap gap-2">
              {componentAnalysis.exports.map((exp, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded text-sm font-mono"
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Execution Context */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "Where it runs" : "Execution Context"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isClient ? "🖥️" : "🏭"}</span>
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {analogyMode
                  ? isClient
                    ? "Runs in your browser"
                    : "Runs on the server"
                  : isClient
                    ? "Client-side (Browser)"
                    : "Server-side"}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {isClient
                  ? analogyMode
                    ? "Interactive - responds to clicks, typing, and other interactions"
                    : "Hydrated on client. Supports hooks, state, effects, and event handlers."
                  : analogyMode
                    ? "Pre-rendered for faster loading, but can't handle interactions"
                    : "Rendered on server. Cannot use browser APIs or client-side state."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dependencies */}
      {component.dependencies.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Uses these" : "Dependencies"} ({component.dependencies.length})
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap gap-2">
              {component.dependencies.slice(0, complexity >= 3 ? undefined : 8).map((dep, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-secondary)]"
                >
                  {dep}
                </span>
              ))}
              {complexity < 3 && component.dependencies.length > 8 && (
                <span className="px-2 py-1 text-sm text-[var(--text-muted)]">
                  +{component.dependencies.length - 8} more
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* File Location */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "Location" : "File Path"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
          <code className="text-sm text-[var(--text-secondary)] font-mono">
            {component.path}
          </code>
        </div>
      </section>

      {/* Code Viewer */}
      <CodeViewer
        filePath={component.path}
        fileName={component.name + (component.path.endsWith('.tsx') ? '.tsx' : component.path.endsWith('.ts') ? '.ts' : '.jsx')}
      />
    </div>
  );
}

// Model Detail
function ModelDetail({
  model,
  analysis,
  analogyMode,
  complexity,
}: {
  model: ModelInfo;
  analysis: AnalysisResult;
  analogyMode: boolean;
  complexity: number;
}) {
  const dataFields = model.fields.filter((f) => !f.isRelation);
  const relationFields = model.fields.filter((f) => f.isRelation);

  const relationships = analysis.models?.relationships.filter(
    (r) => r.from === model.name || r.to === model.name
  ) || [];

  const getFriendlyType = (type: string): string => {
    const mapping: Record<string, string> = {
      String: "text",
      Int: "whole number",
      Float: "decimal number",
      Boolean: "yes/no",
      DateTime: "date and time",
      Json: "structured data",
    };
    return mapping[type] || type;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">🗄️</span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {model.name}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {analogyMode ? "A type of information the app stores" : "Database Model"}
          </p>
        </div>
      </div>

      {/* What it stores */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "What it stores" : "Description"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-[var(--text-primary)]">
            {analogyMode
              ? `Think of this as a form template with ${dataFields.length} blanks to fill in. Every ${model.name.toLowerCase()} in the app follows this template.`
              : `A database table with ${dataFields.length} fields and ${relationFields.length} relationships.`}
          </p>
        </div>
      </section>

      {/* Fields */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "Information it holds" : "Fields"} ({dataFields.length})
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
          {dataFields.slice(0, complexity >= 3 ? undefined : 6).map((field, i) => (
            <div
              key={field.name}
              className={`px-4 py-3 flex items-center justify-between ${
                i !== 0 ? "border-t border-[var(--border-color)]" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{field.name}</span>
                {field.isOptional && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {analogyMode ? "(can be empty)" : "(optional)"}
                  </span>
                )}
              </div>
              <span className="text-sm text-[var(--text-secondary)]">
                {analogyMode ? getFriendlyType(field.type) : field.type}
                {field.isArray && (analogyMode ? " (list)" : "[]")}
              </span>
            </div>
          ))}
          {complexity < 3 && dataFields.length > 6 && (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)] border-t border-[var(--border-color)]">
              +{dataFields.length - 6} more fields
            </div>
          )}
        </div>
      </section>

      {/* Relationships */}
      {relationships.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Connections to other data" : "Relationships"} ({relationships.length})
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
            {relationships.map((rel, i) => {
              const isOutgoing = rel.from === model.name;
              const otherModel = isOutgoing ? rel.to : rel.from;

              const getRelationDescription = () => {
                if (analogyMode) {
                  if (rel.type === "one-to-many") {
                    return isOutgoing
                      ? `Can have many ${otherModel}s`
                      : `Belongs to a ${otherModel}`;
                  } else if (rel.type === "many-to-many") {
                    return `Connected to many ${otherModel}s`;
                  }
                  return `Has one ${otherModel}`;
                }
                return `${rel.type} with ${otherModel}`;
              };

              return (
                <div
                  key={i}
                  className={`px-4 py-3 flex items-center gap-3 ${
                    i !== 0 ? "border-t border-[var(--border-color)]" : ""
                  }`}
                >
                  <span className="text-lg">{isOutgoing ? "➡️" : "⬅️"}</span>
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{otherModel}</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {getRelationDescription()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// File Detail - fetches and displays detailed analysis from API
function FileDetail({
  file,
  analysis,
  analogyMode,
  complexity,
}: {
  file: NodeInfo;
  analysis: AnalysisResult;
  analogyMode: boolean;
  complexity: number;
}) {
  const [fileAnalysis, setFileAnalysis] = useState<{
    summary: string;
    details: string[];
    exports: string[];
    lines?: number;
    language?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const deps = analysis.dependencies;
  const imports = deps?.edges.filter((e) => e.source === file.id) || [];
  const importedBy = deps?.edges.filter((e) => e.target === file.id) || [];

  // Fetch file analysis when file changes
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!analysis.projectPath) return;

      setLoading(true);
      try {
        const response = await fetch("/api/read-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: `${file.directory}/${file.label}`,
            projectPath: analysis.projectPath,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setFileAnalysis({
            summary: data.description?.summary || "",
            details: data.description?.details || [],
            exports: data.description?.exports || [],
            lines: data.lines,
            language: data.language,
          });
        }
      } catch (err) {
        console.error("Failed to fetch file analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [file.id, file.directory, file.label, analysis.projectPath]);

  const getTypeFriendly = () => {
    if (!analogyMode) return file.type;
    switch (file.type) {
      case "component": return "Building Block";
      case "lib": return "Tool";
      case "api": return "Doorway";
      case "page": return "Page";
      default: return "File";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">
          {file.type === "component" ? "🧩" : file.type === "lib" ? "🔧" : file.type === "api" ? "🚪" : "📄"}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {file.label}
          </h2>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>{getTypeFriendly()}</span>
            {fileAnalysis?.lines && (
              <>
                <span>•</span>
                <span>{fileAnalysis.lines} lines</span>
              </>
            )}
            {fileAnalysis?.language && (
              <>
                <span>•</span>
                <span className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs">
                  {fileAnalysis.language}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description - from API analysis */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "What this file does" : "Description"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent-purple)] border-t-transparent"></div>
              <span>Analyzing file...</span>
            </div>
          ) : (
            <p className="text-[var(--text-primary)] leading-relaxed">
              {fileAnalysis?.summary || "Loading analysis..."}
            </p>
          )}
        </div>
      </section>

      {/* Technical Details from analysis */}
      {fileAnalysis && fileAnalysis.details.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Key Features" : "Technical Details"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="space-y-2">
              {fileAnalysis.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[var(--accent-purple)] mt-1">•</span>
                  <span className="text-[var(--text-secondary)] text-sm">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Exports */}
      {fileAnalysis && fileAnalysis.exports.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "What it provides" : "Exports"}
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap gap-2">
              {fileAnalysis.exports.map((exp, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded text-sm font-mono"
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Imports/Dependencies */}
      {imports.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Uses these files" : "Imports"} ({imports.length})
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap gap-2">
              {imports.slice(0, complexity >= 3 ? undefined : 8).map((imp) => {
                const target = deps?.nodes.find((n) => n.id === imp.target);
                return (
                  <span
                    key={imp.target}
                    className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-secondary)]"
                  >
                    {target?.label || imp.target}
                  </span>
                );
              })}
              {complexity < 3 && imports.length > 8 && (
                <span className="px-2 py-1 text-sm text-[var(--text-muted)]">
                  +{imports.length - 8} more
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Used By */}
      {importedBy.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {analogyMode ? "Used by these files" : "Imported By"} ({importedBy.length})
          </h3>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex flex-wrap gap-2">
              {importedBy.slice(0, complexity >= 3 ? undefined : 8).map((imp) => {
                const source = deps?.nodes.find((n) => n.id === imp.source);
                return (
                  <span
                    key={imp.source}
                    className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-secondary)]"
                  >
                    {source?.label || imp.source}
                  </span>
                );
              })}
              {complexity < 3 && importedBy.length > 8 && (
                <span className="px-2 py-1 text-sm text-[var(--text-muted)]">
                  +{importedBy.length - 8} more
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* File Location */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "Location" : "File Path"}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
          <code className="text-sm text-[var(--text-secondary)] font-mono">
            {file.directory}/{file.label}
          </code>
        </div>
      </section>

      {/* Code Viewer */}
      <CodeViewer
        filePath={`${file.directory}/${file.label}`}
        fileName={file.label}
      />
    </div>
  );
}

// ============================================================================
// INSIGHTS SIDEBAR - Compact insights view for the detail panel
// ============================================================================

function InsightsSidebar({
  insights,
  loading,
  analogyMode,
  onSelectFile,
}: {
  insights: InsightsData | null;
  loading: boolean;
  analogyMode: boolean;
  onSelectFile?: (file: string) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string>("overview");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-purple)] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
        No insights available
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "start-here", label: "Start Here", icon: "🚀" },
    { id: "features", label: "Features", icon: "✨" },
    { id: "tech", label: "Tech Stack", icon: "🛠️" },
    { id: "health", label: "Health", icon: "💚" },
    { id: "glossary", label: "Glossary", icon: "📖" },
  ];

  return (
    <div className="p-4">
      {/* Section Pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setExpandedSection(section.id)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
              expandedSection === section.id
                ? "bg-[var(--accent-green)] text-white"
                : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {expandedSection === "overview" && (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{insights.health.totalFiles}</div>
              <div className="text-xs text-[var(--text-muted)]">Files</div>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{insights.health.totalComponents}</div>
              <div className="text-xs text-[var(--text-muted)]">Components</div>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{insights.health.totalRoutes}</div>
              <div className="text-xs text-[var(--text-muted)]">Routes</div>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{insights.health.totalModels}</div>
              <div className="text-xs text-[var(--text-muted)]">Models</div>
            </div>
          </div>

          {/* Architecture Summary */}
          <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {insights.architecture.summary}
            </p>
          </div>

          {/* Key Technologies */}
          <div>
            <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">Technologies</h4>
            <div className="flex flex-wrap gap-1.5">
              {insights.techStack.slice(0, 6).map((tech) => (
                <span
                  key={tech.name}
                  className="px-2 py-1 bg-[var(--bg-primary)] rounded text-xs text-[var(--text-secondary)]"
                  title={tech.simpleExplanation}
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>

          {/* Key Insight */}
          {insights.health.insights[0] && (
            <div className="p-3 bg-[var(--accent-purple)]/10 rounded-lg border border-[var(--accent-purple)]/30">
              <p className="text-sm text-[var(--text-secondary)]">
                💡 {insights.health.insights[0]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Start Here */}
      {expandedSection === "start-here" && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {analogyMode
              ? "Read these files first to understand the codebase:"
              : "Key entry points:"}
          </p>
          {insights.startHere.slice(0, 6).map((item, index) => (
            <button
              key={item.file}
              onClick={() => onSelectFile?.(item.file)}
              className="w-full text-left p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-purple)] transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                  item.importance === "critical" ? "bg-red-500" :
                  item.importance === "important" ? "bg-[var(--accent-purple)]" :
                  "bg-[var(--text-muted)]"
                }`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)] text-sm truncate">{item.name}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.reason}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Features */}
      {expandedSection === "features" && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {analogyMode ? "What this app can do:" : "Detected features:"}
          </p>
          {insights.features.map((feature) => (
            <div
              key={feature.id}
              className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{feature.icon}</span>
                <span className="font-medium text-sm text-[var(--text-primary)]">{feature.name}</span>
                <span className="text-xs text-[var(--text-muted)] ml-auto">{feature.files.length} files</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {feature.files.slice(0, 3).map((file) => (
                  <button
                    key={file}
                    onClick={() => onSelectFile?.(file)}
                    className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-muted)] hover:text-[var(--accent-purple)] transition-colors truncate max-w-[100px]"
                  >
                    {file.split("/").pop()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tech Stack */}
      {expandedSection === "tech" && (
        <div className="space-y-2">
          {insights.techStack.slice(0, 8).map((tech) => (
            <div
              key={tech.name}
              className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-[var(--text-primary)]">{tech.name}</span>
                <span className="text-xs text-[var(--text-muted)] capitalize">{tech.category}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {analogyMode ? tech.simpleExplanation : tech.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Health */}
      {expandedSection === "health" && (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-xs text-[var(--text-muted)] mb-1">Complexity</div>
              <div className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {insights.health.complexity.replace("-", " ")}
              </div>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-xs text-[var(--text-muted)] mb-1">Organization</div>
              <div className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {insights.health.organization.replace("-", " ")}
              </div>
            </div>
          </div>

          {/* Hub Files */}
          {insights.health.hubFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
                {analogyMode ? "Most Important Files" : "Hub Files"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {insights.health.hubFiles.slice(0, 5).map((file) => (
                  <button
                    key={file}
                    onClick={() => onSelectFile?.(file)}
                    className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                  >
                    {file.split("/").pop()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Largest Files */}
          {insights.health.largestFiles.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">Largest Files</h4>
              <div className="space-y-1">
                {insights.health.largestFiles.slice(0, 4).map((item) => (
                  <button
                    key={item.file}
                    onClick={() => onSelectFile?.(item.file)}
                    className="w-full flex items-center justify-between p-2 bg-[var(--bg-primary)] rounded text-xs hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <span className="text-[var(--text-secondary)] truncate">{item.file.split("/").pop()}</span>
                    <span className="text-[var(--text-muted)] flex-shrink-0 ml-2">{item.lines} lines</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Glossary */}
      {expandedSection === "glossary" && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {analogyMode ? "What these terms mean:" : "Technical terms:"}
          </p>
          {insights.glossary.slice(0, 8).map((term) => (
            <details key={term.term} className="group">
              <summary className="flex items-center justify-between p-2 bg-[var(--bg-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <span className="font-medium text-sm text-[var(--text-primary)]">{term.term}</span>
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-1 p-3 bg-[var(--bg-primary)] rounded-lg text-xs text-[var(--text-secondary)]">
                {analogyMode ? term.simpleExplanation : term.definition}
                {term.example && (
                  <div className="mt-2 text-[var(--text-muted)]">
                    Example: <code className="text-[var(--accent-purple)]">{term.example}</code>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
