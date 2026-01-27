import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

// Extensions to try if exact file not found
const EXTENSIONS_TO_TRY = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".css", ".scss", ".md"];

// Analyze file content to generate a meaningful description
function analyzeFileContent(content: string, fileName: string, ext: string): { summary: string; details: string[]; exports: string[] } {
  const details: string[] = [];
  const exports: string[] = [];
  let summary = "";

  const lines = content.split("\n");
  const lineCount = lines.length;
  const lowerContent = content.toLowerCase();

  // Extract JSDoc or top comment for additional context
  let jsDocDescription = "";
  const jsDocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  if (jsDocMatch) {
    jsDocDescription = jsDocMatch[0]
      .replace(/\/\*\*|\*\/|\* ?/g, "")
      .trim()
      .split("\n")[0]
      .trim();
  }

  // Detect component type
  const isClientComponent = content.includes('"use client"') || content.includes("'use client'");
  const isServerComponent = !isClientComponent && (ext === ".tsx" || ext === ".jsx");

  if (isClientComponent) {
    details.push("Client Component - runs in the browser, can use hooks and handle user interactions");
  } else if (isServerComponent && content.includes("async function")) {
    details.push("Server Component - renders on the server for better performance and SEO");
  }

  // Find all exports
  const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  const namedExportMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+(\w+)/g);

  if (defaultExportMatch) {
    exports.push(defaultExportMatch[1]);
  }
  for (const match of namedExportMatches) {
    if (match[1] && !exports.includes(match[1])) {
      exports.push(match[1]);
    }
  }

  // Deep analysis for React components
  if (ext === ".tsx" || ext === ".jsx") {
    // Analyze hooks in detail
    const hookAnalysis: string[] = [];

    // useState analysis
    const useStateMatches = content.match(/useState[<(]/g);
    if (useStateMatches) {
      const stateVars = content.match(/const\s+\[(\w+),\s*set\w+\]\s*=\s*useState/g);
      if (stateVars && stateVars.length > 0) {
        const varNames = stateVars.map(m => m.match(/\[(\w+),/)?.[1]).filter(Boolean);
        hookAnalysis.push(`Manages ${stateVars.length} state variable${stateVars.length > 1 ? 's' : ''}: ${varNames.slice(0, 3).join(', ')}${varNames.length > 3 ? '...' : ''}`);
      }
    }

    // useEffect analysis
    const useEffectCount = (content.match(/useEffect\s*\(/g) || []).length;
    if (useEffectCount > 0) {
      hookAnalysis.push(`Has ${useEffectCount} side effect${useEffectCount > 1 ? 's' : ''} (useEffect) for lifecycle management`);
    }

    // useMemo/useCallback analysis
    if (lowerContent.includes("usememo")) {
      hookAnalysis.push("Optimizes expensive calculations with useMemo");
    }
    if (lowerContent.includes("usecallback")) {
      hookAnalysis.push("Optimizes function references with useCallback");
    }

    // useRef analysis
    if (lowerContent.includes("useref")) {
      hookAnalysis.push("Uses refs to access DOM elements or persist values");
    }

    // useContext analysis
    if (lowerContent.includes("usecontext")) {
      hookAnalysis.push("Consumes shared data from React Context");
    }

    // Custom hooks
    const customHookMatches = content.match(/use[A-Z]\w+\s*\(/g);
    if (customHookMatches) {
      const uniqueHooks = [...new Set(customHookMatches.map(h => h.replace(/\s*\($/, '')))];
      const customOnes = uniqueHooks.filter(h => !['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useReducer'].includes(h));
      if (customOnes.length > 0) {
        hookAnalysis.push(`Uses custom hooks: ${customOnes.slice(0, 3).join(', ')}${customOnes.length > 3 ? '...' : ''}`);
      }
    }

    if (hookAnalysis.length > 0) {
      details.push(...hookAnalysis);
    }

    // Event handling analysis
    const eventHandlers: string[] = [];
    if (lowerContent.includes("onsubmit") || lowerContent.includes("handlesubmit")) {
      eventHandlers.push("form submissions");
    }
    if (lowerContent.includes("onclick") || lowerContent.includes("handleclick")) {
      eventHandlers.push("click events");
    }
    if (lowerContent.includes("onchange") || lowerContent.includes("handlechange")) {
      eventHandlers.push("input changes");
    }
    if (lowerContent.includes("onkeydown") || lowerContent.includes("onkeyup") || lowerContent.includes("onkeypress")) {
      eventHandlers.push("keyboard events");
    }
    if (lowerContent.includes("ondrag") || lowerContent.includes("ondrop")) {
      eventHandlers.push("drag and drop");
    }
    if (lowerContent.includes("onscroll")) {
      eventHandlers.push("scroll events");
    }
    if (lowerContent.includes("onmouse") || lowerContent.includes("onhover")) {
      eventHandlers.push("mouse interactions");
    }

    if (eventHandlers.length > 0) {
      details.push(`Handles: ${eventHandlers.join(", ")}`);
    }

    // Data fetching analysis
    if (lowerContent.includes("fetch(")) {
      const fetchCount = (content.match(/fetch\s*\(/g) || []).length;
      details.push(`Makes ${fetchCount} API call${fetchCount > 1 ? 's' : ''} using fetch()`);
    }
    if (lowerContent.includes("axios")) {
      details.push("Uses Axios for HTTP requests");
    }
    if (lowerContent.includes("useswr")) {
      details.push("Uses SWR for data fetching with caching and revalidation");
    }
    if (lowerContent.includes("usequery") || lowerContent.includes("usemutation")) {
      details.push("Uses React Query/TanStack Query for server state management");
    }

    // UI elements rendered
    const uiElements: string[] = [];
    if (content.includes("<button") || content.includes("<Button")) uiElements.push("buttons");
    if (content.includes("<input") || content.includes("<Input")) uiElements.push("text inputs");
    if (content.includes("<textarea") || content.includes("<Textarea")) uiElements.push("text areas");
    if (content.includes("<select") || content.includes("<Select")) uiElements.push("dropdowns");
    if (content.includes("<checkbox") || content.includes("<Checkbox")) uiElements.push("checkboxes");
    if (content.includes("<form") || content.includes("<Form")) uiElements.push("a form");
    if (content.includes("<table") || content.includes("<Table")) uiElements.push("a data table");
    if (content.includes("<ul") || content.includes("<ol")) uiElements.push("lists");
    if (content.includes("<img") || content.includes("<Image")) uiElements.push("images");
    if (content.includes("<video") || content.includes("<Video")) uiElements.push("video");
    if (content.includes("<svg")) uiElements.push("SVG graphics");
    if (content.includes("<canvas")) uiElements.push("canvas");
    if (content.includes("<Modal") || content.includes("<Dialog")) uiElements.push("modal/dialog");
    if (content.includes("<Tooltip") || content.includes("<Popover")) uiElements.push("tooltips/popovers");
    if (content.includes("<Tab") || content.includes("<tabs")) uiElements.push("tabs");
    if (content.includes("<Accordion")) uiElements.push("accordions");
    if (content.includes("<Carousel") || content.includes("<Slider")) uiElements.push("carousel/slider");

    if (uiElements.length > 0) {
      details.push(`Renders: ${uiElements.join(", ")}`);
    }

    // Styling approach
    if (content.includes("className=") && content.includes("tailwind")) {
      details.push("Styled with Tailwind CSS utility classes");
    } else if (content.includes("className=")) {
      details.push("Uses CSS classes for styling");
    }
    if (content.includes("styled.") || content.includes("styled(")) {
      details.push("Uses styled-components for CSS-in-JS styling");
    }
    if (content.includes("css`") || content.includes("css({")) {
      details.push("Uses Emotion for CSS-in-JS styling");
    }
  }

  // Analyze TypeScript-specific patterns
  if (ext === ".ts" || ext === ".tsx") {
    // Interface/Type definitions
    const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
    const typeCount = (content.match(/type\s+\w+\s*=/g) || []).length;
    if (interfaceCount > 0 || typeCount > 0) {
      const total = interfaceCount + typeCount;
      details.push(`Defines ${total} TypeScript type${total > 1 ? 's' : ''}/interface${total > 1 ? 's' : ''}`);
    }

    // Generic usage
    if (content.includes("<T>") || content.includes("<T,") || content.match(/<[A-Z]\w*>/)) {
      details.push("Uses TypeScript generics for type flexibility");
    }
  }

  // Analyze API route patterns (Next.js)
  if (fileName.includes("route") || content.includes("NextRequest") || content.includes("NextResponse")) {
    const methods: string[] = [];
    if (content.includes("export async function GET") || content.includes("export function GET")) methods.push("GET");
    if (content.includes("export async function POST") || content.includes("export function POST")) methods.push("POST");
    if (content.includes("export async function PUT") || content.includes("export function PUT")) methods.push("PUT");
    if (content.includes("export async function DELETE") || content.includes("export function DELETE")) methods.push("DELETE");
    if (content.includes("export async function PATCH") || content.includes("export function PATCH")) methods.push("PATCH");

    if (methods.length > 0) {
      details.push(`API endpoint handling: ${methods.join(", ")} request${methods.length > 1 ? 's' : ''}`);
    }

    // Database operations
    if (lowerContent.includes("prisma")) {
      details.push("Uses Prisma ORM for database operations");
    }
    if (lowerContent.includes("mongodb") || lowerContent.includes("mongoose")) {
      details.push("Connects to MongoDB database");
    }
    if (lowerContent.includes("sql") || lowerContent.includes("postgres") || lowerContent.includes("mysql")) {
      details.push("Performs SQL database operations");
    }
  }

  // File size context
  if (lineCount > 500) {
    details.push(`Large file with ${lineCount} lines - consider splitting into smaller modules`);
  } else if (lineCount > 200) {
    details.push(`${lineCount} lines of code`);
  }

  // Generate comprehensive summary
  const baseName = fileName.replace(/\.(tsx?|jsx?|js|ts)$/, "").toLowerCase();
  summary = generateDetailedSummary(baseName, content, ext, exports, details, jsDocDescription, lineCount);

  return { summary, details, exports };
}

function generateDetailedSummary(
  baseName: string,
  content: string,
  ext: string,
  exports: string[],
  details: string[],
  jsDocDescription: string,
  lineCount: number
): string {
  const lowerContent = content.toLowerCase();
  const lowerBaseName = baseName.toLowerCase();

  // Helper to analyze what the component actually does from the code
  const analyzeComponentPurpose = (): string => {
    const purposes: string[] = [];

    // Check for specific patterns in the actual code
    if (content.includes(".length") && (lowerBaseName.includes("count") || lowerBaseName.includes("character"))) {
      purposes.push("calculates and displays the length of text input");
    }
    if (content.includes(".split(") && lowerBaseName.includes("word")) {
      purposes.push("splits text and counts words");
    }
    if (lowerContent.includes("navigator.clipboard")) {
      purposes.push("provides copy-to-clipboard functionality");
    }
    if (lowerContent.includes("localstorage") || lowerContent.includes("sessionstorage")) {
      purposes.push("persists data in browser storage");
    }
    if (lowerContent.includes("setinterval") || lowerContent.includes("settimeout")) {
      purposes.push("uses timers for delayed or repeated actions");
    }
    if (lowerContent.includes("addeventlistener")) {
      purposes.push("attaches event listeners to DOM elements");
    }
    if (lowerContent.includes("innerhtml") || lowerContent.includes("textcontent")) {
      purposes.push("manipulates DOM content directly");
    }
    if (content.includes("async") && content.includes("await")) {
      purposes.push("handles asynchronous operations");
    }
    if (lowerContent.includes("try") && lowerContent.includes("catch")) {
      purposes.push("includes error handling");
    }
    if (lowerContent.includes("map(") && lowerContent.includes("return")) {
      purposes.push("transforms and renders collections of data");
    }
    if (lowerContent.includes("filter(")) {
      purposes.push("filters data based on conditions");
    }
    if (lowerContent.includes("reduce(")) {
      purposes.push("aggregates data using reduce");
    }
    if (lowerContent.includes("sort(")) {
      purposes.push("sorts data");
    }
    if (lowerContent.includes("json.parse") || lowerContent.includes("json.stringify")) {
      purposes.push("serializes/deserializes JSON data");
    }
    if (lowerContent.includes("new date") || lowerContent.includes("date.now")) {
      purposes.push("works with dates and times");
    }
    if (lowerContent.includes("regexp") || lowerContent.includes(".match(") || lowerContent.includes(".replace(")) {
      purposes.push("uses regular expressions for text processing");
    }
    if (lowerContent.includes("classname") && (lowerContent.includes("?") || lowerContent.includes("&&"))) {
      purposes.push("applies conditional CSS classes");
    }
    if (lowerContent.includes("disabled") && lowerContent.includes("button")) {
      purposes.push("manages button enabled/disabled states");
    }
    if (lowerContent.includes("loading") || lowerContent.includes("isloading")) {
      purposes.push("shows loading states during async operations");
    }
    if (lowerContent.includes("error") && lowerContent.includes("setError")) {
      purposes.push("captures and displays error messages");
    }
    if (lowerContent.includes("validate") || lowerContent.includes("validation")) {
      purposes.push("validates user input");
    }
    if (lowerContent.includes("debounce") || lowerContent.includes("throttle")) {
      purposes.push("optimizes performance with debouncing/throttling");
    }

    return purposes.length > 0 ? purposes.join("; ") : "";
  };

  // Character/word counter - very detailed
  if (lowerBaseName.includes("character") && lowerBaseName.includes("count")) {
    const additionalPurpose = analyzeComponentPurpose();
    return `This component displays a real-time character count for text input fields. It monitors the length of user-entered text and typically shows the current count alongside a maximum limit (e.g., "150/280 characters"). This is commonly used in forms with character limits like social media posts or SMS messages. The component updates instantly as the user types, providing immediate feedback to help users stay within length constraints.${additionalPurpose ? ` Additionally, it ${additionalPurpose}.` : ''}`;
  }

  if (lowerBaseName.includes("word") && lowerBaseName.includes("count")) {
    return `This component counts and displays the number of words in a text input. It works by splitting the text on whitespace and counting the resulting segments. Word counters are useful for content that has word limits (like essays, articles, or meta descriptions) rather than character limits. The count updates in real-time as the user types or edits their text.`;
  }

  // Content output/display
  if (lowerBaseName.includes("contentoutput") || (lowerBaseName.includes("content") && lowerBaseName.includes("output"))) {
    return `This component serves as a display area for generated or processed content. It receives content (often from an API or generation process) and renders it in a formatted, readable way. It may include features like syntax highlighting for code, markdown rendering, or special formatting. This is the "results" area where users see the output of their actions.`;
  }

  // Code Viewer
  if (lowerBaseName.includes("codeviewer") || lowerBaseName.includes("code") && lowerBaseName.includes("view")) {
    return `This component displays source code with proper formatting and styling. It typically includes line numbers, syntax highlighting (coloring different parts of code based on their meaning), and may support features like code copying, line highlighting, or language detection. Code viewers make it easy to read and understand code snippets within the application.`;
  }

  // Generator components
  if (lowerBaseName.includes("generate") && lowerBaseName.includes("button")) {
    return `This is a trigger button that initiates a content generation process when clicked. It likely connects to an AI service or content generation API to create new content (text, images, etc.) based on user inputs. The button typically shows loading states during generation and may be disabled while processing to prevent duplicate requests.`;
  }
  if (lowerBaseName.includes("generate") && lowerBaseName.includes("image")) {
    return `This component handles AI-powered image generation. It takes user prompts or parameters and sends them to an image generation service (like DALL-E, Stable Diffusion, or Midjourney API). It manages the request/response cycle, displays loading states during generation, and shows the resulting images. May include options for image size, style, or number of variations.`;
  }
  if (lowerBaseName.includes("generator")) {
    const purpose = analyzeComponentPurpose();
    return `This is a content generator component that creates dynamic content based on user inputs or algorithms. It typically takes parameters like topic, tone, or format and produces new content accordingly. ${purpose ? `Specifically, it ${purpose}.` : ''} Generator components often include loading states, error handling, and options to regenerate or modify results.`;
  }

  // Platform selector
  if (lowerBaseName.includes("platform") && lowerBaseName.includes("selector")) {
    return `This component allows users to choose a target platform from available options (e.g., Twitter, LinkedIn, Instagram, iOS, Android). Platform selection often affects the formatting, character limits, or features available for content. The component likely displays platform icons/logos and highlights the currently selected option. Selection may trigger content adaptation for the chosen platform's requirements.`;
  }

  // Topic input
  if (lowerBaseName.includes("topic") && lowerBaseName.includes("input")) {
    return `This is a specialized input field for entering topics, subjects, or keywords. It's typically used as the primary input for content generation, search, or filtering features. May include features like autocomplete suggestions, tag-style chips for multiple topics, or validation to ensure meaningful input. The entered topic drives what content gets generated or retrieved.`;
  }

  // Tree Sidebar
  if (lowerBaseName.includes("tree") && lowerBaseName.includes("sidebar")) {
    return `This component renders a hierarchical tree structure in a sidebar layout. It displays nested items (like folders and files, or categories and subcategories) that can be expanded and collapsed. Users can navigate the tree, select items, and the component typically highlights the current selection. Common uses include file explorers, navigation menus, and organizational hierarchies.`;
  }

  // Detail Panel
  if (lowerBaseName.includes("detail") && lowerBaseName.includes("panel")) {
    return `This component displays detailed information about a selected item in a dedicated panel area. When users select an item from a list or tree, this panel shows comprehensive details including properties, descriptions, related data, and available actions. It provides a focused view of a single item while maintaining context within the larger application.`;
  }

  // Admin route/protection
  if (lowerBaseName.includes("admin") && (lowerBaseName.includes("route") || lowerBaseName.includes("guard"))) {
    return `This component protects admin-only routes and pages by checking user permissions before allowing access. It verifies that the current user has administrative privileges (typically by checking a role or permission flag). Unauthorized users are redirected to a login page or shown an "access denied" message. This is a critical security component that prevents unauthorized access to sensitive admin functionality.`;
  }

  // Error boundary
  if (lowerBaseName.includes("error") && lowerBaseName.includes("boundary")) {
    return `This is a React Error Boundary component that catches JavaScript errors in its child component tree. When an error occurs, instead of crashing the entire application, this component catches it and displays a fallback UI (like an error message with a retry button). It logs error details for debugging and provides a recovery mechanism. Error boundaries are essential for building resilient applications that handle failures gracefully.`;
  }

  // App component
  if (lowerBaseName === "app" || lowerBaseName === "_app") {
    return `This is the root application component that serves as the top-level wrapper for the entire application. It typically sets up global providers (theme, authentication, state management), global styles, and shared layout elements that persist across all pages. Any component or context provider placed here will be available throughout the entire application. Changes to this file affect every page and component.`;
  }

  // Layout
  if (lowerBaseName === "layout" || lowerBaseName.includes("layout")) {
    return `This is a layout component that defines the common structure shared across multiple pages. It typically includes persistent UI elements like headers, navigation, sidebars, and footers that remain constant while page content changes. In Next.js, layout components wrap page content and maintain state between page navigations, improving performance and user experience.`;
  }

  // Page component
  if (lowerBaseName === "page" || lowerBaseName.includes("page")) {
    return `This is a page component that represents a complete view/route in the application. It composes various components together to create a full page experience. In Next.js, page components in the app directory automatically become routes. This file handles the main content and logic for this specific URL path.`;
  }

  // Index file
  if (lowerBaseName === "index") {
    const exportCount = (content.match(/export/g) || []).length;
    if (exportCount > 2) {
      return `This is a barrel file (index) that re-exports modules from this directory for cleaner imports. Instead of importing from multiple files, other parts of the codebase can import everything from this single entry point. This pattern keeps import statements clean and makes refactoring easier since the internal file structure can change without updating imports elsewhere.`;
    }
    return `This is the main entry point for this module or directory. It exports the primary functionality that other parts of the application use when importing from this location.`;
  }

  // Service worker
  if (lowerBaseName.includes("sw") || lowerBaseName.includes("serviceworker") || lowerBaseName.includes("service-worker")) {
    return `This is a Service Worker script that runs in the background, separate from the main browser thread. It enables powerful features like offline functionality (caching pages and assets for offline access), push notifications, and background sync. The service worker intercepts network requests and can serve cached responses when offline, making the app work without an internet connection.`;
  }
  if (lowerBaseName.includes("register") && (lowerContent.includes("serviceworker") || lowerContent.includes("workbox"))) {
    return `This script registers and initializes the Service Worker. It checks if the browser supports service workers, then registers the SW file. This is the activation point that enables offline functionality, caching, and other PWA (Progressive Web App) features. It typically runs once when the application first loads.`;
  }
  if (lowerBaseName.includes("workbox")) {
    return `This is a Workbox configuration file. Workbox is Google's library for creating powerful service workers with advanced caching strategies. This file defines how different types of resources should be cached (e.g., cache-first for assets, network-first for API calls), precaching configurations, and runtime caching rules.`;
  }

  // Modal components
  if (lowerBaseName.includes("modal") || lowerBaseName.includes("dialog")) {
    const modalType = lowerBaseName.replace(/modal|dialog/gi, "").trim();
    if (modalType) {
      return `This is a modal dialog component for ${modalType.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} functionality. It appears as an overlay on top of the main content, focusing user attention on a specific task or information. The modal typically includes a backdrop that dims the underlying content, a close button, and handles keyboard accessibility (closing on Escape key). It blocks interaction with the page behind it until dismissed.`;
    }
    return `This is a reusable modal/dialog component that displays content in an overlay above the main page. It creates a focused interaction context, dimming the background and centering attention on the modal content. Features typically include click-outside-to-close, keyboard accessibility (Escape to close), focus trapping, and smooth animations. Modals are used for confirmations, forms, detailed views, and any content requiring user attention.`;
  }

  // Form components
  if (lowerBaseName.includes("form")) {
    return `This is a form component that collects and manages user input. It handles form state (tracking what the user has entered), validation (checking if input is valid), submission (sending data to a server or handler), and error display (showing what's wrong). Forms typically include input fields, labels, error messages, and submit buttons. This component orchestrates the entire data collection workflow.`;
  }

  // Button components
  if (lowerBaseName.includes("button")) {
    return `This is a reusable button component that provides consistent styling and behavior across the application. It likely supports different variants (primary, secondary, danger), sizes, loading states (showing a spinner during async actions), and disabled states. Using a shared button component ensures visual consistency and makes it easy to update button styles globally.`;
  }

  // Input components
  if (lowerBaseName.includes("input") || lowerBaseName.includes("textfield")) {
    return `This is a reusable input/text field component for collecting user text entry. It wraps the native input element with consistent styling, label handling, error message display, and accessibility features. May support different input types (text, email, password, number), validation states, character limits, and helper text. Using a shared input component ensures form consistency across the application.`;
  }

  // Card components
  if (lowerBaseName.includes("card")) {
    return `This is a card component that displays content in a contained, styled box with defined boundaries. Cards provide visual grouping for related information, typically including a header, content area, and optional footer/actions. They create clear visual hierarchy and are commonly used for displaying items in grids, article previews, user profiles, or any grouped content.`;
  }

  // List components
  if (lowerBaseName.includes("list")) {
    return `This is a list component that renders a collection of items in a vertical (or sometimes horizontal) arrangement. It handles mapping over data arrays to create consistent list items, and may include features like item selection, drag-and-drop reordering, virtual scrolling for performance with large lists, or empty state handling.`;
  }

  // Table components
  if (lowerBaseName.includes("table") || lowerBaseName.includes("datagrid")) {
    return `This is a table/data grid component for displaying structured data in rows and columns. It likely supports features like sorting (clicking headers to reorder), filtering, pagination (breaking data into pages), column resizing, and row selection. Tables are essential for displaying datasets, admin panels, and any tabular information.`;
  }

  // Navigation
  if (lowerBaseName.includes("nav") || lowerBaseName.includes("navbar") || lowerBaseName.includes("navigation")) {
    return `This is a navigation component that helps users move between different sections of the application. It typically appears as a horizontal menu bar or vertical sidebar with links to major app sections. Features may include active state highlighting, dropdown submenus, responsive mobile menu (hamburger), and user account access. Navigation is crucial for app usability and information architecture.`;
  }
  if (lowerBaseName.includes("header")) {
    return `This is the header component that appears at the top of pages. It typically contains the logo/brand, main navigation links, search functionality, and user account controls (login/profile). The header provides consistent branding and navigation access across all pages, often staying fixed at the top as users scroll.`;
  }
  if (lowerBaseName.includes("sidebar")) {
    return `This is a sidebar component that provides secondary navigation or contextual actions in a vertical panel, usually on the left side of the screen. Sidebars often contain navigation links, filters, or settings. They may be collapsible to save space, especially on mobile devices. Sidebars help organize complex applications with many sections or options.`;
  }
  if (lowerBaseName.includes("footer")) {
    return `This is the footer component that appears at the bottom of pages. It typically contains secondary navigation links, legal information (copyright, terms of service, privacy policy), contact details, social media links, and sometimes newsletter signup. The footer provides consistent information and links that don't need prominent placement but should be accessible.`;
  }

  // Provider
  if (lowerBaseName.includes("provider")) {
    const providerType = lowerBaseName.replace("provider", "").trim();
    return `This is a React Context Provider that makes ${providerType || 'shared data and functionality'} available to all child components in the component tree. Instead of passing props through every level (prop drilling), components can directly access this context. The provider typically holds state and methods that many components need, like user authentication, theme settings, or application state.`;
  }

  // Custom Hook
  if (lowerBaseName.startsWith("use")) {
    const hookName = lowerBaseName.slice(3);
    const hookPurpose = analyzeComponentPurpose();
    return `This is a custom React hook that encapsulates reusable ${hookName.replace(/([A-Z])/g, ' $1').toLowerCase().trim() || 'stateful'} logic. Hooks allow you to extract component logic into reusable functions that can be shared across multiple components. ${hookPurpose ? `Specifically, this hook ${hookPurpose}.` : ''} Custom hooks follow the "use" naming convention and can utilize other hooks internally.`;
  }

  // Store/state management
  if (lowerBaseName.includes("store") || lowerBaseName.includes("state") || lowerBaseName.includes("slice")) {
    if (lowerContent.includes("zustand")) {
      return `This is a Zustand store that manages application state. Zustand is a lightweight state management library that creates global stores components can subscribe to. The store defines state values and actions (functions that modify state). Components using this store will automatically re-render when relevant state changes, enabling reactive data flow without prop drilling.`;
    }
    if (lowerContent.includes("redux") || lowerContent.includes("createslice")) {
      return `This is a Redux store/slice that manages application state using the Redux pattern. It defines the state structure, reducers (pure functions that update state based on actions), and action creators. Redux provides predictable state management with a single source of truth, time-travel debugging, and middleware support for side effects.`;
    }
    return `This module manages application state that needs to be shared across multiple components. It likely defines state variables, update functions, and possibly derived/computed values. State management centralizes data that multiple components need, avoiding prop drilling and ensuring consistency across the application.`;
  }

  // Context
  if (lowerBaseName.includes("context")) {
    return `This file defines a React Context for sharing data across the component tree without explicit prop passing. It includes the context definition, a Provider component that supplies values, and typically a custom hook for easy consumption. Contexts are ideal for global data like user authentication, theme preferences, or locale settings that many components need access to.`;
  }

  // API routes and services
  if (lowerBaseName.includes("route") && (lowerContent.includes("nextrequest") || lowerContent.includes("nextresponse"))) {
    const methods: string[] = [];
    if (content.includes("GET")) methods.push("GET (retrieve data)");
    if (content.includes("POST")) methods.push("POST (create new data)");
    if (content.includes("PUT")) methods.push("PUT (replace data)");
    if (content.includes("PATCH")) methods.push("PATCH (partial update)");
    if (content.includes("DELETE")) methods.push("DELETE (remove data)");
    return `This is a Next.js API route that handles HTTP requests at this URL path. It processes ${methods.length > 0 ? methods.join(', ') : 'incoming requests'} from the frontend or external clients. API routes run on the server, making them suitable for database operations, authentication, calling external APIs with secret keys, and other server-side logic that shouldn't be exposed to the browser.`;
  }

  if (lowerBaseName.includes("api") || lowerBaseName.includes("service") || lowerBaseName.includes("client")) {
    return `This is a service/API module that handles communication with external services or APIs. It encapsulates HTTP requests, authentication headers, error handling, and response parsing into reusable functions. By centralizing API calls here, components can simply call these functions without worrying about fetch configuration, making the codebase cleaner and API changes easier to manage.`;
  }

  // Utils/helpers
  if (lowerBaseName.includes("util") || lowerBaseName.includes("helper") || lowerBaseName.includes("lib")) {
    const functionCount = (content.match(/export\s+(const|function)/g) || []).length;
    return `This is a utility module containing ${functionCount > 0 ? functionCount : 'helper'} reusable functions for common operations throughout the application. Utility functions handle tasks like data formatting, validation, calculations, string manipulation, date handling, and other operations that don't belong to any specific component. Centralizing these prevents code duplication and makes testing easier.`;
  }

  // Config
  if (lowerBaseName.includes("config") || lowerBaseName.includes("configuration") || lowerBaseName.includes("settings")) {
    return `This is a configuration file that defines settings controlling application behavior. It may include API endpoints, feature flags, default values, environment-specific settings, and other configurable parameters. Centralizing configuration makes it easy to adjust application behavior without hunting through code, and helps manage different settings for development, staging, and production environments.`;
  }

  // Types/interfaces
  if (lowerBaseName.includes("type") || lowerBaseName.includes("interface") || lowerBaseName.endsWith(".d")) {
    const typeCount = (content.match(/export\s+(type|interface)/g) || []).length;
    return `This file contains TypeScript type definitions (${typeCount > 0 ? typeCount + ' types/interfaces' : 'type definitions'}). Types define the shape of data - what properties objects should have and what types those properties are. This enables TypeScript to catch errors at compile time, provides excellent IDE autocomplete, and serves as documentation for data structures used throughout the application.`;
  }

  // Constants
  if (lowerBaseName.includes("constant")) {
    return `This file defines constant values used throughout the application. Constants are fixed values that never change during runtime - things like configuration options, enum-like values, magic numbers with meaningful names, or repeated strings. Centralizing constants prevents typos (since you reference the constant, not the value), makes global changes easy, and improves code readability.`;
  }

  // Test files
  if (lowerBaseName.includes("test") || lowerBaseName.includes("spec") || lowerBaseName.includes(".test") || lowerBaseName.includes(".spec")) {
    return `This is a test file containing automated tests for verifying code correctness. Tests define expected behavior and check that the code meets those expectations. They catch bugs before they reach users, enable confident refactoring (you know if you broke something), and serve as documentation of how code should work. Running tests regularly ensures the application behaves correctly.`;
  }

  // Middleware
  if (lowerBaseName.includes("middleware")) {
    return `This is a middleware file that intercepts and processes requests before they reach their final destination. In Next.js, middleware runs before every request, enabling authentication checks, redirects, request modification, and response rewriting. Middleware is perfect for cross-cutting concerns that apply to many routes, like requiring login for protected pages.`;
  }

  // Loading component
  if (lowerBaseName.includes("loading") || lowerBaseName.includes("spinner") || lowerBaseName.includes("skeleton")) {
    return `This component displays a loading indicator while content is being fetched or processed. It provides visual feedback that something is happening, improving perceived performance and user experience. Loading indicators can be spinners (animated icons), skeleton screens (placeholder shapes mimicking content layout), or progress bars. They appear during async operations and disappear when content is ready.`;
  }

  // Error component
  if (lowerBaseName === "error" || lowerBaseName.includes("error-page") || lowerBaseName.includes("errorpage")) {
    return `This is an error page/component that displays when something goes wrong. It shows a user-friendly error message instead of a cryptic error or blank page. Good error pages explain what happened, apologize for the inconvenience, and provide a way to recover (like a retry button or link to home). In Next.js, error.tsx files automatically catch errors in their route segment.`;
  }

  // Not found component
  if (lowerBaseName.includes("notfound") || lowerBaseName.includes("not-found") || lowerBaseName.includes("404")) {
    return `This is the "Not Found" (404) page shown when users navigate to a URL that doesn't exist. A good 404 page clearly communicates that the page wasn't found, maintains the site's branding and navigation, and helps users get back on track with links to the homepage or search. In Next.js, not-found.tsx files handle 404 errors for their route segment.`;
  }

  // Animation components
  if (lowerBaseName.includes("animation") || lowerBaseName.includes("transition") || lowerBaseName.includes("motion")) {
    return `This component handles animations and transitions, making UI changes smooth and visually appealing. It may wrap elements to animate them in/out, handle page transitions, or provide reusable animation presets. Good animations guide user attention, indicate state changes, and make the interface feel responsive and polished.`;
  }

  // ============================================================================
  // SCRIPTS AND CLI TOOLS - Common patterns for files in scripts/ directory
  // ============================================================================

  // Promote scripts (promote-admin, promote-user, etc.)
  if (lowerBaseName.includes("promote")) {
    const target = lowerBaseName.replace("promote", "").replace(/-/g, " ").trim() || "user";
    const hasDb = lowerContent.includes("prisma") || lowerContent.includes("database") || lowerContent.includes("db.");
    const hasEmail = lowerContent.includes("email") || lowerContent.includes("mail");
    return `This is a CLI script that promotes a ${target} to a higher privilege level (like making someone an admin). ${hasDb ? "It updates the user's role in the database. " : ""}${hasEmail ? "It may send a notification email about the role change. " : ""}This script is typically run manually by developers or through an admin interface when someone needs elevated permissions. It likely takes a user identifier (email or ID) as input and updates their role/permissions.`;
  }

  // Demote scripts
  if (lowerBaseName.includes("demote")) {
    const target = lowerBaseName.replace("demote", "").replace(/-/g, " ").trim() || "user";
    return `This is a CLI script that demotes a ${target} by reducing their privilege level. It's the opposite of promotion - typically used when someone no longer needs elevated access or when permissions need to be revoked. It updates the user's role in the database to a lower permission level.`;
  }

  // Migration scripts
  if (lowerBaseName.includes("migrate") || lowerBaseName.includes("migration")) {
    const hasDb = lowerContent.includes("prisma") || lowerContent.includes("sql") || lowerContent.includes("database");
    const hasData = lowerContent.includes("transform") || lowerContent.includes("convert");
    if (hasDb) {
      return `This is a database migration script that modifies the database structure or moves data between schemas. Migrations are versioned changes that can be applied (to update) or rolled back (to revert). This script likely adds, modifies, or removes database tables, columns, or indexes, ensuring the database schema matches what the application code expects.`;
    }
    return `This is a data migration script that transforms or moves data from one format/location to another. ${hasData ? "It converts data between different structures or formats. " : ""}Migration scripts are typically run once during upgrades or data restructuring.`;
  }

  // Seed scripts
  if (lowerBaseName.includes("seed")) {
    const hasUser = lowerContent.includes("user") || lowerContent.includes("account");
    const hasProduct = lowerContent.includes("product") || lowerContent.includes("item");
    return `This is a database seeding script that populates the database with initial or test data. Seed scripts create ${hasUser ? "default users, " : ""}${hasProduct ? "sample products, " : ""}and other baseline records needed for the application to function. They're typically run when setting up a new environment or resetting a development database to a known state.`;
  }

  // Setup/init scripts
  if (lowerBaseName.includes("setup") || lowerBaseName.includes("init") || lowerBaseName.includes("bootstrap")) {
    const hasEnv = lowerContent.includes("env") || lowerContent.includes("environment");
    const hasInstall = lowerContent.includes("install") || lowerContent.includes("npm") || lowerContent.includes("yarn");
    return `This is an initialization/setup script that prepares the project environment for use. ${hasEnv ? "It may configure environment variables. " : ""}${hasInstall ? "It may install dependencies. " : ""}Setup scripts automate the tedious steps of getting a project running, ensuring all developers and deployments start from the same baseline configuration.`;
  }

  // Build scripts
  if (lowerBaseName.includes("build") || lowerBaseName.includes("compile")) {
    return `This is a build script that compiles, bundles, or transforms source code into a deployable format. It may run TypeScript compilation, bundle JavaScript with webpack/esbuild, optimize assets, or perform other build-time transformations. Build scripts ensure the code is properly prepared for production deployment.`;
  }

  // Deploy scripts
  if (lowerBaseName.includes("deploy") || lowerBaseName.includes("release") || lowerBaseName.includes("publish")) {
    const hasAws = lowerContent.includes("aws") || lowerContent.includes("s3") || lowerContent.includes("lambda");
    const hasDocker = lowerContent.includes("docker") || lowerContent.includes("container");
    const hasVercel = lowerContent.includes("vercel");
    return `This is a deployment script that pushes code to production or staging environments. ${hasAws ? "It deploys to AWS services. " : ""}${hasDocker ? "It uses Docker containers. " : ""}${hasVercel ? "It deploys to Vercel. " : ""}Deployment scripts automate the process of getting code changes live, including building, uploading, and configuring the production environment.`;
  }

  // Clean/reset scripts
  if (lowerBaseName.includes("clean") || lowerBaseName.includes("reset") || lowerBaseName.includes("clear")) {
    const hasCache = lowerContent.includes("cache");
    const hasDb = lowerContent.includes("database") || lowerContent.includes("db") || lowerContent.includes("prisma");
    return `This is a cleanup/reset script that removes temporary files, caches, or resets state. ${hasCache ? "It clears cached data. " : ""}${hasDb ? "It may reset database state. " : ""}These scripts are useful during development to start fresh, or in CI/CD to ensure clean builds.`;
  }

  // Test scripts
  if (lowerBaseName.includes("test") || lowerBaseName.includes("spec")) {
    return `This is a test script or test file that verifies the application works correctly. It contains automated tests that check specific functionality, catch regressions, and ensure code quality. Tests may be unit tests (testing individual functions), integration tests (testing components together), or end-to-end tests (testing complete user flows).`;
  }

  // Sync scripts
  if (lowerBaseName.includes("sync")) {
    const target = lowerBaseName.replace("sync", "").replace(/-/g, " ").trim();
    return `This is a synchronization script that keeps ${target || "data"} in sync between different sources. It may sync data between a local database and a remote service, between different environments, or between different data stores. Sync scripts typically handle conflict resolution and ensure data consistency.`;
  }

  // Import/export scripts
  if (lowerBaseName.includes("import") || lowerBaseName.includes("export")) {
    const isImport = lowerBaseName.includes("import");
    const hasCSV = lowerContent.includes("csv");
    const hasJSON = lowerContent.includes("json");
    const format = hasCSV ? "CSV" : hasJSON ? "JSON" : "external";
    return `This is a data ${isImport ? "import" : "export"} script that ${isImport ? "reads" : "writes"} data ${isImport ? "from" : "to"} ${format} files or external sources. ${isImport ? "Import scripts bring data into the system, parsing and validating it before storing." : "Export scripts extract data from the system for backup, reporting, or transfer to other systems."}`;
  }

  // Cron/scheduled job scripts
  if (lowerBaseName.includes("cron") || lowerBaseName.includes("job") || lowerBaseName.includes("scheduled") || lowerBaseName.includes("task")) {
    return `This is a scheduled task/job script designed to run automatically at specified intervals. It likely performs maintenance tasks like cleaning up old data, sending scheduled notifications, generating reports, or syncing with external services. These scripts run in the background without user interaction.`;
  }

  // Generate/scaffold scripts
  if (lowerBaseName.includes("scaffold") || (lowerBaseName.includes("generate") && ext !== ".tsx" && ext !== ".jsx")) {
    return `This is a scaffolding/generator script that creates boilerplate code or file structures. It automates the creation of new components, modules, or features following project conventions. Scaffolding scripts speed up development by generating consistent starter code.`;
  }

  // Digest/report scripts
  if (lowerBaseName.includes("digest") || lowerBaseName.includes("report") || lowerBaseName.includes("summary")) {
    const hasEmail = lowerContent.includes("email") || lowerContent.includes("mail") || lowerContent.includes("send");
    const hasSchedule = lowerContent.includes("cron") || lowerContent.includes("schedule") || lowerContent.includes("weekly") || lowerContent.includes("daily");
    return `This script generates ${lowerBaseName.includes("weekly") ? "weekly" : lowerBaseName.includes("daily") ? "daily" : "periodic"} digest reports or summaries. ${hasEmail ? "It sends the digest via email to subscribers or stakeholders. " : ""}${hasSchedule ? "It runs on a schedule (likely via cron job). " : ""}Digest scripts aggregate activity, metrics, or updates into a readable summary format.`;
  }

  // Backup scripts
  if (lowerBaseName.includes("backup") || lowerBaseName.includes("snapshot")) {
    return `This is a backup script that creates copies of important data for disaster recovery. It may back up databases, files, or configuration to a secure location. Regular backups protect against data loss from hardware failure, accidental deletion, or security incidents.`;
  }

  // Check/validate/verify scripts
  if (lowerBaseName.includes("check") || lowerBaseName.includes("validate") || lowerBaseName.includes("verify") || lowerBaseName.includes("lint")) {
    return `This is a validation/check script that verifies code quality, data integrity, or configuration correctness. It scans for issues, enforces standards, and reports problems. These scripts are often run in CI/CD pipelines to catch issues before deployment.`;
  }

  // Fix/repair scripts
  if (lowerBaseName.includes("fix") || lowerBaseName.includes("repair") || lowerBaseName.includes("patch")) {
    return `This is a repair/fix script that corrects known issues in data or configuration. It may fix corrupted records, apply patches, or resolve inconsistencies. Fix scripts are typically run as one-time operations when specific problems are discovered.`;
  }

  // Analyze content to generate a smart description based on what the code actually does
  const analyzeScriptContent = (): string | null => {
    const actions: string[] = [];

    // Database operations
    if (lowerContent.includes("prisma.") || lowerContent.includes("db.")) {
      if (lowerContent.includes(".create")) actions.push("creates records in the database");
      if (lowerContent.includes(".update")) actions.push("updates existing database records");
      if (lowerContent.includes(".delete")) actions.push("deletes records from the database");
      if (lowerContent.includes(".findmany") || lowerContent.includes(".findall")) actions.push("queries multiple records");
      if (lowerContent.includes(".findunique") || lowerContent.includes(".findone")) actions.push("looks up specific records");
    }

    // File operations
    if (lowerContent.includes("fs.") || lowerContent.includes("readfile") || lowerContent.includes("writefile")) {
      if (lowerContent.includes("readfile") || lowerContent.includes("readfilesync")) actions.push("reads files from disk");
      if (lowerContent.includes("writefile") || lowerContent.includes("writefilesync")) actions.push("writes files to disk");
      if (lowerContent.includes("mkdir") || lowerContent.includes("makedirectory")) actions.push("creates directories");
      if (lowerContent.includes("unlink") || lowerContent.includes("rmdir")) actions.push("deletes files or directories");
    }

    // HTTP/API operations
    if (lowerContent.includes("fetch(") || lowerContent.includes("axios") || lowerContent.includes("http")) {
      actions.push("makes HTTP requests to external APIs");
    }

    // Email operations
    if (lowerContent.includes("sendmail") || lowerContent.includes("nodemailer") || lowerContent.includes("sendemail")) {
      actions.push("sends emails");
    }

    // User/auth operations
    if (lowerContent.includes("user") || lowerContent.includes("account")) {
      if (lowerContent.includes("role") || lowerContent.includes("permission") || lowerContent.includes("admin")) {
        actions.push("manages user roles and permissions");
      }
    }

    // Process/exec operations
    if (lowerContent.includes("exec(") || lowerContent.includes("spawn") || lowerContent.includes("child_process")) {
      actions.push("executes shell commands or other programs");
    }

    // Environment/config
    if (lowerContent.includes("process.env") || lowerContent.includes("dotenv")) {
      actions.push("reads environment variables");
    }

    // Command line arguments
    if (lowerContent.includes("process.argv") || lowerContent.includes("commander") || lowerContent.includes("yargs")) {
      actions.push("accepts command-line arguments");
    }

    if (actions.length > 0) {
      return actions.join(", ");
    }
    return null;
  };

  const scriptActions = analyzeScriptContent();
  if (scriptActions) {
    const readableName = baseName.replace(/[-_]/g, " ");
    return `This script (${readableName}) ${scriptActions}. It's designed to be run from the command line or as part of an automated process. Scripts like this typically perform administrative tasks, data processing, or system maintenance that don't require a user interface.`;
  }

  // Fallback: use content analysis
  const purpose = analyzeComponentPurpose();
  if (purpose && purpose !== "handles asynchronous operations") {
    const mainExport = exports[0] || 'This module';
    const readableName = mainExport.replace(/([A-Z])/g, ' $1').trim();
    return `${readableName} is a ${ext === '.tsx' || ext === '.jsx' ? 'React component' : 'module'} that ${purpose}. ${lineCount > 100 ? `With ${lineCount} lines of code, it handles significant functionality in the application.` : ''}`;
  }

  // Ultimate fallback with JSDoc if available
  if (jsDocDescription && !jsDocDescription.startsWith("@")) {
    return jsDocDescription;
  }

  // Better final fallback - try to infer from file name
  const readableName = baseName.replace(/[-_]/g, " ").replace(/([A-Z])/g, ' $1').trim();
  if (ext === '.ts' || ext === '.js') {
    return `This is a "${readableName}" module. Based on its name and location, it likely handles ${readableName.toLowerCase()} functionality for the application. Check the Technical Details section above for more specific information about what this code does.`;
  }

  // Final fallback for components
  if (exports.length > 0) {
    const mainExport = exports[0];
    const readable = mainExport.replace(/([A-Z])/g, ' $1').trim();
    return `This ${ext === '.tsx' || ext === '.jsx' ? 'component' : 'module'} exports ${readable}. ${details.length > 0 ? `Key characteristics: ${details.slice(0, 2).join('; ')}.` : ''}`;
  }

  return `This "${readableName}" file provides functionality for the application. Review the Technical Details section to understand what specific features it implements.`;
}

export async function POST(request: NextRequest) {
  try {
    const { filePath, projectPath } = await request.json();

    if (!filePath || !projectPath) {
      return NextResponse.json(
        { error: "filePath and projectPath are required" },
        { status: 400 }
      );
    }

    // Construct full path - filePath might be relative to projectPath
    let fullPath = filePath;
    if (!path.isAbsolute(filePath)) {
      fullPath = path.join(projectPath, filePath);
    }

    // Security: ensure the file is within the project directory
    const resolvedProject = path.resolve(projectPath);
    let resolvedFile = path.resolve(fullPath);

    if (!resolvedFile.startsWith(resolvedProject)) {
      return NextResponse.json(
        { error: "Access denied: file is outside project directory" },
        { status: 403 }
      );
    }

    // Check if file exists, try with different extensions if not
    let fileExists = false;
    try {
      await fs.access(resolvedFile);
      fileExists = true;
    } catch {
      // Try adding extensions
      for (const ext of EXTENSIONS_TO_TRY) {
        try {
          const withExt = resolvedFile + ext;
          await fs.access(withExt);
          resolvedFile = withExt;
          fileExists = true;
          break;
        } catch {
          // Continue trying
        }
      }

      // Also try index files in the directory
      if (!fileExists) {
        for (const indexFile of ["index.tsx", "index.ts", "index.jsx", "index.js"]) {
          try {
            const indexPath = path.join(resolvedFile, indexFile);
            await fs.access(indexPath);
            resolvedFile = indexPath;
            fileExists = true;
            break;
          } catch {
            // Continue trying
          }
        }
      }
    }

    if (!fileExists) {
      return NextResponse.json(
        { error: `File not found: ${filePath}` },
        { status: 404 }
      );
    }

    // Read file contents
    const content = await fs.readFile(resolvedFile, "utf-8");

    // Get file stats
    const stats = await fs.stat(resolvedFile);

    // Determine language from extension
    const ext = path.extname(resolvedFile).toLowerCase();
    const languageMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "typescript",
      ".js": "javascript",
      ".jsx": "javascript",
      ".json": "json",
      ".css": "css",
      ".scss": "scss",
      ".html": "html",
      ".md": "markdown",
      ".py": "python",
      ".prisma": "prisma",
      ".sql": "sql",
      ".yml": "yaml",
      ".yaml": "yaml",
      ".env": "shell",
      ".sh": "shell",
      ".bash": "shell",
    };

    // Extract description from code analysis
    const description = analyzeFileContent(content, path.basename(resolvedFile), ext);

    return NextResponse.json({
      content,
      language: languageMap[ext] || "plaintext",
      fileName: path.basename(resolvedFile),
      filePath: resolvedFile,
      size: stats.size,
      lines: content.split("\n").length,
      description,
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}
