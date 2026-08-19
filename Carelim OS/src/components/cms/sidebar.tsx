"use client";

import Image from "next/image";
import { useAppStore, navItems, navGroups } from "@/store/app-store";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const { view, setView, sidebarCollapsed, toggleSidebar, favorites, toggleFavorite, enabledModules } = useAppStore();

  // Filter nav items based on enabled modules (empty = show all, always include core)
  const CORE_KEYS = ["dashboard", "settings", "audit"];
  const filteredNavItems = enabledModules.length > 0
    ? navItems.filter((i) => CORE_KEYS.includes(i.key) || enabledModules.includes(i.key))
    : navItems;
  const filteredGroups = navGroups.filter((g) => filteredNavItems.some((i) => i.group === g));
  const favItems = filteredNavItems.filter((i) => favorites.includes(i.key));

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 76 : 264 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
    >
      {/* Brand */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20">
        <Image src="/images/carelim-os.png" alt="Carelim OS" width={160} height={40} className="h-9 w-auto object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
        {/* Favorites section */}
        {favItems.length > 0 && (
          <div className="mb-3">
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 flex items-center gap-1"
                >
                  <Star className="w-2.5 h-2.5 fill-current" /> Favorites
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {favItems.map((item) => {
                const active = view === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={`fav-${item.key}`}
                    onClick={() => setView(item.key)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
                        : "text-sidebar-foreground/75 hover:bg-amber-50 dark:hover:bg-amber-950/20",
                      sidebarCollapsed && "justify-center"
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          className="flex-1 text-left truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!sidebarCollapsed && (
                      <Star
                        className="w-3 h-3 text-amber-400 fill-current shrink-0"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.key); }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredGroups.map((group) => {
          const items = filteredNavItems.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-3">
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                  >
                    {group}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = view === item.key;
                  const Icon = item.icon;
                  const isFav = favorites.includes(item.key);
                  return (
                    <div key={item.key} className="relative group/nav-item">
                      <button
                        onClick={() => setView(item.key)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md shadow-teal-600/20"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          sidebarCollapsed && "justify-center"
                        )}
                      >
                        {active && !sidebarCollapsed && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white shadow-sm"
                          />
                        )}
                        <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform", active && "scale-110")} />
                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              className="flex-1 text-left truncate"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {item.badge && !sidebarCollapsed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                            {item.badge}
                          </span>
                        )}
                      </button>
                      {/* Star toggle - appears on hover */}
                      {!sidebarCollapsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.key); }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center transition-all",
                            isFav
                              ? "opacity-100 text-amber-400"
                              : "opacity-0 group-hover/nav-item:opacity-100 text-muted-foreground hover:text-amber-400"
                          )}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star className={cn("w-3 h-3", isFav && "fill-current")} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2.5">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center gap-2 w-full rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")}
          />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Status pill */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {!sidebarCollapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">System Online</span>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60">All services healthy</span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
