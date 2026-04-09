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
    <Panel className="space-y-4 border-osrs-border/50 bg-[linear-gradient(180deg,rgba(14,14,14,0.98),rgba(11,11,11,0.98))] p-4">
      <SectionHeader eyebrow="Quest journal" subtitle="A compact command log of what matters next, without falling back into raw planner clutter." title="Recommended next steps" />
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-osrs-border/50 bg-black/20 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
            No journal entries yet. Sync an account and generate a goal plan to surface recommendations here.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              className="rounded-[16px] border border-osrs-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              key={`${entry.tag}-${entry.title}`}
            >
              <div className="mb-2 inline-flex rounded-full border border-osrs-border/40 bg-black/20 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-osrs-gold-soft">
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
