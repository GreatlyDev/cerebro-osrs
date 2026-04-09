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
  return Math.max(6, Math.min(100, Math.round((level / 99) * 100)));
}

export function TelemetryBoard({
  selectedAccountRsn,
  snapshot,
  progress,
  nextActions,
}: TelemetryBoardProps) {
  const topAction = nextActions?.top_action ?? null;
  const topSkills = snapshot?.summary.top_skills?.slice(0, 6) ?? [];
  const profile = snapshot?.summary.progression_profile;
  const completedQuests = progress?.completed_quests.length ?? 0;
  const trackedUnlocks = progress?.active_unlocks.length ?? 0;

  const spotlightTitle = topAction?.title ?? (selectedAccountRsn ? `${selectedAccountRsn} telemetry synced` : "Workspace telemetry");
  const spotlightSummary =
    topAction?.summary ??
    (selectedAccountRsn
      ? "Live account context is available. Use this board to keep the account's strongest signals in view while Cerebro guides the next move."
      : "Select and sync an account to unlock the full telemetry board.");

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
        <div className="relative overflow-hidden rounded-[28px] border border-osrs-border/70 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_24%),linear-gradient(135deg,rgba(19,19,19,0.98),rgba(24,20,17,0.98)_62%,rgba(48,40,30,0.86))] p-7 shadow-osrs">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-osrs-border-light/80 bg-osrs-gold/10 px-3 py-1 text-[0.64rem] uppercase tracking-[0.2em] text-osrs-gold-soft">
                Critical movement
              </span>
              <span className="text-[0.66rem] uppercase tracking-[0.22em] text-osrs-text-soft">
                {selectedAccountRsn ? `Live telemetry // ${selectedAccountRsn}` : "Live telemetry"}
              </span>
            </div>
            <div className="space-y-3">
              <h2 className="max-w-4xl font-display text-[2rem] font-semibold uppercase leading-tight text-osrs-text md:text-[3.2rem]">
                {spotlightTitle}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-osrs-text-soft md:text-base">
                {spotlightSummary}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[18px] border border-osrs-border/60 bg-black/20 px-4 py-3.5">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Highest skill</p>
                <p className="mt-2 font-display text-xl text-osrs-text">
                  {profile?.highest_skill ?? topSkills[0]?.skill ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-[18px] border border-osrs-border/60 bg-black/20 px-4 py-3.5">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Quest completions</p>
                <p className="mt-2 font-display text-xl text-osrs-text">{completedQuests}</p>
              </div>
              <div className="rounded-[18px] border border-osrs-border/60 bg-black/20 px-4 py-3.5">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Live unlock threads</p>
                <p className="mt-2 font-display text-xl text-osrs-text">{trackedUnlocks}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(26,22,18,0.96))] p-5 shadow-osrs">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.22em] text-osrs-gold">Live telemetry</p>
            <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
              Keep the account's cleanest signals visible while you move through Cerebro.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-[18px] border border-osrs-border/70 bg-white/[0.02] px-4 py-4">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Combat level</p>
              <p className="mt-2 font-display text-3xl text-osrs-text">{snapshot?.summary.combat_level ?? "Unknown"}</p>
            </div>
            <div className="rounded-[18px] border border-osrs-border/70 bg-white/[0.02] px-4 py-4">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">Total level</p>
              <p className="mt-2 font-display text-3xl text-osrs-text">{snapshot?.summary.overall_level ?? "Unknown"}</p>
            </div>
            <div className="rounded-[18px] border border-osrs-border/70 bg-white/[0.02] px-4 py-4">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">90+ skills</p>
              <p className="mt-2 font-display text-3xl text-osrs-text">
                {profile?.total_skills_at_90_plus ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-5">
          <h3 className="font-display text-sm uppercase tracking-[0.34em] text-osrs-text">Active skill tracking</h3>
          <div className="h-px flex-1 bg-osrs-border/70" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {topSkills.length > 0 ? (
            topSkills.map((skill) => (
              <div
                className="group flex items-center gap-4 rounded-[20px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(20,20,20,0.98),rgba(24,21,18,0.98))] px-4 py-4 transition-all duration-200 hover:border-osrs-border-light/80 hover:translate-y-[-2px]"
                key={skill.skill}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.45))] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.25)]">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-osrs-gold">
                    {skill.skill.slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-[0.66rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                    <span>{skill.skill}</span>
                    <span>{skill.level}</span>
                  </div>
                  <p className="mt-1 font-display text-lg text-osrs-text">{skill.experience.toLocaleString()} XP</p>
                  <div className="mt-3 h-[2px] w-full bg-osrs-border/40">
                    <div className="h-full bg-osrs-gold transition-all duration-300" style={{ width: `${skillFill(skill.level)}%` }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-osrs-border/70 bg-black/10 px-5 py-6 text-sm text-osrs-text-soft lg:col-span-2 2xl:col-span-3">
              Sync an account to unlock the live skill telemetry board.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
