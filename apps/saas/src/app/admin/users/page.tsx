"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carelim/ui";
import { Search, Users, Plus, ShieldCheck, MoreVertical } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin-users")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setUsers(d))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Admin Users</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {users.length} users</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">User</TableHead>
                  <TableHead className="text-[11px] uppercase">Role</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Last Login</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="table-row-hover cursor-pointer">
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${u.role === "super_admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300" : u.role === "admin" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                        {u.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
