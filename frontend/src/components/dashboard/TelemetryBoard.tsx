import type { AccountProgress, AccountSnapshot, NextActionResponse } from "../../types";

type TelemetryBoardProps = {
  selectedAccountRsn: string | null;
  snapshot: AccountSnapshot | null;
  progress: AccountProgress | null;
  nextActions: NextActionResponse | null;
};

function skillFill(level: number) {
  if (level >= 99) {
    return 100;
  }
  return Math.max(8, Math.min(100, Math.round((level / 99) * 100)));
}

export function TelemetryBoard({
  selectedAccountRsn,
  snapshot,
  progress,
  nextActions,
}: TelemetryBoardProps) {
  const topAction = nextActions?.top_action ?? null;
  const topSkills = snapshot?.summary.top_skills?.slice(0, 4) ?? [];
  const trackedUnlocks = progress?.active_unlocks.length ?? 0;

  const featuredTitle = topAction?.title?.toUpperCase() ?? (selectedAccountRsn ? `${selectedAccountRsn.toUpperCase()} ACCOUNT LIVE` : "ACCOUNT TELEMETRY READY");
  const featuredSummary =
    topAction?.summary ??
    (selectedAccountRsn
      ? "Live account telemetry is available. Use the board below to keep the clearest opportunities in view."
      : "Select and sync an account to turn this board into a live telemetry surface.");

  return (
    <section className="space-y-10">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative min-h-[31rem] overflow-hidden border border-osrs-border/35 bg-[radial-gradient(circle_at_78%_28%,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,rgba(8,8,8,1),rgba(12,12,12,0.98))] px-8 py-8">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82),rgba(0,0,0,0.35))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex border border-osrs-gold/85 px-3 py-1 text-[0.66rem] uppercase tracking-[0.24em] text-osrs-gold">
                Critical achievement
              </span>
            </div>
            <div className="max-w-3xl space-y-5">
              <h2 className="font-sans text-[3.2rem] font-black uppercase leading-[0.96] tracking-[-0.04em] text-white md:text-[4.2rem]">
                {featuredTitle}
              </h2>
              <p className="max-w-2xl text-[0.95rem] leading-7 text-osrs-text-soft">{featuredSummary}</p>
              <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.8rem] uppercase tracking-[0.08em] text-osrs-gold">
                <span>{selectedAccountRsn ?? "workspace-wide"}</span>
                <span>{trackedUnlocks} unlock threads tracked</span>
                <span>{topSkills.length} live skill surfaces</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-osrs-border/35 bg-[#121212] p-4">
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-osrs-gold">Cerebro intelligence</p>
            <div className="mt-4 space-y-4">
              <div className="border-b border-osrs-border/25 pb-4">
                <p className="text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">System</p>
                <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                  {selectedAccountRsn
                    ? `${selectedAccountRsn} is synced. Cerebro can already read stats, blockers, unlocks, and what the account actually needs next.`
                    : "Select an account to ground Cerebro in live telemetry."}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Readout</p>
                <div className="flex items-center justify-between gap-4 text-sm text-osrs-text-soft">
                  <span>Combat level</span>
                  <strong className="font-sans text-[1.8rem] font-bold tracking-[-0.04em] text-white">
                    {snapshot?.summary.combat_level ?? "--"}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-osrs-text-soft">
                  <span>Total level</span>
                  <strong className="font-sans text-[1.8rem] font-bold tracking-[-0.04em] text-white">
                    {snapshot?.summary.overall_level ?? "--"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[0.64rem] uppercase tracking-[0.28em] text-osrs-text">Strategic recommendations</p>
            {(nextActions?.actions ?? []).slice(0, 3).map((action) => (
              <div key={`${action.action_type}-${action.title}`} className="border border-osrs-border/35 bg-[#121212] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-11 w-11 shrink-0 border border-osrs-border/25 bg-black/50" />
                  <div className="min-w-0">
                    <p className="font-sans text-[1rem] font-bold uppercase leading-tight text-white">{action.title}</p>
                    <p className="mt-1 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-5">
          <h3 className="font-sans text-[0.86rem] font-semibold uppercase tracking-[0.34em] text-white">Skill progress</h3>
          <div className="h-px flex-1 bg-osrs-border/35" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topSkills.length > 0 ? (
            topSkills.map((skill) => (
              <div key={skill.skill} className="border border-osrs-border/35 bg-[#121212] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center border border-osrs-border/30 bg-[#161616] shadow-[inset_2px_2px_4px_rgba(255,255,255,0.03),inset_-2px_-2px_4px_rgba(0,0,0,0.45)]">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">
                      {skill.skill.slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 text-[0.64rem] uppercase tracking-[0.2em] text-osrs-text-soft">
                      <span>{skill.skill}</span>
                      <span>{skill.level}</span>
                    </div>
                    <p className="mt-2 font-sans text-[1.1rem] font-bold tracking-[-0.03em] text-white">
                      {skill.experience.toLocaleString()} XP
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-[2px] w-full bg-osrs-border/30">
                  <div className="h-full bg-osrs-gold" style={{ width: `${skillFill(skill.level)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-osrs-border/35 bg-[#111111] px-5 py-6 text-sm leading-6 text-osrs-text-soft md:col-span-2 xl:col-span-4">
              Sync an account to unlock the live skill telemetry board.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
