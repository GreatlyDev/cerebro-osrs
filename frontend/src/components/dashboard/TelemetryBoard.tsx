import type { AccountProgress, AccountSnapshot, NextActionResponse } from "../../types";
import { RecommendationThumb } from "./RecommendationThumb";
import { SkillIcon } from "./skillIcons";

type TelemetryBoardProps = {
  busyAction: string | null;
  newAccountRsn: string;
  onChangeNewAccountRsn: (value: string) => void;
  onQuickstartAccount: () => void;
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
  busyAction,
  newAccountRsn,
  onChangeNewAccountRsn,
  onQuickstartAccount,
  selectedAccountRsn,
  snapshot,
  progress,
  nextActions,
}: TelemetryBoardProps) {
  const topAction = nextActions?.top_action ?? null;
  const topSkills = snapshot?.summary.top_skills?.slice(0, 4) ?? [];
  const normalizedNewRsn = newAccountRsn.trim().toLowerCase();
  const hasPendingExistingRsn = Boolean(
    normalizedNewRsn &&
      selectedAccountRsn &&
      selectedAccountRsn.trim().toLowerCase() === normalizedNewRsn,
  );
  const featuredTitle = topAction?.title?.toUpperCase() ?? "ACCOUNT TELEMETRY READY";
  const featuredSummary =
    topAction?.summary ??
    (selectedAccountRsn
      ? `${selectedAccountRsn} is synced. Cerebro can now read the account clearly and turn it into a cleaner next move.`
      : "Link and sync an account to unlock live telemetry, recommendations, and a grounded assistant read.");

  const featuredMeta = selectedAccountRsn
    ? `${selectedAccountRsn.toUpperCase()} // ${snapshot?.summary.overall_level ?? "--"} TOTAL // ${progress?.active_unlocks.length ?? 0} UNLOCK THREADS`
    : "WORKSPACE // TELEMETRY STANDBY";

  return (
    <section className="space-y-12">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
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

        <aside className="space-y-4">
          <section className="border border-white/8 bg-[#101010]">
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white">Cerebro intelligence</p>
            </div>
            <div className="space-y-0">
              <div className="border-b border-white/8 px-5 py-5">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">System</p>
                <p className="mt-3 text-[0.92rem] leading-7 text-osrs-text-soft">
                  {selectedAccountRsn
                    ? `${selectedAccountRsn} is live. Ask Cerebro about stats, routes, gear, money, bosses, or what the account actually needs next.`
                    : "No account telemetry is loaded yet. Add an RSN here to bring the workspace online."}
                </p>
              </div>
              {selectedAccountRsn ? (
                <div className="px-5 py-5">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Readout</p>
                  <div className="mt-4 space-y-3 text-sm text-osrs-text-soft">
                    <div className="flex items-center justify-between gap-3">
                      <span>Combat</span>
                      <strong className="font-display text-[1.15rem] uppercase text-white">
                        {snapshot?.summary.combat_level ?? "--"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Total</span>
                      <strong className="font-display text-[1.15rem] uppercase text-white">
                        {snapshot?.summary.overall_level ?? "--"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Unlock threads</span>
                      <strong className="font-display text-[1.15rem] uppercase text-white">
                        {progress?.active_unlocks.length ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-5">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Link account</p>
                  <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
                    Add an RSN and Cerebro will link it, sync it, and make it the active account for this workspace.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <input
                      className="w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
                      onChange={(event) => onChangeNewAccountRsn(event.target.value)}
                      placeholder="RuneScape name"
                      value={newAccountRsn}
                    />
                    <button
                      className="inline-flex min-h-[2.85rem] items-center justify-center rounded-[10px] border border-osrs-gold/55 bg-[linear-gradient(180deg,rgba(48,38,22,0.92),rgba(22,18,12,0.98))] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-osrs-gold-soft transition hover:border-osrs-gold/75 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!newAccountRsn.trim() || busyAction === "quickstart-account"}
                      onClick={onQuickstartAccount}
                      type="button"
                    >
                      {busyAction === "quickstart-account"
                        ? "Syncing..."
                        : hasPendingExistingRsn
                          ? "Sync linked RSN"
                          : "Add + sync RSN"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="font-display text-[0.82rem] font-semibold uppercase tracking-[0.3em] text-white">Strategic recommendations</p>
              <div className="h-px flex-1 bg-white/8" />
            </div>
            <div className="space-y-3">
              {(nextActions?.actions ?? []).slice(0, 3).map((action) => (
                <div
                  key={`${action.action_type}-${action.title}`}
                  className="flex items-center gap-4 border border-white/8 bg-[#101010] px-4 py-4 transition-transform duration-200 hover:translate-x-1 hover:border-osrs-gold/45"
                >
                  <RecommendationThumb action={action} className="h-20 w-20 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-display text-[1.02rem] font-bold uppercase leading-tight text-white">{action.title}</p>
                    <p className="mt-1 text-[0.78rem] leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
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
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-white/8 bg-[#151515] shadow-[inset_2px_2px_4px_rgba(255,255,255,0.03),inset_-2px_-2px_4px_rgba(0,0,0,0.45)]">
                    <SkillIcon className="h-16 w-16 object-cover" skill={skill.skill} />
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
