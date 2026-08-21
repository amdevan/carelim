"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Search } from "lucide-react";

interface Lead {
  id: string;
  leadNo: string;
  patientName: string;
  phone: string;
  email: string | null;
  source: string;
  interest: string | null;
  status: string;
  assignedTo: string | null;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cms-leads")
      .then((res) => res.json())
      .then((d) => {
        setLeads(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = leads.filter(
    (l) =>
      l.patientName.toLowerCase().includes(search.toLowerCase()) ||
      l.leadNo.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    new: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    contacted: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    interested: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    appointment_booked: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    treatment_started: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    completed: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    lost: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage marketing leads
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            All Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Lead #</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Phone</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Source</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Assigned To</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((lead) => (
                      <tr key={lead.id} className="border-b border-border table-row-hover">
                        <td className="py-3 px-3 font-mono text-xs">{lead.leadNo}</td>
                        <td className="py-3 px-3 font-medium">{lead.patientName}</td>
                        <td className="py-3 px-3 text-muted-foreground">{lead.phone}</td>
                        <td className="py-3 px-3 capitalize text-muted-foreground">{lead.source}</td>
                        <td className="py-3 px-3">
                          <Badge className={statusColor[lead.status] || ""}>
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{lead.assignedTo || "—"}</td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
