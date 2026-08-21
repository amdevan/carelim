export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

export const formatRs = (n: number) => `Rs. ${formatCurrency(n)}`;

export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const timeAgo = (d: Date | string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
};

export const statusColors: Record<string, string> = {
  scheduled: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  "checked-in": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "in-consult": "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  "no-show": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  collected: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  processing: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  unpaid: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  refunded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "on_leave": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "out-of-stock": "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

export const statusLabel = (s: string) =>
  s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
