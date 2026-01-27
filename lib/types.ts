// Route/API endpoint data
export interface RouteInfo {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  feature: string;
  auth: "public" | "protected" | "admin";
  file: string;
}

export interface RouteData {
  routes: RouteInfo[];
  generatedAt: string;
  projectPath: string;
}

// Component data
export interface ComponentInfo {
  name: string;
  path: string;
  directory: string;
  type: "client" | "server";
  dependencies: string[];
  linesOfCode: number;
}

export interface DirectoryInfo {
  path: string;
  label: string;
  componentCount: number;
}

export interface ComponentData {
  components: ComponentInfo[];
  directories: DirectoryInfo[];
  generatedAt: string;
  projectPath: string;
}

// Database model data
export interface FieldInfo {
  name: string;
  type: string;
  isRelation: boolean;
  isOptional: boolean;
  isArray: boolean;
}

export interface ModelInfo {
  name: string;
  fields: FieldInfo[];
}

export interface RelationshipInfo {
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
  fieldName: string;
}

export interface ModelData {
  models: ModelInfo[];
  relationships: RelationshipInfo[];
  generatedAt: string;
  projectPath: string;
}

// Dependency graph data
export interface NodeInfo {
  id: string;
  label: string;
  directory: string;
  type: "component" | "lib" | "api" | "page" | "other";
}

export interface EdgeInfo {
  source: string;
  target: string;
}

export interface ClusterInfo {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface DependencyData {
  nodes: NodeInfo[];
  edges: EdgeInfo[];
  clusters: ClusterInfo[];
  generatedAt: string;
  projectPath: string;
}

// Combined analysis result
export interface AnalysisResult {
  routes: RouteData | null;
  components: ComponentData | null;
  models: ModelData | null;
  dependencies: DependencyData | null;
  projectPath: string;
  projectName: string;
  generatedAt: string;
}

// Tab types for dashboard
export type TabId = "explorer" | "routes" | "components" | "models" | "dependencies" | "insights";

export interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// INSIGHTS & LEARNING FEATURES
// ============================================================================

// Start Here Guide
export interface StartHereItem {
  file: string;
  name: string;
  order: number;
  importance: "critical" | "important" | "helpful";
  reason: string;
  whatYouLearn: string;
}

// Feature Detection
export interface DetectedFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  files: string[];
  entryPoint?: string;
}

// Technology Stack
export interface TechStackItem {
  name: string;
  category: "framework" | "database" | "styling" | "auth" | "api" | "testing" | "tooling" | "other";
  description: string;
  simpleExplanation: string;
  icon?: string;
  version?: string;
  usedIn: string[];
}

// Codebase Health
export interface CodebaseHealth {
  totalFiles: number;
  totalLines: number;
  totalComponents: number;
  totalRoutes: number;
  totalModels: number;
  complexity: "simple" | "moderate" | "complex" | "very-complex";
  organization: "excellent" | "good" | "fair" | "needs-work";
  hubFiles: string[]; // Files with many dependencies
  isolatedFiles: string[]; // Files with no dependencies
  largestFiles: Array<{ file: string; lines: number }>;
  insights: string[];
}

// Architecture Summary
export interface ArchitectureSummary {
  projectType: string;
  summary: string;
  keyTechnologies: string[];
  mainFeatures: string[];
  dataFlow: string;
  deploymentTarget?: string;
}

// Guided Tours
export interface TourStep {
  file: string;
  title: string;
  explanation: string;
  highlightLines?: [number, number];
  nextAction?: string;
}

export interface GuidedTour {
  id: string;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  steps: TourStep[];
}

// File Importance
export interface FileImportance {
  file: string;
  importedByCount: number;
  importsCount: number;
  isHub: boolean;
  isLeaf: boolean;
  impactScore: number; // 0-100
}

// Data Flow
export interface DataFlowStep {
  id: string;
  type: "user-action" | "component" | "api" | "database" | "response";
  label: string;
  file?: string;
  description: string;
}

export interface DataFlow {
  id: string;
  name: string;
  description: string;
  steps: DataFlowStep[];
}

// Glossary
export interface GlossaryTerm {
  term: string;
  definition: string;
  simpleExplanation: string;
  example?: string;
  relatedTerms?: string[];
}

// Complete Insights Data
export interface InsightsData {
  startHere: StartHereItem[];
  features: DetectedFeature[];
  techStack: TechStackItem[];
  health: CodebaseHealth;
  architecture: ArchitectureSummary;
  tours: GuidedTour[];
  fileImportance: FileImportance[];
  dataFlows: DataFlow[];
  glossary: GlossaryTerm[];
}
