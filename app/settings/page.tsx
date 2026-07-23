export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Settings</h1>

          <p className="mt-2 text-slate-400">
            Manage your default trading preferences.
          </p>
        </div>

        <div className="max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <Setting label="Default Contract" value="STOCK" />
          <Setting label="Default Risk" value="1%" />
          <Setting label="Default Risk-to-Reward" value="1:2" />
        </div>
      </div>
    </main>
  );
}

type SettingProps = {
  label: string;
  value: string;
};

function Setting({ label, value }: SettingProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800 p-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}