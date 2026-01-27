import * as fs from "fs";
import * as path from "path";
import type {
  AnalysisResult,
  RouteData,
  RouteInfo,
  ComponentData,
  ComponentInfo,
  DirectoryInfo,
  ModelData,
  ModelInfo,
  FieldInfo,
  RelationshipInfo,
  DependencyData,
  NodeInfo,
  EdgeInfo,
  ClusterInfo,
} from "./types";

// ============================================
// Route Analyzer
// ============================================

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

function findApiRoutes(dir: string, basePath: string = ""): string[] {
  const routes: string[] = [];
  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...findApiRoutes(fullPath, path.join(basePath, entry.name)));
    } else if (entry.name === "route.ts" || entry.name === "route.js") {
      routes.push(fullPath);
    }
  }
  return routes;
}

function extractMethods(content: string): HttpMethod[] {
  const methods: HttpMethod[] = [];
  for (const method of HTTP_METHODS) {
    const patterns = [
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\s*\\(`, "m"),
      new RegExp(`export\\s+const\\s+${method}\\s*=`, "m"),
    ];
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        methods.push(method);
        break;
      }
    }
  }
  return methods;
}

function extractAuthType(content: string): "public" | "protected" | "admin" {
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes("requireadmin") ||
    lowerContent.includes("isadmin") ||
    lowerContent.includes("role === 'admin'") ||
    lowerContent.includes('role === "admin"')
  ) {
    return "admin";
  }
  if (
    lowerContent.includes("getauthenticateduser") ||
    lowerContent.includes("auth.protect") ||
    lowerContent.includes("requireauth") ||
    lowerContent.includes("getserversession") ||
    lowerContent.includes("currentuser") ||
    lowerContent.includes("unauthorized")
  ) {
    return "protected";
  }
  return "public";
}

function pathToApiRoute(filePath: string, projectPath: string): string {
  const relativePath = path.relative(projectPath, filePath);
  const parts = relativePath.split(path.sep);
  const apiIndex = parts.indexOf("api");
  if (apiIndex === -1) return "/" + parts.slice(0, -1).join("/");
  const routeParts = parts.slice(apiIndex, -1);
  return "/" + routeParts.join("/");
}

function extractFeature(routePath: string): string {
  const parts = routePath.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "api") {
    return parts[1];
  }
  return parts[0] || "root";
}

export async function analyzeRoutes(projectPath: string): Promise<RouteData> {
  const routes: RouteInfo[] = [];
  const possibleApiDirs = [
    path.join(projectPath, "app", "api"),
    path.join(projectPath, "src", "app", "api"),
    path.join(projectPath, "pages", "api"),
    path.join(projectPath, "src", "pages", "api"),
  ];

  for (const apiDir of possibleApiDirs) {
    const routeFiles = findApiRoutes(apiDir);
    for (const routeFile of routeFiles) {
      try {
        const content = fs.readFileSync(routeFile, "utf-8");
        const methods = extractMethods(content);
        const auth = extractAuthType(content);
        const routePath = pathToApiRoute(routeFile, projectPath);
        const feature = extractFeature(routePath);

        for (const method of methods) {
          routes.push({
            path: routePath,
            method,
            feature,
            auth,
            file: path.relative(projectPath, routeFile),
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  routes.sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) return pathCompare;
    return a.method.localeCompare(b.method);
  });

  return { routes, generatedAt: new Date().toISOString(), projectPath };
}

// ============================================
// Component Analyzer
// ============================================

const COMPONENT_EXTENSIONS = [".tsx", ".jsx"];
const IGNORED_DIRS = ["node_modules", ".next", ".git", "dist", "build", "__tests__", "__mocks__"];

function isComponentFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!COMPONENT_EXTENSIONS.includes(ext)) return false;
  const basename = path.basename(filePath, ext);
  return /^[A-Z]/.test(basename);
}

function findComponentFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findComponentFiles(fullPath, files);
    } else if (isComponentFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractComponentType(content: string): "client" | "server" {
  if (/^["']use client["'];?\s*$/m.test(content)) {
    return "client";
  }
  return "server";
}

function extractDependencies(content: string): string[] {
  const deps: string[] = [];
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith(".") || importPath.startsWith("@/")) {
      const parts = importPath.split("/");
      const lastPart = parts[parts.length - 1];
      if (/^[A-Z]/.test(lastPart)) {
        deps.push(lastPart);
      }
    }
  }
  return [...new Set(deps)];
}

function countLines(content: string): number {
  return content.split("\n").length;
}

function getDirectoryLabel(dirPath: string): string {
  const parts = dirPath.split(path.sep);
  return parts[parts.length - 1] || dirPath;
}

export async function analyzeComponents(projectPath: string): Promise<ComponentData> {
  const components: ComponentInfo[] = [];
  const directoryMap = new Map<string, number>();

  const possibleComponentDirs = [
    path.join(projectPath, "components"),
    path.join(projectPath, "src", "components"),
    path.join(projectPath, "app"),
    path.join(projectPath, "src", "app"),
  ];

  for (const componentDir of possibleComponentDirs) {
    const componentFiles = findComponentFiles(componentDir);
    for (const filePath of componentFiles) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const relativePath = path.relative(projectPath, filePath);
        const dirPath = path.dirname(relativePath);
        const name = path.basename(filePath, path.extname(filePath));
        const type = extractComponentType(content);
        const dependencies = extractDependencies(content);
        const linesOfCode = countLines(content);

        components.push({ name, path: relativePath, directory: dirPath, type, dependencies, linesOfCode });
        directoryMap.set(dirPath, (directoryMap.get(dirPath) || 0) + 1);
      } catch {
        // Skip files that can't be read
      }
    }
  }

  const directories: DirectoryInfo[] = Array.from(directoryMap.entries())
    .map(([dirPath, count]) => ({
      path: dirPath,
      label: getDirectoryLabel(dirPath),
      componentCount: count,
    }))
    .sort((a, b) => b.componentCount - a.componentCount);

  components.sort((a, b) => {
    const dirCompare = a.directory.localeCompare(b.directory);
    if (dirCompare !== 0) return dirCompare;
    return a.name.localeCompare(b.name);
  });

  return { components, directories, generatedAt: new Date().toISOString(), projectPath };
}

// ============================================
// Model Analyzer
// ============================================

const PRISMA_SCHEMA_PATHS = ["prisma/schema.prisma", "schema.prisma", "prisma/schema/schema.prisma"];

function findPrismaSchema(projectPath: string): string | null {
  for (const schemaPath of PRISMA_SCHEMA_PATHS) {
    const fullPath = path.join(projectPath, schemaPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function parseField(line: string, modelNames: string[]): FieldInfo | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;

  const name = parts[0];
  let type = parts[1];

  if (name.startsWith("@")) return null;

  const isArray = type.endsWith("[]");
  if (isArray) type = type.slice(0, -2);

  const isOptional = type.endsWith("?");
  if (isOptional) type = type.slice(0, -1);

  const isRelation = modelNames.includes(type);

  return { name, type, isRelation, isOptional, isArray };
}

function parseModels(content: string): { models: ModelInfo[]; modelNames: string[] } {
  const models: ModelInfo[] = [];
  const modelNames: string[] = [];

  const modelNameRegex = /^model\s+(\w+)\s*\{/gm;
  let match;
  while ((match = modelNameRegex.exec(content)) !== null) {
    modelNames.push(match[1]);
  }

  const modelRegex = /^model\s+(\w+)\s*\{([^}]+)\}/gm;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    const fields: FieldInfo[] = [];

    const lines = modelBody.split("\n");
    for (const line of lines) {
      const field = parseField(line, modelNames);
      if (field) fields.push(field);
    }

    models.push({ name: modelName, fields });
  }

  return { models, modelNames };
}

function extractRelationships(models: ModelInfo[]): RelationshipInfo[] {
  const relationships: RelationshipInfo[] = [];
  const seen = new Set<string>();

  for (const model of models) {
    for (const field of model.fields) {
      if (field.isRelation) {
        const key = [model.name, field.type].sort().join("-");
        if (!seen.has(key)) {
          seen.add(key);

          let type: "one-to-one" | "one-to-many" | "many-to-many" = "one-to-one";
          if (field.isArray) {
            const otherModel = models.find((m) => m.name === field.type);
            const reverseField = otherModel?.fields.find((f) => f.type === model.name && f.isRelation);
            type = reverseField?.isArray ? "many-to-many" : "one-to-many";
          }

          relationships.push({ from: model.name, to: field.type, type, fieldName: field.name });
        }
      }
    }
  }

  return relationships;
}

export async function analyzeModels(projectPath: string): Promise<ModelData | null> {
  const schemaPath = findPrismaSchema(projectPath);
  if (!schemaPath) return null;

  try {
    const content = fs.readFileSync(schemaPath, "utf-8");
    const { models } = parseModels(content);
    const relationships = extractRelationships(models);
    return { models, relationships, generatedAt: new Date().toISOString(), projectPath };
  } catch {
    return null;
  }
}

// ============================================
// Dependency Analyzer
// ============================================

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const MAX_FILES = 500;

function findSourceFiles(dir: string, files: string[] = [], limit: number = MAX_FILES): string[] {
  if (!fs.existsSync(dir) || files.length >= limit) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= limit) break;
    if (IGNORED_DIRS.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findSourceFiles(fullPath, files, limit);
    } else {
      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function getNodeType(filePath: string): NodeInfo["type"] {
  if (filePath.includes("/components/") || filePath.includes("\\components\\")) return "component";
  if (filePath.includes("/lib/") || filePath.includes("\\lib\\") || filePath.includes("/utils/") || filePath.includes("\\utils\\")) return "lib";
  if (filePath.includes("/api/") || filePath.includes("\\api\\")) return "api";
  if (filePath.includes("/app/") || filePath.includes("\\app\\") || filePath.includes("/pages/") || filePath.includes("\\pages\\")) return "page";
  return "other";
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith(".") || importPath.startsWith("@/")) {
      imports.push(importPath);
    }
  }
  return imports;
}

function resolveImportPath(importPath: string, fromFile: string, projectPath: string): string | null {
  let resolved: string;

  if (importPath.startsWith("@/")) {
    resolved = path.join(projectPath, importPath.slice(2));
  } else {
    const fromDir = path.dirname(fromFile);
    resolved = path.resolve(fromDir, importPath);
  }

  for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }
  return null;
}

function getClusterLabel(dirPath: string): string {
  const parts = dirPath.split(path.sep).filter(Boolean);
  const meaningful = parts.filter((p) => !["src", "app"].includes(p)).slice(-2);
  return meaningful.join("/") || "root";
}

export async function analyzeDependencies(projectPath: string): Promise<DependencyData> {
  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const nodeMap = new Map<string, string>();
  const clusterMap = new Map<string, Set<string>>();

  const sourceFiles = findSourceFiles(projectPath);

  for (const filePath of sourceFiles) {
    const relativePath = path.relative(projectPath, filePath);
    const nodeId = relativePath.replace(/[\/\\]/g, "_").replace(/\.[^.]+$/, "");
    const dirPath = path.dirname(relativePath);
    const label = path.basename(filePath, path.extname(filePath));
    const type = getNodeType(relativePath);

    nodes.push({ id: nodeId, label, directory: dirPath, type });
    nodeMap.set(filePath, nodeId);

    const clusterKey = getClusterLabel(dirPath);
    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, new Set());
    }
    clusterMap.get(clusterKey)!.add(nodeId);
  }

  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const imports = extractImports(content);
      const sourceId = nodeMap.get(filePath);

      if (!sourceId) continue;

      for (const importPath of imports) {
        const resolvedPath = resolveImportPath(importPath, filePath, projectPath);
        if (resolvedPath) {
          const targetId = nodeMap.get(resolvedPath);
          if (targetId && targetId !== sourceId) {
            edges.push({ source: sourceId, target: targetId });
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  const clusters: ClusterInfo[] = Array.from(clusterMap.entries())
    .filter(([, nodeIds]) => nodeIds.size > 1)
    .map(([label, nodeIds]) => ({
      id: label.replace(/[\/\\]/g, "_"),
      label,
      nodeIds: Array.from(nodeIds),
    }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length);

  const uniqueEdges = Array.from(new Map(edges.map((e) => [`${e.source}->${e.target}`, e])).values());

  return { nodes, edges: uniqueEdges, clusters, generatedAt: new Date().toISOString(), projectPath };
}

// ============================================
// Main Analyzer
// ============================================

export async function analyzeCodebase(projectPath: string): Promise<AnalysisResult> {
  let projectName = path.basename(projectPath);
  const packageJsonPath = path.join(projectPath, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.name) {
        projectName = packageJson.name;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  const [routes, components, models, dependencies] = await Promise.all([
    analyzeRoutes(projectPath),
    analyzeComponents(projectPath),
    analyzeModels(projectPath),
    analyzeDependencies(projectPath),
  ]);

  return {
    routes: routes.routes.length > 0 ? routes : null,
    components: components.components.length > 0 ? components : null,
    models,
    dependencies: dependencies.nodes.length > 0 ? dependencies : null,
    projectPath,
    projectName,
    generatedAt: new Date().toISOString(),
  };
}
