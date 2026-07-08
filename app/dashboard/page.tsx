export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <Card label="Today's P&L" value="$0.00" />
        <Card label="Trades Today" value="0" />
        <Card label="Win Rate" value="0%" />
        <Card label="Risk Today" value="$0.00" />
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}