import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type InventoryPanelProps = {
  title: string;
  items: Array<{ slot: string; item: string | null }>;
};

export function InventoryPanel({ title, items }: InventoryPanelProps) {
  return (
    <Panel className="space-y-4 border-osrs-border/50 bg-[linear-gradient(180deg,rgba(14,14,14,0.98),rgba(11,11,11,0.98))] p-4">
      <SectionHeader
        eyebrow="Equipment Chest"
        subtitle="Real tracked gear fills these first; empty slots stay visibly unclaimed."
        title={title}
      />
      <div className="grid grid-cols-3 gap-3">
        {items.map((entry) => (
          <div
            className="cerebro-hover flex min-h-[5.15rem] flex-col justify-between rounded-[16px] border border-osrs-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
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
