import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();

  const [items, locations, stocks, movements, transfers, audits, batches] = await Promise.all([
    db.inventoryItem.findMany({ include: { stocks: { include: { location: true } }, batches: true } }),
    db.inventoryLocation.findMany({ include: { _count: { select: { stocks: true } } } }),
    db.inventoryStock.findMany({ include: { item: true, location: true } }),
    db.inventoryMovement.findMany({ include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.stockTransfer.findMany({ include: { fromLocation: true, toLocation: true, items: { include: { item: true } } } }),
    db.stockAudit.findMany({ include: { location: true, items: true } }),
    db.inventoryBatch.findMany(),
  ]);

  const totalInventoryValue = items.reduce((s, i) => s + (i.purchasePrice * i.stocks.reduce((ss, st) => ss + st.quantity, 0)), 0);
  const totalItems = items.length;
  const availableStock = stocks.reduce((s, st) => s + st.quantity, 0);
  const reservedStock = stocks.reduce((s, st) => s + st.reservedQty, 0);
  const damagedStock = stocks.reduce((s, st) => s + st.damagedQty, 0);
  const expiredStock = items.reduce((s, i) => s + i.batches.filter(b => b.expiryDate && b.expiryDate < today).reduce((ss, b) => ss + b.quantity, 0), 0);
  const nearExpiry = items.reduce((s, i) => s + i.batches.filter(b => {
    if (!b.expiryDate) return false;
    const days = Math.floor((b.expiryDate.getTime() - today.getTime()) / 86400000);
    return days <= 30 && days >= 0;
  }).reduce((ss, b) => ss + b.quantity, 0), 0);
  const lowStockItems = items.filter(i => {
    const totalQty = i.stocks.reduce((s, st) => s + st.quantity, 0);
    return totalQty <= i.reorderLevel && totalQty > 0;
  });
  const pendingPOs = await db.purchaseOrder.count({ where: { status: { in: ["draft", "sent", "pending"] } } });
  const pendingTransfers = transfers.filter(t => t.status === "pending" || t.status === "approved").length;

  // Stock value by category
  const categoryValue: Record<string, number> = {};
  items.forEach(i => {
    const qty = i.stocks.reduce((s, st) => s + st.quantity, 0);
    categoryValue[i.category] = (categoryValue[i.category] || 0) + (i.purchasePrice * qty);
  });
  const stockByCategory = Object.entries(categoryValue).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Stock movement trend (last 7 days)
  const movementTrend: { date: string; in: number; out: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayMoves = await db.inventoryMovement.findMany({ where: { createdAt: { gte: ds, lt: de } } });
    movementTrend.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      in: dayMoves.filter(m => m.direction === "in").reduce((s, m) => s + m.quantity, 0),
      out: dayMoves.filter(m => m.direction === "out").reduce((s, m) => s + m.quantity, 0),
    });
  }

  // Fast/slow/dead stock (based on movements)
  const itemMoveCounts: Record<string, number> = {};
  movements.forEach(m => { itemMoveCounts[m.itemId] = (itemMoveCounts[m.itemId] || 0) + m.quantity; });
  const fastMoving = Object.entries(itemMoveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => {
    const item = items.find(i => i.id === id);
    return { name: item?.name || "Unknown", qty };
  });
  const slowMoving = items.filter(i => !itemMoveCounts[i.id]).slice(0, 5).map(i => ({ name: i.name, qty: 0 }));
  const deadStock = items.filter(i => {
    const age = Math.floor((today.getTime() - i.createdAt.getTime()) / 86400000);
    return age > 90 && !itemMoveCounts[i.id];
  }).slice(0, 5).map(i => ({ name: i.name, days: Math.floor((today.getTime() - i.createdAt.getTime()) / 86400000) }));

  // Expiry buckets
  const expiryBuckets = { expired: 0, days30: 0, days60: 0, days90: 0 };
  batches.forEach(b => {
    if (!b.expiryDate) return;
    const days = Math.floor((b.expiryDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) expiryBuckets.expired++;
    else if (days <= 30) expiryBuckets.days30++;
    else if (days <= 60) expiryBuckets.days60++;
    else if (days <= 90) expiryBuckets.days90++;
  });

  // Location-wise stock summary
  const locationSummary = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    code: loc.code,
    type: loc.type,
    itemCount: loc._count.stocks,
    stockValue: stocks.filter(s => s.locationId === loc.id).reduce((sum, s) => sum + (s.item.purchasePrice * s.quantity), 0),
  }));

  return NextResponse.json({
    kpis: {
      totalInventoryValue,
      totalItems,
      availableStock,
      reservedStock,
      damagedStock,
      expiredStock,
      nearExpiry,
      lowStockCount: lowStockItems.length,
      pendingPOs,
      pendingTransfers,
    },
    stockByCategory,
    movementTrend,
    fastMoving,
    slowMoving,
    deadStock,
    expiryBuckets,
    lowStockItems: lowStockItems.map(i => ({ id: i.id, name: i.name, stockQty: i.stocks.reduce((s, st) => s + st.quantity, 0), reorderLevel: i.reorderLevel, category: i.category })),
    locationSummary,
    recentMovements: movements.slice(0, 8).map(m => ({ id: m.id, itemName: m.item.name, type: m.type, direction: m.direction, quantity: m.quantity, department: m.department, performedBy: m.performedBy, createdAt: m.createdAt })),
    pendingTransfersList: transfers.filter(t => t.status === "pending" || t.status === "approved").slice(0, 5).map(t => ({ transferNo: t.transferNo, from: t.fromLocation.name, to: t.toLocation.name, status: t.status, items: t.items.length })),
  });
}
