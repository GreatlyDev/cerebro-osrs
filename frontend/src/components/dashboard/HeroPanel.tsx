type HeroPanelProps = {
  selectedAccountRsn: string | null;
  combatLevel: number | null;
  overallLevel: number | null;
  questPoints: string;
  bankValue: string;
};

export function HeroPanel({
  selectedAccountRsn,
  combatLevel,
  overallLevel,
  questPoints,
  bankValue,
}: HeroPanelProps) {
  return (
    <section className="border-b border-white/8 pb-7">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-end">
        <div className="min-w-0 space-y-6">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
            Protocol v4.02 // Account status
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-[3.8rem] font-black uppercase tracking-[0.14em] text-white md:text-[4.8rem] xl:text-[5.5rem]">
              Cerebro
            </h1>
            <p className="max-w-3xl text-[0.98rem] leading-7 text-osrs-text-soft">
              A telemetry-first workspace for reading account state clearly, interrogating recommendations, and keeping a live OSRS assistant within reach.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-white/8 bg-[#101010] px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-osrs-text-soft">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              {selectedAccountRsn ? "Live telemetry" : "Workspace-wide mode"}
            </span>
            <span className="inline-flex border border-white/8 bg-[#101010] px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-osrs-text-soft">
              {selectedAccountRsn ? `Account: ${selectedAccountRsn}` : "No active RSN"}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard accent label="Combat level" value={combatLevel !== null ? `${combatLevel}.0` : "--"} />
          <MetricCard label="Total level" value={overallLevel !== null ? String(overallLevel) : "--"} />
          <MetricCard label="Quest points" value={questPoints} />
          <MetricCard label="Bank state" value={bankValue} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-white/8 bg-[#101010] px-4 py-4">
      <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-osrs-text-soft">{label}</p>
      <strong
        className={`mt-2 block font-display text-[1.55rem] font-bold uppercase tracking-[-0.04em] ${
          accent ? "text-white" : "text-osrs-gold-soft"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}
