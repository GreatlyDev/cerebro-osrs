import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { NextAction, NextActionResponse, QuestDetail as QuestDetailType } from "../types";

type QuestDetailProps = {
  onBackToDashboard: () => void;
  onBackToQuests: () => void;
  onOpenNextAction: (action: NextAction) => void;
  nextActions: NextActionResponse | null;
  selectedQuest: QuestDetailType | null;
};

export function QuestDetailView({
  onBackToDashboard,
  onBackToQuests,
  onOpenNextAction,
  nextActions,
  selectedQuest,
}: QuestDetailProps) {
  if (!selectedQuest) {
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No quest loaded.</p>
      </Panel>
    );
  }

  const relatedActions =
    nextActions?.actions.filter(
      (action) => action.action_type === "quest" && action.target.quest_id === selectedQuest.id,
    ) ?? [];

  return (
    <div className="space-y-6">
      <PageHero
        action={<Button onClick={onBackToQuests} variant="secondary">All quests</Button>}
        chips={[
          { label: "Difficulty", value: selectedQuest.difficulty },
          { label: "Category", value: selectedQuest.category },
          { label: "Planner links", value: String(relatedActions.length) },
        ]}
        description={selectedQuest.short_description}
        eyebrow="Quest Detail"
        title={selectedQuest.name}
      >
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <button
            className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5"
            onClick={onBackToDashboard}
            type="button"
          >
            Dashboard
          </button>
        </div>
      </PageHero>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
        <div className="space-y-6">
          <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))]">
            <SectionHeader
              eyebrow="Why it matters"
              subtitle={selectedQuest.why_it_matters}
              title="Quest overview"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <ListPanel items={selectedQuest.requirements} title="Requirements" />
              <ListPanel items={selectedQuest.rewards} title="Rewards" />
            </div>
          </Panel>

          <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))]">
            <SectionHeader
              eyebrow="Next steps"
              subtitle="A clean place for richer guide content later without crowding the catalog."
              title="Walkthrough lane"
            />
            <ol className="space-y-3 text-sm leading-7 text-osrs-text-soft">
              {selectedQuest.next_steps.map((step, index) => (
                <li className="flex gap-3" key={step}>
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-osrs-border-light/70 bg-osrs-gold/10 text-xs text-osrs-gold-soft">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))]">
          <SectionHeader eyebrow="Planner links" title="Related actions" subtitle="Ranked quest pressure and follow-through for this unlock." />
          {relatedActions.length > 0 ? (
            relatedActions.map((action) => (
              <div
                className="rounded-[16px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.32))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                key={`${action.action_type}-${action.title}`}
              >
                <strong className="block text-osrs-text">{action.title}</strong>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                <Button className="mt-3 w-full" onClick={() => onOpenNextAction(action)} variant="secondary">
                  Open from planner
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-osrs-text-soft">
              No active ranked action is currently attached to this quest.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ListPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <strong className="block font-display text-xl text-osrs-text">{title}</strong>
      <ul className="mt-4 space-y-2 text-sm leading-7 text-osrs-text-soft">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
