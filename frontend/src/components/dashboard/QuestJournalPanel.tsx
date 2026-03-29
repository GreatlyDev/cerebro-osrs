import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type JournalEntry = {
  title: string;
  summary: string;
  tag: string;
};

type QuestJournalPanelProps = {
  entries: JournalEntry[];
};

export function QuestJournalPanel({ entries }: QuestJournalPanelProps) {
  return (
    <Panel className="space-y-4">
      <SectionHeader
        eyebrow="Quest Journal"
        subtitle="The right rail keeps a tighter journal-like list of what the planner thinks matters next."
        title="Recommended next steps"
      />
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
            No journal entries yet. Sync an account and generate a goal plan to surface recommendations here.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(54,43,33,0.52),rgba(23,18,14,0.96))] p-4 shadow-insetPanel"
              key={`${entry.tag}-${entry.title}`}
            >
              <div className="mb-2 inline-flex rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-osrs-gold-soft">
                {entry.tag}
              </div>
              <strong className="block font-display text-base text-osrs-text">{entry.title}</strong>
              <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{entry.summary}</p>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
