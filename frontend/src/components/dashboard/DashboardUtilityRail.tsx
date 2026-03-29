import type { Account, AccountProgress, AccountSnapshot, Goal, NextActionResponse } from "../../types";
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
