import { PageHero } from "../components/ui/PageHero";
import { Panel } from "../components/ui/Panel";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { SkillCatalogItem, SkillRecommendationResponse } from "../types";

type SkillsViewProps = {
  busyAction: string | null;
  filteredSkills: SkillCatalogItem[];
  onLoadSkill: (skillKey: string) => void;
  selectedAccountRsn: string | null;
  setSkillSearch: (value: string) => void;
  skillRecommendations: SkillRecommendationResponse | null;
  skillSearch: string;
};

export function SkillsView({
  busyAction,
  filteredSkills,
  onLoadSkill,
  selectedAccountRsn,
  setSkillSearch,
  skillRecommendations,
  skillSearch,
}: SkillsViewProps) {
  return (
    <div className="space-y-6">
      <PageHero
        action={
          <input
            className="w-full min-w-[14rem] rounded-[14px] border border-osrs-border/80 bg-[linear-gradient(180deg,rgba(50,40,28,0.34),rgba(18,22,20,0.9))] px-4 py-3 text-sm text-osrs-text shadow-insetPanel outline-none placeholder:text-osrs-text-soft/60 focus:border-osrs-border-light/80"
            onChange={(event) => setSkillSearch(event.target.value)}
            placeholder="Search skills"
            value={skillSearch}
          />
        }
        chips={[
          { label: "Active account", value: selectedAccountRsn ?? "None selected" },
          { label: "Catalog size", value: String(filteredSkills.length) },
          { label: "Method source", value: "Live methods" },
        ]}
        description="Browse the live skill atlas, then open a dedicated skill page to fetch account-aware methods from Cerebro's backend recommendation layer."
        eyebrow="Skill Atlas"
        title="Training guidance with real account context"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_24rem]">
        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Catalog"
            subtitle="Open a skill card to load the richer detail page and recommendation ladder."
            title="Browse skills"
          />
          {filteredSkills.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No skills matched that search. Try a broader term to reopen the full training catalog.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSkills.map((skill) => (
                <button
                  className="cerebro-hover rounded-[18px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 text-left shadow-insetPanel"
                  key={skill.key}
                  onClick={() => onLoadSkill(skill.key)}
                  type="button"
                >
                  <span className="inline-flex rounded-full border border-osrs-border-light/60 bg-osrs-gold/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                    {skill.category}
                  </span>
                  <strong className="mt-4 block font-display text-xl text-osrs-text">{skill.label}</strong>
                  <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                    Open the dedicated skill page for training methods, level bands, requirements, and planner-aware guidance.
                  </p>
                  <span className="mt-4 inline-flex text-xs uppercase tracking-[0.16em] text-osrs-gold">
                    {busyAction === `skill-${skill.key}` ? "Loading..." : "Open skill page"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="space-y-4">
          <SectionHeader
            eyebrow="Latest read"
            subtitle="The most recent skill recommendation still shows here so the catalog page stays informative."
            title="Loaded skill preview"
          />
          {skillRecommendations ? (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-osrs-border-light/60 bg-[linear-gradient(180deg,rgba(60,46,30,0.84),rgba(31,24,18,0.98))] p-5 shadow-insetPanel">
                <h3 className="font-display text-2xl text-osrs-text">{skillRecommendations.skill}</h3>
                <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                  Account {selectedAccountRsn ?? "none selected"} | Preference {skillRecommendations.preference} | Current level{" "}
                  {skillRecommendations.current_level ?? "unknown"}
                </p>
              </div>
              <div className="grid gap-3">
                {skillRecommendations.recommendations.slice(0, 3).map((recommendation) => (
                  <div
                    className="rounded-[16px] border border-osrs-border/70 bg-[linear-gradient(180deg,rgba(56,44,35,0.5),rgba(24,19,15,0.96))] p-4 shadow-insetPanel"
                    key={recommendation.method}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-base text-osrs-text">{recommendation.method}</strong>
                        <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{recommendation.rationale}</p>
                      </div>
                      <span className="rounded-full border border-osrs-border/70 bg-osrs-panel-2/70 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                        {recommendation.estimated_xp_rate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-osrs-border/70 bg-osrs-panel/40 px-4 py-5 text-sm leading-6 text-osrs-text-soft">
              No skill is loaded yet. Open any catalog card and Cerebro will take you into a dedicated skill detail page with live methods.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
