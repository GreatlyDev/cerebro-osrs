import type { Dispatch, SetStateAction } from "react";

import { Button } from "../components/ui/Button";
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
  onAskAdvisor: (prompt: string) => void;
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

function renderRecommendationValue(value: unknown) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-osrs-text-soft">None tracked.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {value.map((entry, index) => (
          <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={`${String(entry)}-${index}`}>
            {String(entry).replaceAll("_", " ")}
          </span>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div className="border border-white/8 bg-[#0b0b0b] px-3 py-3" key={nestedKey}>
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-osrs-gold">
              {nestedKey.replaceAll("_", " ")}
            </p>
            <div className="mt-1">{renderRecommendationValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-osrs-text-soft">{String(value).replaceAll("_", " ")}</p>;
}

export function GoalsView({
  busyAction,
  goals,
  newGoalTargetRsn,
  newGoalTitle,
  newGoalType,
  onAskAdvisor,
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
  const fieldClassName =
    "w-full border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40";

  return (
    <div className="space-y-8">
      <section className="border-b border-white/8 pb-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Goals // Workspace anchor
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[2.8rem] font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-[3.7rem]">
              Anchor the workspace around a real target
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Goals are where Cerebro stops being broad advice and starts turning account context, unlock pressure,
              and momentum into a real progression plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() =>
                onAskAdvisor(
                  goals.length > 0
                    ? "Which of my goals deserves the most attention right now?"
                    : "What kind of goal should I create first for this account?",
                )
              }
              variant="secondary"
            >
              Ask Cerebro
            </Button>
            <Button onClick={onGoToRecommendations} variant="secondary">
              Open recommendations
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active RSN</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "None selected"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Tracked goals</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{goals.length}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Latest plan</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedGoalPlan ? "Loaded" : "Not loaded"}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-5 border-b border-white/8 pb-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Create goal</p>
            <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Start a new objective</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Use one strong goal to sharpen the planner before you branch into secondary targets.
            </p>
          </div>

          <div className="space-y-3">
            <label className="space-y-2">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Goal title</span>
              <input
                className={fieldClassName}
                onChange={(event) => setNewGoalTitle(event.target.value)}
                placeholder="Goal title"
                value={newGoalTitle}
              />
            </label>
            <label className="space-y-2">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Goal type</span>
              <input
                className={fieldClassName}
                list="goal-type-suggestions"
                onChange={(event) => setNewGoalType(event.target.value)}
                placeholder="Goal type"
                value={newGoalType}
              />
            </label>
            <datalist id="goal-type-suggestions">
              {COMMON_GOAL_TYPES.map((goalType) => (
                <option key={goalType} value={goalType} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {COMMON_GOAL_TYPES.map((goalType) => (
                <button
                  className={`border px-3 py-2 text-[0.64rem] uppercase tracking-[0.18em] transition ${
                    newGoalType === goalType
                      ? "border-osrs-gold/45 bg-white/[0.03] text-osrs-gold-soft"
                      : "border-white/8 bg-[#0b0b0b] text-osrs-text-soft hover:border-white/14 hover:text-white"
                  }`}
                  key={goalType}
                  onClick={() => setNewGoalType(goalType)}
                  type="button"
                >
                  {goalType}
                </button>
              ))}
            </div>
            <label className="space-y-2">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-osrs-gold">Target RSN</span>
              <input
                className={fieldClassName}
                onChange={(event) => setNewGoalTargetRsn(event.target.value)}
                placeholder="Target RSN (optional)"
                value={newGoalTargetRsn}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setNewGoalTargetRsn(selectedAccountRsn ?? "")} variant="secondary">
              Use selected account
            </Button>
            <Button onClick={onCreateGoal}>
              {busyAction === "create-goal" ? "Creating..." : "Create goal"}
            </Button>
          </div>
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={() =>
                onAskAdvisor(
                  `What kind of ${newGoalType || "goal"} would make the best first anchor for this workspace?`,
                )
              }
              variant="secondary"
            >
              Ask what goal would fit best
            </Button>
          </div>

          <div className="mt-4 border border-white/8 bg-[#111111] px-4 py-4 text-sm leading-7 text-osrs-text-soft">
            Goal plans feed ranked actions, advisor replies, and account-aware planning. Use one of the common goal
            types or make your own if your target does not fit the preset list.
          </div>
        </section>

        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active board</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Current goals</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                Open a goal page for the full planning surface, or generate a fresh plan from here.
              </p>
            </div>

            {goals.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
                No goals yet. Create one on the left to turn the rest of Cerebro into a more opinionated planning workspace.
                <div className="mt-4">
                  <Button
                    className="w-full"
                    onClick={() => onAskAdvisor("What goal would make Cerebro most useful for me right now?")}
                    variant="secondary"
                  >
                    Ask what goal to start with
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {goals.map((goal) => (
                  <div className="border border-white/8 bg-[#111111] px-5 py-5" key={goal.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                            {goal.status}
                          </span>
                          <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                            {goal.goal_type}
                          </span>
                          {goal.target_account_rsn ? (
                            <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                              {goal.target_account_rsn}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-display text-[1.4rem] font-bold uppercase tracking-[0.05em] text-white">{goal.title}</h3>
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
                        <Button
                          onClick={() => onAskAdvisor(`How should I think about ${goal.title} right now?`)}
                          variant="secondary"
                        >
                          Ask Cerebro
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Plan readout</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Latest generated plan</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                The latest generated plan stays visible here so the goal board still feels useful before you drill into a dedicated goal page.
              </p>
            </div>

            {selectedGoalPlan ? (
              <div className="space-y-4">
                <div className="border border-white/8 bg-[#111111] px-5 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Summary</p>
                      <h3 className="mt-2 font-display text-[1.4rem] font-bold uppercase tracking-[0.05em] text-white">{selectedGoalPlan.summary}</h3>
                    </div>
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                      {selectedGoalPlan.status}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="border border-white/8 bg-[#111111] px-5 py-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Steps</p>
                    <ol className="mt-4 space-y-3 text-sm leading-7 text-osrs-text-soft">
                      {selectedGoalPlan.steps.map((step, index) => (
                        <li className="flex gap-3" key={step}>
                          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center border border-white/8 bg-[#0b0b0b] text-xs text-osrs-gold-soft">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="border border-white/8 bg-[#111111] px-5 py-5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Recommendation snapshot</p>
                    <div className="mt-4 grid gap-3">
                      {Object.entries(selectedGoalPlan.recommendations).map(([key, value]) => (
                        <div className="border border-white/8 bg-[#0b0b0b] px-4 py-4" key={key}>
                          <strong className="block text-sm uppercase tracking-[0.08em] text-white">
                            {key.replaceAll("_", " ")}
                          </strong>
                          <div className="mt-2">{renderRecommendationValue(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    onAskAdvisor(
                      `What is the smartest way to act on this ${selectedGoalPlan.summary.toLowerCase()} plan right now?`,
                    )
                  }
                  variant="secondary"
                >
                  Ask how to use this plan
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
                No plan selected yet. Generate a plan from one of the goal cards above and it will surface here immediately.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
