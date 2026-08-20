"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@carelim/ui";
import {
  Package,
  Stethoscope,
  Activity,
  Building,
  Calculator,
  Settings,
  Star,
  Download,
} from "lucide-react";

interface Module {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  installCount: number;
  category: string;
  icon: string;
}

const CATEGORIES = ["All", "Clinical", "Diagnostics", "Operations", "Finance", "Admin"];

const CATEGORY_ICONS: Record<string, typeof Stethoscope> = {
  Clinical: Stethoscope,
  Diagnostics: Activity,
  Operations: Building,
  Finance: Calculator,
  Admin: Settings,
};

const CATEGORY_COLORS: Record<string, string> = {
  Clinical: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  Diagnostics: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  Operations: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Finance: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  Admin: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetch("/api/marketplace-modules")
      .then((res) => res.json())
      .then((data) => {
        setModules(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = activeCategory === "All"
    ? modules
    : modules.filter((m) => m.category === activeCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Modules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse and manage available marketplace modules
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white" : ""}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Module Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No modules found in this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mod) => {
            const CategoryIcon = CATEGORY_ICONS[mod.category] || Package;
            return (
              <Card key={mod.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${CATEGORY_COLORS[mod.category] || "bg-teal-50 text-teal-700"}`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {mod.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{mod.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{mod.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {mod.rating}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Download className="w-3.5 h-3.5" />
                        {mod.installCount}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {mod.price === 0 ? "Free" : `$${mod.price}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
