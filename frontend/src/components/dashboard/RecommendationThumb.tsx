import type { NextAction } from "../../types";
import { SkillIcon } from "./skillIcons";

function getActionSkill(action: NextAction): string | null {
  const targetSkill = action.target?.skill;
  if (typeof targetSkill === "string" && targetSkill.trim()) {
    return targetSkill;
  }

  const supportingSkill = action.supporting_data?.recommended_skill;
  if (typeof supportingSkill === "string" && supportingSkill.trim()) {
    return supportingSkill;
  }

  const titleMatch = action.title.match(/train\s+([a-z]+)/i);
  if (titleMatch) {
    return titleMatch[1];
  }

  return null;
}

function ActionGlyph({ actionType }: { actionType: string }) {
  if (actionType === "quest") {
    return (
      <svg aria-hidden="true" className="h-10 w-10 text-osrs-gold" viewBox="0 0 24 24" fill="none">
        <path d="M7 3.5h8.5L19 7v13.5H7z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15.5 3.5V7H19" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 10.5h6M10 13.5h6M10 16.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (actionType === "gear") {
    return (
      <svg aria-hidden="true" className="h-10 w-10 text-osrs-gold" viewBox="0 0 24 24" fill="none">
        <path d="M14.5 4 20 9.5 9.5 20H4l.5-5.5z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 5.5 18.5 11" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (actionType === "travel") {
    return (
      <svg aria-hidden="true" className="h-10 w-10 text-osrs-gold" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="12" rx="6.5" ry="9" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3v18M5.5 8h13M5.5 16h13" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-10 w-10 text-osrs-gold" viewBox="0 0 24 24" fill="none">
      <path
        d="m12 4 1.85 4.78L19 10.3l-3.96 3.2 1.36 4.9L12 15.75 7.6 18.4l1.36-4.9L5 10.3l5.15-1.52z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function RecommendationThumb({ action, className = "" }: { action: NextAction; className?: string }) {
  const skill = action.action_type === "skill" ? getActionSkill(action) : null;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden border border-white/8 bg-[radial-gradient(circle_at_35%_30%,rgba(212,175,55,0.22),transparent_38%),linear-gradient(180deg,#141414_0%,#0a0a0a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`.trim()}
    >
      {skill ? <SkillIcon className="h-12 w-12 object-cover" skill={skill} /> : <ActionGlyph actionType={action.action_type} />}
    </div>
  );
}
