"use client";

import { useMemo, useState } from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { SearchFilter } from "./SearchFilter";
import { useAppStore } from "@/lib/store";
import type { DependencyData } from "@/lib/types";

interface DependencyGraphProps {
  data: DependencyData;
}

type ViewMode = "graph" | "list";

const TYPE_COLORS: Record<string, string> = {
  component: "var(--accent-pink)",
  lib: "var(--accent-blue)",
  api: "var(--accent-green)",
  page: "var(--accent-purple)",
  other: "var(--text-muted)",
};

export function DependencyGraph({ data }: DependencyGraphProps) {
  const { searchQuery, expandedNodes, toggleNode, selectedItem, setSelectedItem } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!searchQuery && !selectedCluster) return data.nodes;
    return data.nodes.filter((node) => {
      if (selectedCluster) {
        const cluster = data.clusters.find((c) => c.id === selectedCluster);
        if (cluster && !cluster.nodeIds.includes(node.id)) return false;
      }
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        node.label.toLowerCase().includes(query) ||
        node.directory.toLowerCase().includes(query)
      );
    });
  }, [data.nodes, data.clusters, searchQuery, selectedCluster]);

  // Get edges for filtered nodes
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return data.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [data.edges, filteredNodes]);

  // Generate Mermaid flowchart (limited for performance)
  const mermaidChart = useMemo(() => {
    const maxNodes = 50;
    const nodesToShow = filteredNodes.slice(0, maxNodes);
    const nodeIds = new Set(nodesToShow.map((n) => n.id));
    const edgesToShow = filteredEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    if (nodesToShow.length === 0) return "";

    const lines: string[] = ["flowchart TD"];

    // Add nodes
    for (const node of nodesToShow) {
      const label = node.label.replace(/"/g, "'");
      lines.push(`    ${node.id}["${label}"]`);
    }

    // Add edges
    for (const edge of edgesToShow) {
      lines.push(`    ${edge.source} --> ${edge.target}`);
    }

    return lines.join("\n");
  }, [filteredNodes, filteredEdges]);

  // Group nodes by directory for list view
  const groupedNodes = useMemo(() => {
    const groups = new Map<string, typeof data.nodes>();
    for (const node of filteredNodes) {
      const existing = groups.get(node.directory) || [];
      existing.push(node);
      groups.set(node.directory, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredNodes]);

  // Get imports/exports for a node
  const getNodeConnections = (nodeId: string) => {
    const imports = data.edges.filter((e) => e.source === nodeId).map((e) => e.target);
    const exports = data.edges.filter((e) => e.target === nodeId).map((e) => e.source);
    return { imports, exports };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>{data.nodes.length} files</span>
          <span>{data.edges.length} imports</span>
          <span>{data.clusters.length} directories</span>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === "list"
                ? "bg-[var(--accent-purple)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === "graph"
                ? "bg-[var(--accent-purple)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Graph
          </button>
        </div>
      </div>

      {/* Cluster filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCluster(null)}
          className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
            !selectedCluster
              ? "bg-[var(--accent-purple)] text-white"
              : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          All
        </button>
        {data.clusters.slice(0, 10).map((cluster) => (
          <button
            key={cluster.id}
            onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
              selectedCluster === cluster.id
                ? "bg-[var(--accent-purple)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {cluster.label} ({cluster.nodeIds.length})
          </button>
        ))}
      </div>

      <SearchFilter
        placeholder="Search files..."
        resultsCount={filteredNodes.length}
        totalCount={data.nodes.length}
      />

      {viewMode === "graph" ? (
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 overflow-auto">
          {mermaidChart ? (
            <>
              {filteredNodes.length > 50 && (
                <div className="mb-4 px-3 py-2 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-sm rounded">
                  Showing first 50 of {filteredNodes.length} files. Use search or filters to narrow down.
                </div>
              )}
              <MermaidDiagram chart={mermaidChart} id="dependency-graph" />
            </>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              No files to display
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedNodes.map(([directory, nodes]) => {
            const isExpanded = expandedNodes.has(`dep-${directory}`);

            return (
              <div
                key={directory}
                className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden"
              >
                <button
                  onClick={() => toggleNode(`dep-${directory}`)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-mono text-sm text-[var(--text-primary)]">{directory}</span>
                    <span className="text-sm text-[var(--text-secondary)]">({nodes.length})</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border-color)]">
                    {nodes.map((node) => {
                      const isSelected = selectedItem === node.id;
                      const connections = isSelected ? getNodeConnections(node.id) : null;

                      return (
                        <div key={node.id}>
                          <div
                            onClick={() => setSelectedItem(isSelected ? null : node.id)}
                            className={`px-4 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[var(--accent-purple)]/10 border-l-2 border-[var(--accent-purple)]"
                                : "hover:bg-[var(--bg-tertiary)] border-l-2 border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: TYPE_COLORS[node.type] }}
                              />
                              <span className="text-[var(--text-primary)]">{node.label}</span>
                            </div>
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${TYPE_COLORS[node.type]}20`,
                                color: TYPE_COLORS[node.type],
                              }}
                            >
                              {node.type}
                            </span>
                          </div>

                          {isSelected && connections && (
                            <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-l-2 border-[var(--accent-purple)]">
                              {connections.imports.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-xs text-[var(--text-muted)] mb-1">
                                    Imports ({connections.imports.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {connections.imports.slice(0, 10).map((id) => {
                                      const targetNode = data.nodes.find((n) => n.id === id);
                                      return (
                                        <span
                                          key={id}
                                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                        >
                                          {targetNode?.label || id}
                                        </span>
                                      );
                                    })}
                                    {connections.imports.length > 10 && (
                                      <span className="text-xs text-[var(--text-muted)]">
                                        +{connections.imports.length - 10} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {connections.exports.length > 0 && (
                                <div>
                                  <div className="text-xs text-[var(--text-muted)] mb-1">
                                    Imported by ({connections.exports.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {connections.exports.slice(0, 10).map((id) => {
                                      const sourceNode = data.nodes.find((n) => n.id === id);
                                      return (
                                        <span
                                          key={id}
                                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                        >
                                          {sourceNode?.label || id}
                                        </span>
                                      );
                                    })}
                                    {connections.exports.length > 10 && (
                                      <span className="text-xs text-[var(--text-muted)]">
                                        +{connections.exports.length - 10} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {connections.imports.length === 0 && connections.exports.length === 0 && (
                                <div className="text-xs text-[var(--text-muted)]">No dependencies</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {groupedNodes.length === 0 && (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              {searchQuery ? "No files match your search" : "No files found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
