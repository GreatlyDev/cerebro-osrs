import { RecommendationThumb } from "../components/dashboard/RecommendationThumb";
import { Button } from "../components/ui/Button";
import type { AccountReadiness, NextAction, NextActionResponse } from "../types";

type RecommendationsPageProps = {
  nextActions: NextActionResponse | null;
  selectedAccountRsn: string | null;
  onAskAdvisor: (prompt: string, action?: NextAction) => void;
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

function formatReadinessText(value: string | undefined | null, fallback: string) {
  return value ? value.replaceAll("_", " ") : fallback;
}

function ReadinessPanel({ readiness }: { readiness: AccountReadiness }) {
  const trustedSources = readiness.trusted_sources ?? [];
  const missingInputs = readiness.missing_inputs ?? [];

  return (
    <section className="border border-white/8 bg-[#101010] px-5 py-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-osrs-gold">Account brain readiness</p>
          <h2 className="mt-3 font-display text-[1.65rem] font-bold uppercase tracking-[0.05em] text-white">
            Planning confidence is {formatReadinessText(readiness.confidence, "unknown")}
          </h2>
          {readiness.advisor_warning ? (
            <p className="mt-3 text-sm leading-7 text-osrs-text-soft">{readiness.advisor_warning}</p>
          ) : (
            <p className="mt-3 text-sm leading-7 text-osrs-text-soft">
              Cerebro has enough account context to rank actions without adding an extra caution note.
            </p>
          )}
        </div>
        <div className="grid min-w-[18rem] gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="border border-white/8 bg-[#0b0b0b] px-4 py-4">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-osrs-gold-soft">Next sync</p>
            <p className="mt-2 font-display text-lg uppercase text-white">
              {formatReadinessText(readiness.next_sync_needed, "none queued")}
            </p>
          </div>
          <div className="border border-white/8 bg-[#0b0b0b] px-4 py-4">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-osrs-gold-soft">Trusted sources</p>
            <p className="mt-2 text-sm uppercase tracking-[0.08em] text-white">
              {trustedSources.length > 0 ? trustedSources.join(" / ") : "None yet"}
            </p>
          </div>
        </div>
      </div>

      {missingInputs.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {missingInputs.map((input) => (
            <span className="border border-osrs-gold/25 bg-[rgba(212,175,55,0.08)] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-osrs-gold-soft" key={input}>
              Needs {input}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SupportingData({ action }: { action: NextAction }) {
  const entries = Object.entries(action.supporting_data ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="border border-white/8 bg-[#111111] px-4 py-4 text-sm leading-7 text-osrs-text-soft">
        {buildRecommendationSummary(action)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => {
          const label = formatSupportLabel(key);

          if (Array.isArray(value)) {
            return (
              <div className="border border-white/8 bg-[#111111] px-4 py-4" key={key}>
                <strong className="block text-sm uppercase tracking-[0.08em] text-white">{label}</strong>
                {value.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {value.map((item, index) => (
                      <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={`${key}-${index}`}>
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
              <div className="border border-white/8 bg-[#111111] px-4 py-4" key={key}>
                <strong className="block text-sm uppercase tracking-[0.08em] text-white">{label}</strong>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(value).map(([nestedKey, nestedValue]) => (
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={`${key}-${nestedKey}`}>
                      {formatSupportLabel(nestedKey)}: {formatSupportValue(nestedValue)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div className="border border-white/8 bg-[#111111] px-4 py-4" key={key}>
              <strong className="block text-sm uppercase tracking-[0.08em] text-white">{label}</strong>
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
  onAskAdvisor,
  onGoToGoals,
  onOpenNextAction,
}: RecommendationsPageProps) {
  const actions = nextActions?.actions ?? [];
  const accountReadiness = nextActions?.context.account_readiness ?? null;

  return (
    <div className="space-y-8">
      <section className="border-b border-white/8 pb-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Recommendations // Ranked action room
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[2.8rem] font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-[3.7rem]">
              See the next actions Cerebro is actually backing
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              This board is the planner&apos;s ranked read of what matters next, why it matters, and which move gives
              the cleanest momentum right now. Goals can sharpen the stack, but the board should still be useful
              when you are simply reading the account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => onAskAdvisor("What should I actually act on first from this recommendation stack?")}
              variant="secondary"
            >
              Ask Cerebro
            </Button>
            <Button onClick={onGoToGoals} variant="secondary">
              Open Goal Planner
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "None selected"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Goal anchor</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{nextActions?.goal_title ?? "Optional"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Ranked actions</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{actions.length}</p>
        </div>
      </div>

      {accountReadiness ? <ReadinessPanel readiness={accountReadiness} /> : null}

      {actions.length === 0 ? (
        <section className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">
          Link an account to turn this into a ranked progression room. Add a goal when you want a stronger planning
          anchor, not because the workspace is unusable without one.
        </section>
      ) : (
        <div className="grid gap-4">
          {actions.map((action, index) => (
            <section
              className={`border bg-[#101010] px-5 py-5 ${
                index === 0 ? "border-osrs-gold/45 shadow-[0_0_0_1px_rgba(212,175,55,0.08)]" : "border-white/8"
              }`}
              key={`${action.action_type}-${action.title}`}
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 gap-5">
                  <RecommendationThumb action={action} className="h-24 w-24 shrink-0" />
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-white/8 bg-[#0b0b0b] px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                        {index === 0 ? "Top action" : `Option ${index + 1}`}
                      </span>
                      <span className="border border-white/8 bg-[#0b0b0b] px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                        {action.action_type}
                      </span>
                      <span className="border border-white/8 bg-[#0b0b0b] px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                        {action.priority}
                      </span>
                    </div>
                    <h2 className="font-display text-[1.75rem] font-bold uppercase leading-tight tracking-[0.05em] text-white">{action.title}</h2>
                    <p className="max-w-3xl text-sm leading-7 text-osrs-text-soft">{action.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="border border-white/8 bg-[#0b0b0b] px-4 py-3 text-center">
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold">Score</p>
                    <strong className="font-display text-xl text-white">{action.score}</strong>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => onOpenNextAction(action)}>Open</Button>
                    <Button
                      onClick={() => onAskAdvisor(`Why is ${action.title} ranked this highly for my account right now?`, action)}
                      variant="secondary"
                    >
                      Ask why
                    </Button>
                  </div>
                </div>
              </div>

              {action.blockers.length > 0 ? (
                <div className="mt-5 border border-red-900/40 bg-[rgba(90,20,20,0.16)] px-4 py-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold">Current blockers</p>
                  <ul className="mt-2 space-y-2 text-sm text-osrs-text-soft">
                    {action.blockers.map((blocker) => (
                      <li key={blocker}>- {blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5">
                <SupportingData action={action} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
