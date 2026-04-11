import { SkillIcon } from "../components/dashboard/skillIcons";
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
    <div className="space-y-8">
      <section className="border-b border-white/8 pb-7">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.42em] text-osrs-text-soft/75">
              Skills // Training atlas
            </p>
            <h1 className="mt-2 max-w-5xl font-display text-[2.8rem] font-black uppercase leading-[0.98] tracking-[0.08em] text-white md:text-[3.7rem]">
              Training guidance with real account context
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-osrs-text-soft">
              Browse the live skill atlas, then open a dedicated skill page to fetch account-aware methods from
              Cerebro&apos;s backend recommendation layer.
            </p>
          </div>
          <input
            className="w-full min-w-[18rem] max-w-sm border border-white/8 bg-[#0c0c0c] px-4 py-3.5 text-sm text-osrs-text outline-none placeholder:text-osrs-text-soft/55 focus:border-osrs-gold/40"
            onChange={(event) => setSkillSearch(event.target.value)}
            placeholder="Search skills"
            value={skillSearch}
          />
        </div>
      </section>

      {!selectedAccountRsn ? (
        <section className="border border-white/8 bg-[#101010] px-5 py-5 text-sm leading-7 text-osrs-text-soft">
          You can browse the full skill atlas without a selected account, but synced account context is what turns these
          methods into genuinely personalized training advice.
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Active account</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{selectedAccountRsn ?? "Workspace-wide"}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Catalog size</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">{filteredSkills.length}</p>
        </div>
        <div className="border border-white/8 bg-[#101010] px-5 py-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Method source</p>
          <p className="mt-3 font-display text-[1.35rem] uppercase text-white">Live methods</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_22rem]">
        <section className="border border-white/8 bg-[#101010] px-6 py-6">
          <div className="mb-5 border-b border-white/8 pb-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Catalog</p>
            <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Browse skills</h2>
            <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
              Open a skill card to load the richer detail page and recommendation ladder.
            </p>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No skills matched that search. Try a broader term to reopen the full training catalog.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSkills.map((skill) => (
                <button
                  className="border border-white/8 bg-[#111111] p-4 text-left transition hover:border-osrs-gold/35 hover:bg-white/[0.02]"
                  key={skill.key}
                  onClick={() => onLoadSkill(skill.key)}
                  type="button"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-white/8 bg-[#0b0b0b]">
                      <SkillIcon className="h-10 w-10 object-cover" skill={skill.key} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-gold-soft">
                        {skill.category}
                      </span>
                      <strong className="mt-3 block font-display text-xl uppercase text-white">{skill.label}</strong>
                      <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                        Open the dedicated skill page for methods, level bands, requirements, and planner-aware guidance.
                      </p>
                      <span className="mt-4 inline-flex text-xs uppercase tracking-[0.16em] text-osrs-gold">
                        {busyAction === `skill-${skill.key}` ? "Loading..." : "Open skill page"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

          <section className="border border-white/8 bg-[#101010] px-6 py-6">
            <div className="mb-5 border-b border-white/8 pb-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">Latest read</p>
              <h2 className="mt-3 font-display text-[1.18rem] font-bold uppercase tracking-[0.08em] text-white">Loaded skill preview</h2>
              <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
                The most recent skill recommendation still shows here so the catalog page stays informative.
              </p>
          </div>

          {skillRecommendations ? (
            <div className="space-y-4">
              <div className="border border-white/8 bg-[#111111] px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden border border-white/8 bg-[#0b0b0b]">
                    <SkillIcon className="h-12 w-12 object-cover" skill={skillRecommendations.skill} />
                  </div>
                  <div>
                    <h3 className="font-display text-[1.4rem] font-bold uppercase tracking-[0.05em] text-white">{skillRecommendations.skill}</h3>
                    <p className="mt-2 text-sm leading-6 text-osrs-text-soft">
                      Account {selectedAccountRsn ?? "none selected"} | Preference {skillRecommendations.preference} | Current level{" "}
                      {skillRecommendations.current_level ?? "unknown"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                {skillRecommendations.recommendations.slice(0, 3).map((recommendation) => (
                  <div className="border border-white/8 bg-[#111111] px-4 py-4" key={recommendation.method}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-base uppercase text-white">{recommendation.method}</strong>
                        <p className="mt-2 text-sm leading-6 text-osrs-text-soft">{recommendation.rationale}</p>
                      </div>
                      <span className="border border-white/8 bg-[#0b0b0b] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-osrs-text-soft">
                        {recommendation.estimated_xp_rate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-[#0b0b0b] px-4 py-5 text-sm leading-7 text-osrs-text-soft">
              No skill is loaded yet. Open any catalog card and Cerebro will load a dedicated skill page with level bands,
              requirements, and account-aware methods.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
