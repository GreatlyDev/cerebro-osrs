import type { AccountProgress, AccountSnapshot, NextActionResponse } from "../../types";
import { SkillIcon } from "./skillIcons";

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
  const featuredTitle = topAction?.title?.toUpperCase() ?? "ACCOUNT TELEMETRY READY";
  const featuredSummary =
    topAction?.summary ??
    (selectedAccountRsn
      ? `${selectedAccountRsn} is synced. Cerebro can now read the account clearly and turn it into a cleaner next move.`
      : "Select and sync an account to unlock live telemetry, recommendations, and a grounded assistant read.");

  const featuredMeta = selectedAccountRsn
    ? `${selectedAccountRsn.toUpperCase()} // ${snapshot?.summary.overall_level ?? "--"} TOTAL // ${progress?.active_unlocks.length ?? 0} UNLOCK THREADS`
    : "WORKSPACE // TELEMETRY STANDBY";

  return (
    <section className="space-y-12">
      <div className="border border-white/8 bg-[radial-gradient(circle_at_78%_24%,rgba(212,175,55,0.08),transparent_34%),linear-gradient(180deg,#050505_0%,#090909_100%)] px-10 py-10">
        <div className="relative min-h-[29rem] overflow-hidden border border-white/8 bg-[linear-gradient(90deg,rgba(0,0,0,0.95),rgba(0,0,0,0.55)),radial-gradient(circle_at_74%_32%,rgba(212,175,55,0.1),transparent_46%)] px-10 py-10">
          <div className="flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex border border-osrs-gold/85 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-osrs-gold">
                Critical movement
              </span>
            </div>
            <div className="space-y-5">
              <h2 className="max-w-3xl font-display text-[3.4rem] font-black uppercase leading-[0.94] tracking-[0.02em] text-white md:text-[4.4rem]">
                {featuredTitle}
              </h2>
              <p className="max-w-2xl text-[0.96rem] leading-7 text-osrs-text-soft">{featuredSummary}</p>
              <p className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-osrs-gold">{featuredMeta}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-5">
          <h3 className="font-display text-[0.86rem] font-semibold uppercase tracking-[0.34em] text-white">Skill progress</h3>
          <div className="h-px flex-1 bg-white/8" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {topSkills.length > 0 ? (
            topSkills.map((skill) => (
              <div key={skill.skill} className="border border-white/8 bg-[#101010] px-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center border border-white/8 bg-[#151515] shadow-[inset_2px_2px_4px_rgba(255,255,255,0.03),inset_-2px_-2px_4px_rgba(0,0,0,0.45)]">
                    <SkillIcon skill={skill.skill} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                      <span>{skill.skill}</span>
                      <span>{skill.level}</span>
                    </div>
                    <p className="mt-1.5 font-display text-[1.65rem] font-bold tracking-[-0.04em] text-white">
                      {skill.experience.toLocaleString()} XP
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-[2px] w-full bg-white/8">
                  <div className="h-full bg-osrs-gold" style={{ width: `${skillFill(skill.level)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-white/10 bg-[#101010] px-6 py-7 text-sm leading-6 text-osrs-text-soft md:col-span-2 xl:col-span-3">
              Sync an account to unlock live skill telemetry here.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
