"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

interface FileDescription {
  summary: string;
  details: string[];
  exports: string[];
}

interface CodeViewerProps {
  filePath: string;
  fileName: string;
}

export function CodeViewer({ filePath, fileName }: CodeViewerProps) {
  const { analysis, analogyMode } = useAppStore();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [language, setLanguage] = useState("plaintext");
  const [copied, setCopied] = useState(false);
  const [actualFileName, setActualFileName] = useState(fileName);
  const [description, setDescription] = useState<FileDescription | null>(null);

  const fetchCode = async () => {
    if (!analysis?.projectPath || !filePath) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/read-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          projectPath: analysis.projectPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load file");
      }

      const data = await response.json();
      setCode(data.content);
      setLineCount(data.lines);
      setLanguage(data.language);
      setActualFileName(data.fileName);
      setDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  // Reset when file changes
  useEffect(() => {
    setCode(null);
    setError(null);
    setCopied(false);
    setDescription(null);
  }, [filePath]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openModal = () => {
    setIsOpen(true);
    if (!code && !loading) {
      fetchCode();
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <section className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
          {analogyMode ? "See the code" : "Source Code"}
        </h3>
        <button
          onClick={openModal}
          className="w-full p-4 bg-[var(--bg-primary)] rounded-sm border border-[var(--border-color)] hover:border-[var(--accent-dark)] transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {fileName}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {analogyMode ? "Click to peek inside" : "Click to view source"}
                </div>
              </div>
            </div>
            <svg
              className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </button>
      </section>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-5xl max-h-[90vh] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <span className="text-2xl">📄</span>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {actualFileName}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <span className="px-2 py-0.5 bg-[var(--bg-primary)] rounded text-xs">
                      {language}
                    </span>
                    {lineCount > 0 && <span>{lineCount} lines</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  disabled={!code}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              {loading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent"></div>
                  <p className="mt-4 text-[var(--text-muted)]">
                    {analogyMode ? "Opening the file..." : "Loading..."}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-64">
                  <span className="text-5xl mb-4">😕</span>
                  <p className="text-[var(--text-secondary)] mb-4">{error}</p>
                  <button
                    onClick={fetchCode}
                    className="px-5 py-2.5 bg-[var(--accent-dark)] text-white rounded-full text-xs font-semibold uppercase tracking-wide hover:bg-[#6d0000] transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {code && !loading && (
                <>
                  {/* File Analysis Section */}
                  {description && (
                    <div className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                      {/* Summary */}
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                          {analogyMode ? "What this file does" : "File Purpose"}
                        </h4>
                        <p className="text-[var(--text-primary)]">{description.summary}</p>
                      </div>

                      {/* Details */}
                      {description.details.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                            {analogyMode ? "Key Features" : "Technical Details"}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {description.details.map((detail, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-secondary)]"
                              >
                                {detail}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exports */}
                      {description.exports.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                            {analogyMode ? "What it provides" : "Exports"}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {description.exports.map((exp, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-[var(--accent-dark)]/20 text-[var(--accent)] rounded text-sm font-mono"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Code Section */}
                  <pre className="p-0 text-sm font-mono leading-relaxed">
                    <code className="text-[var(--text-primary)]">
                      {code.split("\n").map((line, i) => (
                        <div
                          key={i}
                          className="flex hover:bg-[var(--bg-tertiary)] px-6 py-0.5"
                        >
                          <span className="select-none w-16 pr-6 text-right text-[var(--text-muted)] opacity-50 flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="flex-1 whitespace-pre overflow-x-auto">{line || " "}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {analogyMode && code && (
              <div className="px-6 py-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)]">
                  💡 This is the actual code that makes this part of the app work. Each line is an instruction that tells the computer what to do.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
