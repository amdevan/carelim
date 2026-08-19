"use client";

import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  headers: { label: string; className?: string; sortKey?: string }[];
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ headers, children, className }: DataTableProps) {
  return (
    <div className={cn("rounded-xl border border-border/60 overflow-hidden bg-card", className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              {headers.map((h, i) => (
                <TableHead
                  key={i}
                  className={cn(
                    "h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80",
                    h.className
                  )}
                >
                  {h.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
    </div>
  );
}

export function DataRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "table-row-hover border-b border-border/40 transition-colors cursor-default",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </TableRow>
  );
}

export { TableCell };
