import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type InventoryPanelProps = {
  title: string;
  items: Array<{ slot: string; item: string | null }>;
};

export function InventoryPanel({ title, items }: InventoryPanelProps) {
  return (
    <Panel className="space-y-4">
      <SectionHeader
        eyebrow="Equipment Chest"
        subtitle="A themed slot view for the current workspace. Real tracked gear fills these first; empty slots stay visibly unclaimed."
        title={title}
      />
      <div className="grid grid-cols-3 gap-3">
        {items.map((entry) => (
          <div
            className="cerebro-hover flex min-h-[5.25rem] flex-col justify-between rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(59,47,38,0.52),rgba(25,20,16,0.96))] p-3 shadow-insetPanel"
            key={entry.slot}
          >
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">{entry.slot}</p>
            <strong className="font-display text-sm text-osrs-text">
              {entry.item ?? "Empty"}
            </strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}
