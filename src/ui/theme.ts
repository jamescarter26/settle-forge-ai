import type { PlayerColor, Resource, Terrain, PortType } from "@/engine/types";

export const RES_ICON: Record<Resource, string> = {
  sucre: "🎋",
  basalte: "🪨",
  the: "🍵",
  ananas: "🍍",
  poisson: "🐟",
};
export const terrainFill = (t: Terrain) => `var(--res-${t})`;
export const playerFill = (c: PlayerColor) => `var(--player-${c})`;
export const COLOR_LABEL: Record<PlayerColor, string> = {
  rouge: "Rouge",
  bleu: "Bleu",
  jaune: "Jaune",
  vert: "Vert",
};
export const portLabel = (p: PortType) => (p === "generic" ? "3:1" : `2:1 ${RES_ICON[p]}`);
