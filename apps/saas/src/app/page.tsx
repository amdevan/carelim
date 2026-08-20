export default function SaaSAdmin() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold">Carelim SaaS Admin</h1>
      <p className="mt-4 text-muted-foreground">
        Tenant management, subscriptions, and marketplace administration.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Tenants</h2>
          <p className="text-sm text-muted-foreground mt-2">Manage healthcare organizations</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Plans & Billing</h2>
          <p className="text-sm text-muted-foreground mt-2">Subscription plans and invoicing</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Marketplace</h2>
          <p className="text-sm text-muted-foreground mt-2">Module add-ons management</p>
        </div>
      </div>
    </main>
  );
}
