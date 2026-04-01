import type { Account, AccountProgress, AccountSnapshot, Goal, NextActionResponse } from "../../types";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";
import { GoalProgressPanel } from "./GoalProgressPanel";
import { InventoryPanel } from "./InventoryPanel";
import { QuestJournalPanel } from "./QuestJournalPanel";

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

function estimateGoalProgress(goal: Goal) {
  if (goal.status === "completed") {
    return 100;
  }
  if (goal.generated_plan) {
    return 72;
  }
  if (goal.status === "in_progress") {
    return 54;
  }
  return 22;
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
  const inventorySlots = [
    "Head",
    "Cape",
    "Neck",
    "Weapon",
    "Body",
    "Shield",
    "Legs",
    "Gloves",
    "Boots",
    "Ring",
    "Ammo",
    "Pack",
  ].map((slot, index) => ({
    slot,
    item: selectedProgress?.owned_gear[index] ?? null,
  }));

  const goalLedger = goals.slice(0, 4).map((goal) => ({
    id: goal.id,
    title: goal.title,
    status: goal.status.replaceAll("_", " "),
    progress: estimateGoalProgress(goal),
    targetAccount: goal.target_account_rsn,
  }));

  const journalEntries = (nextActions?.actions ?? []).slice(0, 4).map((action) => ({
    title: action.title,
    summary: action.summary,
    tag: action.action_type,
  }));

  if (journalEntries.length === 0 && selectedSnapshotDelta) {
    journalEntries.push({
      title: "Momentum snapshot",
      summary:
        selectedSnapshotDelta.improvedSkills.length > 0
          ? `Recent skill gains showed up in ${selectedSnapshotDelta.improvedSkills
              .slice(0, 3)
              .map((skill) => skill.skill)
              .join(", ")}.`
          : "The last sync did not show strong momentum yet, so the planner is still leaning on static account context.",
      tag: "sync",
    });
  }

  if (journalEntries.length === 0 && selectedSnapshot) {
    journalEntries.push({
      title: `${selectedSnapshot.summary.rsn} snapshot loaded`,
      summary: `Overall ${selectedSnapshot.summary.overall_level} with combat ${selectedSnapshot.summary.combat_level ?? "unknown"} is now available for planning.`,
      tag: "account",
    });
  }

  return (
    <>
      <Panel tone="soft" className="space-y-4">
        <SectionHeader
          eyebrow="Cerebro Assistant"
          title="Keep the advisor within reach"
          subtitle="Ask about stats, routes, gear, money, bosses, tasks, or goals from anywhere in the workspace."
        />
        <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(44,34,26,0.74),rgba(20,18,16,0.96))] px-4 py-4 shadow-insetPanel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Live advisor</p>
              <p className="mt-1 text-sm text-osrs-text-soft">
                {selectedAccount
                  ? `Grounded on ${selectedAccount.rsn} and ready for general account questions.`
                  : "Select an account to ground replies, or ask a broader OSRS planning question."}
              </p>
            </div>
            <span className="rounded-full border border-osrs-border/80 bg-osrs-bg-soft/70 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
              {chatSessionCount} thread{chatSessionCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => onAdvisorPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAskAdvisor();
                }
              }}
              placeholder="Ask Cerebro about your account, task, route, or next move"
              value={advisorPrompt}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button onClick={onAskAdvisor}>
                {busyAction === "chat" ? "Consulting..." : "Ask Cerebro"}
              </Button>
              <Button onClick={onOpenAdvisor} variant="secondary">
                Open full advisor
              </Button>
            </div>
          </div>
        </div>
      </Panel>
      <Panel className="space-y-4">
        <SectionHeader
          eyebrow="Command Rail"
          subtitle="A compact read on the currently selected account before the deeper utility panels below."
          title={selectedAccount ? `${selectedAccount.rsn} at a glance` : "Workspace at a glance"}
        />
        <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(60,46,30,0.62),rgba(24,19,15,0.96))] px-4 py-4 shadow-insetPanel">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Current pulse</p>
          <div className="mt-3 grid gap-2 text-sm text-osrs-text-soft">
            <div className="flex items-center justify-between gap-3">
              <span>Tracked account</span>
              <strong className="font-display text-base text-osrs-text">{selectedAccount?.rsn ?? "none"}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Top skill</span>
              <strong className="font-display text-base text-osrs-text">
                {selectedSnapshot?.summary.progression_profile?.highest_skill ?? "unknown"}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Owned gear tracked</span>
              <strong className="font-display text-base text-osrs-text">{selectedProgress?.owned_gear.length ?? 0}</strong>
            </div>
          </div>
        </div>
        <div className="cerebro-stagger grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Overall</p>
            <strong className="mt-2 block font-display text-2xl text-osrs-text">
              {selectedSnapshot?.summary.overall_level ?? "n/a"}
            </strong>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Quest log</p>
            <strong className="mt-2 block font-display text-2xl text-osrs-text">
              {selectedProgress?.completed_quests.length ?? 0}
            </strong>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Momentum</p>
            <strong className="mt-2 block font-display text-2xl text-osrs-text">
              {selectedSnapshotDelta ? selectedSnapshotDelta.improvedSkills.length : 0}
            </strong>
          </div>
        </div>
      </Panel>
      <div className="cerebro-stagger space-y-5">
        <InventoryPanel
          items={inventorySlots}
          title={selectedAccount ? `${selectedAccount.rsn} loadout chest` : "Loadout chest"}
        />
        <GoalProgressPanel goals={goalLedger} />
        <QuestJournalPanel entries={journalEntries} />
      </div>
    </>
  );
}
