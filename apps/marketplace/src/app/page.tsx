export default function Marketplace() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold">Carelim Marketplace</h1>
      <p className="mt-4 text-muted-foreground">
        Browse and install healthcare modules for your Carelim instance.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Dental Module</h2>
          <p className="text-sm text-muted-foreground mt-2">Complete dental practice management</p>
          <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Available</span>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">IVF Module</h2>
          <p className="text-sm text-muted-foreground mt-2">Fertility and IVF cycle management</p>
          <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Available</span>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Telemedicine</h2>
          <p className="text-sm text-muted-foreground mt-2">Video consultations and remote care</p>
          <span className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Coming Soon</span>
        </div>
      </div>
    </main>
  );
}
