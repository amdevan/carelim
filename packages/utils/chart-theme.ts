"use client";

// Centralized chart styling constants for consistent light/dark mode
// These use CSS variables that adapt to the theme

export const CHART_COLORS = {
  teal: "#0d9488",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  violet: "#8b5cf6",
  red: "#dc2626",
  gray: "#94a3b8",
};

export const CHART_GRADIENTS = {
  teal: [
    { offset: "5%", color: "#0d9488", opacity: 0.35 },
    { offset: "95%", color: "#0d9488", opacity: 0 },
  ],
  emerald: [
    { offset: "5%", color: "#10b981", opacity: 0.35 },
    { offset: "95%", color: "#10b981", opacity: 0 },
  ],
  amber: [
    { offset: "5%", color: "#f59e0b", opacity: 0.35 },
    { offset: "95%", color: "#f59e0b", opacity: 0 },
  ],
};

// Use currentColor approach for axis text so it adapts to theme
export const CHART_AXIS_STYLE = {
  tick: { fontSize: 12 },
  stroke: "currentColor",
  className: "fill-muted-foreground",
};

export const CHART_GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "currentColor",
  opacity: 0.15,
  className: "stroke-border",
};
