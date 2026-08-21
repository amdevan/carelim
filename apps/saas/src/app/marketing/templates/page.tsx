"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Search, Plus, FileText } from "lucide-react";

export default function TemplatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms-templates")
      .then((res) => res.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Email and SMS message templates
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add New
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No templates yet</p>
              <p className="text-sm mt-1">
                Create your first template to streamline messaging
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {item.name || item.title || "Template"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.description || item.status || ""}
                    </p>
                  </div>
                  <Badge variant="secondary">{item.status || "active"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
