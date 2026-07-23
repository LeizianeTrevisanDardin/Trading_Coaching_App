export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>

          <p className="mt-2 text-slate-400">
            Track your daily trading performance and risk.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card label="Today&apos;s P&L" value="$0.00" />
          <Card label="Trades Today" value="0" />
          <Card label="Win Rate" value="0%" />
          <Card label="Risk Used Today" value="$0.00" />
        </div>
      </div>
    </main>
  );
}

type CardProps = {
  label: string;
  value: string;
};

function Card({ label, value }: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}