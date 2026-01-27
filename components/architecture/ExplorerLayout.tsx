"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { TreeSidebar } from "./TreeSidebar";
import { DetailPanel } from "./DetailPanel";
import { MermaidDiagram } from "./MermaidDiagram";
import { COMPLEXITY_LEVELS, STORY_PATHS } from "@/lib/learning";
import type { AnalysisResult, ModelInfo, NodeInfo } from "@/lib/types";

interface ExplorerLayoutProps {
  analysis: AnalysisResult;
}

export function ExplorerLayout({ analysis }: ExplorerLayoutProps) {
  const {
    analogyMode,
    setAnalogyMode,
    complexityLevel,
    setComplexityLevel,
    activeStoryPath,
    setActiveStoryPath,
    reset,
  } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<unknown>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSelect = (id: string, type: string, item: unknown) => {
    setSelectedId(id);
    setSelectedType(type);
    setSelectedItem(item);
  };

  // Generate diagram for selected item
  const diagram = useMemo(() => {
    if (!selectedType || !selectedItem) return "";

    if (selectedType === "model" && analysis.models) {
      const model = selectedItem as ModelInfo;
      const relationships = analysis.models.relationships.filter(
        (r) => r.from === model.name || r.to === model.name
      );
      const relatedModels = new Set<string>([model.name]);
      relationships.forEach((r) => {
        relatedModels.add(r.from);
        relatedModels.add(r.to);
      });

      const lines: string[] = ["erDiagram"];
      for (const name of relatedModels) {
        lines.push(`    ${name}`);
      }
      for (const rel of relationships) {
        let relSymbol = "||--||";
        if (rel.type === "one-to-many") relSymbol = "||--o{";
        if (rel.type === "many-to-many") relSymbol = "}o--o{";
        lines.push(`    ${rel.from} ${relSymbol} ${rel.to} : "${rel.fieldName}"`);
      }
      return lines.join("\n");
    }

    if (selectedType === "file" && analysis.dependencies) {
      const file = selectedItem as NodeInfo;
      const deps = analysis.dependencies;
      const imports = deps.edges.filter((e) => e.source === file.id);
      const importedBy = deps.edges.filter((e) => e.target === file.id);

      const connectedIds = new Set<string>([file.id]);
      imports.forEach((e) => connectedIds.add(e.target));
      importedBy.forEach((e) => connectedIds.add(e.source));

      const lines: string[] = ["flowchart LR"];
      for (const id of connectedIds) {
        const node = deps.nodes.find((n) => n.id === id);
        if (node) {
          const style = id === file.id ? ":::selected" : "";
          lines.push(`    ${id}["${node.label}"]${style}`);
        }
      }
      for (const edge of [...imports, ...importedBy]) {
        if (connectedIds.has(edge.source) && connectedIds.has(edge.target)) {
          lines.push(`    ${edge.source} --> ${edge.target}`);
        }
      }
      lines.push("    classDef selected fill:#667eea,stroke:#667eea,color:white");
      return lines.join("\n");
    }

    if (selectedType === "component" && analysis.dependencies) {
      const comp = selectedItem as { name: string; path: string };
      const deps = analysis.dependencies;
      const node = deps.nodes.find((n) => n.label === comp.name);
      if (!node) return "";

      const imports = deps.edges.filter((e) => e.source === node.id);
      const importedBy = deps.edges.filter((e) => e.target === node.id);

      const connectedIds = new Set<string>([node.id]);
      imports.forEach((e) => connectedIds.add(e.target));
      importedBy.forEach((e) => connectedIds.add(e.source));

      const lines: string[] = ["flowchart LR"];
      for (const id of connectedIds) {
        const n = deps.nodes.find((x) => x.id === id);
        if (n) {
          const style = id === node.id ? ":::selected" : "";
          lines.push(`    ${id}["${n.label}"]${style}`);
        }
      }
      for (const edge of [...imports, ...importedBy]) {
        if (connectedIds.has(edge.source) && connectedIds.has(edge.target)) {
          lines.push(`    ${edge.source} --> ${edge.target}`);
        }
      }
      lines.push("    classDef selected fill:#667eea,stroke:#667eea,color:white");
      return lines.join("\n");
    }

    // Module-level diagram - shows this module and its connections to other modules
    if (selectedType === "module" && analysis.dependencies) {
      const moduleData = selectedItem as {
        id: string;
        name: string;
        friendlyName: string;
        items: Array<{ id: string; label: string }>;
        category: string;
      };

      const deps = analysis.dependencies;

      // Get IDs of items in this module
      const moduleItemIds = new Set(
        moduleData.items.map((i) => i.id.replace(/^(comp-|file-)/, ""))
      );

      // Find which directories/modules this module connects to
      const outgoingModules = new Map<string, number>();
      const incomingModules = new Map<string, number>();

      for (const edge of deps.edges) {
        const sourceInModule = moduleItemIds.has(edge.source);
        const targetInModule = moduleItemIds.has(edge.target);

        if (sourceInModule && !targetInModule) {
          const targetNode = deps.nodes.find((n) => n.id === edge.target);
          if (targetNode) {
            const targetDir = targetNode.directory.split("/")[0] || "other";
            outgoingModules.set(targetDir, (outgoingModules.get(targetDir) || 0) + 1);
          }
        }

        if (!sourceInModule && targetInModule) {
          const sourceNode = deps.nodes.find((n) => n.id === edge.source);
          if (sourceNode) {
            const sourceDir = sourceNode.directory.split("/")[0] || "other";
            incomingModules.set(sourceDir, (incomingModules.get(sourceDir) || 0) + 1);
          }
        }
      }

      // Build the diagram
      const lines: string[] = ["flowchart LR"];

      // Current module (center)
      const currentModuleName = moduleData.name.replace(/[^a-zA-Z0-9]/g, "_");
      const displayName = analogyMode ? moduleData.friendlyName : moduleData.name;
      lines.push(`    ${currentModuleName}["📦 ${displayName}<br/><small>${moduleData.items.length} items</small>"]:::selected`);

      // Outgoing connections
      for (const [dir, count] of outgoingModules) {
        const dirId = dir.replace(/[^a-zA-Z0-9]/g, "_");
        const dirLabel = analogyMode ? getFriendlyDirName(dir) : dir;
        lines.push(`    ${dirId}["${dirLabel}"]`);
        lines.push(`    ${currentModuleName} -->|"${count}"| ${dirId}`);
      }

      // Incoming connections
      for (const [dir, count] of incomingModules) {
        if (!outgoingModules.has(dir)) {
          const dirId = dir.replace(/[^a-zA-Z0-9]/g, "_");
          const dirLabel = analogyMode ? getFriendlyDirName(dir) : dir;
          lines.push(`    ${dirId}["${dirLabel}"]`);
          lines.push(`    ${dirId} -->|"${count}"| ${currentModuleName}`);
        }
      }

      lines.push("    classDef selected fill:#667eea,stroke:#667eea,color:white");

      return lines.join("\n");
    }

    return "";
  }, [selectedType, selectedItem, analysis, analogyMode]);

  // Helper for friendly directory names
  function getFriendlyDirName(dir: string): string {
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
    return mapping[dir.toLowerCase()] || dir;
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo/Title */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <div>
                <h1 className="font-semibold text-[var(--text-primary)]">
                  {analysis.projectName}
                </h1>
                <p className="text-xs text-[var(--text-muted)]">
                  {analogyMode ? "Code Explorer" : analysis.projectPath}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm text-[var(--text-secondary)] border-l border-[var(--border-color)] pl-4">
              {analysis.routes && (
                <span>
                  <span className="text-[var(--accent-green)] font-medium">
                    {analysis.routes.routes.length}
                  </span>{" "}
                  {analogyMode ? "doorways" : "routes"}
                </span>
              )}
              {analysis.components && (
                <span>
                  <span className="text-[var(--accent-pink)] font-medium">
                    {analysis.components.components.length}
                  </span>{" "}
                  {analogyMode ? "blocks" : "components"}
                </span>
              )}
              {analysis.models && (
                <span>
                  <span className="text-[var(--accent-purple)] font-medium">
                    {analysis.models.models.length}
                  </span>{" "}
                  {analogyMode ? "forms" : "models"}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Change Project Button */}
            <button
              onClick={reset}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Change to a different project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Change Project</span>
            </button>

            {/* Friendly Mode Toggle */}
            <button
              onClick={() => setAnalogyMode(!analogyMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                analogyMode
                  ? "bg-[var(--accent-purple)] text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              title={analogyMode ? "Switch to technical mode" : "Switch to friendly mode"}
            >
              <span>{analogyMode ? "🎓" : "💻"}</span>
              <span className="hidden sm:inline">{analogyMode ? "Friendly" : "Technical"}</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detail Level */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {analogyMode ? "How much detail?" : "Detail Level"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={complexityLevel}
                    onChange={(e) => setComplexityLevel(Number(e.target.value))}
                    className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-purple)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)] w-24">
                    {COMPLEXITY_LEVELS[complexityLevel as 1 | 2 | 3].icon}{" "}
                    {COMPLEXITY_LEVELS[complexityLevel as 1 | 2 | 3].name}
                  </span>
                </div>
              </div>

              {/* Guided Tours */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {analogyMode ? "Take a guided tour" : "Guided Tours"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STORY_PATHS.map((path) => (
                    <button
                      key={path.id}
                      onClick={() => setActiveStoryPath(activeStoryPath === path.id ? null : path.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        activeStoryPath === path.id
                          ? "bg-[var(--accent-purple)] text-white"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {path.icon} {path.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Story Path Banner */}
      {activeStoryPath && (
        <StoryBanner
          pathId={activeStoryPath}
          onClose={() => setActiveStoryPath(null)}
          analogyMode={analogyMode}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div
            className={`flex-shrink-0 transition-all duration-300 ${
              sidebarCollapsed ? "w-0" : "w-72"
            } overflow-hidden`}
          >
            <TreeSidebar
              analysis={analysis}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex-shrink-0 w-6 flex items-center justify-center bg-[var(--bg-secondary)] border-r border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Content Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Diagram Area */}
            <div className="flex-1 p-4 overflow-auto">
              {diagram ? (
                <div className="h-full bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
                  <MermaidDiagram chart={diagram} id="explorer-diagram" />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {analogyMode ? "Welcome to the Code Explorer!" : "Code Visualizer"}
                  </h2>
                  <p className="text-[var(--text-secondary)] max-w-md mb-6">
                    {analogyMode
                      ? "Pick anything from the sidebar to see how it connects to other parts of the code. It's like exploring a map!"
                      : "Select an item from the sidebar to view its relationships and details."}
                  </p>

                  {/* Quick Start */}
                  <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-6 max-w-sm w-full">
                    <h3 className="font-medium text-[var(--text-primary)] mb-3">
                      {analogyMode ? "Try these to get started:" : "Quick Start"}
                    </h3>
                    <div className="space-y-2">
                      <QuickStartItem
                        icon="🧱"
                        label={analogyMode ? "Explore building blocks" : "View components"}
                        onClick={() => {
                          // Auto-expand components
                        }}
                      />
                      <QuickStartItem
                        icon="🗄️"
                        label={analogyMode ? "See how data is stored" : "View database models"}
                        onClick={() => {
                          // Auto-expand models
                        }}
                      />
                      <QuickStartItem
                        icon="🚪"
                        label={analogyMode ? "Find the doorways" : "View API routes"}
                        onClick={() => {
                          // Auto-expand routes
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="w-full lg:w-96 flex-shrink-0 p-4 border-t lg:border-t-0 lg:border-l border-[var(--border-color)] overflow-auto">
              <DetailPanel
                type={selectedType}
                item={selectedItem}
                analysis={analysis}
                onSelectFile={(filePath) => {
                  // Try to find and select the file in the dependency graph
                  if (analysis.dependencies) {
                    const fileName = filePath.split("/").pop();
                    const node = analysis.dependencies.nodes.find(
                      (n) => `${n.directory}/${n.label}` === filePath || n.label === fileName
                    );
                    if (node) {
                      handleSelect(`file-${node.id}`, "file", node);
                    }
                  }
                }}
              />
            </div>
          </div>
      </div>
    </div>
  );
}

// Quick Start Item
function QuickStartItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </button>
  );
}

// Story Banner
function StoryBanner({
  pathId,
  onClose,
  analogyMode,
}: {
  pathId: string;
  onClose: () => void;
  analogyMode: boolean;
}) {
  const path = STORY_PATHS.find((p) => p.id === pathId);
  const [currentStep, setCurrentStep] = useState(0);

  if (!path) return null;

  const step = path.steps[currentStep];

  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-[var(--accent-purple)]/10 via-[var(--accent-blue)]/10 to-[var(--accent-pink)]/10 border-b border-[var(--border-color)] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">{path.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">{path.title}</span>
              <span className="text-xs text-[var(--text-muted)]">
                Step {currentStep + 1} of {path.steps.length}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{step.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(path.steps.length - 1, currentStep + 1))}
            disabled={currentStep === path.steps.length - 1}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Step explanation */}
      <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
        <p className="text-sm text-[var(--text-primary)]">{step.explanation}</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mt-3">
        {path.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= currentStep ? "bg-[var(--accent-purple)]" : "bg-[var(--bg-tertiary)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
