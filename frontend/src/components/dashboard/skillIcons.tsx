import { useEffect, useState } from "react";

const skillIconMap: Record<string, string> = {
  attack: "/skills/attack.png",
  strength: "/skills/strength.png",
  defence: "/skills/defence.png",
  ranged: "/skills/ranged.png",
  prayer: "/skills/prayer.png",
  magic: "/skills/magic.png",
  runecraft: "/skills/runecraft.png",
  construction: "/skills/construction.png",
  hitpoints: "/skills/hitpoints.png",
  agility: "/skills/agility.png",
  herblore: "/skills/herblore.png",
  thieving: "/skills/thieving.png",
  crafting: "/skills/crafting.png",
  fletching: "/skills/fletching.png",
  slayer: "/skills/slayer.png",
  hunter: "/skills/hunter.png",
  mining: "/skills/mining.png",
  smithing: "/skills/smithing.png",
  fishing: "/skills/fishing.png",
  cooking: "/skills/cooking.png",
  firemaking: "/skills/firemaking.png",
  woodcutting: "/skills/woodcutting.png",
  farming: "/skills/farming.png",
  sailing: "/skills/sailing.png",
};

export function getSkillIconPath(skill: string): string | null {
  return skillIconMap[skill.toLowerCase()] ?? null;
}

export function SkillIcon(props: { skill: string; className?: string }) {
  const { skill, className = "" } = props;
  const path = getSkillIconPath(skill);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [path]);

  if (!path || failed) {
    return (
      <span className={`font-mono text-[0.62rem] uppercase tracking-[0.18em] text-osrs-gold ${className}`.trim()}>
        {skill.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      alt={`${skill} icon`}
      className={`h-10 w-10 object-cover drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)] ${className}`.trim()}
      onError={() => setFailed(true)}
      src={path}
    />
  );
}
