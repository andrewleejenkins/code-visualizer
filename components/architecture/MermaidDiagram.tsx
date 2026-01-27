"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

// Cache for rendered SVGs to avoid re-rendering identical charts
const svgCache = new Map<string, string>();

export function MermaidDiagram({ chart, id = "mermaid-diagram" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const renderIdRef = useRef(0);

  const renderDiagram = useCallback(async () => {
    if (!chart) {
      setSvg("");
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = chart;
    if (svgCache.has(cacheKey)) {
      setSvg(svgCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentRenderId = ++renderIdRef.current;

    try {
      const mermaid = (await import("mermaid")).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#667eea",
          primaryTextColor: "#e8e0d4",
          primaryBorderColor: "#404040",
          lineColor: "#666666",
          secondaryColor: "#2d2d2d",
          tertiaryColor: "#1a1a1a",
          background: "#1a1a1a",
          mainBkg: "#2d2d2d",
          nodeBorder: "#404040",
          clusterBkg: "#2d2d2d",
          clusterBorder: "#404040",
          titleColor: "#e8e0d4",
          edgeLabelBackground: "#2d2d2d",
        },
        flowchart: {
          htmlLabels: true,
          curve: "basis",
        },
        er: {
          useMaxWidth: false,
          layoutDirection: "TB",
        },
        securityLevel: "loose",
        maxTextSize: 100000,
      });

      const uniqueId = `${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);

      if (currentRenderId === renderIdRef.current) {
        svgCache.set(cacheKey, renderedSvg);
        if (svgCache.size > 20) {
          const firstKey = svgCache.keys().next().value;
          if (firstKey) svgCache.delete(firstKey);
        }
        setSvg(renderedSvg);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Mermaid rendering error:", err);
      if (currentRenderId === renderIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setIsLoading(false);
      }
    }
  }, [chart, id]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Reset zoom and position when chart changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [chart]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(Math.max(0.1, z * delta), 5));
    }
  }, []);

  // Handle drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const zoomIn = () => setZoom((z) => Math.min(z * 1.25, 5));
  const zoomOut = () => setZoom((z) => Math.max(z * 0.8, 0.1));
  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-red-500/50">
        <p className="text-red-400 text-sm">Failed to render diagram:</p>
        <pre className="mt-2 text-xs text-[var(--text-secondary)] overflow-auto max-h-32">
          {error}
        </pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <div className="w-5 h-5 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
          <span>Rendering diagram...</span>
        </div>
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  const diagramContent = (
    <div
      ref={containerRef}
      className={`mermaid-container overflow-hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        height: isFullscreen ? "100%" : "600px",
        position: "relative",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.1s ease-out",
          display: "inline-block",
          minWidth: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );

  const controls = (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
        <button
          onClick={zoomOut}
          className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-xs text-[var(--text-secondary)] w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <button
        onClick={resetView}
        className="p-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Reset view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button
        onClick={() => setIsFullscreen(true)}
        className="p-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Fullscreen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      <span className="text-xs text-[var(--text-muted)] ml-2">
        Drag to pan • Ctrl+scroll to zoom
      </span>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            {controls}
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Exit fullscreen (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {diagramContent}
        </div>
      </div>
    );
  }

  return (
    <div>
      {controls}
      {diagramContent}
    </div>
  );
}
