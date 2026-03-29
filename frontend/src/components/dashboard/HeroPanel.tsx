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
          <p className="text-[0.7rem] uppercase tracking-[0.26em] text-osrs-gold">Old School RuneScape AI Assistant</p>
          <div className="space-y-3">
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-osrs-text md:text-5xl">
              Welcome back, {displayName}. Let’s turn today’s account state into a sharper plan.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-osrs-text-soft md:text-base">
              Cerebro blends live OSRS account context, ranked recommendations, and structured planner logic into a premium command center inspired by the Wise Old Man’s study.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-4 py-2 text-sm text-osrs-text">
            <span className="h-2.5 w-2.5 rounded-full bg-osrs-success shadow-[0_0_14px_rgba(111,161,109,0.65)]" />
            Tracking {selectedAccountRsn ?? "your workspace"} right now
          </div>
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
    </section>
  );
}
