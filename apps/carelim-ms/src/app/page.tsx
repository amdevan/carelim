export default function CarelimMS() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold">Carelim MS</h1>
      <p className="mt-4 text-muted-foreground">
        Marketing automation, CRM, and patient acquisition platform.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">CRM</h2>
          <p className="text-sm text-muted-foreground mt-2">Manage contacts, deals, and communications</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <p className="text-sm text-muted-foreground mt-2">Email and SMS marketing campaigns</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Leads</h2>
          <p className="text-sm text-muted-foreground mt-2">Lead capture and conversion tracking</p>
        </div>
      </div>
    </main>
  );
}
