// Carelim OS — Step Indicator Component
// Progress bar showing 25%, 50%, 75%, 100% completion

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  maxStep: number;
  onStepClick?: (step: number) => void;
}

const stepLabels = [
  { label: "Basic Information", description: "Organization & admin details" },
  { label: "Select Modules", description: "Choose your features" },
  { label: "Choose Plan", description: "Subscription & payment" },
  { label: "Success", description: "Welcome to Carelim OS" },
];

export function StepIndicator({ currentStep, maxStep, onStepClick }: StepIndicatorProps) {
  const progress = ((currentStep - 1) / (maxStep - 1)) * 100;

  return (
    <div className="w-full mb-8">
      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="absolute top-5 left-0 right-0 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        <div className="flex justify-between relative">
          {Array.from({ length: maxStep }).map((_, index) => {
            const step = index + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            const isClickable = step <= currentStep && !!onStepClick;

            return (
              <button
                key={step}
                type="button"
                onClick={() => isClickable && onStepClick?.(step)}
                disabled={!isClickable}
                className={cn(
                  "relative flex flex-col items-center transition-all duration-200",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isActive
                      ? "bg-white border-blue-600 text-blue-600 dark:bg-gray-900"
                      : "bg-muted border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    <span className="text-sm font-semibold">{step}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-blue-600" : isCompleted ? "text-blue-600" : "text-muted-foreground"
                    )}
                  >
                    {stepLabels[index]?.label || `Step ${step}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate">
                    {stepLabels[index]?.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress percentage */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <motion.span
          key={currentStep}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-medium text-blue-600"
        >
          {Math.round(progress)}%
        </motion.span>
        <span>100%</span>
      </div>
    </div>
  );
}
