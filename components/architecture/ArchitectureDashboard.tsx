"use client";

import { useAppStore } from "@/lib/store";
import { FolderPicker } from "./FolderPicker";
import { ExplorerLayout } from "./ExplorerLayout";

export function ArchitectureDashboard() {
  const { analysis, isLoading, error, reset } = useAppStore();

  // Show folder picker if no analysis loaded
  if (!analysis) {
    return <FolderPicker />;
  }

  // Show the new explorer layout
  return <ExplorerLayout analysis={analysis} />;
}
