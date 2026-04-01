import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
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
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No goal loaded.</p>
      </Panel>
    );
  }

  const matchedActions =
    nextActions?.actions.filter((action) => typeof action.target.goal_id === "number" && action.target.goal_id === selectedGoal.id) ?? [];
  const plan = selectedGoalPlan && selectedGoalPlan.goal_id === selectedGoal.id ? selectedGoalPlan : null;

  return (
    <div className="space-y-6">
      <PageHero
        action={
          <div className="flex gap-3">
            <Button onClick={onGoToGoals} variant="secondary">All goals</Button>
            <Button onClick={() => onGeneratePlan(selectedGoal)}>
              {busyAction === `plan-${selectedGoal.id}` ? "Generating..." : "Refresh plan"}
            </Button>
          </div>
        }
        chips={[
          { label: "Goal type", value: selectedGoal.goal_type },
          { label: "Status", value: selectedGoal.status },
          { label: "Target RSN", value: selectedGoal.target_account_rsn ?? "Workspace-wide" },
        ]}
        description={`Full planning view for ${selectedGoal.title}.`}
        eyebrow="Goal Detail"
        title={selectedGoal.title}
      >
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <button className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5" onClick={onBackToDashboard} type="button">Dashboard</button>
        </div>
      </PageHero>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeader eyebrow="Goal read" title="Planning context" subtitle="A dedicated surface for this goal's direction and generated plan." />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
                <strong className="block text-osrs-text">Workspace focus</strong>
                <p className="mt-2 text-sm text-osrs-text-soft">{profile?.goals_focus ?? "progression"}</p>
              </div>
              <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel">
                <strong className="block text-osrs-text">Notes</strong>
                <p className="mt-2 text-sm text-osrs-text-soft">{selectedGoal.notes ?? "No notes yet."}</p>
              </div>
            </div>
            {matchedActions.length > 0 ? (
              <div className="rounded-[18px] border border-osrs-border/70 bg-osrs-panel-2/45 px-4 py-4 shadow-insetPanel">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Planner pressure</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchedActions.slice(0, 4).map((action) => (
                    <span
                      className="rounded-full border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(55,43,33,0.42),rgba(24,19,15,0.92))] px-3 py-1 text-xs text-osrs-text-soft"
                      key={`${action.action_type}-${action.title}`}
                    >
                      {action.action_type} · {action.priority}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader eyebrow="Generated plan" title={plan?.summary ?? "No plan loaded"} subtitle="Use the generated plan as the anchor for the rest of the workspace." />
            {plan ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-5 shadow-insetPanel">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Steps</p>
                  <ol className="mt-4 space-y-3 text-sm leading-7 text-osrs-text-soft">
                    {plan.steps.map((step, index) => (
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
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Recommendations</p>
                  <div className="mt-4 grid gap-3">
                    {Object.entries(plan.recommendations).map(([key, value]) => (
                      <div className="rounded-[14px] border border-osrs-border/60 bg-osrs-panel-2/60 px-4 py-3" key={key}>
                        <strong className="block text-sm text-osrs-text">{key.replaceAll("_", " ")}</strong>
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
          </Panel>
        </div>

        <Panel className="space-y-4">
          <SectionHeader eyebrow="Goal-aware actions" title="Ranked actions" subtitle="The planner's live next moves for this exact goal." />
          {matchedActions.length > 0 ? (
            <div className="grid gap-3">
              {matchedActions.map((action) => (
                <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel" key={`${action.action_type}-${action.title}`}>
                  <strong className="block text-osrs-text">{action.title}</strong>
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
        </Panel>
      </div>
    </div>
  );
}

function renderRecommendationValue(value: unknown) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-osrs-text-soft">None tracked.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span
            className="rounded-full border border-osrs-border/70 bg-osrs-panel/60 px-3 py-1 text-xs text-osrs-text-soft"
            key={`${String(item)}-${index}`}
          >
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
          <div
            className="rounded-[12px] border border-osrs-border/50 bg-osrs-panel/45 px-3 py-2"
            key={nestedKey}
          >
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
