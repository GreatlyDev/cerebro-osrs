import type { Account, AccountProgress, AccountSnapshot, Goal, NextActionResponse } from "../../types";
import { Button } from "../ui/Button";
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
      <div className="overflow-hidden rounded-[24px] border border-osrs-border/60 bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(15,13,11,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="border-b border-osrs-border/50 px-4 py-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.64rem] uppercase tracking-[0.24em] text-osrs-gold">Cerebro assistant</p>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-osrs-success shadow-[0_0_14px_rgba(111,161,109,0.8)]" />
                <span className="text-[0.56rem] uppercase tracking-[0.18em] text-osrs-text-soft">Online</span>
              </div>
            </div>
            <p className="mt-3 font-display text-[1.55rem] uppercase leading-tight text-osrs-text">Keep the advisor within reach</p>
            <p className="mt-3 text-sm leading-6 text-osrs-text-soft">
              Ask about stats, routes, gear, money, bosses, or what the account actually needs next from anywhere in the workspace.
            </p>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-[18px] border border-osrs-border/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.32))] p-4">
            <p className="text-[0.58rem] uppercase tracking-[0.22em] text-osrs-gold">System</p>
            <p className="mt-2 text-sm leading-6 text-osrs-text">
              {selectedAccount
                ? `${selectedAccount.rsn} is in focus. Ask about stats, routes, gear, money, bosses, or what the account actually needs next.`
                : "Select an account to ground the assistant, or ask a broader OSRS question from the workspace."}
            </p>
          </div>
          <div className="rounded-[18px] border border-osrs-border/40 bg-[linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.22em] text-osrs-gold">Live advisor</p>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                  {selectedAccount ? `Grounded on ${selectedAccount.rsn}` : "No account selected"}
                </p>
              </div>
              <span className="rounded-full border border-osrs-border/40 bg-black/30 px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                {chatSessionCount} thread{chatSessionCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-[14px] border border-osrs-border/50 bg-[#111311] px-4 py-3 text-sm text-osrs-text shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
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
              <div className="grid gap-2">
                <Button onClick={onAskAdvisor}>
                  {busyAction === "chat" ? "Consulting..." : "Ask Cerebro"}
                </Button>
                <Button onClick={onOpenAdvisor} variant="secondary">
                  Open full advisor
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-osrs-border/50 bg-[linear-gradient(180deg,rgba(14,14,14,0.98),rgba(11,11,11,0.98))] shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
        <div className="border-b border-osrs-border/40 px-4 py-4">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-osrs-gold">Command rail</p>
          <p className="mt-2 font-display text-2xl uppercase leading-tight text-osrs-text">
            {selectedAccount ? `${selectedAccount.rsn} at a glance` : "Workspace at a glance"}
          </p>
          <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
            A tighter telemetry read on the selected account before the deeper ledger and journal panels below.
          </p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-[18px] border border-osrs-border/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.32))] p-4">
            <p className="text-[0.58rem] uppercase tracking-[0.22em] text-osrs-gold">Current pulse</p>
            <div className="mt-3 grid gap-3 text-sm text-osrs-text-soft">
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
                <span>Owned gear tracked</span>
                <strong className="font-display text-base text-osrs-text">{selectedProgress?.owned_gear.length ?? 0}</strong>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[16px] border border-osrs-border/60 bg-black/20 px-4 py-4">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-osrs-gold">Overall</p>
              <strong className="mt-2 block font-display text-2xl text-osrs-text">
                {selectedSnapshot?.summary.overall_level ?? "n/a"}
              </strong>
            </div>
            <div className="rounded-[16px] border border-osrs-border/60 bg-black/20 px-4 py-4">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-osrs-gold">Quest log</p>
              <strong className="mt-2 block font-display text-2xl text-osrs-text">
                {selectedProgress?.completed_quests.length ?? 0}
              </strong>
            </div>
            <div className="rounded-[16px] border border-osrs-border/60 bg-black/20 px-4 py-4">
              <p className="text-[0.58rem] uppercase tracking-[0.18em] text-osrs-gold">Momentum</p>
              <strong className="mt-2 block font-display text-2xl text-osrs-text">
                {selectedSnapshotDelta ? selectedSnapshotDelta.improvedSkills.length : 0}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div className="cerebro-stagger space-y-4">
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
