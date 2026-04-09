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
};

export function getSkillIconPath(skill: string): string | null {
  return skillIconMap[skill.toLowerCase()] ?? null;
}
