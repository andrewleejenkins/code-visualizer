"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { InsightsData, GlossaryTerm } from "@/lib/types";

interface CompareFileData {
  name: string;
  path: string;
  summary: string;
  details: string[];
  lines: number;
  language: string;
  importedBy: number;
  imports: number;
}

interface InsightsPanelProps {
  analysis?: unknown; // Optional - will use from store if not provided
  onSelectFile?: (file: string) => void;
  onClose?: () => void;
}

export function InsightsPanel({ onSelectFile, onClose }: InsightsPanelProps) {
  const { analysis, analogyMode } = useAppStore();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ file: string; reason: string }>>([]);
  const [compareFiles, setCompareFiles] = useState<[string | null, string | null]>([null, null]);
  const [compareData, setCompareData] = useState<[CompareFileData | null, CompareFileData | null]>([null, null]);

  // Fetch insights when analysis changes
  useEffect(() => {
    const fetchInsights = async () => {
      if (!analysis) return;

      setLoading(true);
      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsights(data);
        }
      } catch (err) {
        console.error("Failed to fetch insights:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [analysis]);

  // Plain English Search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !insights) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: Array<{ file: string; reason: string }> = [];

    // Search patterns mapping plain English to technical terms
    const searchMappings = [
      { patterns: ["login", "sign in", "log in", "signin", "authentication", "user account"], terms: ["auth", "login", "signin", "session"] },
      { patterns: ["sign up", "register", "create account", "signup", "registration"], terms: ["register", "signup", "create"] },
      { patterns: ["pay", "payment", "checkout", "buy", "purchase", "credit card", "billing"], terms: ["payment", "stripe", "checkout", "billing"] },
      { patterns: ["email", "send email", "mail", "notification", "message"], terms: ["email", "mail", "send", "notification"] },
      { patterns: ["upload", "file", "image", "picture", "photo"], terms: ["upload", "file", "image", "media"] },
      { patterns: ["search", "find", "look for", "filter"], terms: ["search", "filter", "query"] },
      { patterns: ["setting", "preference", "configure", "option"], terms: ["setting", "config", "preference"] },
      { patterns: ["admin", "manage", "dashboard", "control"], terms: ["admin", "dashboard", "manage"] },
      { patterns: ["database", "data", "store", "save"], terms: ["prisma", "database", "model", "schema"] },
      { patterns: ["style", "design", "look", "appearance", "color", "css"], terms: ["style", "css", "tailwind", "theme"] },
      { patterns: ["page", "route", "url", "navigate"], terms: ["page", "route", "layout"] },
      { patterns: ["api", "backend", "server", "endpoint"], terms: ["api", "route", "server"] },
      { patterns: ["component", "ui", "interface", "button", "form"], terms: ["component", "ui"] },
      { patterns: ["test", "testing"], terms: ["test", "spec"] },
      { patterns: ["error", "bug", "problem", "fix"], terms: ["error", "catch", "try"] },
    ];

    // Find matching terms for the query
    const matchingTerms: string[] = [];
    for (const mapping of searchMappings) {
      if (mapping.patterns.some(p => lowerQuery.includes(p))) {
        matchingTerms.push(...mapping.terms);
      }
    }

    // Also include the raw query words
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    matchingTerms.push(...queryWords);

    // Search through features
    for (const feature of insights.features) {
      if (matchingTerms.some(t => feature.name.toLowerCase().includes(t) || feature.id.includes(t))) {
        for (const file of feature.files.slice(0, 3)) {
          results.push({ file, reason: `Part of ${feature.name}` });
        }
      }
    }

    // Search through file importance
    for (const fi of insights.fileImportance) {
      if (matchingTerms.some(t => fi.file.toLowerCase().includes(t))) {
        if (!results.some(r => r.file === fi.file)) {
          results.push({ file: fi.file, reason: "Matches your search" });
        }
      }
    }

    setSearchResults(results.slice(0, 10));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent-purple)] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[var(--text-muted)]">Analyzing codebase...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
        Select a project to see insights
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "start-here", label: "Start Here", icon: "🚀" },
    { id: "features", label: "Features", icon: "✨" },
    { id: "tech-stack", label: "Tech Stack", icon: "🛠️" },
    { id: "health", label: "Health", icon: "💚" },
    { id: "tours", label: "Guided Tours", icon: "🎯" },
    { id: "flows", label: "Data Flows", icon: "🔄" },
    { id: "glossary", label: "Glossary", icon: "📖" },
    { id: "search", label: "Ask", icon: "🔍" },
    { id: "compare", label: "Compare", icon: "⚖️" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header with Title and Close */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h1 className="font-semibold text-[var(--text-primary)]">Insights & Learning</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {analogyMode ? "Understand your codebase" : "Codebase analysis and navigation"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Explorer</span>
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              activeSection === section.id
                ? "bg-[var(--accent-purple)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Overview Section */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analysis?.projectName || "Project"} Overview
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {insights.architecture.summary}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Files" value={insights.health.totalFiles} icon="📁" />
              <StatCard label="Components" value={insights.health.totalComponents} icon="🧩" />
              <StatCard label="API Routes" value={insights.health.totalRoutes} icon="🚪" />
              <StatCard label="Database Models" value={insights.health.totalModels} icon="🗄️" />
            </div>

            {/* Key Technologies */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Key Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {insights.techStack.slice(0, 8).map((tech) => (
                  <span
                    key={tech.name}
                    className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)]"
                    title={tech.simpleExplanation}
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Main Features */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Main Features</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {insights.features.slice(0, 6).map((feature) => (
                  <div
                    key={feature.id}
                    className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{feature.icon}</span>
                      <span className="font-medium text-[var(--text-primary)]">{feature.name}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{feature.files.length} files</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            {insights.health.insights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Insights</h3>
                <div className="space-y-2">
                  {insights.health.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 rounded-lg text-sm text-[var(--text-secondary)]"
                    >
                      💡 {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start Here Section */}
        {activeSection === "start-here" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Where to Begin" : "Start Here"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "These are the most important files to understand first. Read them in this order to build your understanding."
                  : "Key entry points and important files to understand the codebase."}
              </p>
            </div>

            <div className="space-y-3">
              {insights.startHere.map((item, index) => (
                <button
                  key={item.file}
                  onClick={() => onSelectFile?.(item.file)}
                  className="w-full text-left p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-purple)] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      item.importance === "critical" ? "bg-red-500" :
                      item.importance === "important" ? "bg-[var(--accent-purple)]" :
                      "bg-[var(--text-muted)]"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
                      <div className="text-sm text-[var(--text-muted)] mt-1">{item.reason}</div>
                      <div className="text-sm text-[var(--accent-purple)] mt-2">
                        📚 {item.whatYouLearn}
                      </div>
                    </div>
                    <ImportanceBadge importance={item.importance} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        {activeSection === "features" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "What This App Can Do" : "Detected Features"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "These are the main things this application does. Click on any feature to see the files that make it work."
                  : "Features detected by analyzing file names and patterns."}
              </p>
            </div>

            <div className="grid gap-4">
              {insights.features.map((feature) => (
                <div
                  key={feature.id}
                  className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{feature.name}</h3>
                        <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-muted)]">
                      {feature.files.length} files
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {feature.files.slice(0, 5).map((file) => (
                      <button
                        key={file}
                        onClick={() => onSelectFile?.(file)}
                        className="px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-purple)]/20 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors"
                      >
                        {file.split("/").pop()}
                      </button>
                    ))}
                    {feature.files.length > 5 && (
                      <span className="px-2 py-1 text-xs text-[var(--text-muted)]">
                        +{feature.files.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack Section */}
        {activeSection === "tech-stack" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Tools & Technologies" : "Technology Stack"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "These are the tools and services that power this application. Hover over any to learn what it does."
                  : "Libraries, frameworks, and services detected in this codebase."}
              </p>
            </div>

            {/* Group by category */}
            {["framework", "database", "auth", "styling", "api", "testing", "tooling"].map((category) => {
              const items = insights.techStack.filter((t) => t.category === category);
              if (items.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 capitalize">
                    {category === "api" ? "APIs & Services" : category}
                  </h3>
                  <div className="grid gap-3">
                    {items.map((tech) => (
                      <div
                        key={tech.name}
                        className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-[var(--text-primary)]">{tech.name}</h4>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                              {analogyMode ? tech.simpleExplanation : tech.description}
                            </p>
                          </div>
                        </div>
                        {tech.usedIn.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            <span className="text-xs text-[var(--text-muted)]">Used in:</span>
                            {tech.usedIn.slice(0, 3).map((file) => (
                              <button
                                key={file}
                                onClick={() => onSelectFile?.(file)}
                                className="text-xs text-[var(--accent-purple)] hover:underline"
                              >
                                {file.split("/").pop()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Health Section */}
        {activeSection === "health" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Project Health Check" : "Codebase Health"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "A checkup on how this project is doing. Like a health report for code!"
                  : "Metrics and analysis of codebase quality and organization."}
              </p>
            </div>

            {/* Health Meters */}
            <div className="grid grid-cols-2 gap-4">
              <HealthMeter
                label="Complexity"
                value={insights.health.complexity}
                levels={["simple", "moderate", "complex", "very-complex"]}
              />
              <HealthMeter
                label="Organization"
                value={insights.health.organization}
                levels={["needs-work", "fair", "good", "excellent"]}
                reverse
              />
            </div>

            {/* Hub Files */}
            {insights.health.hubFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  {analogyMode ? "Most Important Files" : "Hub Files"}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  {analogyMode
                    ? "These files are used by many other files. They're the backbone of the app."
                    : "Files with many dependents - changes here have wide impact."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {insights.health.hubFiles.map((file) => (
                    <button
                      key={file}
                      onClick={() => onSelectFile?.(file)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      {file.split("/").pop()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Largest Files */}
            {insights.health.largestFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  {analogyMode ? "Biggest Files" : "Largest Files"}
                </h3>
                <div className="space-y-2">
                  {insights.health.largestFiles.map((item) => (
                    <button
                      key={item.file}
                      onClick={() => onSelectFile?.(item.file)}
                      className="w-full flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-purple)] transition-colors"
                    >
                      <span className="text-[var(--text-secondary)]">{item.file.split("/").pop()}</span>
                      <span className="text-sm text-[var(--text-muted)]">{item.lines} lines</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guided Tours Section */}
        {activeSection === "tours" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Guided Explorations" : "Guided Tours"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "Let me walk you through different parts of the app step by step."
                  : "Step-by-step walkthroughs of features and architecture."}
              </p>
            </div>

            {activeTour ? (
              <TourPlayer
                tour={insights.tours.find((t) => t.id === activeTour)!}
                currentStep={tourStep}
                onStepChange={setTourStep}
                onSelectFile={onSelectFile}
                onExit={() => {
                  setActiveTour(null);
                  setTourStep(0);
                }}
              />
            ) : (
              <div className="grid gap-4">
                {insights.tours.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => setActiveTour(tour.id)}
                    className="w-full text-left p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-purple)] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{tour.name}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{tour.description}</p>
                      </div>
                      <div className="text-right">
                        <DifficultyBadge difficulty={tour.difficulty} />
                        <p className="text-xs text-[var(--text-muted)] mt-1">{tour.duration}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--accent-purple)]">
                      <span>▶</span>
                      <span>{tour.steps.length} steps</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Flows Section */}
        {activeSection === "flows" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "How Things Work" : "Data Flows"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "See how information moves through the app when users do things."
                  : "Visual representation of how data flows through the application."}
              </p>
            </div>

            <div className="space-y-6">
              {insights.dataFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
                >
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{flow.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">{flow.description}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    {flow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={`px-3 py-2 rounded-lg text-sm ${
                            step.type === "user-action"
                              ? "bg-blue-500/20 text-blue-400"
                              : step.type === "component"
                              ? "bg-purple-500/20 text-purple-400"
                              : step.type === "api"
                              ? "bg-green-500/20 text-green-400"
                              : step.type === "database"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                          title={step.description}
                        >
                          {step.label}
                        </div>
                        {index < flow.steps.length - 1 && (
                          <span className="text-[var(--text-muted)]">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glossary Section */}
        {activeSection === "glossary" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "What Does This Mean?" : "Glossary"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "Confused by a term? Find simple explanations here."
                  : "Technical terms and their definitions."}
              </p>
            </div>

            <div className="space-y-4">
              {insights.glossary.map((term) => (
                <GlossaryCard key={term.term} term={term} analogyMode={analogyMode} />
              ))}
            </div>
          </div>
        )}

        {/* Search/Ask Section */}
        {activeSection === "search" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Ask Me Anything" : "Search"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "Ask questions in plain English like \"where do users log in?\" or \"what handles payments?\""
                  : "Search for files using natural language queries."}
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={analogyMode ? "Try: \"where do users sign up?\"" : "Search..."}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            </div>

            {/* Suggested Questions */}
            {!searchQuery && (
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">Try asking:</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Where do users log in?",
                    "What handles payments?",
                    "How is data saved?",
                    "Where are the settings?",
                    "What sends emails?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSearch(q)}
                      className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--accent-purple)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  Found {searchResults.length} results:
                </h3>
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.file}
                      onClick={() => onSelectFile?.(result.file)}
                      className="w-full text-left p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-purple)] transition-colors"
                    >
                      <div className="font-medium text-[var(--text-primary)]">
                        {result.file.split("/").pop()}
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">{result.reason}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-[var(--text-muted)]">
                No results found. Try different words or check the Features tab.
              </div>
            )}
          </div>
        )}

        {/* Compare Section */}
        {activeSection === "compare" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {analogyMode ? "Compare Two Files" : "File Comparison"}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {analogyMode
                  ? "Select two files to see them side by side and understand how they're different."
                  : "Compare file metadata, dependencies, and purpose."}
              </p>
            </div>

            {/* File Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileSelector
                label="First File"
                selectedFile={compareFiles[0]}
                files={analysis?.dependencies?.nodes || []}
                onSelect={async (file) => {
                  setCompareFiles([file, compareFiles[1]]);
                  if (file) {
                    const data = await fetchFileData(file, analysis);
                    setCompareData([data, compareData[1]]);
                  } else {
                    setCompareData([null, compareData[1]]);
                  }
                }}
              />
              <FileSelector
                label="Second File"
                selectedFile={compareFiles[1]}
                files={analysis?.dependencies?.nodes || []}
                onSelect={async (file) => {
                  setCompareFiles([compareFiles[0], file]);
                  if (file) {
                    const data = await fetchFileData(file, analysis);
                    setCompareData([compareData[0], data]);
                  } else {
                    setCompareData([compareData[0], null]);
                  }
                }}
              />
            </div>

            {/* Comparison Results */}
            {compareData[0] && compareData[1] && (
              <div className="space-y-6">
                {/* Side by Side Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CompareCard data={compareData[0]} onView={() => onSelectFile?.(compareData[0]!.path)} />
                  <CompareCard data={compareData[1]} onView={() => onSelectFile?.(compareData[1]!.path)} />
                </div>

                {/* Comparison Metrics */}
                <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-4">Comparison</h3>
                  <div className="space-y-3">
                    <CompareMetric
                      label="Lines of Code"
                      value1={compareData[0].lines}
                      value2={compareData[1].lines}
                    />
                    <CompareMetric
                      label="Files That Import This"
                      value1={compareData[0].importedBy}
                      value2={compareData[1].importedBy}
                    />
                    <CompareMetric
                      label="Files This Imports"
                      value1={compareData[0].imports}
                      value2={compareData[1].imports}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {(!compareData[0] || !compareData[1]) && (
              <div className="text-center py-8 text-[var(--text-muted)]">
                Select two files above to compare them
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-2xl font-bold text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function ImportanceBadge({ importance }: { importance: "critical" | "important" | "helpful" }) {
  const colors = {
    critical: "bg-red-500/20 text-red-400",
    important: "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]",
    helpful: "bg-[var(--text-muted)]/20 text-[var(--text-muted)]",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[importance]}`}>
      {importance}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: "beginner" | "intermediate" | "advanced" }) {
  const colors = {
    beginner: "bg-green-500/20 text-green-400",
    intermediate: "bg-yellow-500/20 text-yellow-400",
    advanced: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[difficulty]}`}>
      {difficulty}
    </span>
  );
}

function HealthMeter({
  label,
  value,
  levels,
  reverse = false,
}: {
  label: string;
  value: string;
  levels: string[];
  reverse?: boolean;
}) {
  const index = levels.indexOf(value);
  const percentage = ((index + 1) / levels.length) * 100;
  const adjustedPercentage = reverse ? percentage : 100 - percentage;

  const color =
    adjustedPercentage >= 75 ? "bg-green-500" :
    adjustedPercentage >= 50 ? "bg-yellow-500" :
    adjustedPercentage >= 25 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{value.replace("-", " ")}</span>
      </div>
      <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${adjustedPercentage}%` }} />
      </div>
    </div>
  );
}

function TourPlayer({
  tour,
  currentStep,
  onStepChange,
  onSelectFile,
  onExit,
}: {
  tour: { name: string; steps: Array<{ file: string; title: string; explanation: string; nextAction?: string }> };
  currentStep: number;
  onStepChange: (step: number) => void;
  onSelectFile?: (file: string) => void;
  onExit: () => void;
}) {
  const step = tour.steps[currentStep];

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--accent-purple)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">{tour.name}</h3>
        <button
          onClick={onExit}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ✕
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {tour.steps.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded ${
              i <= currentStep ? "bg-[var(--accent-purple)]" : "bg-[var(--bg-tertiary)]"
            }`}
          />
        ))}
      </div>

      {/* Current Step */}
      <div className="mb-6">
        <div className="text-sm text-[var(--accent-purple)] mb-2">
          Step {currentStep + 1} of {tour.steps.length}
        </div>
        <h4 className="text-lg font-medium text-[var(--text-primary)] mb-2">{step.title}</h4>
        <p className="text-[var(--text-secondary)] mb-4">{step.explanation}</p>
        <button
          onClick={() => onSelectFile?.(step.file)}
          className="px-4 py-2 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded-lg text-sm hover:bg-[var(--accent-purple)]/30 transition-colors"
        >
          📁 View: {step.file.split("/").pop()}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg disabled:opacity-50"
        >
          ← Previous
        </button>
        {currentStep < tour.steps.length - 1 ? (
          <button
            onClick={() => onStepChange(currentStep + 1)}
            className="px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg"
          >
            {step.nextAction || "Next"} →
          </button>
        ) : (
          <button
            onClick={onExit}
            className="px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            ✓ Finish Tour
          </button>
        )}
      </div>
    </div>
  );
}

function GlossaryCard({ term, analogyMode }: { term: GlossaryTerm; analogyMode: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <span className="font-medium text-[var(--text-primary)]">{term.term}</span>
        <span className="text-[var(--text-muted)]">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3">
          <p className="text-[var(--text-secondary)] mb-3">
            {analogyMode ? term.simpleExplanation : term.definition}
          </p>
          {term.example && (
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Example: </span>
              <code className="text-[var(--accent-purple)]">{term.example}</code>
            </div>
          )}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-[var(--text-muted)]">Related: </span>
              <span className="text-[var(--text-secondary)]">{term.relatedTerms.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPARE FEATURE COMPONENTS
// ============================================================================

interface FileNode {
  id: string;
  label: string;
  directory: string;
}

function FileSelector({
  label,
  selectedFile,
  files,
  onSelect,
}: {
  label: string;
  selectedFile: string | null;
  files: FileNode[];
  onSelect: (file: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredFiles = files.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.directory.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-left hover:border-[var(--accent-purple)] transition-colors"
      >
        {selectedFile ? (
          <span className="text-[var(--text-primary)]">{selectedFile.split("/").pop()}</span>
        ) : (
          <span className="text-[var(--text-muted)]">Select a file...</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-64 overflow-hidden">
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filteredFiles.slice(0, 50).map((file) => (
              <button
                key={file.id}
                onClick={() => {
                  onSelect(`${file.directory}/${file.label}`);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)]">{file.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{file.directory}</div>
              </button>
            ))}
            {filteredFiles.length === 0 && (
              <div className="px-3 py-4 text-center text-[var(--text-muted)]">No files found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareCard({ data, onView }: { data: CompareFileData; onView: () => void }) {
  return (
    <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[var(--text-primary)]">{data.name}</h4>
          <p className="text-xs text-[var(--text-muted)]">{data.path}</p>
        </div>
        <span className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-muted)]">
          {data.language}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-3">{data.summary}</p>
      {data.details.length > 0 && (
        <ul className="text-xs text-[var(--text-muted)] space-y-1 mb-3">
          {data.details.slice(0, 3).map((detail, i) => (
            <li key={i}>• {detail}</li>
          ))}
        </ul>
      )}
      <button
        onClick={onView}
        className="text-sm text-[var(--accent-purple)] hover:underline"
      >
        View file →
      </button>
    </div>
  );
}

function CompareMetric({
  label,
  value1,
  value2,
}: {
  label: string;
  value1: number;
  value2: number;
}) {
  const max = Math.max(value1, value2, 1);
  const pct1 = (value1 / max) * 100;
  const pct2 = (value2 / max) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm text-[var(--text-muted)] mb-1">
        <span>{label}</span>
        <span>
          {value1} vs {value2}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[var(--accent-purple)] transition-all"
            style={{ width: `${pct1}%` }}
          />
        </div>
        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[var(--accent-green)] transition-all"
            style={{ width: `${pct2}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper function to fetch file data for comparison
async function fetchFileData(
  filePath: string,
  analysis: { projectPath?: string; dependencies?: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; label: string; directory: string }> } } | null
): Promise<CompareFileData | null> {
  if (!analysis?.projectPath) return null;

  try {
    const response = await fetch("/api/read-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath,
        projectPath: analysis.projectPath,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const fileName = filePath.split("/").pop() || filePath;

    // Calculate dependency counts
    let importedBy = 0;
    let imports = 0;
    if (analysis.dependencies) {
      const node = analysis.dependencies.nodes.find(
        (n) => `${n.directory}/${n.label}` === filePath || n.label === fileName
      );
      if (node) {
        importedBy = analysis.dependencies.edges.filter((e) => e.target === node.id).length;
        imports = analysis.dependencies.edges.filter((e) => e.source === node.id).length;
      }
    }

    return {
      name: fileName,
      path: filePath,
      summary: data.description?.summary || "No description available",
      details: data.description?.details || [],
      lines: data.lines || 0,
      language: data.language || "unknown",
      importedBy,
      imports,
    };
  } catch {
    return null;
  }
}
