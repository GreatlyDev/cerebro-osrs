import { StatCard } from "../ui/StatCard";

type HeroPanelProps = {
  displayName: string;
  selectedAccountRsn: string | null;
  combatLevel: number | null;
  questPoints: string;
  bankValue: string;
};

export function HeroPanel({
  displayName,
  selectedAccountRsn,
  combatLevel,
  questPoints,
  bankValue,
}: HeroPanelProps) {
  return (
    <section className="cerebro-frame overflow-hidden rounded-[26px] border border-osrs-border/80 bg-[radial-gradient(circle_at_top_right,rgba(143,183,201,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(200,164,90,0.18),transparent_30%),linear-gradient(180deg,rgba(40,31,22,0.97),rgba(19,15,12,0.99))] px-6 py-7 shadow-osrs shadow-insetPanel">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)] xl:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-osrs-border-light/50 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-osrs-gold-soft">
              Old School RuneScape AI Assistant
            </span>
            <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/60 px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-osrs-text-soft">
              Live planner
            </span>
          </div>
          <div className="space-y-3">
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-osrs-text md:text-5xl">
              Welcome back, {displayName}. Let&apos;s turn today&apos;s account state into a sharper next move.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-osrs-text-soft md:text-base">
              Cerebro blends live OSRS account telemetry, ranked recommendations, and an always-available assistant into a premium command center inspired by the Wise Old Man&apos;s study.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/50 px-4 py-3 shadow-insetPanel">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Live account</p>
              <p className="mt-2 font-display text-lg text-osrs-text">{selectedAccountRsn ?? "Workspace-wide"}</p>
            </div>
            <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/50 px-4 py-3 shadow-insetPanel">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Assistant mode</p>
              <p className="mt-2 font-display text-lg text-osrs-text">Always available</p>
            </div>
            <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/50 px-4 py-3 shadow-insetPanel">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Data state</p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm text-osrs-text">
                <span className="h-2.5 w-2.5 rounded-full bg-osrs-success shadow-[0_0_14px_rgba(111,161,109,0.65)]" />
                Synced context ready
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[22px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(35,28,22,0.74),rgba(18,14,12,0.92))] p-4 shadow-insetPanel">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Account readout</p>
            <p className="mt-1 text-sm text-osrs-text-soft">Keep the account pulse visible while you move through the planner.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <StatCard
              hint={selectedAccountRsn ? `Live from ${selectedAccountRsn}` : "Sync an account to enrich this"}
              label="Combat Level"
              value={combatLevel !== null ? String(combatLevel) : "Unknown"}
            />
            <StatCard
              hint="Uses tracked quest progress until true journal sync exists"
              label="Quest Points"
              value={questPoints}
            />
            <StatCard
              hint="Bank sync is not integrated yet, so this stays transparent"
              label="Bank Value"
              value={bankValue}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
