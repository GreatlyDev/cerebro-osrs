import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type GoalProgressItem = {
  id: number;
  title: string;
  progress: number;
  status: string;
  targetAccount: string | null;
};

type GoalProgressPanelProps = {
  goals: GoalProgressItem[];
};

export function GoalProgressPanel({ goals }: GoalProgressPanelProps) {
  return (
    <Panel className="space-y-4">
      <SectionHeader
        eyebrow="Goal Progression"
        subtitle="Live goals stay visible here so the right rail feels like a planning ledger instead of filler."
        title="Progress ledger"
      />
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
            No goals are anchored yet. Create one from the main workspace to turn the rail into a real progression log.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
              key={goal.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="font-display text-base text-osrs-text">{goal.title}</strong>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-osrs-text-soft">
                    {goal.targetAccount ? `${goal.targetAccount} | ${goal.status}` : goal.status}
                  </p>
                </div>
                <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-2.5 py-1 text-xs text-osrs-gold-soft">
                  {goal.progress}%
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-osrs-border/60 bg-osrs-stone/40">
                <div
                  className="h-full rounded-full bg-osrs-progress"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
