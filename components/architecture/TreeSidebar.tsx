"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisResult, InsightsData } from "@/lib/types";

interface TreeNode {
  id: string;
  label: string;
  friendlyLabel: string;
  icon: string;
  type: "category" | "item";
  children?: TreeNode[];
  data?: unknown;
  filePath?: string; // Full path for badge matching
}

// Badge types for visual indicators
interface FileBadges {
  startHereFiles: Set<string>;  // ⭐ Files in "Start Here" guide
  hubFiles: Set<string>;        // 🔥 Files with many dependencies
  featureEntryPoints: Set<string>; // 🏷️ Feature entry points
}

interface TreeSidebarProps {
  analysis: AnalysisResult;
  selectedId: string | null;
  onSelect: (id: string, type: string, data: unknown) => void;
}

// Build tree structure from analysis data
function buildTree(analysis: AnalysisResult, analogyMode: boolean): TreeNode[] {
  const tree: TreeNode[] = [];

  // Pages/Routes category
  if (analysis.routes && analysis.routes.routes.length > 0) {
    const routesByFeature = new Map<string, typeof analysis.routes.routes>();
    for (const route of analysis.routes.routes) {
      const feature = route.feature || "other";
      if (!routesByFeature.has(feature)) {
        routesByFeature.set(feature, []);
      }
      routesByFeature.get(feature)!.push(route);
    }

    const routeChildren: TreeNode[] = [];
    for (const [feature, routes] of routesByFeature) {
      if (routes.length === 1) {
        routeChildren.push({
          id: `route-${routes[0].method}-${routes[0].path}`,
          label: routes[0].path,
          friendlyLabel: routes[0].path.replace("/api/", "").replace(/\//g, " > ") || "Home",
          icon: getMethodIcon(routes[0].method),
          type: "item",
          data: { type: "route", item: routes[0] },
        });
      } else {
        routeChildren.push({
          id: `route-feature-${feature}`,
          label: feature,
          friendlyLabel: capitalizeFirst(feature),
          icon: "📂",
          type: "category",
          children: routes.map((r) => ({
            id: `route-${r.method}-${r.path}`,
            label: `${r.method} ${r.path}`,
            friendlyLabel: `${r.method} ${r.path.split("/").pop() || r.path}`,
            icon: getMethodIcon(r.method),
            type: "item" as const,
            data: { type: "route", item: r },
          })),
        });
      }
    }

    tree.push({
      id: "routes",
      label: "API Routes",
      friendlyLabel: analogyMode ? "Doorways" : "API Routes",
      icon: "🚪",
      type: "category",
      children: routeChildren,
    });
  }

  // Components category
  if (analysis.components && analysis.components.components.length > 0) {
    const componentsByDir = new Map<string, typeof analysis.components.components>();
    for (const comp of analysis.components.components) {
      const dir = comp.directory || "other";
      if (!componentsByDir.has(dir)) {
        componentsByDir.set(dir, []);
      }
      componentsByDir.get(dir)!.push(comp);
    }

    const componentChildren: TreeNode[] = [];
    for (const [dir, components] of componentsByDir) {
      componentChildren.push({
        id: `comp-dir-${dir}`,
        label: dir,
        friendlyLabel: getFriendlyDirName(dir, analogyMode),
        icon: "📁",
        type: "category",
        children: components.map((c) => ({
          id: `comp-${c.name}`,
          label: c.name,
          friendlyLabel: c.name,
          icon: c.type === "client" ? "🎨" : "⚙️",
          type: "item" as const,
          data: { type: "component", item: c },
        })),
      });
    }

    tree.push({
      id: "components",
      label: "Components",
      friendlyLabel: analogyMode ? "Building Blocks" : "Components",
      icon: "🧱",
      type: "category",
      children: componentChildren,
    });
  }

  // Database Models category
  if (analysis.models && analysis.models.models.length > 0) {
    const modelsByPrefix = new Map<string, typeof analysis.models.models>();
    for (const model of analysis.models.models) {
      const prefixMatch = model.name.match(/^([A-Z][a-z]+)/);
      const prefix = prefixMatch ? prefixMatch[1] : "Other";
      if (!modelsByPrefix.has(prefix)) {
        modelsByPrefix.set(prefix, []);
      }
      modelsByPrefix.get(prefix)!.push(model);
    }

    const modelChildren: TreeNode[] = [];
    for (const [prefix, models] of modelsByPrefix) {
      if (models.length === 1) {
        modelChildren.push({
          id: `model-${models[0].name}`,
          label: models[0].name,
          friendlyLabel: models[0].name,
          icon: "📋",
          type: "item",
          data: { type: "model", item: models[0] },
        });
      } else {
        modelChildren.push({
          id: `model-group-${prefix}`,
          label: prefix,
          friendlyLabel: getFriendlyModelGroup(prefix, analogyMode),
          icon: "🗂️",
          type: "category",
          children: models.map((m) => ({
            id: `model-${m.name}`,
            label: m.name,
            friendlyLabel: m.name,
            icon: "📋",
            type: "item" as const,
            data: { type: "model", item: m },
          })),
        });
      }
    }

    tree.push({
      id: "models",
      label: "Database",
      friendlyLabel: analogyMode ? "Storage" : "Database",
      icon: "🗄️",
      type: "category",
      children: modelChildren,
    });
  }

  // Files category (from dependencies)
  if (analysis.dependencies && analysis.dependencies.nodes.length > 0) {
    const filesByDir = new Map<string, typeof analysis.dependencies.nodes>();
    for (const node of analysis.dependencies.nodes) {
      const dir = node.directory.split("/")[0] || "root";
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, []);
      }
      filesByDir.get(dir)!.push(node);
    }

    const fileChildren: TreeNode[] = [];
    for (const [dir, files] of filesByDir) {
      fileChildren.push({
        id: `file-dir-${dir}`,
        label: dir,
        friendlyLabel: getFriendlyDirName(dir, analogyMode),
        icon: "📁",
        type: "category",
        children: files.slice(0, 20).map((f) => ({
          id: `file-${f.id}`,
          label: f.label,
          friendlyLabel: f.label,
          icon: getFileIcon(f.type),
          type: "item" as const,
          data: { type: "file", item: f },
        })),
      });
    }

    tree.push({
      id: "files",
      label: "All Files",
      friendlyLabel: analogyMode ? "All Pieces" : "All Files",
      icon: "📚",
      type: "category",
      children: fileChildren,
    });
  }

  return tree;
}

function getMethodIcon(method: string): string {
  switch (method) {
    case "GET": return "📥";
    case "POST": return "📤";
    case "PUT": return "🔄";
    case "PATCH": return "✏️";
    case "DELETE": return "🗑️";
    default: return "📡";
  }
}

function getFileIcon(type: string): string {
  switch (type) {
    case "component": return "🧩";
    case "lib": return "🔧";
    case "api": return "🚪";
    case "page": return "📄";
    default: return "📄";
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getFriendlyDirName(dir: string, analogyMode: boolean): string {
  if (!analogyMode) return dir;
  const mapping: Record<string, string> = {
    components: "Building Blocks",
    lib: "Toolbox",
    app: "Pages & Routes",
    api: "Doorways",
    hooks: "Special Helpers",
    utils: "Utilities",
    services: "Workers",
    types: "Definitions",
    styles: "Appearance",
    store: "Memory",
    context: "Shared Info",
  };
  return mapping[dir.toLowerCase()] || dir;
}

function getFriendlyModelGroup(prefix: string, analogyMode: boolean): string {
  if (!analogyMode) return prefix;
  const mapping: Record<string, string> = {
    User: "People",
    Auth: "Security",
    Post: "Content",
    Comment: "Discussions",
    Product: "Items",
    Order: "Purchases",
    Payment: "Payments",
    Team: "Groups",
    Project: "Projects",
    File: "Uploads",
    Setting: "Preferences",
    Log: "History",
  };
  return mapping[prefix] || prefix;
}

// Tree Node Component
function TreeNodeItem({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  onSelectCategory,
  analogyMode,
  badges,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  onSelectCategory: (node: TreeNode) => void;
  analogyMode: boolean;
  badges: FileBadges;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // Check if this file has badges
  const fileName = node.label;
  const isStartHere = badges.startHereFiles.has(fileName);
  const isHub = badges.hubFiles.has(fileName);
  const isEntryPoint = badges.featureEntryPoints.has(fileName);
  const hasBadge = isStartHere || isHub || isEntryPoint;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(node.id);
            // Also select the category/folder to show module view
            onSelectCategory(node);
          }
          if (node.type === "item") {
            onSelect(node);
          }
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-[var(--accent-dark)] text-white rounded-sm"
            : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-sm"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse chevron */}
        {hasChildren ? (
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <span className="flex-shrink-0">{node.icon}</span>

        {/* Label */}
        <span className={`truncate ${isSelected ? "font-medium" : ""}`}>
          {analogyMode ? node.friendlyLabel : node.label}
        </span>

        {/* Importance Badges */}
        {hasBadge && !hasChildren && (
          <span className="flex items-center gap-0.5 ml-1 flex-shrink-0">
            {isStartHere && (
              <span
                className="text-xs"
                title={analogyMode ? "Read this first!" : "Start Here - important entry point"}
              >
                ⭐
              </span>
            )}
            {isHub && (
              <span
                className="text-xs"
                title={analogyMode ? "Very important file!" : "Hub file - many dependencies"}
              >
                🔥
              </span>
            )}
            {isEntryPoint && !isStartHere && (
              <span
                className="text-xs"
                title={analogyMode ? "Feature starting point" : "Feature entry point"}
              >
                🏷️
              </span>
            )}
          </span>
        )}

        {/* Count badge */}
        {hasChildren && (
          <span className="ml-auto text-xs opacity-60">
            {node.children!.length}
          </span>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              onSelectCategory={onSelectCategory}
              analogyMode={analogyMode}
              badges={badges}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeSidebar({ analysis, selectedId, onSelect }: TreeSidebarProps) {
  const { analogyMode } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["routes", "components", "models"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [badges, setBadges] = useState<FileBadges>({
    startHereFiles: new Set(),
    hubFiles: new Set(),
    featureEntryPoints: new Set(),
  });

  const tree = useMemo(() => buildTree(analysis, analogyMode), [analysis, analogyMode]);

  // Fetch insights for badges
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis }),
        });
        if (response.ok) {
          const data: InsightsData = await response.json();

          // Extract badge information
          const startHere = new Set(data.startHere.map(item => {
            const fileName = item.file.split("/").pop() || item.file;
            return fileName;
          }));

          const hubs = new Set(data.health.hubFiles.map(file => {
            const fileName = file.split("/").pop() || file;
            return fileName;
          }));

          const entryPoints = new Set(
            data.features.flatMap(f => f.entryPoint ? [f.entryPoint.split("/").pop() || f.entryPoint] : [])
          );

          setBadges({
            startHereFiles: startHere,
            hubFiles: hubs,
            featureEntryPoints: entryPoints,
          });
        }
      } catch (err) {
        console.error("Failed to fetch badges:", err);
      }
    };

    if (analysis) {
      fetchBadges();
    }
  }, [analysis]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (node: TreeNode) => {
    if (node.data) {
      const { type, item } = node.data as { type: string; item: unknown };
      onSelect(node.id, type, item);
    }
  };

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const query = searchQuery.toLowerCase();

    function filterNode(node: TreeNode): TreeNode | null {
      const labelMatch =
        node.label.toLowerCase().includes(query) ||
        node.friendlyLabel.toLowerCase().includes(query);

      if (node.children) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((n): n is TreeNode => n !== null);

        if (filteredChildren.length > 0 || labelMatch) {
          return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children };
        }
      }

      return labelMatch ? node : null;
    }

    return tree.map(filterNode).filter((n): n is TreeNode => n !== null);
  }, [tree, searchQuery]);

  // Handle selecting a category/folder
  const handleSelectCategory = (node: TreeNode) => {
    // Pass module data for folder-level view
    const moduleData = {
      type: "module",
      item: {
        id: node.id,
        name: node.label,
        friendlyName: node.friendlyLabel,
        items: node.children?.map(c => ({
          id: c.id,
          label: c.label,
          data: c.data,
        })) || [],
        category: node.id.split("-")[0], // routes, components, models, files
      }
    };
    onSelect(node.id, "module", moduleData.item);
  };

  // Auto-expand when searching
  const displayExpanded = useMemo(() => {
    if (searchQuery.trim()) {
      // Expand all when searching
      const allIds = new Set<string>();
      function collectIds(nodes: TreeNode[]) {
        for (const node of nodes) {
          allIds.add(node.id);
          if (node.children) collectIds(node.children);
        }
      }
      collectIds(filteredTree);
      return allIds;
    }
    return expanded;
  }, [expanded, searchQuery, filteredTree]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)]">
      {/* Search */}
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={analogyMode ? "Find something..." : "Search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-dark)] focus:ring-1 focus:ring-[var(--accent-dark)]/30"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTree.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={displayExpanded}
            selected={selectedId}
            onToggle={toggleNode}
            onSelect={handleSelect}
            onSelectCategory={handleSelectCategory}
            analogyMode={analogyMode}
            badges={badges}
          />
        ))}

        {filteredTree.length === 0 && searchQuery && (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            No results for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <div className="text-[0.65rem] text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wide">
          {analogyMode ? "Quick Start" : "Quick Actions"}
        </div>
        <button
          onClick={() => {
            // Expand all top-level
            setExpanded(new Set(tree.map((n) => n.id)));
          }}
          className="w-full text-left text-xs px-3 py-2 rounded-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {analogyMode ? "📖 Show everything" : "Expand All"}
        </button>
        <button
          onClick={() => setExpanded(new Set())}
          className="w-full text-left text-xs px-3 py-2 rounded-sm hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {analogyMode ? "📕 Collapse all" : "Collapse All"}
        </button>
      </div>
    </div>
  );
}
