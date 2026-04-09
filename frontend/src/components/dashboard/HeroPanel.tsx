import { StatCard } from "../ui/StatCard";

type HeroPanelProps = {
  displayName: string;
  selectedAccountRsn: string | null;
  combatLevel: number | null;
  overallLevel: number | null;
  questPoints: string;
  bankValue: string;
};

export function HeroPanel({
  displayName,
  selectedAccountRsn,
  combatLevel,
  overallLevel,
  questPoints,
  bankValue,
}: HeroPanelProps) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-osrs-border/60 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(15,13,11,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
      <div className="border-b border-osrs-border/40 px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[0.66rem] uppercase tracking-[0.24em] text-osrs-gold">Live telemetry</span>
              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-osrs-text-soft">Account: {selectedAccountRsn ?? "Workspace-wide"}</span>
            </div>
            <h1 className="mt-3 max-w-4xl font-display text-[2.15rem] leading-[1.04] text-osrs-text md:text-[2.8rem] xl:text-[3rem]">
              Welcome back, {displayName}. Read the account clearly and keep the next move obvious.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-osrs-text-soft md:text-[0.96rem]">
              Live telemetry, ranked next actions, and an always-available advisor all stay in one cleaner OSRS command surface.
            </p>
          </div>
          <div className="grid min-w-[18rem] grid-cols-2 gap-4 xl:grid-cols-3">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Total level</p>
              <strong className="mt-2 block font-display text-3xl text-osrs-gold-soft">{overallLevel !== null ? overallLevel : "--"}</strong>
            </div>
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Combat lvl</p>
              <strong className="mt-2 block font-display text-3xl text-osrs-gold-soft">{combatLevel !== null ? combatLevel : "--"}</strong>
            </div>
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Context</p>
              <strong className="mt-2 block font-display text-3xl text-osrs-success">Synced</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] xl:items-start">
        <div className="space-y-3">
          <div className="rounded-[22px] border border-osrs-border/45 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Most important read</p>
                <p className="mt-2 font-display text-[1.7rem] uppercase leading-tight text-osrs-text md:text-[1.95rem]">
                  {selectedAccountRsn ? `${selectedAccountRsn} is live and ready for a sharper next move` : "Select an account to begin"}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-osrs-text-soft">
                  {selectedAccountRsn
                    ? "Use the account pulse, live telemetry, and advisor lane together so the workspace feels like one command center instead of a collection of disconnected tools."
                    : "Once an account is selected, the dashboard keeps its strongest signals and the assistant in view together."}
                </p>
              </div>
              <div className="rounded-full border border-osrs-border/40 bg-black/20 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                Always-available advisor
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[16px] border border-osrs-border/45 bg-black/20 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Live account</p>
              <p className="mt-2 font-display text-lg uppercase text-osrs-text">{selectedAccountRsn ?? "Workspace-wide"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/45 bg-black/20 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Advisor mode</p>
              <p className="mt-2 font-display text-lg uppercase text-osrs-text">Always available</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/45 bg-black/20 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Data state</p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm text-osrs-text">
                <span className="h-2.5 w-2.5 rounded-full bg-osrs-success shadow-[0_0_14px_rgba(111,161,109,0.65)]" />
                Synced context ready
              </div>
            </div>
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
