import { Button } from "../components/ui/Button";
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
    <div className="space-y-8">
      <section className="border-b border-white/8 pb-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Quests // Unlock board
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[2.8rem] font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-[3.7rem]">
              Unlock-first quest planning
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Use the live quest catalog as an unlock board, then open a dedicated quest page when you want requirements,
              rewards, blockers, and follow-up value.
            </p>
          </div>
          <input
            className="w-full min-w-[18rem] max-w-sm border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
            onChange={(event) => setQuestSearch(event.target.value)}
            placeholder="Search quests"
            value={questSearch}
          />
        </div>
      </section>

      {recommendedQuestActions.length === 0 ? (
        <section className="border border-white/8 bg-[#101010] px-5 py-5 text-sm leading-7 text-osrs-text-soft">
          The quest catalog is still useful without an active planner lane. Once you sync an account or anchor a goal,
          Cerebro will start surfacing much sharper unlock pressure here.
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Catalog entries</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{filteredQuests.length}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Quest pressure</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{recommendedQuestActions.length}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Detail mode</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">Dedicated pages</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-5 border-b border-white/8 pb-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Catalog</p>
            <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Quest board</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Browse the structured quest catalog and open any entry into its own richer page.
            </p>
          </div>

          {filteredQuests.length === 0 ? (
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No quests matched that search. Clear the filter or try a broader term to reopen the catalog.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredQuests.map((quest) => (
                <div className="border border-white/8 bg-[#111111] p-4" key={quest.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                          {quest.difficulty}
                        </span>
                        <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                          {quest.category}
                        </span>
                      </div>
                      <h3 className="font-display text-[1.4rem] font-bold uppercase tracking-[0.05em] text-white">{quest.name}</h3>
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
        </section>

        <div className="space-y-6">
          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Selected quest</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Quest preview</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                This keeps a cleaner preview in view before you move into the dedicated quest page.
              </p>
            </div>

            {selectedQuest ? (
              <div className="space-y-4">
                <div className="border border-white/8 bg-[#111111] p-5">
                  <h3 className="font-display text-[1.4rem] font-bold uppercase tracking-[0.05em] text-white">{selectedQuest.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{selectedQuest.short_description}</p>
                </div>
                <div className="border border-white/8 bg-[#111111] p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{selectedQuest.why_it_matters}</p>
                </div>
                <Button className="w-full" onClick={onOpenSelectedQuest}>
                  Open quest page
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
                No quest is selected yet. Open one from the catalog and Cerebro will load the dedicated unlock page.
              </div>
            )}
          </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Planner pull</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Quest pressure points</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                These are the quest-shaped ranked actions currently surfacing from the planner.
              </p>
            </div>

            {recommendedQuestActions.length > 0 ? (
              <div className="grid gap-3">
                {recommendedQuestActions.slice(0, 3).map((action) => (
                  <div className="border border-white/8 bg-[#111111] px-4 py-4" key={`${action.action_type}-${action.title}`}>
                    <strong className="block text-base uppercase text-white">{action.title}</strong>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{action.summary}</p>
                  </div>
                ))}
              </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No ranked quest actions are active yet. Sync an account or anchor one goal and this board will start
              pulling the unlocks that matter most.
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
