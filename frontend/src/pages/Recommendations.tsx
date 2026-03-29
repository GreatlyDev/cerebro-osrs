import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { NextAction, NextActionResponse } from "../types";

type RecommendationsPageProps = {
  nextActions: NextActionResponse | null;
  selectedAccountRsn: string | null;
  onGoToGoals: () => void;
  onOpenNextAction: (action: NextAction) => void;
};

function formatSupportLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSupportValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }
  if (typeof value === "string") {
    return value.replaceAll("_", " ");
  }
  return String(value);
}

function buildRecommendationSummary(action: NextAction) {
  const supporting = action.supporting_data ?? {};
  const snippets: string[] = [];

  if (typeof supporting.recommended_skill === "string") {
    const level = supporting.current_level;
    snippets.push(
      level !== undefined && level !== null
        ? `Push ${supporting.recommended_skill} next from level ${level}.`
        : `Push ${supporting.recommended_skill} next.`,
    );
  }

  if (typeof supporting.recommended_quest === "string") {
    snippets.push(`This path is anchored around ${supporting.recommended_quest}.`);
  }

  if (typeof supporting.recommended_upgrade === "string") {
    snippets.push(`The most relevant upgrade right now is ${supporting.recommended_upgrade}.`);
  }

  if (typeof supporting.recommended_route === "string") {
    snippets.push(`Travel setup points toward ${supporting.recommended_route}.`);
  }

  if (Array.isArray(supporting.missing_skills) && supporting.missing_skills.length > 0) {
    snippets.push(`You still need ${supporting.missing_skills.join(", ")} before this fully opens up.`);
  }

  if (Array.isArray(supporting.recently_progressed_skills) && supporting.recently_progressed_skills.length > 0) {
    snippets.push(`Recent momentum showed up in ${supporting.recently_progressed_skills.join(", ")}.`);
  }

  if (supporting.skill_stalled) {
    snippets.push("The planner thinks this path has stalled recently, so it is surfacing a cleaner next move.");
  }

  return snippets.length === 0 ? action.summary : snippets.join(" ");
}

function SupportingData({ action }: { action: NextAction }) {
  const entries = Object.entries(action.supporting_data ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="rounded-[16px] border border-osrs-border-light/30 bg-osrs-gold/10 px-4 py-3 text-sm leading-6 text-osrs-text-soft">
        {buildRecommendationSummary(action)}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => {
          const label = formatSupportLabel(key);
          if (Array.isArray(value)) {
            return (
              <div
                className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.42),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                key={key}
              >
                <strong className="block text-sm text-osrs-text">{label}</strong>
                {value.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {value.map((item, index) => (
                      <span
                        className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft"
                        key={`${key}-${index}`}
                      >
                        {typeof item === "string" ? item.replaceAll("_", " ") : JSON.stringify(item)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-osrs-text-soft">None tracked.</p>
                )}
              </div>
            );
          }

          if (value && typeof value === "object") {
            return (
              <div
                className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.42),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                key={key}
              >
                <strong className="block text-sm text-osrs-text">{label}</strong>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(value).map(([nestedKey, nestedValue]) => (
                    <span
                      className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft"
                      key={`${key}-${nestedKey}`}
                    >
                      {formatSupportLabel(nestedKey)}: {formatSupportValue(nestedValue)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.42),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
              key={key}
            >
              <strong className="block text-sm text-osrs-text">{label}</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{formatSupportValue(value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecommendationsView({
  nextActions,
  selectedAccountRsn,
  onGoToGoals,
  onOpenNextAction,
}: RecommendationsPageProps) {
  const actions = nextActions?.actions ?? [];

  return (
    <div className="space-y-6">
      <Panel tone="hero">
        <SectionHeader
          action={<Button onClick={onGoToGoals} variant="secondary">Open Goal Planner</Button>}
          eyebrow="Recommendation Board"
          subtitle="This is Cerebro’s ranked action room: a premium readout of what matters next, why it matters, and where each recommendation points."
          title="Ranked next actions"
        />
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Account {selectedAccountRsn ?? "none selected"}
          </span>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Goal {nextActions?.goal_title ?? "not anchored"}
          </span>
          <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5">
            Actions {actions.length}
          </span>
        </div>
      </Panel>

      {actions.length === 0 ? (
        <Panel>
          <p className="text-sm leading-7 text-osrs-text-soft">
            Link an account and create a real goal to turn this board into a ranked progression room.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4">
          {actions.map((action, index) => (
            <Panel
              className={`space-y-4 ${index === 0 ? "border-osrs-border-light/70 shadow-glowGold" : ""}`}
              key={`${action.action_type}-${action.title}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                      {index === 0 ? "Top action" : `Option ${index + 1}`}
                    </span>
                    <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                      {action.action_type}
                    </span>
                    <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                      {action.priority}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl text-osrs-text">{action.title}</h3>
                  <p className="max-w-3xl text-sm leading-7 text-osrs-text-soft">{action.summary}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-[16px] border border-osrs-border/70 bg-osrs-panel-2/70 px-4 py-3 text-center">
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Score</p>
                    <strong className="font-display text-xl text-osrs-text">{action.score}</strong>
                  </div>
                  <Button onClick={() => onOpenNextAction(action)}>Open</Button>
                </div>
              </div>

              {action.blockers.length > 0 ? (
                <div className="rounded-[16px] border border-osrs-danger/35 bg-osrs-danger/10 px-4 py-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current blockers</p>
                  <ul className="mt-2 space-y-2 text-sm text-osrs-text-soft">
                    {action.blockers.map((blocker) => (
                      <li key={blocker}>• {blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <SupportingData action={action} />
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
