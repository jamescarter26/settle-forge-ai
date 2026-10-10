import { useState } from "react";
import type { GameConfig, PlayerColor, SeatConfig } from "@/engine/types";
import { COLOR_LABEL, playerFill } from "./theme";

const COLORS: PlayerColor[] = ["rouge", "bleu", "jaune", "vert"];
const NAMES = ["Kaya", "Ti Frère", "Ravanne", "Marie-Josée"];
const MODES = [
  { label: "4 humains", humans: 4 },
  { label: "2 humains + 2 robots", humans: 2 },
  { label: "1 humain + 3 robots", humans: 1 },
  { label: "4 robots (spectateur)", humans: 0 },
];
const makeSeats = (humans: number, count: number): SeatConfig[] =>
  COLORS.slice(0, count).map((c, i) => ({
    color: c,
    isBot: i >= humans,
    name: i >= humans ? `Robot ${NAMES[i]}` : `Joueur ${i + 1}`,
  }));

export function SetupScreen({ onStart }: { onStart: (c: GameConfig, seed: number) => void }) {
  const [seats, setSeats] = useState<SeatConfig[]>(makeSeats(1, 4));
  const [seed, setSeed] = useState(2026);
  const update = (i: number, patch: Partial<SeatConfig>) => setSeats((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setCount = (n: number) => {
    const humans = seats.filter((s) => !s.isBot).length;
    setSeats(makeSeats(Math.min(humans, n), n));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Jeu de colonisation mauricien</p>
        <h1 className="mt-2 text-6xl font-black text-sand">MORIS</h1>
        <p className="mt-1 font-display text-2xl italic text-primary">Les Bâtisseurs de l'Île</p>
        <p className="mt-3 text-muted-foreground">3 à 4 sièges · 10 points de victoire pour gagner</p>
      </header>

      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Mode de session</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map((m) => (
            <button key={m.label} onClick={() => setSeats(makeSeats(Math.min(m.humans, seats.length), seats.length))} className="rounded-lg border bg-secondary px-3 py-2 text-sm hover:border-accent">
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <span className="text-muted-foreground">Sièges :</span>
          {[3, 4].map((n) => (
            <button key={n} onClick={() => setCount(n)} className={`rounded-md px-3 ${seats.length === n ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
              {n}
            </button>
          ))}
        </div>
        {seats.filter((s) => !s.isBot).length === 2 && seats.length < 3 && <p className="text-sm text-primary">Complétez avec des robots.</p>}
      </section>

      <section className="panel space-y-2">
        {seats.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full border-2 border-sand" style={{ background: playerFill(s.color) }} title={COLOR_LABEL[s.color]} />
            <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1 rounded-md border bg-input/30 px-3 py-1.5" />
            <button onClick={() => update(i, { isBot: !s.isBot })} className="w-28 rounded-md border bg-secondary py-1.5 text-sm">
              {s.isBot ? "🤖 Robot" : "🧑 Humain"}
            </button>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Graine
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-32 rounded-md border bg-input/30 px-2 py-1 text-foreground" />
          <button onClick={() => setSeed(Math.floor(Math.random() * 1e6))} className="rounded-md bg-secondary px-2 py-1">🎲</button>
        </label>
        <button onClick={() => onStart({ seats }, seed)} className="rounded-xl bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-lg hover:brightness-110">
          Lancer la partie
        </button>
      </div>
    </div>
  );
}
