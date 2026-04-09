import { FeatureCard } from "../ui/FeatureCard";
import { Panel } from "../ui/Panel";
import { SectionHeader } from "../ui/SectionHeader";

type FeatureItem = {
  title: string;
  summary: string;
  eyebrow: string;
  meta?: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type FeatureGridProps = {
  items: FeatureItem[];
};

export function FeatureGrid({ items }: FeatureGridProps) {
  return (
    <Panel className="space-y-3 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(15,13,11,0.98))]" tone="soft">
      <SectionHeader
        eyebrow="Strategic Surfaces"
        subtitle="Keep the surfaces that matter most close at hand while Cerebro reads the account and sharpens the next move."
        title="Command surfaces"
      />
      <div className="cerebro-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <FeatureCard key={item.title} {...item} />
        ))}
      </div>
    </Panel>
  );
}
