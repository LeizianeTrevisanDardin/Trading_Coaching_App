export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl">
        <Setting label="Default Contract" value="STOCK" />
        <Setting label="Default Risk" value="1%" />
        <Setting label="Default Reward" value="1:2" />
      </div>
    </main>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between bg-slate-800 rounded-lg p-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}