import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createGame } from "@/engine/engine";
import type { GameState } from "@/engine/types";
import { SetupScreen } from "@/ui/SetupScreen";
import { GameScreen } from "@/ui/GameScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MORIS — Les Bâtisseurs de l'Île" },
      { name: "description", content: "Jeu de colonisation mauricien pour 3 à 4 joueurs, humains ou robots." },
      { property: "og:title", content: "MORIS — Les Bâtisseurs de l'Île" },
      { property: "og:description", content: "Bâtissez campements et cottages créoles sur l'île Maurice. 10 PV pour gagner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [game, setGame] = useState<GameState | null>(null);
  if (!game) return <SetupScreen onStart={(c, seed) => setGame(createGame(c, seed))} />;
  return <GameScreen key={game.seed} initial={game} onQuit={() => setGame(null)} />;
}
