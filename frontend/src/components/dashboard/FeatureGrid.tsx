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
    <Panel className="space-y-5" tone="soft">
      <SectionHeader
        eyebrow="Strategic Surfaces"
        subtitle="These are the highest-value Cerebro surfaces to keep close at hand as the planner gets smarter."
        title="Command modules"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <FeatureCard key={item.title} {...item} />
        ))}
      </div>
    </Panel>
  );
}
