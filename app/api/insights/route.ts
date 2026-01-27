import { NextRequest, NextResponse } from "next/server";
import type {
  AnalysisResult,
  InsightsData,
  StartHereItem,
  DetectedFeature,
  TechStackItem,
  CodebaseHealth,
  ArchitectureSummary,
  GuidedTour,
  FileImportance,
  DataFlow,
  GlossaryTerm,
} from "@/lib/types";

// Generate insights from analysis data
export async function POST(request: NextRequest) {
  try {
    const { analysis }: { analysis: AnalysisResult } = await request.json();

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis data is required" },
        { status: 400 }
      );
    }

    const insights: InsightsData = {
      startHere: generateStartHere(analysis),
      features: detectFeatures(analysis),
      techStack: detectTechStack(analysis),
      health: analyzeHealth(analysis),
      architecture: generateArchitectureSummary(analysis),
      tours: generateTours(analysis),
      fileImportance: calculateFileImportance(analysis),
      dataFlows: detectDataFlows(analysis),
      glossary: getGlossary(),
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

// ============================================================================
// START HERE GUIDE
// ============================================================================

function generateStartHere(analysis: AnalysisResult): StartHereItem[] {
  const items: StartHereItem[] = [];
  const deps = analysis.dependencies;

  // Find entry points and important files
  const entryPatterns = [
    { pattern: /layout\.(tsx?|jsx?)$/, importance: "critical" as const, reason: "This is the main layout that wraps every page", whatYouLearn: "How the app is structured and what appears on every page" },
    { pattern: /page\.(tsx?|jsx?)$/, importance: "critical" as const, reason: "This is the homepage - the first thing users see", whatYouLearn: "What the main user experience looks like", matchDir: /^app\/?$/ },
    { pattern: /globals?\.(css|scss)$/, importance: "helpful" as const, reason: "This controls the overall visual style", whatYouLearn: "The color scheme and design choices" },
    { pattern: /store\.(tsx?|ts)$/, importance: "important" as const, reason: "This is the app's memory - where shared data lives", whatYouLearn: "What data the app keeps track of" },
    { pattern: /types?\.(tsx?|ts)$/, importance: "helpful" as const, reason: "This defines the shape of all data in the app", whatYouLearn: "What kinds of information the app works with" },
    { pattern: /auth/, importance: "important" as const, reason: "This handles user login and security", whatYouLearn: "How users sign in and stay logged in" },
    { pattern: /prisma\.?schema/, importance: "important" as const, reason: "This defines the database structure", whatYouLearn: "What data gets saved permanently" },
    { pattern: /package\.json$/, importance: "helpful" as const, reason: "This lists all the tools and libraries used", whatYouLearn: "What technologies power this app" },
  ];

  if (deps?.nodes) {
    let order = 1;
    for (const ep of entryPatterns) {
      const found = deps.nodes.find(n => {
        const matchesPattern = ep.pattern.test(n.label);
        if (ep.matchDir) {
          return matchesPattern && ep.matchDir.test(n.directory);
        }
        return matchesPattern;
      });

      if (found) {
        items.push({
          file: `${found.directory}/${found.label}`,
          name: found.label,
          order: order++,
          importance: ep.importance,
          reason: ep.reason,
          whatYouLearn: ep.whatYouLearn,
        });
      }
    }
  }

  // Add the most connected components (hubs)
  const importCounts = new Map<string, number>();
  if (deps?.edges) {
    for (const edge of deps.edges) {
      importCounts.set(edge.target, (importCounts.get(edge.target) || 0) + 1);
    }
  }

  const hubs = Array.from(importCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [nodeId, count] of hubs) {
    const node = deps?.nodes.find(n => n.id === nodeId);
    if (node && !items.some(i => i.file.includes(node.label))) {
      items.push({
        file: `${node.directory}/${node.label}`,
        name: node.label,
        order: items.length + 1,
        importance: "important",
        reason: `This is used by ${count} other files - it's a key building block`,
        whatYouLearn: "A reusable piece that appears in many places",
      });
    }
  }

  return items.slice(0, 10);
}

// ============================================================================
// FEATURE DETECTION
// ============================================================================

function detectFeatures(analysis: AnalysisResult): DetectedFeature[] {
  const features: DetectedFeature[] = [];
  const deps = analysis.dependencies;
  const routes = analysis.routes;
  const components = analysis.components;

  // Feature patterns to detect
  const featurePatterns = [
    { id: "auth", name: "User Authentication", icon: "🔐", patterns: [/auth/i, /login/i, /signup/i, /signin/i, /register/i, /session/i], description: "Handles user accounts, login, and security" },
    { id: "dashboard", name: "Dashboard", icon: "📊", patterns: [/dashboard/i, /analytics/i, /overview/i], description: "Shows data summaries and key metrics" },
    { id: "payments", name: "Payments", icon: "💳", patterns: [/payment/i, /stripe/i, /checkout/i, /billing/i, /subscription/i], description: "Handles money transactions and subscriptions" },
    { id: "email", name: "Email", icon: "📧", patterns: [/email/i, /mail/i, /newsletter/i, /notification/i], description: "Sends emails and notifications to users" },
    { id: "upload", name: "File Uploads", icon: "📁", patterns: [/upload/i, /file/i, /image/i, /media/i, /storage/i], description: "Lets users upload files and images" },
    { id: "search", name: "Search", icon: "🔍", patterns: [/search/i, /filter/i, /query/i], description: "Helps users find content" },
    { id: "settings", name: "Settings", icon: "⚙️", patterns: [/setting/i, /preference/i, /config/i, /profile/i], description: "Lets users customize their experience" },
    { id: "admin", name: "Admin Panel", icon: "👑", patterns: [/admin/i, /manage/i], description: "Tools for administrators to manage the app" },
    { id: "api", name: "API", icon: "🔌", patterns: [/api/i, /route/i], description: "Backend endpoints that handle data" },
    { id: "blog", name: "Blog/Content", icon: "📝", patterns: [/blog/i, /post/i, /article/i, /content/i, /cms/i], description: "Content management and publishing" },
    { id: "chat", name: "Chat/Messaging", icon: "💬", patterns: [/chat/i, /message/i, /conversation/i], description: "Real-time communication features" },
    { id: "social", name: "Social Features", icon: "👥", patterns: [/social/i, /friend/i, /follow/i, /share/i, /comment/i], description: "Social interactions between users" },
  ];

  for (const fp of featurePatterns) {
    const matchingFiles: string[] = [];

    // Check components
    if (components?.components) {
      for (const comp of components.components) {
        if (fp.patterns.some(p => p.test(comp.name) || p.test(comp.path))) {
          matchingFiles.push(comp.path);
        }
      }
    }

    // Check routes
    if (routes?.routes) {
      for (const route of routes.routes) {
        if (fp.patterns.some(p => p.test(route.path) || p.test(route.file))) {
          if (!matchingFiles.includes(route.file)) {
            matchingFiles.push(route.file);
          }
        }
      }
    }

    // Check dependency nodes
    if (deps?.nodes) {
      for (const node of deps.nodes) {
        if (fp.patterns.some(p => p.test(node.label) || p.test(node.directory))) {
          const path = `${node.directory}/${node.label}`;
          if (!matchingFiles.includes(path)) {
            matchingFiles.push(path);
          }
        }
      }
    }

    if (matchingFiles.length > 0) {
      features.push({
        id: fp.id,
        name: fp.name,
        description: fp.description,
        icon: fp.icon,
        files: matchingFiles.slice(0, 20),
        entryPoint: matchingFiles[0],
      });
    }
  }

  return features.sort((a, b) => b.files.length - a.files.length);
}

// ============================================================================
// TECH STACK DETECTION
// ============================================================================

function detectTechStack(analysis: AnalysisResult): TechStackItem[] {
  const techStack: TechStackItem[] = [];
  const deps = analysis.dependencies;

  // Detect from file patterns and known technologies
  const techPatterns: Array<{
    name: string;
    category: TechStackItem["category"];
    patterns: RegExp[];
    description: string;
    simpleExplanation: string;
  }> = [
    { name: "Next.js", category: "framework", patterns: [/next/i, /app\/.*page\./], description: "React framework for production websites", simpleExplanation: "The main engine that powers this website - it handles pages, routing, and makes things fast" },
    { name: "React", category: "framework", patterns: [/\.tsx$/, /\.jsx$/, /usestate/i, /useeffect/i], description: "UI library for building interfaces", simpleExplanation: "The tool that builds all the visual pieces you see and interact with" },
    { name: "TypeScript", category: "tooling", patterns: [/\.tsx?$/], description: "JavaScript with types for safety", simpleExplanation: "A helper that catches mistakes in the code before they become bugs" },
    { name: "Tailwind CSS", category: "styling", patterns: [/tailwind/i, /className.*bg-/], description: "Utility-first CSS framework", simpleExplanation: "A styling system that makes the app look good with ready-made design pieces" },
    { name: "Prisma", category: "database", patterns: [/prisma/i], description: "Database toolkit and ORM", simpleExplanation: "The translator between the app and the database - it saves and retrieves information" },
    { name: "PostgreSQL", category: "database", patterns: [/postgres/i, /postgresql/i], description: "Relational database", simpleExplanation: "A powerful filing cabinet that stores all the app's data permanently" },
    { name: "MongoDB", category: "database", patterns: [/mongo/i, /mongoose/i], description: "NoSQL document database", simpleExplanation: "A flexible storage system that keeps data in a format similar to JSON" },
    { name: "Stripe", category: "api", patterns: [/stripe/i], description: "Payment processing", simpleExplanation: "The secure system that handles credit cards and payments" },
    { name: "NextAuth.js", category: "auth", patterns: [/next-?auth/i, /authOptions/i], description: "Authentication for Next.js", simpleExplanation: "The security guard that handles user logins and keeps accounts safe" },
    { name: "Clerk", category: "auth", patterns: [/clerk/i], description: "User management platform", simpleExplanation: "A service that handles user accounts, logins, and profile management" },
    { name: "Zustand", category: "framework", patterns: [/zustand/i, /create\(\s*\(\s*set/], description: "State management library", simpleExplanation: "The app's short-term memory - it remembers things while you're using the app" },
    { name: "Redux", category: "framework", patterns: [/redux/i, /createSlice/i], description: "State management library", simpleExplanation: "A system that manages data that needs to be shared across the whole app" },
    { name: "Jest", category: "testing", patterns: [/jest/i, /\.test\./i, /\.spec\./i], description: "JavaScript testing framework", simpleExplanation: "A tool that automatically checks if the code works correctly" },
    { name: "AWS", category: "api", patterns: [/aws/i, /s3/i, /lambda/i], description: "Amazon cloud services", simpleExplanation: "Cloud computing services that can store files, run code, and more" },
    { name: "Vercel", category: "api", patterns: [/vercel/i], description: "Deployment platform", simpleExplanation: "The service that puts the website on the internet for everyone to access" },
    { name: "OpenAI", category: "api", patterns: [/openai/i, /gpt/i, /chatgpt/i], description: "AI services", simpleExplanation: "Artificial intelligence that can understand and generate text" },
    { name: "Resend", category: "api", patterns: [/resend/i], description: "Email API", simpleExplanation: "A service that sends emails on behalf of the app" },
    { name: "Framer Motion", category: "styling", patterns: [/framer-?motion/i, /motion\./], description: "Animation library", simpleExplanation: "Makes things move smoothly - animations, transitions, and visual effects" },
  ];

  // Check each technology
  if (deps?.nodes) {
    for (const tech of techPatterns) {
      const matchingFiles: string[] = [];

      for (const node of deps.nodes) {
        const fullPath = `${node.directory}/${node.label}`;
        if (tech.patterns.some(p => p.test(node.label) || p.test(fullPath))) {
          matchingFiles.push(fullPath);
        }
      }

      if (matchingFiles.length > 0) {
        techStack.push({
          name: tech.name,
          category: tech.category,
          description: tech.description,
          simpleExplanation: tech.simpleExplanation,
          usedIn: matchingFiles.slice(0, 10),
        });
      }
    }
  }

  return techStack;
}

// ============================================================================
// CODEBASE HEALTH
// ============================================================================

function analyzeHealth(analysis: AnalysisResult): CodebaseHealth {
  const deps = analysis.dependencies;
  const components = analysis.components;
  const routes = analysis.routes;
  const models = analysis.models;

  // Count totals
  const totalFiles = deps?.nodes.length || 0;
  const totalComponents = components?.components.length || 0;
  const totalRoutes = routes?.routes.length || 0;
  const totalModels = models?.models.length || 0;

  // Estimate total lines (rough calculation)
  let totalLines = 0;
  if (components?.components) {
    totalLines = components.components.reduce((sum, c) => sum + c.linesOfCode, 0);
  }

  // Calculate import counts for each file
  const importedByCount = new Map<string, number>();
  const importsCount = new Map<string, number>();

  if (deps?.edges) {
    for (const edge of deps.edges) {
      importedByCount.set(edge.target, (importedByCount.get(edge.target) || 0) + 1);
      importsCount.set(edge.source, (importsCount.get(edge.source) || 0) + 1);
    }
  }

  // Find hub files (imported by many)
  const hubFiles = Array.from(importedByCount.entries())
    .filter(([_, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => {
      const node = deps?.nodes.find(n => n.id === id);
      return node ? `${node.directory}/${node.label}` : id;
    });

  // Find isolated files (no imports or exports)
  const isolatedFiles: string[] = [];
  if (deps?.nodes) {
    for (const node of deps.nodes) {
      const id = node.id;
      if (!importedByCount.has(id) && !importsCount.has(id)) {
        isolatedFiles.push(`${node.directory}/${node.label}`);
      }
    }
  }

  // Find largest files
  const largestFiles = (components?.components || [])
    .sort((a, b) => b.linesOfCode - a.linesOfCode)
    .slice(0, 5)
    .map(c => ({ file: c.path, lines: c.linesOfCode }));

  // Determine complexity
  let complexity: CodebaseHealth["complexity"] = "simple";
  if (totalFiles > 200 || totalLines > 50000) complexity = "very-complex";
  else if (totalFiles > 100 || totalLines > 20000) complexity = "complex";
  else if (totalFiles > 50 || totalLines > 10000) complexity = "moderate";

  // Determine organization
  let organization: CodebaseHealth["organization"] = "excellent";
  const avgFilesPerDir = totalFiles / (deps?.clusters.length || 1);
  if (avgFilesPerDir > 30) organization = "needs-work";
  else if (avgFilesPerDir > 20) organization = "fair";
  else if (avgFilesPerDir > 10) organization = "good";

  // Generate insights
  const insights: string[] = [];

  if (hubFiles.length > 5) {
    insights.push(`This codebase has ${hubFiles.length} "hub" files that many other files depend on. These are critical to understand.`);
  }

  if (isolatedFiles.length > 10) {
    insights.push(`There are ${isolatedFiles.length} isolated files that aren't connected to anything else. Some might be unused.`);
  }

  if (largestFiles.length > 0 && largestFiles[0].lines > 500) {
    insights.push(`The largest file has ${largestFiles[0].lines} lines. Files this large can be hard to understand and maintain.`);
  }

  if (totalModels > 20) {
    insights.push(`This app has ${totalModels} database models - it stores a lot of different types of information.`);
  }

  if (totalRoutes > 30) {
    insights.push(`With ${totalRoutes} API routes, this app has a substantial backend API.`);
  }

  return {
    totalFiles,
    totalLines,
    totalComponents,
    totalRoutes,
    totalModels,
    complexity,
    organization,
    hubFiles,
    isolatedFiles: isolatedFiles.slice(0, 10),
    largestFiles,
    insights,
  };
}

// ============================================================================
// ARCHITECTURE SUMMARY
// ============================================================================

function generateArchitectureSummary(analysis: AnalysisResult): ArchitectureSummary {
  const techStack = detectTechStack(analysis);
  const features = detectFeatures(analysis);
  const health = analyzeHealth(analysis);

  // Determine project type
  let projectType = "Web Application";
  if (techStack.some(t => t.name === "Next.js")) {
    projectType = "Next.js Web Application";
  }

  // Key technologies
  const keyTech = techStack
    .filter(t => ["framework", "database", "auth"].includes(t.category))
    .map(t => t.name);

  // Main features
  const mainFeatures = features
    .slice(0, 5)
    .map(f => f.name);

  // Generate summary
  const summary = `This is a ${projectType} with ${health.totalFiles} files and approximately ${health.totalLines.toLocaleString()} lines of code. ${
    health.totalComponents > 0 ? `It contains ${health.totalComponents} components` : ""
  }${health.totalRoutes > 0 ? `, ${health.totalRoutes} API endpoints` : ""}${
    health.totalModels > 0 ? `, and ${health.totalModels} database models` : ""
  }. The codebase is ${health.complexity} in complexity and has ${health.organization} organization.`;

  // Data flow description
  let dataFlow = "Users interact with React components, which communicate with API routes on the server.";
  if (techStack.some(t => t.category === "database")) {
    const db = techStack.find(t => t.category === "database");
    dataFlow += ` Data is stored in ${db?.name || "a database"}.`;
  }

  return {
    projectType,
    summary,
    keyTechnologies: keyTech,
    mainFeatures,
    dataFlow,
  };
}

// ============================================================================
// GUIDED TOURS
// ============================================================================

function generateTours(analysis: AnalysisResult): GuidedTour[] {
  const tours: GuidedTour[] = [];
  const deps = analysis.dependencies;
  const features = detectFeatures(analysis);

  // Basic app structure tour
  const structureFiles: TourStep[] = [];

  // Find key structural files
  const layoutFile = deps?.nodes.find(n => /layout\.(tsx?|jsx?)$/.test(n.label));
  const pageFile = deps?.nodes.find(n => /^page\.(tsx?|jsx?)$/.test(n.label) && /^app\/?$/.test(n.directory));

  if (layoutFile) {
    structureFiles.push({
      file: `${layoutFile.directory}/${layoutFile.label}`,
      title: "The Main Layout",
      explanation: "This file wraps every page in your app. It's like the frame of a house - it defines what appears on every single page, like navigation bars, footers, and overall structure.",
      nextAction: "Next, let's look at the homepage itself",
    });
  }

  if (pageFile) {
    structureFiles.push({
      file: `${pageFile.directory}/${pageFile.label}`,
      title: "The Homepage",
      explanation: "This is what users see when they first visit the site. It's the main entrance to your application and often showcases the key features.",
      nextAction: "Now let's see how the app remembers things",
    });
  }

  if (structureFiles.length > 0) {
    tours.push({
      id: "app-structure",
      name: "Understanding the App Structure",
      description: "A beginner's tour of how the application is organized",
      difficulty: "beginner",
      duration: "5 minutes",
      steps: structureFiles,
    });
  }

  // Feature-specific tours
  for (const feature of features.slice(0, 3)) {
    if (feature.files.length >= 2) {
      const steps: TourStep[] = feature.files.slice(0, 5).map((file, i) => ({
        file,
        title: `${feature.name} - Part ${i + 1}`,
        explanation: `This file is part of the ${feature.name.toLowerCase()} feature. ${i === 0 ? "It's the main entry point." : "It works together with the other files in this feature."}`,
        nextAction: i < feature.files.length - 1 ? "See the next piece" : undefined,
      }));

      tours.push({
        id: `feature-${feature.id}`,
        name: `How ${feature.name} Works`,
        description: `Walk through the ${feature.name.toLowerCase()} feature step by step`,
        difficulty: "intermediate",
        duration: `${Math.ceil(feature.files.length * 2)} minutes`,
        steps,
      });
    }
  }

  return tours;
}

// ============================================================================
// FILE IMPORTANCE
// ============================================================================

function calculateFileImportance(analysis: AnalysisResult): FileImportance[] {
  const deps = analysis.dependencies;
  const importance: FileImportance[] = [];

  if (!deps?.nodes || !deps?.edges) return importance;

  // Calculate import counts
  const importedByCount = new Map<string, number>();
  const importsCount = new Map<string, number>();

  for (const edge of deps.edges) {
    importedByCount.set(edge.target, (importedByCount.get(edge.target) || 0) + 1);
    importsCount.set(edge.source, (importsCount.get(edge.source) || 0) + 1);
  }

  // Calculate importance for each file
  for (const node of deps.nodes) {
    const imported = importedByCount.get(node.id) || 0;
    const imports = importsCount.get(node.id) || 0;

    // Impact score: weighted combination of imports and imported-by
    const impactScore = Math.min(100, Math.round((imported * 10) + (imports * 2)));

    importance.push({
      file: `${node.directory}/${node.label}`,
      importedByCount: imported,
      importsCount: imports,
      isHub: imported >= 5,
      isLeaf: imported === 0 && imports === 0,
      impactScore,
    });
  }

  return importance.sort((a, b) => b.impactScore - a.impactScore);
}

// ============================================================================
// DATA FLOWS
// ============================================================================

function detectDataFlows(analysis: AnalysisResult): DataFlow[] {
  const flows: DataFlow[] = [];
  const features = detectFeatures(analysis);

  // Generate common data flows based on detected features
  if (features.some(f => f.id === "auth")) {
    flows.push({
      id: "login-flow",
      name: "User Login",
      description: "How a user logs into the application",
      steps: [
        { id: "1", type: "user-action", label: "User enters credentials", description: "The user types their email and password into the login form" },
        { id: "2", type: "component", label: "Login Form", description: "The form component collects and validates the input" },
        { id: "3", type: "api", label: "Auth API", description: "The server checks if the credentials are correct" },
        { id: "4", type: "database", label: "User Database", description: "The database is queried to verify the user exists and password matches" },
        { id: "5", type: "response", label: "Session Created", description: "If successful, a session is created and the user is logged in" },
      ],
    });
  }

  if (features.some(f => f.id === "payments")) {
    flows.push({
      id: "payment-flow",
      name: "Making a Payment",
      description: "How a payment is processed",
      steps: [
        { id: "1", type: "user-action", label: "User clicks Pay", description: "The user initiates a payment on the checkout page" },
        { id: "2", type: "component", label: "Checkout Form", description: "Payment details are collected securely" },
        { id: "3", type: "api", label: "Payment API", description: "The server creates a payment intent with Stripe" },
        { id: "4", type: "api", label: "Stripe", description: "Stripe processes the payment securely" },
        { id: "5", type: "database", label: "Order Database", description: "The order is saved to the database" },
        { id: "6", type: "response", label: "Confirmation", description: "User sees a success message" },
      ],
    });
  }

  // Generic CRUD flow
  flows.push({
    id: "crud-flow",
    name: "Creating/Saving Data",
    description: "The typical flow when saving something",
    steps: [
      { id: "1", type: "user-action", label: "User fills form", description: "The user enters information in a form" },
      { id: "2", type: "component", label: "Form Component", description: "The component validates the data" },
      { id: "3", type: "api", label: "API Route", description: "The server receives and processes the request" },
      { id: "4", type: "database", label: "Database", description: "Data is saved to the database" },
      { id: "5", type: "response", label: "Success", description: "User sees confirmation that it worked" },
    ],
  });

  return flows;
}

// ============================================================================
// GLOSSARY
// ============================================================================

function getGlossary(): GlossaryTerm[] {
  return [
    {
      term: "Component",
      definition: "A reusable piece of UI that can contain HTML, styling, and logic",
      simpleExplanation: "Think of it like a LEGO brick - a self-contained piece that can be combined with others to build something bigger. A button, a header, or a card are all components.",
      example: "A 'UserCard' component might display a user's photo, name, and bio",
      relatedTerms: ["Props", "State", "JSX"],
    },
    {
      term: "API Route",
      definition: "A server-side endpoint that handles HTTP requests",
      simpleExplanation: "Like a waiter in a restaurant - it takes your order (request), goes to the kitchen (server/database), and brings back your food (response). It's the messenger between the website and the data.",
      example: "/api/users might return a list of all users",
      relatedTerms: ["Endpoint", "REST", "HTTP"],
    },
    {
      term: "State",
      definition: "Data that can change over time and affects what the UI shows",
      simpleExplanation: "The app's short-term memory. Like remembering whether a dropdown is open or closed, what's in your shopping cart, or whether you're logged in.",
      example: "isLoggedIn, cartItems, selectedTab",
      relatedTerms: ["useState", "Store", "Props"],
    },
    {
      term: "Props",
      definition: "Data passed from a parent component to a child component",
      simpleExplanation: "Instructions given to a component. Like telling a Button component what text to show and what to do when clicked.",
      example: "<Button label=\"Submit\" onClick={handleSubmit} />",
      relatedTerms: ["Component", "State"],
    },
    {
      term: "Hook",
      definition: "A special function that lets you use React features in components",
      simpleExplanation: "Power-ups for components. They let components remember things (useState), react to changes (useEffect), and share data (useContext).",
      example: "useState, useEffect, useContext",
      relatedTerms: ["State", "Component", "useEffect"],
    },
    {
      term: "Database Model",
      definition: "A definition of how data is structured in the database",
      simpleExplanation: "A template or blueprint. Like a form that defines what information to collect - a User model might have name, email, and password fields.",
      example: "User model with fields: id, name, email, createdAt",
      relatedTerms: ["Schema", "Prisma", "Table"],
    },
    {
      term: "Layout",
      definition: "A component that wraps pages and provides shared structure",
      simpleExplanation: "The picture frame around your content. It's what stays the same on every page - like the navigation bar and footer.",
      relatedTerms: ["Component", "Page"],
    },
    {
      term: "Client Component",
      definition: "A component that runs in the user's browser",
      simpleExplanation: "Code that runs on YOUR device after the page loads. It can respond to clicks, update instantly, and be interactive. Marked with 'use client'.",
      relatedTerms: ["Server Component", "Hydration"],
    },
    {
      term: "Server Component",
      definition: "A component that runs on the server before being sent to the browser",
      simpleExplanation: "Code that runs on the website's computer before being sent to you. It's faster to load but can't be interactive. It's the default in Next.js.",
      relatedTerms: ["Client Component", "SSR"],
    },
    {
      term: "Middleware",
      definition: "Code that runs between a request and response",
      simpleExplanation: "A security checkpoint. It intercepts every request and can check if you're logged in, redirect you, or modify the request before it continues.",
      relatedTerms: ["API Route", "Authentication"],
    },
    {
      term: "Environment Variables",
      definition: "Configuration values stored outside the code",
      simpleExplanation: "Secret settings stored in a safe place. Things like API keys, database passwords, and other sensitive information that shouldn't be in the code.",
      example: "DATABASE_URL, STRIPE_SECRET_KEY",
      relatedTerms: [".env", "Configuration"],
    },
    {
      term: "TypeScript",
      definition: "JavaScript with added type checking",
      simpleExplanation: "A spell-checker for code. It catches mistakes before they happen by checking that you're using the right types of data in the right places.",
      relatedTerms: ["Interface", "Type"],
    },
  ];
}
