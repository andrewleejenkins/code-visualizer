"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { SearchFilter } from "./SearchFilter";
import type { RouteData, RouteInfo } from "@/lib/types";

interface RouteMapProps {
  data: RouteData;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--accent-green)",
  POST: "var(--accent-purple)",
  PUT: "var(--accent-orange)",
  PATCH: "var(--accent-orange)",
  DELETE: "var(--accent-red)",
};

const AUTH_BADGES: Record<string, { label: string; color: string }> = {
  public: { label: "Public", color: "var(--accent-green)" },
  protected: { label: "Auth", color: "var(--accent-blue)" },
  admin: { label: "Admin", color: "var(--accent-red)" },
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className="px-2 py-0.5 text-xs font-mono font-semibold rounded"
      style={{
        backgroundColor: `${METHOD_COLORS[method]}20`,
        color: METHOD_COLORS[method],
      }}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  const badge = AUTH_BADGES[auth] || AUTH_BADGES.public;
  return (
    <span
      className="px-2 py-0.5 text-xs rounded"
      style={{
        backgroundColor: `${badge.color}15`,
        color: badge.color,
      }}
    >
      {badge.label}
    </span>
  );
}

export function RouteMap({ data }: RouteMapProps) {
  const { searchQuery, expandedNodes, toggleNode, selectedItem, setSelectedItem } = useAppStore();

  // Group routes by feature
  const groupedRoutes = useMemo(() => {
    const filtered = data.routes.filter((route) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        route.path.toLowerCase().includes(query) ||
        route.method.toLowerCase().includes(query) ||
        route.feature.toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, RouteInfo[]>();
    for (const route of filtered) {
      const existing = groups.get(route.feature) || [];
      existing.push(route);
      groups.set(route.feature, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.routes, searchQuery]);

  const filteredCount = groupedRoutes.reduce((sum, [, routes]) => sum + routes.length, 0);

  return (
    <div>
      <SearchFilter
        placeholder="Search routes..."
        resultsCount={filteredCount}
        totalCount={data.routes.length}
      />

      <div className="space-y-2">
        {groupedRoutes.map(([feature, routes]) => {
          const isExpanded = expandedNodes.has(feature);
          const methodCounts = routes.reduce(
            (acc, r) => {
              acc[r.method] = (acc[r.method] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          return (
            <div
              key={feature}
              className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden"
            >
              <button
                onClick={() => toggleNode(feature)}
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
                  <span className="font-medium text-[var(--text-primary)]">{feature}</span>
                  <span className="text-sm text-[var(--text-secondary)]">({routes.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  {Object.entries(methodCounts).map(([method, count]) => (
                    <span
                      key={method}
                      className="text-xs px-1.5 rounded"
                      style={{
                        backgroundColor: `${METHOD_COLORS[method]}20`,
                        color: METHOD_COLORS[method],
                      }}
                    >
                      {count}
                    </span>
                  ))}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border-color)]">
                  {routes.map((route) => {
                    const routeKey = `${route.method}-${route.path}`;
                    const isSelected = selectedItem === routeKey;

                    return (
                      <div
                        key={routeKey}
                        onClick={() => setSelectedItem(isSelected ? null : routeKey)}
                        className={`px-4 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[var(--accent-purple)]/10 border-l-2 border-[var(--accent-purple)]"
                            : "hover:bg-[var(--bg-tertiary)] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <MethodBadge method={route.method} />
                          <span className="font-mono text-sm text-[var(--text-primary)]">
                            {route.path}
                          </span>
                        </div>
                        <AuthBadge auth={route.auth} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {groupedRoutes.length === 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            {searchQuery ? "No routes match your search" : "No API routes found"}
          </div>
        )}
      </div>
    </div>
  );
}
