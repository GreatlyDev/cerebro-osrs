import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { SkillRecommendationResponse } from "../types";

type SkillDetailProps = {
  onBackToDashboard: () => void;
  onBackToSkills: () => void;
  onReloadSkill: (skillKey: string) => void;
  selectedAccountRsn: string | null;
  skillRecommendations: SkillRecommendationResponse | null;
};

export function SkillDetailView({
  onBackToDashboard,
  onBackToSkills,
  onReloadSkill,
  selectedAccountRsn,
  skillRecommendations,
}: SkillDetailProps) {
  if (!skillRecommendations) {
    return (
      <Panel>
        <p className="text-sm leading-7 text-osrs-text-soft">No skill loaded.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        action={
          <div className="flex gap-3">
            <Button onClick={onBackToSkills} variant="secondary">All skills</Button>
            <Button onClick={() => onReloadSkill(skillRecommendations.skill)}>Refresh skill</Button>
          </div>
        }
        chips={[
          { label: "Account", value: selectedAccountRsn ?? "None selected" },
          { label: "Current level", value: String(skillRecommendations.current_level ?? "unknown") },
          { label: "Preference", value: skillRecommendations.preference },
        ]}
        description={skillRecommendations.skill}
        eyebrow="Skill Detail"
        title={`Train ${skillRecommendations.skill} smarter`}
      >
        <div className="flex flex-wrap gap-3 text-sm text-osrs-text-soft">
          <button
            className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1.5"
            onClick={onBackToDashboard}
            type="button"
          >
            Dashboard
          </button>
        </div>
      </PageHero>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))]">
          <SectionHeader
            eyebrow="Methods"
            subtitle="Live methods from the backend recommendation layer."
            title="Recommended training methods"
          />
          <div className="grid gap-4">
            {skillRecommendations.recommendations.map((recommendation) => (
              <div
                className="rounded-[18px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                key={recommendation.method}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <strong className="block font-display text-2xl text-osrs-text">{recommendation.method}</strong>
                    <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{recommendation.rationale}</p>
                  </div>
                    <span className="rounded-full border border-osrs-border/45 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-osrs-text-soft">
                    {recommendation.estimated_xp_rate}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-osrs-border/45 bg-black/20 px-3 py-1 text-xs text-osrs-gold-soft">
                    Levels {recommendation.min_level}-{recommendation.max_level}
                  </span>
                  <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-xs text-osrs-text-soft">
                    {recommendation.preference}
                  </span>
                  {recommendation.tags.map((tag) => (
                    <span
                      className="rounded-full border border-osrs-border/45 bg-black/20 px-3 py-1 text-xs text-osrs-text-soft"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {recommendation.requirements.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-osrs-text-soft">
                    {recommendation.requirements.map((requirement) => (
                      <li key={requirement}>- {requirement}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4 border-osrs-border/45 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(15,13,11,0.98))]">
          <SectionHeader
            eyebrow="Skill frame"
            subtitle="A compact read of how Cerebro is judging this skill right now."
            title="Training posture"
          />
          <div className="grid gap-3">
            <div className="rounded-[16px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.32))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <strong className="block text-osrs-text">Selected account</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{selectedAccountRsn ?? "none selected"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.32))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <strong className="block text-osrs-text">Current level</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{skillRecommendations.current_level ?? "unknown"}</p>
            </div>
            <div className="rounded-[16px] border border-osrs-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.32))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <strong className="block text-osrs-text">Preference</strong>
              <p className="mt-2 text-sm text-osrs-text-soft">{skillRecommendations.preference}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
