"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  size: number;
  setSize: (s: number) => void;
  range: string;
}

export function Pagination({ page, totalPages, setPage, size, setSize, range }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-2 py-2 text-xs text-muted-foreground">
        <span>{range}</span>
        {totalPages === 1 && (
          <span>Page 1 of 1</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-2 border-t">
      <span className="text-xs text-muted-foreground">{range}</span>
      <div className="flex items-center gap-1.5">
        <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
          <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((s) => <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(1)}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs px-2 font-medium">Page {page} of {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
