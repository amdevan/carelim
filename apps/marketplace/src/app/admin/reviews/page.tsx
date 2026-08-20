"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage and monitor module reviews
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Total Reviews", value: "0", icon: MessageSquare },
          { title: "Average Rating", value: "—", icon: Star },
          { title: "Pending Review", value: "0", icon: Star },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
