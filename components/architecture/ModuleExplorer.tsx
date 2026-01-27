"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { MermaidDiagram } from "./MermaidDiagram";
import type { ModelData, ModelInfo, DependencyData, ComponentData, NodeInfo } from "@/lib/types";
import { getComplexityFeatures, TOOLTIPS } from "@/lib/learning";

interface ModuleExplorerProps {
  models?: ModelData | null;
  dependencies?: DependencyData | null;
  components?: ComponentData | null;
}

type ExplorerMode = "models" | "files";

interface Module {
  id: string;
  name: string;
  items: string[];
  color: string;
  description: string;
}

const MODULE_COLORS = [
  "#667eea", "#4ade80", "#f472b6", "#60a5fa", "#fbbf24",
  "#f87171", "#a78bfa", "#34d399", "#fb923c", "#38bdf8",
];

// Generate description for a module based on its name and contents
function getModuleDescription(name: string, items: string[], mode: ExplorerMode, analogyMode: boolean = false): string {
  const count = items.length;

  if (mode === "models") {
    if (analogyMode) {
      // Friendly, analogy-based descriptions
      const friendlyPatterns: Record<string, string> = {
        user: `This is like a filing cabinet for people (${count} forms). It keeps track of who uses the app, their names, emails, and account details.`,
        auth: `This is like the security desk (${count} forms). It checks who's allowed in and keeps track of login information.`,
        post: `This is like a folder for articles (${count} forms). It stores blog posts, stories, or any written content.`,
        comment: `This is like sticky notes (${count} forms). It saves what people say about different things.`,
        product: `This is like a product catalog (${count} forms). It keeps track of items that can be bought or sold.`,
        order: `This is like a receipt drawer (${count} forms). It records when someone buys something.`,
        payment: `This is like a cash register log (${count} forms). It tracks money coming in and going out.`,
        notification: `This is like a message board (${count} forms). It stores alerts and updates for users.`,
        message: `This is like a mailbox (${count} forms). It holds conversations between people.`,
        team: `This is like an organization chart (${count} forms). It keeps track of groups and who belongs to them.`,
        project: `This is like a project folder (${count} forms). It organizes tasks and work items.`,
        file: `This is like a file storage room (${count} forms). It keeps track of uploaded pictures and documents.`,
        setting: `This is like a preferences notebook (${count} forms). It remembers how users want things set up.`,
        log: `This is like a journal (${count} forms). It records what happened and when.`,
        subscription: `This is like a membership list (${count} forms). It tracks who pays monthly fees.`,
        invoice: `This is like a billing folder (${count} forms). It stores receipts and payment requests.`,
        other: `These are miscellaneous forms (${count} total) for storing various kinds of information.`,
      };
      return friendlyPatterns[name.toLowerCase()] || `This section holds ${count} different types of information about "${name}".`;
    }

    const patterns: Record<string, string> = {
      user: `User management domain with ${count} models. Handles user accounts, profiles, authentication, and user-related data.`,
      auth: `Authentication & authorization domain with ${count} models. Manages login, sessions, permissions, and security.`,
      post: `Content/posts domain with ${count} models. Handles articles, blog posts, or content entries.`,
      comment: `Comments domain with ${count} models. Manages user comments and discussions.`,
      product: `Product domain with ${count} models. Handles inventory, product catalog, and item data.`,
      order: `Orders domain with ${count} models. Manages purchases, transactions, and order processing.`,
      payment: `Payment domain with ${count} models. Handles billing, transactions, and payment processing.`,
      notification: `Notifications domain with ${count} models. Manages alerts, messages, and user notifications.`,
      message: `Messaging domain with ${count} models. Handles direct messages and communication.`,
      team: `Team/organization domain with ${count} models. Manages groups, teams, and organizational structure.`,
      project: `Projects domain with ${count} models. Handles project management and task organization.`,
      file: `File management domain with ${count} models. Handles uploads, attachments, and media.`,
      setting: `Settings domain with ${count} models. Manages configuration and preferences.`,
      log: `Logging/audit domain with ${count} models. Tracks events, changes, and activity history.`,
      subscription: `Subscription domain with ${count} models. Manages recurring payments and plans.`,
      invoice: `Invoicing domain with ${count} models. Handles billing documents and receipts.`,
      other: `Miscellaneous models (${count} total) that don't fit into a specific domain pattern.`,
    };
    return patterns[name.toLowerCase()] || `${name} domain with ${count} related models.`;
  } else {
    if (analogyMode) {
      // Friendly, analogy-based descriptions for files
      const friendlyPatterns: Record<string, string> = {
        components: `These are visual building blocks (${count} pieces). Like LEGO bricks, they snap together to create what you see on screen.`,
        lib: `This is the toolbox (${count} tools). Helper code that other parts of the app use to get things done.`,
        app: `These are the rooms of the house (${count} pages). Each one is a different page or feature you can visit.`,
        api: `These are the doorways (${count} entry points). They're how the app talks to the outside world and databases.`,
        hooks: `These are special helpers (${count} helpers). They let building blocks remember things and react to changes.`,
        utils: `This is the utility belt (${count} tools). Small, handy functions that do common tasks.`,
        services: `These are the workers (${count} services). They handle the heavy lifting and talk to external systems.`,
        types: `This is the dictionary (${count} definitions). It defines what kind of information each piece can hold.`,
        styles: `This is the paint and decoration (${count} style files). It makes everything look nice.`,
        store: `This is the memory center (${count} files). It remembers important information across the whole app.`,
        context: `These are shared information boards (${count} files). They let different parts of the app share information.`,
        other: `These are miscellaneous files (${count} total) that help the app work.`,
      };
      return friendlyPatterns[name.toLowerCase()] || `This folder contains ${count} files related to "${name}".`;
    }

    const patterns: Record<string, string> = {
      components: `UI Components (${count} files). Reusable React components that make up the user interface.`,
      lib: `Library/utilities (${count} files). Shared helper functions, hooks, and utility code.`,
      app: `Application routes (${count} files). Next.js pages and API routes that define the app structure.`,
      api: `API layer (${count} files). Backend endpoints and server-side logic.`,
      hooks: `Custom hooks (${count} files). Reusable React hooks for state and side effects.`,
      utils: `Utilities (${count} files). Helper functions and shared logic.`,
      services: `Services (${count} files). Business logic and external service integrations.`,
      types: `Type definitions (${count} files). TypeScript interfaces and type declarations.`,
      styles: `Styles (${count} files). CSS, styling utilities, and theme configuration.`,
      store: `State management (${count} files). Global state, stores, and state logic.`,
      context: `React contexts (${count} files). Shared state via React Context API.`,
      other: `Other files (${count} total) in various locations.`,
    };
    return patterns[name.toLowerCase()] || `${name} directory with ${count} files.`;
  }
}

// Generate explanation for a specific model
function getModelExplanation(model: ModelInfo, allModels: ModelInfo[], relationships: ModelData["relationships"], analogyMode: boolean = false): string {
  const dataFields = model.fields.filter(f => !f.isRelation);
  const relationFields = model.fields.filter(f => f.isRelation);

  const outgoing = relationships.filter(r => r.from === model.name);
  const incoming = relationships.filter(r => r.to === model.name);

  let explanation: string;

  if (analogyMode) {
    explanation = `**${model.name}** is like a form template with ${dataFields.length} blank${dataFields.length !== 1 ? 's' : ''} to fill in`;
    if (relationFields.length > 0) {
      explanation += ` and connects to ${relationFields.length} other form${relationFields.length !== 1 ? 's' : ''}`;
    }
    explanation += '.\n\n';
  } else {
    explanation = `**${model.name}** is a database model with ${dataFields.length} data field${dataFields.length !== 1 ? 's' : ''} and ${relationFields.length} relationship${relationFields.length !== 1 ? 's' : ''}.\n\n`;
  }

  // Infer purpose from name
  const nameLower = model.name.toLowerCase();
  const purposeLabel = analogyMode ? "**What it's for:**" : "**Purpose:**";

  if (nameLower.includes('user')) {
    explanation += analogyMode
      ? `${purposeLabel} This keeps track of people who use the app - their names, emails, and account info.\n\n`
      : `${purposeLabel} Represents a user account in the system.\n\n`;
  } else if (nameLower.includes('session')) {
    explanation += analogyMode
      ? `${purposeLabel} This remembers who's currently logged in, like a visitor badge.\n\n`
      : `${purposeLabel} Tracks user login sessions for authentication.\n\n`;
  } else if (nameLower.includes('post') || nameLower.includes('article')) {
    explanation += analogyMode
      ? `${purposeLabel} This stores written content like blog posts or articles.\n\n`
      : `${purposeLabel} Represents content entries or articles.\n\n`;
  } else if (nameLower.includes('comment')) {
    explanation += analogyMode
      ? `${purposeLabel} This saves what people say about things, like notes on a bulletin board.\n\n`
      : `${purposeLabel} Stores user comments on content.\n\n`;
  } else if (nameLower.includes('order')) {
    explanation += analogyMode
      ? `${purposeLabel} This records purchases, like a receipt from a store.\n\n`
      : `${purposeLabel} Represents a purchase or transaction.\n\n`;
  } else if (nameLower.includes('product')) {
    explanation += analogyMode
      ? `${purposeLabel} This describes items available in the app, like a catalog entry.\n\n`
      : `${purposeLabel} Represents items in a product catalog.\n\n`;
  } else if (nameLower.includes('setting') || nameLower.includes('config')) {
    explanation += analogyMode
      ? `${purposeLabel} This remembers how users want things set up, like personal preferences.\n\n`
      : `${purposeLabel} Stores configuration or preferences.\n\n`;
  } else if (nameLower.includes('notification')) {
    explanation += analogyMode
      ? `${purposeLabel} This stores alerts and messages for users, like a notification center.\n\n`
      : `${purposeLabel} Manages user notifications and alerts.\n\n`;
  } else if (nameLower.includes('log') || nameLower.includes('audit')) {
    explanation += analogyMode
      ? `${purposeLabel} This keeps a history of what happened, like a diary or journal.\n\n`
      : `${purposeLabel} Tracks events and changes for auditing.\n\n`;
  }

  // Key fields
  if (dataFields.length > 0) {
    explanation += analogyMode ? "**Information it stores:**\n" : "**Key Fields:**\n";
    dataFields.slice(0, 5).forEach(f => {
      if (analogyMode) {
        // Friendly type descriptions
        const friendlyType = getFriendlyFieldType(f.type);
        let fieldDesc = friendlyType;
        if (f.isOptional) fieldDesc += " (can be empty)";
        if (f.isArray) fieldDesc += " (a list)";
        explanation += `- **${f.name}**: ${fieldDesc}\n`;
      } else {
        let fieldDesc = f.type;
        if (f.isOptional) fieldDesc += " (optional)";
        if (f.isArray) fieldDesc += " (array)";
        explanation += `- \`${f.name}\`: ${fieldDesc}\n`;
      }
    });
    if (dataFields.length > 5) {
      explanation += `- ...and ${dataFields.length - 5} more\n`;
    }
    explanation += "\n";
  }

  // Relationships
  if (outgoing.length > 0 || incoming.length > 0) {
    explanation += analogyMode ? "**Connections:**\n" : "**Relationships:**\n";
    outgoing.forEach(r => {
      if (analogyMode) {
        const typeDesc = r.type === 'one-to-many'
          ? 'can have multiple'
          : r.type === 'many-to-many'
            ? 'is linked to many'
            : 'has one';
        explanation += `- ${typeDesc} **${r.to}**\n`;
      } else {
        const typeDesc = r.type === 'one-to-many' ? 'has many' : r.type === 'many-to-many' ? 'has many (via junction)' : 'has one';
        explanation += `- ${typeDesc} **${r.to}** (via \`${r.fieldName}\`)\n`;
      }
    });
    incoming.forEach(r => {
      if (analogyMode) {
        const typeDesc = r.type === 'one-to-many'
          ? 'belongs to a'
          : r.type === 'many-to-many'
            ? 'connects with many'
            : 'is paired with';
        explanation += `- ${typeDesc} **${r.from}**\n`;
      } else {
        const typeDesc = r.type === 'one-to-many' ? 'belongs to' : r.type === 'many-to-many' ? 'connected to' : 'has one';
        explanation += `- ${typeDesc} **${r.from}**\n`;
      }
    });
  }

  return explanation;
}

// Helper to get friendly field type names
function getFriendlyFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'String': 'text',
    'Int': 'whole number',
    'Float': 'decimal number',
    'Boolean': 'yes/no',
    'DateTime': 'date and time',
    'Json': 'structured data',
    'BigInt': 'large number',
    'Decimal': 'precise number',
    'Bytes': 'binary data',
  };
  return typeMap[type] || type.toLowerCase();
}

// Generate explanation for a file
function getFileExplanation(node: NodeInfo, dependencies: DependencyData, components?: ComponentData | null, analogyMode: boolean = false): string {
  const imports = dependencies.edges.filter(e => e.source === node.id);
  const importedBy = dependencies.edges.filter(e => e.target === node.id);

  let explanation = `**${node.label}**\n\n`;

  if (!analogyMode) {
    explanation += `**Location:** \`${node.directory}/${node.label}\`\n\n`;
  }

  // Type-based description
  if (analogyMode) {
    switch (node.type) {
      case 'component':
        explanation += "**What it is:** A visual building block that users see and interact with.\n\n";
        break;
      case 'lib':
        explanation += "**What it is:** A tool from the toolbox that helps other parts work.\n\n";
        break;
      case 'api':
        explanation += "**What it is:** A doorway that lets the app receive and send information.\n\n";
        break;
      case 'page':
        explanation += "**What it is:** A room in the app that you can visit.\n\n";
        break;
      default:
        explanation += "**What it is:** A piece of the app's code.\n\n";
    }
  } else {
    switch (node.type) {
      case 'component':
        explanation += "**Type:** React Component\n\n";
        break;
      case 'lib':
        explanation += "**Type:** Library/Utility\n\n";
        break;
      case 'api':
        explanation += "**Type:** API Route\n\n";
        break;
      case 'page':
        explanation += "**Type:** Page/Route\n\n";
        break;
      default:
        explanation += "**Type:** Source File\n\n";
    }
  }

  // Infer purpose from name
  const nameLower = node.label.toLowerCase();
  const purposeLabel = analogyMode ? "**What it does:**" : "**Purpose:**";

  if (nameLower.includes('button') || nameLower.includes('btn')) {
    explanation += analogyMode
      ? `${purposeLabel} A clickable button - like pressing a button on a remote control.\n\n`
      : `${purposeLabel} A button UI component for user interactions.\n\n`;
  } else if (nameLower.includes('form')) {
    explanation += analogyMode
      ? `${purposeLabel} A form that collects information, like filling out paperwork.\n\n`
      : `${purposeLabel} A form component for collecting user input.\n\n`;
  } else if (nameLower.includes('modal') || nameLower.includes('dialog')) {
    explanation += analogyMode
      ? `${purposeLabel} A popup window that appears on top, like a pop-up message.\n\n`
      : `${purposeLabel} A modal/dialog component for overlay content.\n\n`;
  } else if (nameLower.includes('list')) {
    explanation += analogyMode
      ? `${purposeLabel} Shows a list of items, like a shopping list.\n\n`
      : `${purposeLabel} Displays a list of items.\n\n`;
  } else if (nameLower.includes('card')) {
    explanation += analogyMode
      ? `${purposeLabel} A card that displays information, like a playing card or business card.\n\n`
      : `${purposeLabel} A card component for displaying content blocks.\n\n`;
  } else if (nameLower.includes('nav') || nameLower.includes('menu')) {
    explanation += analogyMode
      ? `${purposeLabel} A menu for getting around, like a restaurant menu or GPS navigation.\n\n`
      : `${purposeLabel} Navigation component for routing between pages.\n\n`;
  } else if (nameLower.includes('header')) {
    explanation += analogyMode
      ? `${purposeLabel} The top section of a page, like a letterhead.\n\n`
      : `${purposeLabel} Page or section header component.\n\n`;
  } else if (nameLower.includes('footer')) {
    explanation += analogyMode
      ? `${purposeLabel} The bottom section of a page, like the footer of a document.\n\n`
      : `${purposeLabel} Page footer component.\n\n`;
  } else if (nameLower.includes('sidebar')) {
    explanation += analogyMode
      ? `${purposeLabel} A panel on the side for extra options, like a sidebar in a magazine.\n\n`
      : `${purposeLabel} Side navigation or panel component.\n\n`;
  } else if (nameLower.includes('layout')) {
    explanation += analogyMode
      ? `${purposeLabel} Arranges the page structure, like a blueprint for a room.\n\n`
      : `${purposeLabel} Layout wrapper that structures page content.\n\n`;
  } else if (nameLower.includes('provider') || nameLower.includes('context')) {
    explanation += analogyMode
      ? `${purposeLabel} Shares information with other parts, like a central bulletin board.\n\n`
      : `${purposeLabel} Context provider for sharing state across components.\n\n`;
  } else if (nameLower.includes('hook') || nameLower.startsWith('use')) {
    explanation += analogyMode
      ? `${purposeLabel} A special helper that adds abilities, like a power-up in a video game.\n\n`
      : `${purposeLabel} Custom React hook for reusable logic.\n\n`;
  } else if (nameLower.includes('util') || nameLower.includes('helper')) {
    explanation += analogyMode
      ? `${purposeLabel} A handy tool that helps with common tasks, like a Swiss army knife.\n\n`
      : `${purposeLabel} Utility functions for common operations.\n\n`;
  } else if (nameLower.includes('api') || nameLower.includes('service')) {
    explanation += analogyMode
      ? `${purposeLabel} Talks to external systems to get or send data, like a messenger.\n\n`
      : `${purposeLabel} API service for external data fetching.\n\n`;
  } else if (nameLower.includes('store')) {
    explanation += analogyMode
      ? `${purposeLabel} The app's memory - remembers important stuff across the whole app.\n\n`
      : `${purposeLabel} State store for application state management.\n\n`;
  } else if (nameLower.includes('type') || nameLower.includes('interface')) {
    explanation += analogyMode
      ? `${purposeLabel} A dictionary that defines what kind of information things can hold.\n\n`
      : `${purposeLabel} TypeScript type definitions.\n\n`;
  } else if (nameLower.includes('route')) {
    explanation += analogyMode
      ? `${purposeLabel} A doorway that receives requests and sends back responses.\n\n`
      : `${purposeLabel} API route handler for server-side logic.\n\n`;
  } else if (nameLower.includes('page')) {
    explanation += analogyMode
      ? `${purposeLabel} A page you can visit in the app, like a page in a book.\n\n`
      : `${purposeLabel} Page component that renders at a specific route.\n\n`;
  }

  // Component info if available
  const component = components?.components.find(c => c.name === node.label);
  if (component) {
    if (analogyMode) {
      const typeExplain = component.type === 'client'
        ? "runs in your browser (the dining room - what you see)"
        : "runs on the server (the kitchen - behind the scenes)";
      explanation += `**Where it runs:** This ${typeExplain}.\n`;
      explanation += `**Size:** About ${component.linesOfCode} lines of code.\n\n`;
    } else {
      explanation += `**Component Type:** ${component.type === 'client' ? 'Client Component ("use client")' : 'Server Component'}\n`;
      explanation += `**Lines of Code:** ${component.linesOfCode}\n\n`;
    }
  }

  // Dependencies
  if (imports.length > 0) {
    explanation += analogyMode
      ? `**Ingredients it needs (${imports.length}):** This uses:\n`
      : `**Imports (${imports.length}):** This file depends on:\n`;
    imports.slice(0, 5).forEach(e => {
      const target = dependencies.nodes.find(n => n.id === e.target);
      if (target) explanation += `- ${target.label}\n`;
    });
    if (imports.length > 5) {
      explanation += `- ...and ${imports.length - 5} more\n`;
    }
    explanation += "\n";
  }

  if (importedBy.length > 0) {
    explanation += analogyMode
      ? `**Who uses it (${importedBy.length}):** This helps:\n`
      : `**Used By (${importedBy.length}):** This file is imported by:\n`;
    importedBy.slice(0, 5).forEach(e => {
      const source = dependencies.nodes.find(n => n.id === e.source);
      if (source) explanation += `- ${source.label}\n`;
    });
    if (importedBy.length > 5) {
      explanation += `- ...and ${importedBy.length - 5} more\n`;
    }
  }

  if (imports.length === 0 && importedBy.length === 0) {
    explanation += analogyMode
      ? "*This piece works on its own.*\n"
      : "*This file has no tracked dependencies.*\n";
  }

  return explanation;
}

// Auto-detect modules from model names
function detectModelModules(models: ModelInfo[], analogyMode: boolean = false): Module[] {
  const prefixMap = new Map<string, string[]>();

  for (const model of models) {
    const name = model.name;
    const prefixMatch = name.match(/^([A-Z][a-z]+)/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, []);
      }
      prefixMap.get(prefix)!.push(name);
    }
  }

  const modules: Module[] = [];
  let colorIndex = 0;

  for (const [prefix, items] of prefixMap) {
    if (items.length >= 2) {
      modules.push({
        id: prefix.toLowerCase(),
        name: prefix,
        items,
        color: MODULE_COLORS[colorIndex % MODULE_COLORS.length],
        description: getModuleDescription(prefix, items, "models", analogyMode),
      });
      colorIndex++;
    }
  }

  const assignedModels = new Set(modules.flatMap(m => m.items));
  const unassigned = models.filter(m => !assignedModels.has(m.name)).map(m => m.name);

  if (unassigned.length > 0) {
    modules.push({
      id: "other",
      name: "Other",
      items: unassigned,
      color: "#666666",
      description: getModuleDescription("other", unassigned, "models", analogyMode),
    });
  }

  return modules.sort((a, b) => b.items.length - a.items.length);
}

// Auto-detect modules from file directories
function detectFileModules(dependencies: DependencyData, analogyMode: boolean = false): Module[] {
  const dirMap = new Map<string, string[]>();

  for (const node of dependencies.nodes) {
    const dir = node.directory.split("/")[0] || "root";
    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(node.id);
  }

  const modules: Module[] = [];
  let colorIndex = 0;

  for (const [dir, items] of dirMap) {
    modules.push({
      id: dir,
      name: dir,
      items,
      color: MODULE_COLORS[colorIndex % MODULE_COLORS.length],
      description: getModuleDescription(dir, items, "files", analogyMode),
    });
    colorIndex++;
  }

  return modules.sort((a, b) => b.items.length - a.items.length);
}

export function ModuleExplorer({ models, dependencies, components }: ModuleExplorerProps) {
  const { analogyMode, complexityLevel, showTooltips } = useAppStore();
  const [mode, setMode] = useState<ExplorerMode>(models ? "models" : "files");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [focusItem, setFocusItem] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [showIncoming, setShowIncoming] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);
  const [explorationPath, setExplorationPath] = useState<string[]>([]);

  // Get complexity features
  const complexityFeatures = getComplexityFeatures(complexityLevel);

  // Friendly labels for analogy mode
  const labels = {
    databaseModels: analogyMode ? "Filing Cabinets" : "Database Models",
    fileDependencies: analogyMode ? "Ingredient Connections" : "File Dependencies",
    domainModules: analogyMode ? "Information Sections" : "Domain Modules",
    directoryModules: analogyMode ? "Folders" : "Directory Modules",
    explorationControls: analogyMode ? "Exploration Settings" : "Exploration Controls",
    depth: analogyMode ? "How far to look" : "Depth",
    incoming: analogyMode ? "What uses this" : "Incoming",
    outgoing: analogyMode ? "What this uses" : "Outgoing",
    clickToExplore: analogyMode ? "Click any item to learn about it:" : "Click to explore:",
    back: "← Back",
    clearFocus: analogyMode ? "Start Over" : "Clear Focus",
    showAllModules: analogyMode ? "Show all sections" : "Show all modules",
    selectToStart: analogyMode
      ? "Pick a section above or click on any item to start your tour"
      : "Select a module above or click on an item to start exploring",
  };

  const modelModules = useMemo(() =>
    models ? detectModelModules(models.models, analogyMode) : [],
    [models, analogyMode]
  );

  const fileModules = useMemo(() =>
    dependencies ? detectFileModules(dependencies, analogyMode) : [],
    [dependencies, analogyMode]
  );

  const currentModules = mode === "models" ? modelModules : fileModules;

  // Get current explanation
  const explanation = useMemo(() => {
    if (focusItem) {
      if (mode === "models" && models) {
        const model = models.models.find(m => m.name === focusItem);
        if (model) {
          return getModelExplanation(model, models.models, models.relationships, analogyMode);
        }
      } else if (mode === "files" && dependencies) {
        const node = dependencies.nodes.find(n => n.id === focusItem);
        if (node) {
          return getFileExplanation(node, dependencies, components, analogyMode);
        }
      }
    } else if (selectedModule) {
      const module = currentModules.find(m => m.id === selectedModule);
      if (module) {
        const sectionLabel = analogyMode ? "Section" : "Module";
        const containsLabel = analogyMode ? "Includes" : "Contains";
        return `## ${module.name} ${sectionLabel}\n\n${module.description}\n\n**${containsLabel} ${module.items.length} items:**\n${module.items.slice(0, 10).map(i => `- ${i}`).join('\n')}${module.items.length > 10 ? `\n- ...and ${module.items.length - 10} more` : ''}`;
      }
    }
    return null;
  }, [focusItem, selectedModule, mode, models, dependencies, components, currentModules, analogyMode]);

  // Get connections for focused item
  const getModelConnections = (modelName: string, currentDepth: number): Set<string> => {
    if (!models || currentDepth === 0) return new Set([modelName]);

    const connected = new Set<string>([modelName]);
    const toProcess = [modelName];
    let processedDepth = 0;

    while (processedDepth < currentDepth && toProcess.length > 0) {
      const currentLevel = [...toProcess];
      toProcess.length = 0;

      for (const name of currentLevel) {
        for (const rel of models.relationships) {
          if (showOutgoing && rel.from === name && !connected.has(rel.to)) {
            connected.add(rel.to);
            toProcess.push(rel.to);
          }
          if (showIncoming && rel.to === name && !connected.has(rel.from)) {
            connected.add(rel.from);
            toProcess.push(rel.from);
          }
        }
      }
      processedDepth++;
    }

    return connected;
  };

  const getFileConnections = (fileId: string, currentDepth: number): Set<string> => {
    if (!dependencies || currentDepth === 0) return new Set([fileId]);

    const connected = new Set<string>([fileId]);
    const toProcess = [fileId];
    let processedDepth = 0;

    while (processedDepth < currentDepth && toProcess.length > 0) {
      const currentLevel = [...toProcess];
      toProcess.length = 0;

      for (const id of currentLevel) {
        for (const edge of dependencies.edges) {
          if (showOutgoing && edge.source === id && !connected.has(edge.target)) {
            connected.add(edge.target);
            toProcess.push(edge.target);
          }
          if (showIncoming && edge.target === id && !connected.has(edge.source)) {
            connected.add(edge.source);
            toProcess.push(edge.source);
          }
        }
      }
      processedDepth++;
    }

    return connected;
  };

  // Generate diagram for current focus
  const diagram = useMemo(() => {
    if (mode === "models" && models) {
      let modelsToShow: ModelInfo[];

      if (focusItem) {
        const connected = getModelConnections(focusItem, depth);
        modelsToShow = models.models.filter(m => connected.has(m.name));
      } else if (selectedModule) {
        const module = modelModules.find(m => m.id === selectedModule);
        modelsToShow = module
          ? models.models.filter(m => module.items.includes(m.name))
          : [];
      } else {
        return "";
      }

      if (modelsToShow.length === 0) return "";

      const lines: string[] = ["erDiagram"];
      const modelNames = new Set(modelsToShow.map(m => m.name));

      for (const model of modelsToShow) {
        lines.push(`    ${model.name}`);
      }

      for (const rel of models.relationships) {
        if (modelNames.has(rel.from) && modelNames.has(rel.to)) {
          let relSymbol = "||--||";
          if (rel.type === "one-to-many") relSymbol = "||--o{";
          if (rel.type === "many-to-many") relSymbol = "}o--o{";
          lines.push(`    ${rel.from} ${relSymbol} ${rel.to} : "${rel.fieldName}"`);
        }
      }

      return lines.join("\n");
    }

    if (mode === "files" && dependencies) {
      let nodesToShow: typeof dependencies.nodes;

      if (focusItem) {
        const connected = getFileConnections(focusItem, depth);
        nodesToShow = dependencies.nodes.filter(n => connected.has(n.id));
      } else if (selectedModule) {
        const module = fileModules.find(m => m.id === selectedModule);
        nodesToShow = module
          ? dependencies.nodes.filter(n => module.items.includes(n.id))
          : [];
      } else {
        return "";
      }

      if (nodesToShow.length === 0) return "";

      const lines: string[] = ["flowchart TD"];
      const nodeIds = new Set(nodesToShow.map(n => n.id));

      const subDirs = new Map<string, typeof dependencies.nodes>();
      for (const node of nodesToShow) {
        const subDir = node.directory || "root";
        if (!subDirs.has(subDir)) subDirs.set(subDir, []);
        subDirs.get(subDir)!.push(node);
      }

      for (const [subDir, nodes] of subDirs) {
        if (subDirs.size > 1) {
          lines.push(`    subgraph ${subDir.replace(/[\/\\-]/g, "_")}["${subDir}"]`);
        }
        for (const node of nodes) {
          const style = node.id === focusItem ? ":::focus" : "";
          lines.push(`        ${node.id}["${node.label}"]${style}`);
        }
        if (subDirs.size > 1) {
          lines.push("    end");
        }
      }

      for (const edge of dependencies.edges) {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          lines.push(`    ${edge.source} --> ${edge.target}`);
        }
      }

      lines.push("    classDef focus fill:#667eea,stroke:#667eea,color:white");

      return lines.join("\n");
    }

    return "";
  }, [mode, models, dependencies, focusItem, selectedModule, depth, showIncoming, showOutgoing, modelModules, fileModules]);

  const handleFocus = (item: string) => {
    setFocusItem(item);
    setExplorationPath(prev => [...prev, item]);
  };

  const handleBack = () => {
    if (explorationPath.length > 1) {
      const newPath = explorationPath.slice(0, -1);
      setExplorationPath(newPath);
      setFocusItem(newPath[newPath.length - 1]);
    } else {
      setFocusItem(null);
      setExplorationPath([]);
    }
  };

  const clearFocus = () => {
    setFocusItem(null);
    setExplorationPath([]);
  };

  const currentItems = useMemo(() => {
    if (mode === "models" && models) {
      if (selectedModule) {
        const module = modelModules.find(m => m.id === selectedModule);
        return module?.items || [];
      }
      return models.models.map(m => m.name);
    }
    if (mode === "files" && dependencies) {
      if (selectedModule) {
        const module = fileModules.find(m => m.id === selectedModule);
        return module?.items || [];
      }
      return dependencies.nodes.map(n => n.id);
    }
    return [];
  }, [mode, models, dependencies, selectedModule, modelModules, fileModules]);

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {models && (
            <button
              onClick={() => { setMode("models"); setSelectedModule(null); clearFocus(); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                mode === "models"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {labels.databaseModels}
            </button>
          )}
          {dependencies && (
            <button
              onClick={() => { setMode("files"); setSelectedModule(null); clearFocus(); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                mode === "files"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {labels.fileDependencies}
            </button>
          )}
        </div>

        {focusItem && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={explorationPath.length <= 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {labels.back}
            </button>
            <button
              onClick={clearFocus}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {labels.clearFocus}
            </button>
          </div>
        )}
      </div>

      {/* Exploration path breadcrumb */}
      {explorationPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] overflow-x-auto pb-2">
          <span className="text-[var(--text-muted)]">Path:</span>
          {explorationPath.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[var(--text-muted)]">→</span>}
              <button
                onClick={() => {
                  setExplorationPath(explorationPath.slice(0, i + 1));
                  setFocusItem(item);
                }}
                className={`px-2 py-0.5 rounded ${
                  i === explorationPath.length - 1
                    ? "bg-[var(--accent-purple)] text-white"
                    : "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {mode === "files"
                  ? dependencies?.nodes.find(n => n.id === item)?.label || item
                  : item}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Module selector */}
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {mode === "models" ? labels.domainModules : labels.directoryModules}
          </h3>
          {selectedModule && (
            <button
              onClick={() => setSelectedModule(null)}
              className="text-xs text-[var(--accent-purple)] hover:underline"
            >
              {labels.showAllModules}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {currentModules.map(module => (
            <button
              key={module.id}
              onClick={() => {
                setSelectedModule(selectedModule === module.id ? null : module.id);
                clearFocus();
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                selectedModule === module.id
                  ? "ring-2 ring-[var(--accent-purple)]"
                  : ""
              }`}
              style={{
                backgroundColor: `${module.color}20`,
                color: module.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: module.color }}
              />
              {module.name}
              <span className="text-xs opacity-70">({module.items.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Explanation Panel */}
      {explanation && (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--accent-purple)]/30 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-purple)]/20">
              <svg className="w-5 h-5 text-[var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 text-sm">
              <div className="prose prose-invert prose-sm max-w-none">
                {explanation.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h3 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-0 mb-2">{line.slice(3)}</h3>;
                  }
                  if (line.startsWith('**') && line.includes(':**')) {
                    const [label, ...rest] = line.split(':**');
                    return (
                      <p key={i} className="mb-2">
                        <span className="font-semibold text-[var(--text-primary)]">{label.replace(/\*\*/g, '')}:</span>
                        <span className="text-[var(--text-secondary)]">{rest.join(':**').replace(/\*\*/g, '')}</span>
                      </p>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return <div key={i} className="ml-4 text-[var(--text-secondary)]">{line}</div>;
                  }
                  if (line.startsWith('*') && line.endsWith('*')) {
                    return <p key={i} className="text-[var(--text-muted)] italic">{line.slice(1, -1)}</p>;
                  }
                  if (line.trim()) {
                    return <p key={i} className="text-[var(--text-secondary)] mb-2">{line}</p>;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Focus controls */}
      {focusItem && (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              {labels.explorationControls}
            </h3>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">{labels.depth}:</span>
              <input
                type="range"
                min="1"
                max="4"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="w-24 accent-[var(--accent-purple)]"
              />
              <span className="text-sm text-[var(--text-primary)] w-4">{depth}</span>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showIncoming}
                onChange={(e) => setShowIncoming(e.target.checked)}
                className="rounded accent-[var(--accent-purple)]"
              />
              <span className="text-[var(--text-secondary)]">{labels.incoming}</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOutgoing}
                onChange={(e) => setShowOutgoing(e.target.checked)}
                className="rounded accent-[var(--accent-purple)]"
              />
              <span className="text-[var(--text-secondary)]">{labels.outgoing}</span>
            </label>
          </div>
        </div>
      )}

      {/* Item list to click on */}
      {(selectedModule || !focusItem) && (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {labels.clickToExplore}
          </h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {currentItems.slice(0, 50).map(item => {
              const module = currentModules.find(m => m.items.includes(item));
              const label = mode === "files"
                ? dependencies?.nodes.find(n => n.id === item)?.label || item
                : item;
              return (
                <button
                  key={item}
                  onClick={() => handleFocus(item)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    focusItem === item
                      ? "bg-[var(--accent-purple)] text-white"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                  }`}
                  style={focusItem !== item && module ? {
                    borderLeft: `3px solid ${module.color}`,
                  } : undefined}
                >
                  {label}
                </button>
              );
            })}
            {currentItems.length > 50 && (
              <span className="text-xs text-[var(--text-muted)] self-center">
                +{currentItems.length - 50} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Diagram */}
      {diagram && (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
          <MermaidDiagram chart={diagram} id="module-explorer" />
        </div>
      )}

      {!diagram && !selectedModule && !focusItem && (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-8 text-center text-[var(--text-secondary)]">
          {labels.selectToStart}
        </div>
      )}
    </div>
  );
}
