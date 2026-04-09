import { Button } from "../components/ui/Button";
import type { Goal, GoalPlanResponse, NextAction, NextActionResponse, Profile } from "../types";

type GoalDetailProps = {
  busyAction: string | null;
  nextActions: NextActionResponse | null;
  onBackToDashboard: () => void;
  onGeneratePlan: (goal: Goal) => void;
  onGoToGoals: () => void;
  onOpenNextAction: (action: NextAction) => void;
  onOpenRecommendedQuest: (questId: string) => void;
  onOpenTargetAccount: (rsn: string) => void;
  profile: Profile | null;
  selectedGoal: Goal | null;
  selectedGoalPlan: GoalPlanResponse | null;
};

function renderRecommendationValue(value: unknown) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-osrs-text-soft">None tracked.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={`${String(item)}-${index}`}>
            {String(item).replaceAll("_", " ")}
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
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-osrs-gold">{nestedKey.replaceAll("_", " ")}</p>
            <div className="mt-1">{renderRecommendationValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-osrs-text-soft">{String(value).replaceAll("_", " ")}</p>;
}

export function GoalDetailView(props: GoalDetailProps) {
  const {
    busyAction,
    nextActions,
    onBackToDashboard,
    onGeneratePlan,
    onGoToGoals,
    onOpenNextAction,
    onOpenRecommendedQuest,
    onOpenTargetAccount,
    profile,
    selectedGoal,
    selectedGoalPlan,
  } = props;

  if (!selectedGoal) {
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No goal loaded.</div>;
  }

  const matchedActions =
    nextActions?.actions.filter((action) => typeof action.target.goal_id === "number" && action.target.goal_id === selectedGoal.id) ?? [];
  const plan = selectedGoalPlan && selectedGoalPlan.goal_id === selectedGoal.id ? selectedGoalPlan : null;

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Goal // Planning surface
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              {selectedGoal.title}
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Full planning view for this goal, with generated steps, attached actions, and linked account context when it matters.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onGoToGoals} variant="secondary">All goals</Button>
            <Button onClick={() => onGeneratePlan(selectedGoal)}>
              {busyAction === `plan-${selectedGoal.id}` ? "Generating..." : "Refresh plan"}
            </Button>
            <Button onClick={onBackToDashboard} variant="secondary">Dashboard</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goal type</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedGoal.goal_type}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Status</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedGoal.status}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Target RSN</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedGoal.target_account_rsn ?? "Workspace-wide"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goal read</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Planning context</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A dedicated surface for this goal&apos;s direction and generated plan.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-white/8 bg-[#111111] px-4 py-4">
                <strong className="block text-white">Workspace focus</strong>
                <p className="mt-2 text-sm text-osrs-text-soft">{profile?.goals_focus ?? "progression"}</p>
              </div>
              <div className="border border-white/8 bg-[#111111] px-4 py-4">
                <strong className="block text-white">Notes</strong>
                <p className="mt-2 text-sm text-osrs-text-soft">{selectedGoal.notes ?? "No notes yet."}</p>
              </div>
            </div>
            {matchedActions.length > 0 ? (
              <div className="mt-4 border border-white/8 bg-[#111111] px-4 py-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Planner pressure</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchedActions.slice(0, 4).map((action) => (
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={`${action.action_type}-${action.title}`}>
                      {action.action_type} · {action.priority}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Generated plan</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">{plan?.summary ?? "No plan loaded"}</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">Use the generated plan as the anchor for the rest of the workspace.</p>
            </div>
            {plan ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="border border-white/8 bg-[#111111] p-5">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Steps</p>
                  <ol className="mt-4 space-y-3 text-sm leading-7 text-osrs-text-soft">
                    {plan.steps.map((step, index) => (
                      <li className="flex gap-3" key={step}>
                        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center border border-white/8 bg-[#0b0b0b] text-xs text-osrs-gold-soft">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="border border-white/8 bg-[#111111] p-5">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Recommendations</p>
                  <div className="mt-4 grid gap-3">
                    {Object.entries(plan.recommendations).map(([key, value]) => (
                      <div className="border border-white/8 bg-[#0b0b0b] px-4 py-3" key={key}>
                        <strong className="block text-sm text-white">{key.replaceAll("_", " ")}</strong>
                        <div className="mt-2">{renderRecommendationValue(value)}</div>
                        {key === "recommended_quest" && typeof value === "string" ? <Button className="mt-3" onClick={() => onOpenRecommendedQuest(value)} variant="secondary">Open quest page</Button> : null}
                        {key === "target_account_rsn" && typeof value === "string" ? <Button className="mt-3" onClick={() => onOpenTargetAccount(value)} variant="secondary">Open account</Button> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-osrs-text-soft">Generate a plan to turn this goal into a richer planning surface.</p>
            )}
          </section>
        </div>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goal-aware actions</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Ranked actions</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">The planner&apos;s live next moves for this exact goal.</p>
          </div>
          {matchedActions.length > 0 ? (
            <div className="grid gap-3">
              {matchedActions.map((action) => (
                <div className="border border-white/8 bg-[#111111] px-4 py-4" key={`${action.action_type}-${action.title}`}>
                  <strong className="block text-white">{action.title}</strong>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-osrs-text-soft">{action.priority}</span>
                    <Button onClick={() => onOpenNextAction(action)} variant="secondary">Open</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-osrs-text-soft">No goal-specific ranked actions yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
