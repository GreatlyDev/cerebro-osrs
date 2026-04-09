import type { Account, AccountProgress, AccountSnapshot, Goal, NextActionResponse } from "../../types";
import { Button } from "../ui/Button";

type DashboardUtilityRailProps = {
  selectedAccount: Account | null;
  selectedProgress: AccountProgress | null;
  selectedSnapshotDelta: {
    improvedSkills: Array<{ skill: string; previousLevel: number; currentLevel: number | undefined }>;
  } | null;
  goals: Goal[];
  nextActions: NextActionResponse | null;
  selectedSnapshot: AccountSnapshot | null;
  advisorPrompt: string;
  busyAction: string | null;
  chatSessionCount: number;
  onAdvisorPromptChange: (value: string) => void;
  onAskAdvisor: () => void;
  onOpenAdvisor: () => void;
};

function buildSystemMessage(selectedAccount: Account | null, selectedSnapshot: AccountSnapshot | null) {
  if (!selectedAccount || !selectedSnapshot) {
    return "No account telemetry loaded yet. Select an RSN and Cerebro will ground itself in live account state.";
  }

  return `Telemetry synced. ${selectedAccount.rsn} is currently sitting at total level ${selectedSnapshot.summary.overall_level} with combat ${selectedSnapshot.summary.combat_level ?? "unknown"}.`;
}

function buildAdvisorMessage(
  nextActions: NextActionResponse | null,
  selectedSnapshotDelta: DashboardUtilityRailProps["selectedSnapshotDelta"],
  selectedProgress: AccountProgress | null,
) {
  const topAction = nextActions?.top_action;
  if (topAction) {
    return topAction.summary;
  }

  if (selectedSnapshotDelta?.improvedSkills.length) {
    return `Recent gains showed up in ${selectedSnapshotDelta.improvedSkills.slice(0, 2).map((item) => item.skill).join(" and ")}.`;
  }

  if ((selectedProgress?.active_unlocks.length ?? 0) > 0) {
    return `There are ${selectedProgress?.active_unlocks.length ?? 0} active unlock threads ready to turn into account value.`;
  }

  return "Ask about stats, routes, gear, money, bosses, or what the account actually needs next.";
}

export function DashboardUtilityRail({
  selectedAccount,
  selectedProgress,
  selectedSnapshotDelta,
  goals,
  nextActions,
  selectedSnapshot,
  advisorPrompt,
  busyAction,
  chatSessionCount,
  onAdvisorPromptChange,
  onAskAdvisor,
  onOpenAdvisor,
}: DashboardUtilityRailProps) {
  const recommendationCards = (nextActions?.actions ?? []).slice(0, 3);
  const systemMessage = buildSystemMessage(selectedAccount, selectedSnapshot);
  const advisorMessage = buildAdvisorMessage(nextActions, selectedSnapshotDelta, selectedProgress);

  return (
    <div className="space-y-8">
      <section className="border border-white/8 bg-[#101010]">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white">Cerebro intelligence</p>
        </div>
        <div className="space-y-0">
          <div className="border-b border-white/8 px-5 py-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">System</p>
            <p className="mt-3 text-[0.92rem] leading-7 text-osrs-text-soft">{systemMessage}</p>
          </div>
          <div className="border-b border-white/8 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Cerebro</p>
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                {chatSessionCount} threads
              </span>
            </div>
            <p className="mt-3 text-[0.92rem] leading-7 text-osrs-text-soft">{advisorMessage}</p>
          </div>
          <div className="px-5 py-5">
            <input
              className="w-full border-0 bg-transparent px-0 py-0 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55"
              onChange={(event) => onAdvisorPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAskAdvisor();
                }
              }}
              placeholder="Query account data..."
              value={advisorPrompt}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="font-display text-[0.82rem] font-semibold uppercase tracking-[0.3em] text-white">Strategic recommendations</p>
          <div className="h-px flex-1 bg-white/8" />
        </div>
        <div className="space-y-3">
          {recommendationCards.length > 0 ? (
            recommendationCards.map((action) => (
              <div key={`${action.action_type}-${action.title}`} className="flex items-center gap-4 border border-white/8 bg-[#101010] px-4 py-4 transition-transform duration-200 hover:translate-x-1 hover:border-osrs-gold/45">
                <div className="h-12 w-12 shrink-0 border border-white/8 bg-[#151515]" />
                <div className="min-w-0">
                  <p className="font-display text-[1.02rem] font-bold uppercase leading-tight text-white">{action.title}</p>
                  <p className="mt-1 text-[0.78rem] leading-6 text-osrs-text-soft">{action.summary}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-white/10 bg-[#101010] px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              Sync an account to unlock live recommendations.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-2">
        <Button onClick={onAskAdvisor}>{busyAction === "chat" ? "Thinking..." : "Ask Cerebro"}</Button>
        <Button onClick={onOpenAdvisor} variant="secondary">
          Open full advisor
        </Button>
      </div>

      <section className="border border-white/8 bg-[#101010] px-5 py-5">
        <div className="space-y-3 text-sm text-osrs-text-soft">
          <div className="flex items-center justify-between gap-3">
            <span>Tracked account</span>
            <strong className="font-display text-base uppercase text-white">{selectedAccount?.rsn ?? "none"}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Goals</span>
            <strong className="font-display text-base text-white">{goals.length}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Top skill</span>
            <strong className="font-display text-base uppercase text-white">
              {selectedSnapshot?.summary.progression_profile?.highest_skill ?? "unknown"}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Unlock threads</span>
            <strong className="font-display text-base text-white">{selectedProgress?.active_unlocks.length ?? 0}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
