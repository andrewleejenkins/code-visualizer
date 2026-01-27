"use client";

import { useMemo, useState } from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { SearchFilter } from "./SearchFilter";
import { useAppStore } from "@/lib/store";
import type { ModelData, ModelInfo } from "@/lib/types";

interface ModelDiagramProps {
  data: ModelData;
}

type ViewMode = "diagram" | "list";
type DiagramMode = "simple" | "detailed";

const MAX_DIAGRAM_MODELS = 15;

export function ModelDiagram({ data }: ModelDiagramProps) {
  const { searchQuery, selectedItem, setSelectedItem } = useAppStore();
  // Default to list view for large schemas
  const [viewMode, setViewMode] = useState<ViewMode>(
    data.models.length > MAX_DIAGRAM_MODELS ? "list" : "diagram"
  );
  const [diagramMode, setDiagramMode] = useState<DiagramMode>("simple");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery) return data.models;
    const query = searchQuery.toLowerCase();
    return data.models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.fields.some((f) => f.name.toLowerCase().includes(query))
    );
  }, [data.models, searchQuery]);

  // Models to show in diagram (limited for performance unless showAll)
  const diagramModels = useMemo(() => {
    if (selectedModels.size > 0) {
      return filteredModels.filter((m) => selectedModels.has(m.name));
    }
    if (showAll) {
      return filteredModels;
    }
    return filteredModels.slice(0, MAX_DIAGRAM_MODELS);
  }, [filteredModels, selectedModels, showAll]);

  // Generate Mermaid ER diagram (optimized)
  const mermaidChart = useMemo(() => {
    if (diagramModels.length === 0) return "";

    const lines: string[] = ["erDiagram"];
    const modelNames = new Set(diagramModels.map((m) => m.name));

    if (diagramMode === "simple") {
      // Simple mode: just boxes and relationships, no fields
      for (const model of diagramModels) {
        lines.push(`    ${model.name}`);
      }
    } else {
      // Detailed mode: include fields (limit to 5 per model for performance)
      for (const model of diagramModels) {
        const dataFields = model.fields.filter((f) => !f.isRelation).slice(0, 5);
        if (dataFields.length > 0) {
          lines.push(`    ${model.name} {`);
          for (const field of dataFields) {
            const typeStr = field.isArray ? `${field.type}[]` : field.type;
            lines.push(`        ${typeStr} ${field.name}`);
          }
          lines.push("    }");
        } else {
          lines.push(`    ${model.name}`);
        }
      }
    }

    // Add relationships
    for (const rel of data.relationships) {
      if (modelNames.has(rel.from) && modelNames.has(rel.to)) {
        let relSymbol: string;
        switch (rel.type) {
          case "one-to-one":
            relSymbol = "||--||";
            break;
          case "one-to-many":
            relSymbol = "||--o{";
            break;
          case "many-to-many":
            relSymbol = "}o--o{";
            break;
          default:
            relSymbol = "||--||";
        }
        lines.push(`    ${rel.from} ${relSymbol} ${rel.to} : "${rel.fieldName}"`);
      }
    }

    return lines.join("\n");
  }, [diagramModels, diagramMode, data.relationships]);

  const toggleModelSelection = (modelName: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelName)) {
      newSelected.delete(modelName);
    } else {
      newSelected.add(modelName);
    }
    setSelectedModels(newSelected);
  };

  const selectRelatedModels = (model: ModelInfo) => {
    const related = new Set<string>([model.name]);
    // Find models this one relates to
    for (const rel of data.relationships) {
      if (rel.from === model.name) related.add(rel.to);
      if (rel.to === model.name) related.add(rel.from);
    }
    setSelectedModels(related);
    setViewMode("diagram");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>{data.models.length} models</span>
          <span>{data.relationships.length} relationships</span>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "diagram" && (
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 mr-2">
              <button
                onClick={() => setDiagramMode("simple")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  diagramMode === "simple"
                    ? "bg-[var(--accent-blue)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setDiagramMode("detailed")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  diagramMode === "detailed"
                    ? "bg-[var(--accent-blue)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Detailed
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => setViewMode("diagram")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === "diagram"
                  ? "bg-[var(--accent-purple)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Diagram
            </button>
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
          </div>
        </div>
      </div>

      <SearchFilter
        placeholder="Search models..."
        resultsCount={filteredModels.length}
        totalCount={data.models.length}
      />

      {viewMode === "diagram" ? (
        <div className="space-y-4">
          {/* Model selector for large schemas */}
          {data.models.length > MAX_DIAGRAM_MODELS && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedModels.size > 0
                    ? `${selectedModels.size} models selected`
                    : showAll
                    ? `Showing all ${filteredModels.length} models`
                    : `Showing first ${MAX_DIAGRAM_MODELS} models`}
                </span>
                <div className="flex items-center gap-2">
                  {selectedModels.size > 0 && (
                    <button
                      onClick={() => setSelectedModels(new Set())}
                      className="text-xs text-[var(--accent-purple)] hover:underline"
                    >
                      Clear selection
                    </button>
                  )}
                  {selectedModels.size === 0 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="text-xs px-2 py-1 rounded bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/30"
                    >
                      {showAll ? "Show Less" : `Show All ${filteredModels.length}`}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {filteredModels.slice(0, 30).map((model) => (
                  <button
                    key={model.name}
                    onClick={() => toggleModelSelection(model.name)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedModels.has(model.name) ||
                      (selectedModels.size === 0 &&
                        filteredModels.indexOf(model) < MAX_DIAGRAM_MODELS)
                        ? "bg-[var(--accent-purple)] text-white"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
                {filteredModels.length > 30 && (
                  <span className="px-2 py-1 text-xs text-[var(--text-muted)]">
                    +{filteredModels.length - 30} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 overflow-auto">
            {mermaidChart ? (
              <MermaidDiagram chart={mermaidChart} id="model-diagram" />
            ) : (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                No models to display
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredModels.map((model) => {
            const isSelected = selectedItem === model.name;
            const relationFields = model.fields.filter((f) => f.isRelation);
            const dataFields = model.fields.filter((f) => !f.isRelation);

            return (
              <div
                key={model.name}
                className={`bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden transition-colors ${
                  isSelected ? "border-[var(--accent-purple)]" : ""
                }`}
              >
                <div
                  onClick={() => setSelectedItem(isSelected ? null : model.name)}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-tertiary)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">{model.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {model.fields.length} fields
                    </span>
                    {relationFields.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectRelatedModels(model);
                        }}
                        className="text-xs px-2 py-1 rounded bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/30"
                        title="View in diagram with related models"
                      >
                        View Relations
                      </button>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-[var(--border-color)] px-4 py-3">
                    <div className="space-y-2">
                      {dataFields.map((field) => (
                        <div
                          key={field.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-mono text-[var(--text-primary)]">
                            {field.name}
                            {field.isOptional && (
                              <span className="text-[var(--text-muted)]">?</span>
                            )}
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            {field.type}
                            {field.isArray && "[]"}
                          </span>
                        </div>
                      ))}
                      {relationFields.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-[var(--border-color)]">
                          <div className="text-xs text-[var(--text-muted)] mb-1">Relations</div>
                          {relationFields.map((field) => (
                            <div
                              key={field.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="font-mono text-[var(--accent-purple)]">
                                {field.name}
                              </span>
                              <span className="text-[var(--accent-purple)]">
                                {field.type}
                                {field.isArray && "[]"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              {searchQuery ? "No models match your search" : "No models found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
