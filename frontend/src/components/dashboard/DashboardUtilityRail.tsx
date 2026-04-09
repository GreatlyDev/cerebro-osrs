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
    return "No account is anchored yet. Select an RSN and Cerebro will start grounding its reads in live telemetry.";
  }

  return `Telemetry synced for ${selectedAccount.rsn}. Current overall level is ${selectedSnapshot.summary.overall_level} with combat ${selectedSnapshot.summary.combat_level ?? "unknown"}.`;
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
    return `Recent momentum showed up in ${selectedSnapshotDelta.improvedSkills.slice(0, 2).map((item) => item.skill).join(" and ")}. Cerebro can turn that into a sharper next step.`;
  }

  if ((selectedProgress?.active_unlocks.length ?? 0) > 0) {
    return `There are ${selectedProgress?.active_unlocks.length ?? 0} active unlock threads on this account. Ask Cerebro which one is pulling the most future value.`;
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
    <div className="space-y-4">
      <section className="overflow-hidden border border-osrs-border/35 bg-[#121212]">
        <div className="flex items-center justify-between border-b border-osrs-border/35 px-4 py-3">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.22em] text-osrs-gold">Cerebro assistant</p>
            <p className="mt-1 font-sans text-[1.15rem] font-bold uppercase leading-tight tracking-[0.04em] text-white">Cerebro intelligence</p>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-osrs-success shadow-[0_0_12px_rgba(111,161,109,0.75)]" />
        </div>
        <div className="space-y-0">
          <div className="border-b border-osrs-border/25 px-4 py-4">
            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">System</p>
            <p className="mt-2 text-[0.95rem] leading-7 text-osrs-text-soft">{systemMessage}</p>
          </div>
          <div className="border-b border-osrs-border/25 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Cerebro</p>
              <span className="rounded-full border border-osrs-border/35 px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                {chatSessionCount} threads
              </span>
            </div>
            <p className="mt-2 text-[0.95rem] leading-7 text-osrs-text-soft">{advisorMessage}</p>
          </div>
          <div className="px-4 py-4">
            <input
              className="w-full border-0 border-b border-osrs-border/35 bg-transparent px-0 py-2 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55"
              onChange={(event) => onAdvisorPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAskAdvisor();
                }
              }}
              placeholder="Ask Cerebro about your account..."
              value={advisorPrompt}
            />
            <div className="mt-3 grid gap-2">
              <Button onClick={onAskAdvisor}>{busyAction === "chat" ? "Thinking..." : "Ask Cerebro"}</Button>
              <Button onClick={onOpenAdvisor} variant="secondary">
                Open full advisor
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-[0.64rem] uppercase tracking-[0.28em] text-osrs-text">Strategic recommendations</p>
          <div className="h-px flex-1 bg-osrs-border/35" />
        </div>
        <div className="space-y-3">
          {recommendationCards.length > 0 ? (
            recommendationCards.map((action) => (
              <div key={`${action.action_type}-${action.title}`} className="border border-osrs-border/35 bg-[#121212] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-10 w-10 shrink-0 border border-osrs-border/35 bg-black/40" />
                  <div className="min-w-0">
                    <p className="font-sans text-[0.96rem] font-bold uppercase leading-tight text-white">{action.title}</p>
                    <p className="mt-1 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-osrs-border/35 bg-[#121212] p-4 text-sm leading-6 text-osrs-text-soft">
              Sync an account or create a goal to unlock ranked recommendation cards here.
            </div>
          )}
        </div>
      </section>

      <section className="border border-osrs-border/35 bg-[#121212] p-4">
        <p className="text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account pulse</p>
        <div className="mt-3 space-y-2 text-sm text-osrs-text-soft">
          <div className="flex items-center justify-between gap-3">
            <span>Tracked account</span>
            <strong className="font-display text-base uppercase text-osrs-text">{selectedAccount?.rsn ?? "none"}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Top skill</span>
            <strong className="font-display text-base uppercase text-osrs-text">
              {selectedSnapshot?.summary.progression_profile?.highest_skill ?? "unknown"}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Goals</span>
            <strong className="font-display text-base text-osrs-text">{goals.length}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Tracked unlocks</span>
            <strong className="font-display text-base text-osrs-text">{selectedProgress?.active_unlocks.length ?? 0}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
