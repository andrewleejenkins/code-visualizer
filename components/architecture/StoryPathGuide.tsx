"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getStoryPath, type StoryPath, type StoryStep } from "@/lib/learning";
import type { TabId } from "@/lib/types";

export function StoryPathGuide() {
  const {
    activeStoryPath,
    setActiveStoryPath,
    setActiveTab,
    analogyMode,
  } = useAppStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const storyPath = activeStoryPath ? getStoryPath(activeStoryPath) : null;

  // Reset step index when story path changes
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [activeStoryPath]);

  if (!storyPath) return null;

  const currentStep = storyPath.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === storyPath.steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      const nextStep = storyPath.steps[currentStepIndex + 1];
      setCurrentStepIndex(currentStepIndex + 1);
      // Navigate to the target tab
      if (nextStep.target.tab) {
        setActiveTab(nextStep.target.tab as TabId);
      }
    } else {
      // Complete the tour
      setActiveStoryPath(null);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      const prevStep = storyPath.steps[currentStepIndex - 1];
      setCurrentStepIndex(currentStepIndex - 1);
      // Navigate to the target tab
      if (prevStep.target.tab) {
        setActiveTab(prevStep.target.tab as TabId);
      }
    }
  };

  const handleClose = () => {
    setActiveStoryPath(null);
  };

  // Navigate to current step's tab on mount
  useEffect(() => {
    if (currentStep.target.tab) {
      setActiveTab(currentStep.target.tab as TabId);
    }
  }, [currentStep, setActiveTab]);

  return (
    <div className="bg-gradient-to-r from-[var(--accent-purple)]/10 via-[var(--accent-blue)]/10 to-[var(--accent-pink)]/10 border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{storyPath.icon}</span>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">{storyPath.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Step {currentStepIndex + 1} of {storyPath.steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            aria-label="Close tour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-4">
          {storyPath.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentStepIndex(index);
                const step = storyPath.steps[index];
                if (step.target.tab) {
                  setActiveTab(step.target.tab as TabId);
                }
              }}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= currentStepIndex
                  ? "bg-[var(--accent-purple)]"
                  : "bg-[var(--bg-tertiary)]"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Current Step Content */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
          <div className="flex items-start gap-4">
            {/* Step Number Circle */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-purple)] text-white flex items-center justify-center font-bold">
              {currentStepIndex + 1}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[var(--text-primary)] mb-1">
                {currentStep.title}
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {currentStep.description}
              </p>

              {/* Explanation Box */}
              <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {currentStep.explanation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isFirstStep
                ? "text-[var(--text-muted)] cursor-not-allowed"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-2">
            {storyPath.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIndex(index);
                  if (step.target.tab) {
                    setActiveTab(step.target.tab as TabId);
                  }
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStepIndex
                    ? "bg-[var(--accent-purple)]"
                    : "bg-[var(--text-muted)]"
                }`}
                aria-label={`Go to step ${index + 1}: ${step.title}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg hover:opacity-90 transition-colors"
          >
            {isLastStep ? (
              <>
                Complete
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
