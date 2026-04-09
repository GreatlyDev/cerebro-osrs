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
    <Panel className="space-y-4 border-osrs-border/50 bg-[linear-gradient(180deg,rgba(14,14,14,0.98),rgba(11,11,11,0.98))] p-4">
      <SectionHeader eyebrow="Progress ledger" subtitle="Anchored goals stay visible here as a compact ledger, not a giant planner detour." title="Goal progression" />
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-osrs-border/50 bg-black/20 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
            No goals are anchored yet. Create one from the main workspace to turn the rail into a real progression log.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              className="rounded-[16px] border border-osrs-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.36))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              key={goal.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="font-display text-base text-osrs-text">{goal.title}</strong>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-osrs-text-soft">
                    {goal.targetAccount ? `${goal.targetAccount} | ${goal.status}` : goal.status}
                  </p>
                </div>
                <span className="rounded-full border border-osrs-border/40 bg-black/20 px-2.5 py-1 text-xs text-osrs-gold-soft">
                  {goal.progress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full border border-osrs-border/40 bg-black/25">
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
