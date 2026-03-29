import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { Goal, GoalPlanResponse } from "../types";

const COMMON_GOAL_TYPES = [
  "quest cape",
  "barrows gloves",
  "fire cape",
  "infernal cape",
  "achievement diary cape",
  "max cape",
  "raid ready",
  "money making",
];

type GoalsViewProps = {
  busyAction: string | null;
  goals: Goal[];
  newGoalTargetRsn: string;
  newGoalTitle: string;
  newGoalType: string;
  onCreateGoal: () => void;
  onGeneratePlan: (goal: Goal) => void;
  onGoToRecommendations: () => void;
  onOpenGoal: (goalId: number) => void;
  selectedAccountRsn: string | null;
  selectedGoalPlan: GoalPlanResponse | null;
  setNewGoalTargetRsn: Dispatch<SetStateAction<string>>;
  setNewGoalTitle: Dispatch<SetStateAction<string>>;
  setNewGoalType: Dispatch<SetStateAction<string>>;
};

function formatRecommendationValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).replaceAll("_", " ")).join(", ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value).replaceAll("_", " ");
}

export function GoalsView({
  busyAction,
  goals,
  newGoalTargetRsn,
  newGoalTitle,
  newGoalType,
  onCreateGoal,
  onGeneratePlan,
  onGoToRecommendations,
  onOpenGoal,
  selectedAccountRsn,
  selectedGoalPlan,
  setNewGoalTargetRsn,
  setNewGoalTitle,
  setNewGoalType,
}: GoalsViewProps) {
  return (
    <div className="space-y-6">
      <PageHero
        action={<Button onClick={onGoToRecommendations} variant="secondary">Open recommendations</Button>}
        chips={[
          { label: "Active RSN", value: selectedAccountRsn ?? "None selected" },
          { label: "Tracked goals", value: String(goals.length) },
          { label: "Latest plan", value: selectedGoalPlan ? "Loaded" : "Not loaded" },
        ]}
        description="Goals are where Cerebro stops being broad advice and starts turning account context, unlock pressure, and momentum into a real progression plan."
        eyebrow="Goal Planner"
        title="Anchor the workspace around a real target"
      />

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Create goal"
            subtitle="Use one strong goal to sharpen the planner before you branch into secondary targets."
            title="Start a new objective"
          />
          <div className="space-y-3">
            <input
              className="w-full rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => setNewGoalTitle(event.target.value)}
              placeholder="Goal title"
              value={newGoalTitle}
            />
            <input
              className="w-full rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none focus:border-osrs-border-light/80"
              onChange={(event) => setNewGoalType(event.target.value)}
              placeholder="Goal type"
              value={newGoalType}
              list="goal-type-suggestions"
            />
            <datalist id="goal-type-suggestions">
              {COMMON_GOAL_TYPES.map((goalType) => (
                <option key={goalType} value={goalType} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {COMMON_GOAL_TYPES.map((goalType) => (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                    newGoalType === goalType
                      ? "border-osrs-border-light/80 bg-osrs-gold/12 text-osrs-gold-soft"
                      : "border-osrs-border/70 bg-osrs-panel-2/60 text-osrs-text-soft hover:border-osrs-border-light/60"
                  }`}
                  key={goalType}
                  onClick={() => setNewGoalType(goalType)}
                  type="button"
                >
                  {goalType}
                </button>
              ))}
            </div>
            <input
              className="w-full rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => setNewGoalTargetRsn(event.target.value)}
              placeholder="Target RSN (optional)"
              value={newGoalTargetRsn}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => setNewGoalTargetRsn(selectedAccountRsn ?? "")}
              variant="secondary"
            >
              Use selected account
            </Button>
            <Button onClick={onCreateGoal}>
              {busyAction === "create-goal" ? "Creating..." : "Create goal"}
            </Button>
          </div>
          <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/50 px-4 py-4 text-sm leading-6 text-osrs-text-soft">
            Goal plans feed ranked actions, advisor replies, and account-aware planning. Use one of the common goal types or make your own if your target does not fit the preset list.
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Active board"
              subtitle="Open a goal page for the full planning surface, or generate a fresh plan from here."
              title="Current goals"
            />
            {goals.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                No goals yet. Create one on the left to turn the rest of Cerebro into a more opinionated planning workspace.
              </div>
            ) : (
              <div className="grid gap-3">
                {goals.map((goal) => (
                  <div
                    className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                    key={goal.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                            {goal.status}
                          </span>
                          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                            {goal.goal_type}
                          </span>
                          {goal.target_account_rsn ? (
                            <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                              {goal.target_account_rsn}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-display text-2xl text-osrs-text">{goal.title}</h3>
                        <p className="text-sm leading-7 text-osrs-text-soft">
                          {goal.generated_plan
                            ? "A generated plan already exists for this goal. Open it for the dedicated planning page or refresh the plan from here."
                            : "Generate a plan to turn this goal into ranked actions, quest unlocks, skill pushes, and gear guidance."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => onOpenGoal(goal.id)} variant="secondary">
                          Open goal
                        </Button>
                        <Button onClick={() => onGeneratePlan(goal)}>
                          {busyAction === `plan-${goal.id}` ? "Generating..." : "Generate plan"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Plan readout"
              subtitle="The latest generated plan stays visible here so the goal board still feels useful before you drill into a dedicated goal page."
              title="Latest generated plan"
            />
            {selectedGoalPlan ? (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(60,46,30,0.84),rgba(31,24,18,0.98))] p-5 shadow-insetPanel">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Summary</p>
                      <h3 className="mt-2 font-display text-2xl text-osrs-text">{selectedGoalPlan.summary}</h3>
                    </div>
                    <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                      {selectedGoalPlan.status}
                    </span>
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-5 shadow-insetPanel">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Steps</p>
                    <ol className="mt-4 space-y-3 text-sm leading-7 text-osrs-text-soft">
                      {selectedGoalPlan.steps.map((step, index) => (
                        <li className="flex gap-3" key={step}>
                          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-osrs-border-light/70 bg-osrs-gold/10 text-xs text-osrs-gold-soft">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-5 shadow-insetPanel">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Recommendation snapshot</p>
                    <div className="mt-4 grid gap-3">
                      {Object.entries(selectedGoalPlan.recommendations).map(([key, value]) => (
                        <div
                          className="rounded-[14px] border border-osrs-border/60 bg-osrs-panel-2/60 px-4 py-3"
                          key={key}
                        >
                          <strong className="block text-sm text-osrs-text">
                            {key.replaceAll("_", " ")}
                          </strong>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-osrs-text-soft">
                            {formatRecommendationValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                No plan selected yet. Generate a plan from one of the goal cards above and it will surface here immediately.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
