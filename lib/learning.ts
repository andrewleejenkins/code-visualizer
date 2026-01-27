// Learning mode utilities for making code visualization approachable

// =============================================================================
// ANALOGY MODE - Friendly metaphors for technical concepts
// =============================================================================

export const ANALOGIES = {
  // Tab names
  tabs: {
    explorer: { technical: "Explorer", friendly: "Tour Guide" },
    routes: { technical: "API Routes", friendly: "Doorways" },
    components: { technical: "Components", friendly: "Building Blocks" },
    models: { technical: "Database", friendly: "File Cabinets" },
    dependencies: { technical: "Dependencies", friendly: "Recipe Ingredients" },
  },

  // Component types
  componentTypes: {
    client: { technical: "Client Component", friendly: "Dining Room (what guests see)" },
    server: { technical: "Server Component", friendly: "Kitchen (behind the scenes)" },
  },

  // HTTP methods
  httpMethods: {
    GET: { technical: "GET", friendly: "Read/Fetch" },
    POST: { technical: "POST", friendly: "Create New" },
    PUT: { technical: "PUT", friendly: "Update/Replace" },
    PATCH: { technical: "PATCH", friendly: "Modify Part" },
    DELETE: { technical: "DELETE", friendly: "Remove" },
  },

  // File types
  fileTypes: {
    component: { technical: "Component", friendly: "Building Block" },
    lib: { technical: "Library", friendly: "Toolbox" },
    api: { technical: "API Route", friendly: "Doorway" },
    page: { technical: "Page", friendly: "Room" },
    other: { technical: "File", friendly: "Resource" },
  },

  // Relationship types
  relationships: {
    "one-to-one": { technical: "One-to-One", friendly: "Paired (like a person and their passport)" },
    "one-to-many": { technical: "One-to-Many", friendly: "Collection (like a folder with papers)" },
    "many-to-many": { technical: "Many-to-Many", friendly: "Network (like students and classes)" },
  },

  // General terms
  terms: {
    import: { technical: "imports", friendly: "uses" },
    export: { technical: "exports", friendly: "provides" },
    dependency: { technical: "dependency", friendly: "ingredient" },
    module: { technical: "module", friendly: "section" },
    function: { technical: "function", friendly: "action" },
    database: { technical: "database", friendly: "filing system" },
    model: { technical: "model", friendly: "form template" },
    field: { technical: "field", friendly: "blank to fill in" },
    relation: { technical: "relation", friendly: "connection" },
    schema: { technical: "schema", friendly: "blueprint" },
    props: { technical: "props", friendly: "instructions" },
    state: { technical: "state", friendly: "memory" },
    hook: { technical: "hook", friendly: "helper" },
    render: { technical: "render", friendly: "display" },
    array: { technical: "array", friendly: "list" },
    object: { technical: "object", friendly: "container" },
    string: { technical: "string", friendly: "text" },
    number: { technical: "number", friendly: "number" },
    boolean: { technical: "boolean", friendly: "yes/no" },
  },
} as const;

// Helper to get the appropriate term based on analogy mode
export function getTerm(
  category: keyof typeof ANALOGIES,
  key: string,
  analogyMode: boolean
): string {
  const categoryData = ANALOGIES[category] as Record<string, { technical: string; friendly: string }>;
  const item = categoryData[key];
  if (!item) return key;
  return analogyMode ? item.friendly : item.technical;
}

// =============================================================================
// COMPLEXITY LEVELS - Progressive disclosure of technical details
// =============================================================================

export const COMPLEXITY_LEVELS = {
  1: {
    name: "Beginner",
    description: "Simple overview with friendly explanations",
    icon: "🌱",
    features: {
      showFileExtensions: false,
      showFilePaths: false,
      showTechnicalTypes: false,
      showLineNumbers: false,
      showImportDetails: false,
      showRelationshipTypes: false,
      maxItemsPerSection: 5,
    },
  },
  2: {
    name: "Intermediate",
    description: "More details with some technical terms",
    icon: "🌿",
    features: {
      showFileExtensions: true,
      showFilePaths: false,
      showTechnicalTypes: true,
      showLineNumbers: false,
      showImportDetails: false,
      showRelationshipTypes: true,
      maxItemsPerSection: 15,
    },
  },
  3: {
    name: "Advanced",
    description: "Full technical details",
    icon: "🌳",
    features: {
      showFileExtensions: true,
      showFilePaths: true,
      showTechnicalTypes: true,
      showLineNumbers: true,
      showImportDetails: true,
      showRelationshipTypes: true,
      maxItemsPerSection: Infinity,
    },
  },
} as const;

export type ComplexityLevel = keyof typeof COMPLEXITY_LEVELS;

export function getComplexityFeatures(level: number) {
  const validLevel = Math.max(1, Math.min(3, level)) as ComplexityLevel;
  return COMPLEXITY_LEVELS[validLevel].features;
}

// =============================================================================
// TOOLTIPS - Plain English explanations
// =============================================================================

export const TOOLTIPS = {
  // Dashboard sections
  sections: {
    explorer: "Start here! This is your tour guide to understand how all the pieces fit together.",
    routes: "These are the 'doorways' into your application - how users and other programs communicate with it.",
    components: "These are the visual building blocks that make up what users see on screen.",
    models: "Think of these as the forms and filing cabinets that store all your application's data.",
    dependencies: "This shows which parts of the code rely on other parts - like a recipe showing ingredients.",
  },

  // Stats
  stats: {
    routes: "Number of ways to communicate with the app",
    components: "Number of visual building blocks",
    models: "Number of data storage templates",
    files: "Total number of code files analyzed",
  },

  // Controls
  controls: {
    search: "Type here to find something specific",
    zoom: "Make the diagram bigger or smaller",
    fullscreen: "Expand to fill your entire screen",
    depth: "Control how many levels of connections to show",
    showAll: "Display everything (may be slow with large projects)",
    simpleMode: "Hide extra details for easier viewing",
  },

  // Module Explorer
  moduleExplorer: {
    focusMode: "Click a section to zoom in and see only its connections",
    breadcrumb: "Your navigation trail - click to go back to any previous view",
    incoming: "Things that depend ON this (who uses this?)",
    outgoing: "Things this DEPENDS on (what does this use?)",
    depth: "How many levels of connections to trace",
  },

  // Concepts
  concepts: {
    clientComponent: "Code that runs in the user's browser - handles interactions and animations",
    serverComponent: "Code that runs on the server - handles data and security",
    apiRoute: "A URL endpoint that accepts requests and sends back data",
    prismaModel: "A template that defines what information can be stored",
    relationship: "A link between two pieces of data (like how a book connects to its author)",
  },
} as const;

export function getTooltip(category: keyof typeof TOOLTIPS, key: string): string {
  const categoryData = TOOLTIPS[category] as Record<string, string>;
  return categoryData[key] || "";
}

// =============================================================================
// STORY PATHS - Guided tours through the codebase
// =============================================================================

export interface StoryStep {
  id: string;
  title: string;
  description: string;
  target: {
    tab: string;
    item?: string;
    highlight?: string[];
  };
  explanation: string;
}

export interface StoryPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  steps: StoryStep[];
}

export const STORY_PATHS: StoryPath[] = [
  {
    id: "how-data-flows",
    title: "How Data Flows",
    description: "Follow a piece of information from the user's screen to the database and back",
    icon: "🌊",
    difficulty: "beginner",
    estimatedTime: "5 min",
    steps: [
      {
        id: "start-components",
        title: "Where Users Interact",
        description: "Start with the building blocks users see",
        target: { tab: "components" },
        explanation: "When someone uses your app, they interact with Components. These are like the buttons, forms, and displays on screen. Think of them as the 'face' of your application.",
      },
      {
        id: "api-routes",
        title: "The Doorways",
        description: "See how information travels",
        target: { tab: "routes" },
        explanation: "When a user clicks a button or submits a form, the data travels through an API Route. These are like doorways - they receive requests and send back responses. Each route has a specific job.",
      },
      {
        id: "database-models",
        title: "Where Data Lives",
        description: "Understand data storage",
        target: { tab: "models" },
        explanation: "Finally, data reaches the Database. Models are like filing cabinets with specific folders. A 'User' model stores user information, an 'Order' model stores purchases. Each model defines what information it can hold.",
      },
      {
        id: "connections",
        title: "See the Full Picture",
        description: "Watch it all connect",
        target: { tab: "explorer" },
        explanation: "Now you can see how everything connects! Components talk to Routes, Routes talk to Models. It's like a postal system - letters (data) travel from one place to another through specific paths.",
      },
    ],
  },
  {
    id: "anatomy-of-feature",
    title: "Anatomy of a Feature",
    description: "Understand all the pieces that make one feature work",
    icon: "🔬",
    difficulty: "intermediate",
    estimatedTime: "7 min",
    steps: [
      {
        id: "pick-feature",
        title: "Choose a Feature",
        description: "Select something to explore",
        target: { tab: "explorer" },
        explanation: "Pick any feature from the list - maybe 'Users' or 'Auth'. We'll explore all the pieces that make it work, from what users see to how data is stored.",
      },
      {
        id: "explore-components",
        title: "The Visual Parts",
        description: "See what users interact with",
        target: { tab: "components" },
        explanation: "Every feature has visual components. A 'Login' feature might have a LoginForm, a LoginButton, and error messages. These components work together to create the user experience.",
      },
      {
        id: "trace-routes",
        title: "The Communication Layer",
        description: "How does this feature talk to the server?",
        target: { tab: "routes" },
        explanation: "Features need to send and receive data. A login feature needs a route to check passwords, another to create sessions. Each route is specialized for one task.",
      },
      {
        id: "check-models",
        title: "The Data Layer",
        description: "What information does this feature store?",
        target: { tab: "models" },
        explanation: "Look at what data this feature needs. A login feature needs a User model (to check credentials) and maybe a Session model (to remember who's logged in).",
      },
      {
        id: "dependencies",
        title: "The Hidden Helpers",
        description: "What else does this feature rely on?",
        target: { tab: "dependencies" },
        explanation: "Features often share code. A login form might use a shared Button component, a validation library, or security utilities. Understanding these connections helps you see the bigger picture.",
      },
    ],
  },
  {
    id: "finding-things",
    title: "Finding Your Way Around",
    description: "Learn to navigate and search the codebase like a pro",
    icon: "🧭",
    difficulty: "beginner",
    estimatedTime: "3 min",
    steps: [
      {
        id: "overview",
        title: "Get the Big Picture",
        description: "Start with a bird's eye view",
        target: { tab: "explorer" },
        explanation: "The Explorer shows you all the major sections of the code, grouped by what they do. It's like a map of a city, showing you the different neighborhoods.",
      },
      {
        id: "search",
        title: "Use Search",
        description: "Find something specific quickly",
        target: { tab: "components" },
        explanation: "If you're looking for something specific, use the search bar! Type 'button' to find all buttons, 'user' to find user-related code. It's much faster than browsing.",
      },
      {
        id: "drill-down",
        title: "Click to Explore",
        description: "Dive deeper into any section",
        target: { tab: "explorer" },
        explanation: "Click on any item to focus on it. You'll see what it connects to, what it depends on, and get a plain-English explanation of what it does.",
      },
    ],
  },
];

export function getStoryPath(id: string): StoryPath | undefined {
  return STORY_PATHS.find((path) => path.id === id);
}

// =============================================================================
// EXPLANATION GENERATORS - Context-aware explanations
// =============================================================================

export function generateFriendlyExplanation(
  type: "component" | "route" | "model" | "file",
  name: string,
  details: Record<string, unknown>,
  analogyMode: boolean
): string {
  const intro = analogyMode
    ? "Let me explain this in simple terms:\n\n"
    : "";

  switch (type) {
    case "component": {
      const clientServer = details.type === "client"
        ? (analogyMode ? "runs in the visitor's browser (like the dining room)" : "runs on the client side")
        : (analogyMode ? "runs on the server (like the kitchen)" : "runs on the server side");
      const deps = (details.dependencies as string[])?.length || 0;
      const depText = deps > 0
        ? (analogyMode ? `uses ${deps} other building blocks` : `has ${deps} dependencies`)
        : (analogyMode ? "is self-contained" : "has no dependencies");
      return `${intro}**${name}** is a ${analogyMode ? "building block" : "component"} that ${clientServer}. It ${depText}.`;
    }

    case "route": {
      const method = details.method as string;
      const methodExplain = analogyMode
        ? { GET: "retrieves", POST: "creates", PUT: "updates", PATCH: "modifies", DELETE: "removes" }[method] || "handles"
        : method;
      const auth = details.auth as string;
      const authExplain = analogyMode
        ? { public: "anyone can use", protected: "only logged-in users can use", admin: "only administrators can use" }[auth] || ""
        : `auth: ${auth}`;
      return `${intro}**${details.path}** is a ${analogyMode ? "doorway" : "route"} that ${methodExplain} data. ${authExplain}.`;
    }

    case "model": {
      const fields = (details.fields as unknown[])?.length || 0;
      const relations = (details.relations as string[]) || [];
      const relText = relations.length > 0
        ? (analogyMode
          ? `It's connected to: ${relations.join(", ")}`
          : `Relations: ${relations.join(", ")}`)
        : "";
      return `${intro}**${name}** is a ${analogyMode ? "form template" : "database model"} with ${fields} ${analogyMode ? "blanks to fill in" : "fields"}. ${relText}`;
    }

    case "file": {
      const fileType = details.type as string;
      const typeExplain = analogyMode
        ? { component: "building block", lib: "toolbox", api: "doorway", page: "room", other: "resource" }[fileType] || "file"
        : fileType;
      const imports = (details.imports as number) || 0;
      const usedBy = (details.usedBy as number) || 0;
      return `${intro}**${name}** is a ${typeExplain}. It ${analogyMode ? "uses" : "imports"} ${imports} other ${analogyMode ? "resources" : "files"} and is ${analogyMode ? "used by" : "imported by"} ${usedBy} other ${analogyMode ? "parts" : "files"}.`;
    }

    default:
      return `${intro}This is ${name}.`;
  }
}
