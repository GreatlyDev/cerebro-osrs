import { Button } from "../components/ui/Button";
import type { NextAction, NextActionResponse, QuestDetail as QuestDetailType } from "../types";

type QuestDetailProps = {
  onBackToDashboard: () => void;
  onBackToQuests: () => void;
  onOpenNextAction: (action: NextAction) => void;
  nextActions: NextActionResponse | null;
  selectedQuest: QuestDetailType | null;
};

function ListPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="border border-white/8 bg-[#111111] p-5">
      <strong className="block font-display text-xl text-white">{title}</strong>
      <ul className="mt-4 space-y-2 text-sm leading-7 text-osrs-text-soft">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function QuestDetailView({
  onBackToDashboard,
  onBackToQuests,
  onOpenNextAction,
  nextActions,
  selectedQuest,
}: QuestDetailProps) {
  if (!selectedQuest) {
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No quest loaded.</div>;
  }

  const relatedActions =
    nextActions?.actions.filter(
      (action) => action.action_type === "quest" && action.target.quest_id === selectedQuest.id,
    ) ?? [];

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Quest // Detail view
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              {selectedQuest.name}
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">{selectedQuest.short_description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onBackToQuests} variant="secondary">All quests</Button>
            <Button onClick={onBackToDashboard} variant="secondary">Dashboard</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Difficulty</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedQuest.difficulty}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Category</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedQuest.category}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planner links</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{relatedActions.length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Why it matters</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Quest overview</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{selectedQuest.why_it_matters}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ListPanel items={selectedQuest.requirements} title="Requirements" />
              <ListPanel items={selectedQuest.rewards} title="Rewards" />
            </div>
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Next steps</p>
              <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Walkthrough lane</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A clean place for richer guide content later without crowding the catalog.</p>
            </div>
            <ol className="space-y-3 text-sm leading-7 text-osrs-text-soft">
              {selectedQuest.next_steps.map((step, index) => (
                <li className="flex gap-3" key={step}>
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center border border-white/8 bg-[#0b0b0b] text-xs text-osrs-gold-soft">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planner links</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Related actions</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">Ranked quest pressure and follow-through for this unlock.</p>
          </div>
          {relatedActions.length > 0 ? (
            relatedActions.map((action) => (
              <div className="border border-white/8 bg-[#111111] px-4 py-4" key={`${action.action_type}-${action.title}`}>
                <strong className="block text-white">{action.title}</strong>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                <Button className="mt-3 w-full" onClick={() => onOpenNextAction(action)} variant="secondary">
                  Open from planner
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-osrs-text-soft">No active ranked action is currently attached to this quest.</p>
          )}
        </section>
      </div>
    </div>
  );
}
