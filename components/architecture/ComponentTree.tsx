"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { SearchFilter } from "./SearchFilter";
import type { ComponentData, ComponentInfo } from "@/lib/types";

interface ComponentTreeProps {
  data: ComponentData;
}

const TYPE_COLORS = {
  client: "var(--accent-pink)",
  server: "var(--accent-purple)",
};

function TypeBadge({ type }: { type: "client" | "server" }) {
  return (
    <span
      className="px-2 py-0.5 text-xs rounded"
      style={{
        backgroundColor: `${TYPE_COLORS[type]}20`,
        color: TYPE_COLORS[type],
      }}
    >
      {type}
    </span>
  );
}

function ComponentCard({ component, isSelected, onClick }: {
  component: ComponentInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer transition-colors ${
        isSelected
          ? "bg-[var(--accent-purple)]/10 border-l-2 border-[var(--accent-purple)]"
          : "hover:bg-[var(--bg-tertiary)] border-l-2 border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-[var(--text-primary)]">{component.name}</span>
        <TypeBadge type={component.type} />
      </div>
      <div className="text-xs text-[var(--text-secondary)] font-mono">{component.path}</div>
      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
        <span>{component.linesOfCode} lines</span>
        {component.dependencies.length > 0 && (
          <span>{component.dependencies.length} deps</span>
        )}
      </div>
    </div>
  );
}

export function ComponentTree({ data }: ComponentTreeProps) {
  const { searchQuery, expandedNodes, toggleNode, selectedItem, setSelectedItem } = useAppStore();

  // Group components by directory
  const groupedComponents = useMemo(() => {
    const filtered = data.components.filter((comp) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        comp.name.toLowerCase().includes(query) ||
        comp.path.toLowerCase().includes(query) ||
        comp.directory.toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, ComponentInfo[]>();
    for (const comp of filtered) {
      const existing = groups.get(comp.directory) || [];
      existing.push(comp);
      groups.set(comp.directory, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.components, searchQuery]);

  const filteredCount = groupedComponents.reduce((sum, [, comps]) => sum + comps.length, 0);

  // Calculate stats
  const stats = useMemo(() => {
    const clientCount = data.components.filter((c) => c.type === "client").length;
    const serverCount = data.components.filter((c) => c.type === "server").length;
    const totalLines = data.components.reduce((sum, c) => sum + c.linesOfCode, 0);
    return { clientCount, serverCount, totalLines };
  }, [data.components]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: TYPE_COLORS.client }}
          />
          <span className="text-[var(--text-secondary)]">{stats.clientCount} client</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: TYPE_COLORS.server }}
          />
          <span className="text-[var(--text-secondary)]">{stats.serverCount} server</span>
        </span>
        <span className="text-[var(--text-muted)]">
          {stats.totalLines.toLocaleString()} total lines
        </span>
      </div>

      <SearchFilter
        placeholder="Search components..."
        resultsCount={filteredCount}
        totalCount={data.components.length}
      />

      <div className="space-y-2">
        {groupedComponents.map(([directory, components]) => {
          const isExpanded = expandedNodes.has(directory);
          const clientCount = components.filter((c) => c.type === "client").length;
          const serverCount = components.filter((c) => c.type === "server").length;

          return (
            <div
              key={directory}
              className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden"
            >
              <button
                onClick={() => toggleNode(directory)}
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
                  <svg
                    className="w-4 h-4 text-[var(--accent-blue)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="font-mono text-sm text-[var(--text-primary)]">{directory}</span>
                  <span className="text-sm text-[var(--text-secondary)]">({components.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  {clientCount > 0 && (
                    <span
                      className="text-xs px-1.5 rounded"
                      style={{
                        backgroundColor: `${TYPE_COLORS.client}20`,
                        color: TYPE_COLORS.client,
                      }}
                    >
                      {clientCount}
                    </span>
                  )}
                  {serverCount > 0 && (
                    <span
                      className="text-xs px-1.5 rounded"
                      style={{
                        backgroundColor: `${TYPE_COLORS.server}20`,
                        color: TYPE_COLORS.server,
                      }}
                    >
                      {serverCount}
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border-color)]">
                  {components.map((comp) => (
                    <ComponentCard
                      key={comp.path}
                      component={comp}
                      isSelected={selectedItem === comp.path}
                      onClick={() => setSelectedItem(selectedItem === comp.path ? null : comp.path)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {groupedComponents.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            {searchQuery ? "No components match your search" : "No components found"}
          </div>
        )}
      </div>
    </div>
  );
}
