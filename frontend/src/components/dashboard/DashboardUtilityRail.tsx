import type { Account, AccountProgress, AccountSnapshot, Goal, NextActionResponse } from "../../types";
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
      <InventoryPanel
        items={inventorySlots}
        title={selectedAccount ? `${selectedAccount.rsn} loadout chest` : "Loadout chest"}
      />
      <GoalProgressPanel goals={goalLedger} />
      <QuestJournalPanel entries={journalEntries} />
    </>
  );
}
