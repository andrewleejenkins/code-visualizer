"use client";

import { useAppStore } from "@/lib/store";

interface SearchFilterProps {
  placeholder?: string;
  resultsCount?: number;
  totalCount?: number;
}

export function SearchFilter({
  placeholder = "Search...",
  resultsCount,
  totalCount,
}: SearchFilterProps) {
  const { searchQuery, setSearchQuery } = useAppStore();

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {resultsCount !== undefined && totalCount !== undefined && (
        <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
          {resultsCount === totalCount
            ? `${totalCount} items`
            : `${resultsCount} of ${totalCount}`}
        </span>
      )}
    </div>
  );
}
