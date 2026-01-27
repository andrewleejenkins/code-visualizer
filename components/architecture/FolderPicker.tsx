"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

// Demo data for showcasing the tool
const DEMO_DATA = {
  projectPath: "/demo/sample-app",
  projectName: "Sample E-Commerce App",
  generatedAt: new Date().toISOString(),
  routes: {
    routes: [
      { path: "/api/users", method: "GET" as const, feature: "users", auth: "protected" as const, file: "app/api/users/route.ts" },
      { path: "/api/users", method: "POST" as const, feature: "users", auth: "public" as const, file: "app/api/users/route.ts" },
      { path: "/api/products", method: "GET" as const, feature: "products", auth: "public" as const, file: "app/api/products/route.ts" },
      { path: "/api/products", method: "POST" as const, feature: "products", auth: "admin" as const, file: "app/api/products/route.ts" },
      { path: "/api/orders", method: "GET" as const, feature: "orders", auth: "protected" as const, file: "app/api/orders/route.ts" },
      { path: "/api/orders", method: "POST" as const, feature: "orders", auth: "protected" as const, file: "app/api/orders/route.ts" },
      { path: "/api/auth/login", method: "POST" as const, feature: "auth", auth: "public" as const, file: "app/api/auth/login/route.ts" },
      { path: "/api/auth/logout", method: "POST" as const, feature: "auth", auth: "protected" as const, file: "app/api/auth/logout/route.ts" },
    ],
    generatedAt: new Date().toISOString(),
    projectPath: "/demo/sample-app",
  },
  components: {
    components: [
      { name: "Header", path: "components/layout/Header.tsx", directory: "components/layout", type: "client" as const, dependencies: ["Button", "NavLink"], linesOfCode: 45 },
      { name: "Footer", path: "components/layout/Footer.tsx", directory: "components/layout", type: "server" as const, dependencies: [], linesOfCode: 30 },
      { name: "Button", path: "components/ui/Button.tsx", directory: "components/ui", type: "client" as const, dependencies: [], linesOfCode: 25 },
      { name: "Card", path: "components/ui/Card.tsx", directory: "components/ui", type: "server" as const, dependencies: [], linesOfCode: 20 },
      { name: "Input", path: "components/ui/Input.tsx", directory: "components/ui", type: "client" as const, dependencies: [], linesOfCode: 35 },
      { name: "ProductCard", path: "components/products/ProductCard.tsx", directory: "components/products", type: "server" as const, dependencies: ["Card", "Button"], linesOfCode: 55 },
      { name: "ProductList", path: "components/products/ProductList.tsx", directory: "components/products", type: "server" as const, dependencies: ["ProductCard"], linesOfCode: 40 },
      { name: "CartItem", path: "components/cart/CartItem.tsx", directory: "components/cart", type: "client" as const, dependencies: ["Button"], linesOfCode: 45 },
      { name: "CartSummary", path: "components/cart/CartSummary.tsx", directory: "components/cart", type: "client" as const, dependencies: ["CartItem", "Button"], linesOfCode: 60 },
      { name: "LoginForm", path: "components/auth/LoginForm.tsx", directory: "components/auth", type: "client" as const, dependencies: ["Input", "Button"], linesOfCode: 80 },
      { name: "UserProfile", path: "components/auth/UserProfile.tsx", directory: "components/auth", type: "client" as const, dependencies: ["Card"], linesOfCode: 50 },
    ],
    directories: [
      { path: "components/layout", label: "Layout", componentCount: 2 },
      { path: "components/ui", label: "UI", componentCount: 3 },
      { path: "components/products", label: "Products", componentCount: 2 },
      { path: "components/cart", label: "Cart", componentCount: 2 },
      { path: "components/auth", label: "Auth", componentCount: 2 },
    ],
    generatedAt: new Date().toISOString(),
    projectPath: "/demo/sample-app",
  },
  models: {
    models: [
      { name: "User", fields: [
        { name: "id", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "email", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "name", type: "String", isRelation: false, isOptional: true, isArray: false },
        { name: "orders", type: "Order", isRelation: true, isOptional: false, isArray: true },
      ]},
      { name: "Product", fields: [
        { name: "id", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "name", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "price", type: "Float", isRelation: false, isOptional: false, isArray: false },
        { name: "description", type: "String", isRelation: false, isOptional: true, isArray: false },
        { name: "orderItems", type: "OrderItem", isRelation: true, isOptional: false, isArray: true },
      ]},
      { name: "Order", fields: [
        { name: "id", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "userId", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "user", type: "User", isRelation: true, isOptional: false, isArray: false },
        { name: "items", type: "OrderItem", isRelation: true, isOptional: false, isArray: true },
        { name: "total", type: "Float", isRelation: false, isOptional: false, isArray: false },
        { name: "status", type: "String", isRelation: false, isOptional: false, isArray: false },
      ]},
      { name: "OrderItem", fields: [
        { name: "id", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "orderId", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "order", type: "Order", isRelation: true, isOptional: false, isArray: false },
        { name: "productId", type: "String", isRelation: false, isOptional: false, isArray: false },
        { name: "product", type: "Product", isRelation: true, isOptional: false, isArray: false },
        { name: "quantity", type: "Int", isRelation: false, isOptional: false, isArray: false },
      ]},
    ],
    relationships: [
      { from: "User", to: "Order", type: "one-to-many" as const, fieldName: "orders" },
      { from: "Order", to: "OrderItem", type: "one-to-many" as const, fieldName: "items" },
      { from: "Product", to: "OrderItem", type: "one-to-many" as const, fieldName: "orderItems" },
    ],
    generatedAt: new Date().toISOString(),
    projectPath: "/demo/sample-app",
  },
  dependencies: {
    nodes: [
      { id: "header", label: "Header", directory: "components/layout", type: "component" as const },
      { id: "footer", label: "Footer", directory: "components/layout", type: "component" as const },
      { id: "button", label: "Button", directory: "components/ui", type: "component" as const },
      { id: "card", label: "Card", directory: "components/ui", type: "component" as const },
      { id: "input", label: "Input", directory: "components/ui", type: "component" as const },
      { id: "productcard", label: "ProductCard", directory: "components/products", type: "component" as const },
      { id: "productlist", label: "ProductList", directory: "components/products", type: "component" as const },
      { id: "cartitem", label: "CartItem", directory: "components/cart", type: "component" as const },
      { id: "cartsummary", label: "CartSummary", directory: "components/cart", type: "component" as const },
      { id: "loginform", label: "LoginForm", directory: "components/auth", type: "component" as const },
      { id: "userprofile", label: "UserProfile", directory: "components/auth", type: "component" as const },
    ],
    edges: [
      { source: "header", target: "button" },
      { source: "productcard", target: "card" },
      { source: "productcard", target: "button" },
      { source: "productlist", target: "productcard" },
      { source: "cartitem", target: "button" },
      { source: "cartsummary", target: "cartitem" },
      { source: "cartsummary", target: "button" },
      { source: "loginform", target: "input" },
      { source: "loginform", target: "button" },
      { source: "userprofile", target: "card" },
    ],
    clusters: [
      { id: "layout", label: "Layout", nodeIds: ["header", "footer"] },
      { id: "ui", label: "UI", nodeIds: ["button", "card", "input"] },
      { id: "products", label: "Products", nodeIds: ["productcard", "productlist"] },
      { id: "cart", label: "Cart", nodeIds: ["cartitem", "cartsummary"] },
      { id: "auth", label: "Auth", nodeIds: ["loginform", "userprofile"] },
    ],
    generatedAt: new Date().toISOString(),
    projectPath: "/demo/sample-app",
  },
};

export function FolderPicker() {
  const [folderPath, setFolderPath] = useState("");
  const { setLoading, setAnalysis, setError, isLoading, error, analogyMode, setAnalogyMode } = useAppStore();

  const handleAnalyze = async () => {
    if (!folderPath.trim()) {
      setError("Please enter a folder path");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: folderPath.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setAnalysis(DEMO_DATA);
  };

  const handleLoadFromFile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/data/analysis.json");
      if (!response.ok) {
        throw new Error("No cached analysis found. Run 'npm run analyze <path>' first.");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-dark)] rounded-full flex items-center justify-center">
              <span className="text-xl">🔍</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">CODE EXPLORER</h1>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                {analogyMode ? "Visual Codebase Guide" : "Interactive Visualization"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAnalogyMode(!analogyMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
              analogyMode
                ? "bg-[var(--accent-dark)] text-white shadow-[var(--shadow-glow)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span>{analogyMode ? "🎓" : "💻"}</span>
            <span>{analogyMode ? "Friendly" : "Technical"}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--accent-darker)] rounded-full mb-6 animate-glow-pulse">
              <span className="text-4xl">🗺️</span>
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight uppercase">
              {analogyMode ? "Explore Your Code" : "Visualize Codebase"}
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              {analogyMode
                ? "See how all the pieces of a project fit together. It's like having a GPS for code - no programming experience needed!"
                : "Analyze your project structure, visualize component relationships, explore database models, and understand dependencies."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 px-4 py-3 bg-[var(--error)]/10 border border-[var(--error)]/50 text-[var(--error)] text-center text-sm font-medium">
              {error}
            </div>
          )}

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Try Demo - Featured Card */}
            <button
              onClick={handleLoadDemo}
              className="group p-6 bg-[var(--bg-card)] border border-[var(--border-color)] border-l-[3px] border-l-[var(--accent)] hover:border-[var(--border-hover)] transition-all duration-250 text-left animate-card-enter"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[var(--accent-darker)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎮</span>
                </div>
                <span className="px-2 py-1 bg-[var(--accent-dark)] text-white text-[0.65rem] font-semibold uppercase tracking-wide rounded">
                  Recommended
                </span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wide">
                {analogyMode ? "Try the Demo" : "Load Demo"}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
                {analogyMode
                  ? "See how it works with a sample e-commerce app. No setup needed!"
                  : "Explore a sample e-commerce project to see all features in action."}
              </p>
              <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm uppercase tracking-wide">
                <span>Start Exploring</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Your Project */}
            <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all duration-250 animate-card-enter" style={{ animationDelay: "50ms" }}>
              <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📁</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wide">
                {analogyMode ? "Your Project" : "Analyze Codebase"}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
                {analogyMode
                  ? "Enter the folder path to any project on your computer."
                  : "Enter an absolute path to your project directory."}
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder={analogyMode ? "Paste your project folder path..." : "/path/to/your/project"}
                  className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !folderPath.trim()}
                  className="w-full px-4 py-3 bg-[var(--accent-dark)] text-white font-semibold text-sm uppercase tracking-wide rounded-full hover:bg-[#6d0000] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>{analogyMode ? "Start Exploring" : "Analyze"}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cached Analysis Option */}
          <div className="text-center">
            <button
              onClick={handleLoadFromFile}
              disabled={isLoading}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] text-xs uppercase tracking-wide font-medium transition-colors"
            >
              {analogyMode ? "Have a cached analysis? Load it here" : "Load cached analysis from file"}
            </button>
            <p className="text-xs text-[var(--text-subtle)] mt-2 font-mono">
              npm run analyze /path/to/project
            </p>
          </div>

          {/* What We Analyze */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureCard
              icon="🚪"
              title={analogyMode ? "Doorways" : "Routes"}
              description={analogyMode ? "Entry points" : "HTTP endpoints"}
            />
            <FeatureCard
              icon="🧱"
              title={analogyMode ? "Blocks" : "Components"}
              description={analogyMode ? "Visual pieces" : "React components"}
            />
            <FeatureCard
              icon="🗄️"
              title={analogyMode ? "Storage" : "Database"}
              description={analogyMode ? "Data storage" : "Prisma models"}
            />
            <FeatureCard
              icon="🔗"
              title={analogyMode ? "Links" : "Dependencies"}
              description={analogyMode ? "Connections" : "Import graph"}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] px-6 py-4 text-center">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
          Works with Next.js, React, and Prisma projects
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-center hover:border-[var(--border-hover)] transition-all duration-200">
      <div className="w-10 h-10 bg-[var(--accent-darker)] rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-lg">{icon}</span>
      </div>
      <div className="font-semibold text-[var(--text-primary)] text-sm uppercase tracking-wide">{title}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{description}</div>
    </div>
  );
}
