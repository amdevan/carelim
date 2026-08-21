"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Contact, Plus, Search } from "lucide-react";

interface CRMContact {
  id: string;
  contactNo: string;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  type: string;
  score: number;
  status: string;
  lastContactAt: string | null;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/crm-contacts")
      .then((res) => res.json())
      .then((d) => {
        setContacts(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactNo.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    inactive: "bg-gray-50 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300",
    blocked: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            CRM contact management
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Contact className="w-4 h-4 text-teal-600" />
            All Contacts
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
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Contact #</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Email</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Phone</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Type</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Score</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Last Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No contacts found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((contact) => (
                      <tr key={contact.id} className="border-b border-border table-row-hover">
                        <td className="py-3 px-3 font-mono text-xs">{contact.contactNo}</td>
                        <td className="py-3 px-3 font-medium">{contact.name}</td>
                        <td className="py-3 px-3 text-muted-foreground">{contact.email || "—"}</td>
                        <td className="py-3 px-3 text-muted-foreground">{contact.phone}</td>
                        <td className="py-3 px-3 capitalize text-muted-foreground">{contact.type}</td>
                        <td className="py-3 px-3">
                          <Badge className={statusColor[contact.status] || ""}>
                            {contact.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">{contact.score}</td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {contact.lastContactAt
                            ? new Date(contact.lastContactAt).toLocaleDateString()
                            : "—"}
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
