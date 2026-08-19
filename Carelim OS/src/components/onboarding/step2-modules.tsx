// Carelim OS — Step 2: Module Selection
// Smart recommendations, search, category filters, toggle switches

"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Check, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOnboardingStore } from "./onboarding-store";
import { MODULES, MODULE_CATEGORIES, getRecommendedModules, getModulesByCategory, searchModules, estimateSetupTime } from "./module-data";
import { markAsSaved } from "./onboarding-store";

export function Step2Modules() {
  const {
    basicInfo,
    moduleSelection,
    setModuleSelection,
    toggleModule,
    selectAllModules,
  } = useOnboardingStore();

  const {
    selectedModuleKeys,
    searchQuery,
    activeCategory,
  } = moduleSelection;

  // Auto-save: mark as saved when modules change
  useEffect(() => {
    markAsSaved();
  }, [selectedModuleKeys]);

  // Get recommended modules based on clinic type
  const recommended = useMemo(() => {
    const rec = getRecommendedModules(basicInfo.clinicType);
    return rec;
  }, [basicInfo.clinicType]);

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    let modules = MODULES;

    if (searchQuery) {
      modules = searchModules(searchQuery);
    } else if (activeCategory !== "all") {
      modules = getModulesByCategory(activeCategory);
    }

    return modules;
  }, [searchQuery, activeCategory]);

  // Group filtered modules by category
  const groupedModules = useMemo(() => {
    const groups: Record<string, typeof MODULES> = {};
    filteredModules.forEach((mod) => {
      if (!groups[mod.category]) groups[mod.category] = [];
      groups[mod.category].push(mod);
    });
    return groups;
  }, [filteredModules]);

  const categoryLabels = {
    core: "Core Modules",
    specialty: "Specialty Modules",
    ai: "AI Modules",
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModuleSelection({ searchQuery: e.target.value });
  };

  const handleCategoryChange = (category: string) => {
    setModuleSelection({ activeCategory: category, searchQuery: "" });
  };

  const handleToggle = (moduleKey: string) => {
    toggleModule(moduleKey);
  };

  const handleSelectAll = () => {
    if (activeCategory === "all") {
      // Select all modules
      setModuleSelection({ selectedModuleKeys: MODULES.map((m) => m.key) });
    } else {
      selectAllModules(activeCategory);
    }
  };

  const handleClearAll = () => {
    setModuleSelection({ selectedModuleKeys: [] });
  };

  const handleApplyRecommendations = () => {
    setModuleSelection({ selectedModuleKeys: [...new Set([...selectedModuleKeys, ...recommended])] });
  };

  const selectedCount = selectedModuleKeys.length;
  const setupTime = estimateSetupTime(selectedCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Your Required Modules</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose only the features you need. You can enable or disable modules later.
        </p>
      </div>

      {/* Smart Recommendations */}
      {recommended.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Sparkles className="w-5 h-5" />
                Smart Recommendations
              </CardTitle>
              <CardDescription>
                Based on your clinic type ({basicInfo.clinicType}), we recommend these modules:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {recommended.map((modKey) => {
                  const mod = MODULES.find((m) => m.key === modKey);
                  return mod ? (
                    <Badge key={modKey} variant="secondary" className="text-xs">
                      {mod.name}
                    </Badge>
                  ) : null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyRecommendations}
                className="border-blue-600 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                Apply All Recommendations
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Category filters */}
          <div className="flex flex-wrap gap-1">
            {MODULE_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "text-xs",
                  activeCategory === cat.id
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                )}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Select all / Clear all */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Check className="w-4 h-4 mr-1" />
            {selectedCount} modules selected
          </Badge>
          <Badge variant="outline" className="text-sm">
            Estimated setup: {setupTime}
          </Badge>
        </div>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Ready to proceed
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Modules Grid */}
      <AnimatePresence>
        {Object.keys(groupedModules).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No modules found matching your search.</p>
          </motion.div>
        ) : (
          Object.entries(groupedModules).map(([category, mods]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-3 capitalize">
                {categoryLabels[category as keyof typeof categoryLabels] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {mods.map((mod, idx) => {
                    const isSelected = selectedModuleKeys.includes(mod.key);
                    const isRecommended = recommended.includes(mod.key);

                    return (
                      <motion.div
                        key={mod.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Card
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md",
                            isSelected
                              ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          )}
                          onClick={() => handleToggle(mod.key)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <mod.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{mod.name}</CardTitle>
                                  {isRecommended && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs mt-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300"
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => handleToggle(mod.key)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground">
                              {mod.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
