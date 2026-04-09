import { SkillIcon } from "../components/dashboard/skillIcons";
import { Button } from "../components/ui/Button";
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
    return <div className="border border-white/8 bg-[#101010] px-6 py-6 text-sm leading-7 text-osrs-text-soft">No skill loaded.</div>;
  }

  return (
    <div className="space-y-10">
      <section className="border-b border-white/8 pb-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Skill // Detail view
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[3.1rem] font-black tracking-[0.02em] text-white md:text-[4rem]">
              Train {skillRecommendations.skill} smarter
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Live methods from the backend recommendation layer, plus a compact read of how Cerebro is judging this skill right now.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onBackToSkills} variant="secondary">All skills</Button>
            <Button onClick={() => onReloadSkill(skillRecommendations.skill)}>Refresh skill</Button>
            <Button onClick={onBackToDashboard} variant="secondary">Dashboard</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "None selected"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Current level</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{skillRecommendations.current_level ?? "unknown"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Preference</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{skillRecommendations.preference}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Methods</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Recommended training methods</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">Live methods from the backend recommendation layer.</p>
          </div>
          <div className="grid gap-4">
            {skillRecommendations.recommendations.map((recommendation) => (
              <div className="border border-white/8 bg-[#111111] p-5" key={recommendation.method}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <strong className="block font-display text-2xl text-white">{recommendation.method}</strong>
                    <p className="mt-2 text-sm leading-7 text-osrs-text-soft">{recommendation.rationale}</p>
                  </div>
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs uppercase tracking-[0.18em] text-osrs-text-soft">
                    {recommendation.estimated_xp_rate}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-gold-soft">
                    Levels {recommendation.min_level}-{recommendation.max_level}
                  </span>
                  <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft">
                    {recommendation.preference}
                  </span>
                  {recommendation.tags.map((tag) => (
                    <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-xs text-osrs-text-soft" key={tag}>
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
        </section>

        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Skill frame</p>
            <h2 className="mt-3 font-display text-[1.5rem] font-bold text-white">Training posture</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">A compact read of how Cerebro is judging this skill right now.</p>
          </div>
          <div className="border border-white/8 bg-[#111111] px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden border border-white/8 bg-[#0b0b0b]">
                <SkillIcon className="h-12 w-12 object-cover" skill={skillRecommendations.skill} />
              </div>
              <div>
                <strong className="block font-display text-2xl uppercase text-white">{skillRecommendations.skill}</strong>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                  Account {selectedAccountRsn ?? "none selected"} | Level {skillRecommendations.current_level ?? "unknown"} | Preference {skillRecommendations.preference}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
