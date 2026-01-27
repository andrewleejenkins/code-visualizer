"use client";

import { create } from "zustand";
import type { AnalysisResult, TabId } from "./types";

interface AppState {
  // Analysis data
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  activeTab: TabId;
  searchQuery: string;
  expandedNodes: Set<string>;
  selectedItem: string | null;

  // Learning mode settings
  analogyMode: boolean;
  complexityLevel: number; // 1-3: beginner, intermediate, advanced
  showTooltips: boolean;
  activeStoryPath: string | null;

  // Actions
  setAnalysis: (data: AnalysisResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: TabId) => void;
  setSearchQuery: (query: string) => void;
  toggleNode: (nodeId: string) => void;
  setSelectedItem: (item: string | null) => void;
  setAnalogyMode: (enabled: boolean) => void;
  setComplexityLevel: (level: number) => void;
  setShowTooltips: (show: boolean) => void;
  setActiveStoryPath: (path: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  analysis: null,
  isLoading: false,
  error: null,
  activeTab: "explorer",
  searchQuery: "",
  expandedNodes: new Set(),
  selectedItem: null,
  analogyMode: false,
  complexityLevel: 1,
  showTooltips: true,
  activeStoryPath: null,

  setAnalysis: (data) => set({ analysis: data, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: "", selectedItem: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleNode: (nodeId) => {
    const expanded = new Set(get().expandedNodes);
    if (expanded.has(nodeId)) {
      expanded.delete(nodeId);
    } else {
      expanded.add(nodeId);
    }
    set({ expandedNodes: expanded });
  },
  setSelectedItem: (item) => set({ selectedItem: item }),
  setAnalogyMode: (enabled) => set({ analogyMode: enabled }),
  setComplexityLevel: (level) => set({ complexityLevel: Math.max(1, Math.min(3, level)) }),
  setShowTooltips: (show) => set({ showTooltips: show }),
  setActiveStoryPath: (path) => set({ activeStoryPath: path }),
  reset: () =>
    set({
      analysis: null,
      isLoading: false,
      error: null,
      activeTab: "explorer",
      searchQuery: "",
      expandedNodes: new Set(),
      selectedItem: null,
      analogyMode: false,
      complexityLevel: 1,
      showTooltips: true,
      activeStoryPath: null,
    }),
}));
