import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { NextActionResponse, QuestDetail, QuestSummary } from "../types";

type QuestsViewProps = {
  busyAction: string | null;
  filteredQuests: QuestSummary[];
  nextActions: NextActionResponse | null;
  onLoadQuest: (questId: string) => void;
  onOpenSelectedQuest: () => void;
  questSearch: string;
  selectedQuest: QuestDetail | null;
  setQuestSearch: (value: string) => void;
};

export function QuestsView({
  busyAction,
  filteredQuests,
  nextActions,
  onLoadQuest,
  onOpenSelectedQuest,
  questSearch,
  selectedQuest,
  setQuestSearch,
}: QuestsViewProps) {
  const recommendedQuestActions = nextActions?.actions.filter((action) => action.action_type === "quest") ?? [];

  return (
    <div className="space-y-6">
      <Panel tone="hero">
        <SectionHeader
          action={
            <input
              className="w-full min-w-[14rem] rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
              onChange={(event) => setQuestSearch(event.target.value)}
              placeholder="Search quests"
              value={questSearch}
            />
          }
          eyebrow="Quest Helper"
          subtitle="Use the live quest catalog as an unlock board, then open a dedicated quest page when you want requirements, rewards, and follow-up value."
          title="Unlock-first quest planning"
        />
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Catalog {filteredQuests.length}
          </span>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Ranked quest actions {recommendedQuestActions.length}
          </span>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Dedicated detail pages
          </span>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_24rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Catalog"
            subtitle="Browse the structured quest catalog and open any entry into its own richer page."
            title="Quest board"
          />
          {filteredQuests.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No quests matched that search. Clear the filter or try a broader term to reopen the catalog.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredQuests.map((quest) => (
                <div
                  className="rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                  key={quest.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                          {quest.difficulty}
                        </span>
                        <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {quest.category}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl text-osrs-text">{quest.name}</h3>
                      <p className="text-sm leading-7 text-osrs-text-soft">{quest.recommendation_reason}</p>
                    </div>
                    <Button onClick={() => onLoadQuest(quest.id)} variant="secondary">
                      {busyAction === `quest-${quest.id}` ? "Opening..." : "Open details"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Selected quest"
              subtitle="This keeps a cleaner preview in view before you move into the dedicated quest page."
              title="Quest preview"
            />
            {selectedQuest ? (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(60,46,30,0.84),rgba(31,24,18,0.98))] p-5 shadow-insetPanel">
                  <h3 className="font-display text-2xl text-osrs-text">{selectedQuest.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                    {selectedQuest.short_description}
                  </p>
                </div>
                <div className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{selectedQuest.why_it_matters}</p>
                </div>
                <Button className="w-full" onClick={onOpenSelectedQuest}>
                  Open quest page
                </Button>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                No quest is selected yet. Open one from the catalog and Cerebro will load the dedicated unlock page.
              </div>
            )}
          </Panel>

          <Panel className="space-y-4">
            <SectionHeader
              eyebrow="Planner pull"
              subtitle="These are the quest-shaped ranked actions currently surfacing from the planner."
              title="Quest pressure points"
            />
            {recommendedQuestActions.length > 0 ? (
              <div className="grid gap-3">
                {recommendedQuestActions.slice(0, 3).map((action) => (
                  <div
                    className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/55 px-4 py-4 shadow-insetPanel"
                    key={`${action.action_type}-${action.title}`}
                  >
                    <strong className="block text-base text-osrs-text">{action.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
                No ranked quest actions are active yet. Create a goal and sync an account to make the quest board sharper.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
