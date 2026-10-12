import { useEffect, useMemo, useState } from "react";
import { actor, applyAction, canAfford, COSTS, DEV_LABEL, emptyRes, handTotal, legalActions, RES_LABEL, tradeRatio, vp, WIN_VP } from "@/engine/engine";
import { RESOURCES, type Action, type DevType, type GameState, type ResMap, type Resource } from "@/engine/types";
import { botAction } from "@/bots/bot";
import { BoardView } from "./BoardView";
import { RES_ICON, playerFill } from "./theme";

type Mode = null | "road" | "settlement" | "city";
const btn = "rounded-md border bg-secondary px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40 disabled:hover:border-border";

function Counter({ value, onChange, max }: { value: ResMap; onChange: (v: ResMap) => void; max?: ResMap }) {
  return (
    <div className="flex flex-wrap gap-1">
      {RESOURCES.map((r) => (
        <div key={r} className="flex items-center gap-1 rounded bg-secondary px-1.5 py-1 text-sm">
          <span>{RES_ICON[r]}</span>
          <button className="px-1" onClick={() => onChange({ ...value, [r]: Math.max(0, value[r] - 1) })}>−</button>
          <span className="w-4 text-center">{value[r]}</span>
          <button className="px-1" disabled={max && value[r] >= max[r]} onClick={() => onChange({ ...value, [r]: value[r] + 1 })}>+</button>
        </div>
      ))}
    </div>
  );
}

export function GameScreen({ initial, onQuit }: { initial: GameState; onQuit: () => void }) {
  const [s, setS] = useState(initial);
  const [mode, setMode] = useState<Mode>(null);
  const [err, setErr] = useState<string | null>(null);
  const [discard, setDiscard] = useState(emptyRes());
  const [give, setGive] = useState(emptyRes());
  const [get, setGet] = useState(emptyRes());
  const [tradeTo, setTradeTo] = useState<number>(-1);
  const [bankGive, setBankGive] = useState<Resource>("sucre");
  const [bankGet, setBankGet] = useState<Resource>("basalte");
  const [pick, setPick] = useState<Resource[]>([]);

  const who = actor(s);
  const me = who !== null ? s.players[who] : null;
  const human = me && !me.isBot;
  const legal = useMemo(() => (who !== null ? legalActions(s, who) : []), [s, who]);

  const act = (a: Action) => {
    try {
      setS((cur) => applyAction(cur, a));
      setErr(null);
      setMode(null);
      setPick([]);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    if (who === null || !s.players[who].isBot) return;
    const t = setTimeout(() => {
      try {
        setS((cur) => applyAction(cur, botAction(cur, who)));
      } catch (e) {
        setErr("Robot : " + (e as Error).message);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [s, who]);

  useEffect(() => setDiscard(emptyRes()), [s.discardQueue[0]?.player]);

  const vSpots = new Set<number>();
  const eSpots = new Set<number>();
  const hSpots = new Set<number>();
  if (human) {
    for (const a of legal) {
      if (a.type === "PLACE_SETTLEMENT" || (a.type === "BUILD_SETTLEMENT" && mode === "settlement") || (a.type === "BUILD_CITY" && mode === "city")) vSpots.add(a.vertex);
      if (a.type === "PLACE_ROAD" || (a.type === "BUILD_ROAD" && (mode === "road" || s.freeRoads > 0))) eSpots.add(a.edge);
      if (a.type === "MOVE_MONKEY") hSpots.add(a.hex);
    }
  }
  const find = (pred: (a: Action) => boolean) => legal.find(pred);
  const onVertex = (v: number) => {
    const a = find((x) => "vertex" in x && x.vertex === v);
    if (a) act(a);
  };
  const onEdge = (e: number) => {
    const a = find((x) => "edge" in x && x.edge === e);
    if (a) act(a);
  };
  const onHex = (h: number) => act({ type: "MOVE_MONKEY", player: who!, hex: h });
  const has = (t: Action["type"]) => legal.some((a) => a.type === t);

  const prompt = (() => {
    if (s.phase === "GAME_OVER") return `🏆 ${s.players[s.winner!].name} gagne !`;
    if (!me) return "";
    if (s.phase === "SETUP_1" || s.phase === "SETUP_2") return `${me.name} : placez ${s.setupStep === "settlement" ? "un Campement" : "une Pirogue"}.`;
    if (s.phase === "DISCARD") return `${me.name} : défaussez ${s.discardQueue[0].amount} cartes.`;
    if (s.phase === "MOVE_MONKEY") return `${me.name} : déplacez le Curepipe Monkey.`;
    if (s.phase === "STEAL") return `${me.name} : choisissez qui voler.`;
    if (s.pendingTrade) return `${me.name} : répondez à l'offre de ${s.players[s.pendingTrade.from].name}.`;
    if (s.freeRoads > 0) return `${me.name} : posez ${s.freeRoads} Pirogue(s) gratuite(s).`;
    if (s.phase === "ROLL") return `${me.name} : lancez les dés.`;
    return `${me.name} : construisez, échangez, ou terminez le tour.`;
  })();

  // Hand to display: the human actor in hotseat, else the first human.
  const viewer = human ? who! : s.players.find((p) => !p.isBot)?.id ?? null;
  const vh = viewer !== null ? s.players[viewer] : null;
  const devCounts = (d: DevType[]) => d.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});

  const isMain = human && s.phase === "MAIN" && !s.pendingTrade && s.freeRoads === 0;
  const devAction = (t: DevType) => {
    if (t === "sega") act({ type: "PLAY_SEGA", player: who! });
    if (t === "route") act({ type: "PLAY_ROUTE", player: who! });
  };

  return (
    <div className="flex min-h-screen flex-col gap-3 p-3 lg:flex-row">
      <main className="flex flex-1 flex-col gap-2">
        <div className="panel flex flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-black text-sand">MORIS</span>
            <span className="text-sm text-muted-foreground">Tour {s.turn}</span>
            {s.dice && <span className="rounded bg-secondary px-2 py-0.5 text-lg">🎲 {s.dice[0]} + {s.dice[1]} = {s.dice[0] + s.dice[1]}</span>}
          </div>
          <button className={btn} onClick={onQuit}>Quitter</button>
        </div>
        <div className="panel py-2 text-center font-semibold text-primary">{prompt}{me?.isBot && s.phase !== "GAME_OVER" && " 🤖…"}</div>
        {err && <div className="rounded-md bg-destructive/20 px-3 py-1 text-sm text-destructive-foreground">{err}</div>}
        <div className="panel aspect-square w-full max-w-[min(100%,78vh)] self-center p-1">
          <BoardView state={s} vertexSpots={vSpots} edgeSpots={eSpots} hexSpots={hSpots} onVertex={onVertex} onEdge={onEdge} onHex={onHex} />
        </div>
      </main>

      <aside className="flex w-full flex-col gap-3 lg:w-[380px]">
        <section className="panel space-y-2">
          {s.players.map((p) => (
            <div key={p.id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${p.id === s.current ? "bg-secondary" : ""}`}>
              <span className="h-4 w-4 rounded-full border border-sand" style={{ background: playerFill(p.color) }} />
              <span className="flex-1 truncate text-sm font-medium">{p.isBot ? "🤖 " : ""}{p.name}</span>
              <span className="text-xs text-muted-foreground">🃏{handTotal(p.hand)} 📜{p.dev.length} 💃{p.knightsPlayed} 🛶{s.roadLengths[p.id]}</span>
              {s.longestRoad === p.id && <span title="Pirogue la plus Longue">🛶</span>}
              {s.largestArmy === p.id && <span title="Armée de Ravanne">⚔️</span>}
              <span className="w-12 text-right font-bold text-accent">{vp(s, p.id, s.phase === "GAME_OVER" || p.id === viewer)} PV</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{WIN_VP} PV pour gagner · Pioche Sirandane : {s.devDeck.length}</p>
        </section>

        {vh && (
          <section className="panel space-y-2">
            <h3 className="text-sm font-semibold">Main de {vh.name}</h3>
            <div className="flex flex-wrap gap-2">
              {RESOURCES.map((r) => (
                <span key={r} className="rounded bg-secondary px-2 py-1 text-sm" title={RES_LABEL[r]}>{RES_ICON[r]} {vh.hand[r]}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(devCounts(vh.dev)).map(([t, c]) => {
                const tt = t as DevType;
                const playable = human && who === vh.id && legal.some((a) => a.type === `PLAY_${tt.toUpperCase()}`);
                return (
                  <button key={t} disabled={!playable || tt === "bazar" || tt === "cyclone" || tt === "lieux"} onClick={() => devAction(tt)} className={btn}>
                    {DEV_LABEL[tt]} ×{c}
                  </button>
                );
              })}
            </div>
            {human && who === vh.id && (has("PLAY_BAZAR") || has("PLAY_CYCLONE")) && (
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap gap-1">
                  {RESOURCES.map((r) => (
                    <button key={r} className={`${btn} ${pick.includes(r) ? "border-accent" : ""}`} onClick={() => setPick((p) => [...p, r].slice(-2))}>{RES_ICON[r]}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {has("PLAY_CYCLONE") && <button className={btn} disabled={pick.length < 1} onClick={() => act({ type: "PLAY_CYCLONE", player: who!, res: pick[pick.length - 1] })}>🌀 Cyclone ({pick.length ? RES_ICON[pick[pick.length - 1]] : "?"})</button>}
                  {has("PLAY_BAZAR") && <button className={btn} disabled={pick.length < 2} onClick={() => act({ type: "PLAY_BAZAR", player: who!, res: [pick[0], pick[1]].sort((a, b) => RESOURCES.indexOf(a) - RESOURCES.indexOf(b)) as [Resource, Resource] })}>Bazar ({pick.map((r) => RES_ICON[r]).join("")})</button>}
                </div>
              </div>
            )}
          </section>
        )}

        {human && (
          <section className="panel space-y-2">
            {s.phase === "ROLL" && <button className="w-full rounded-lg bg-primary py-2 font-bold text-primary-foreground" onClick={() => act({ type: "ROLL", player: who! })}>🎲 Lancer les dés</button>}
            {s.phase === "DISCARD" && (
              <>
                <Counter value={discard} onChange={setDiscard} max={me!.hand} />
                <button className={btn} disabled={handTotal(discard) !== s.discardQueue[0].amount} onClick={() => act({ type: "DISCARD", player: who!, cards: discard })}>
                  Défausser ({handTotal(discard)}/{s.discardQueue[0].amount})
                </button>
              </>
            )}
            {s.phase === "STEAL" && legal.map((a) => a.type === "STEAL" && <button key={a.victim} className={btn} onClick={() => act(a)}>Voler {s.players[a.victim].name}</button>)}
            {s.pendingTrade && (
              <div className="space-y-2 text-sm">
                <p>{s.players[s.pendingTrade.from].name} donne {RESOURCES.filter((r) => s.pendingTrade!.give[r]).map((r) => `${s.pendingTrade!.give[r]}${RES_ICON[r]}`).join(" ")} contre {RESOURCES.filter((r) => s.pendingTrade!.get[r]).map((r) => `${s.pendingTrade!.get[r]}${RES_ICON[r]}`).join(" ")}</p>
                <div className="flex gap-2">
                  <button className={btn} disabled={!has("ACCEPT_TRADE")} onClick={() => act({ type: "ACCEPT_TRADE", player: who! })}>Accepter</button>
                  <button className={btn} onClick={() => act({ type: "DECLINE_TRADE", player: who! })}>Refuser</button>
                </div>
              </div>
            )}
            {s.freeRoads > 0 && <button className={btn} onClick={() => act({ type: "SKIP_FREE_ROADS", player: who! })}>Passer les Pirogues gratuites</button>}
            {isMain && (
              <>
                <div className="grid grid-cols-2 gap-1">
                  <button className={`${btn} ${mode === "road" ? "border-accent" : ""}`} disabled={!has("BUILD_ROAD")} onClick={() => setMode(mode === "road" ? null : "road")}>🛶 Pirogue</button>
                  <button className={`${btn} ${mode === "settlement" ? "border-accent" : ""}`} disabled={!has("BUILD_SETTLEMENT")} onClick={() => setMode(mode === "settlement" ? null : "settlement")}>⛺ Campement</button>
                  <button className={`${btn} ${mode === "city" ? "border-accent" : ""}`} disabled={!has("BUILD_CITY")} onClick={() => setMode(mode === "city" ? null : "city")}>🏡 Cottage</button>
                  <button className={btn} disabled={!has("BUY_DEV")} onClick={() => act({ type: "BUY_DEV", player: who! })}>📜 Sirandane</button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pirogue 🪨🎋 · Campement 🪨🎋🍵🍍 · Cottage 🐟🐟🐟🍍🍍 · Sirandane 🍵🍍🐟
                  {mode && " — cliquez un emplacement en surbrillance."}
                </p>
                <div className="space-y-1 border-t pt-2">
                  <h4 className="text-sm font-semibold">Banque / port</h4>
                  <div className="flex items-center gap-1 text-sm">
                    <select value={bankGive} onChange={(e) => setBankGive(e.target.value as Resource)} className="rounded bg-secondary px-1 py-1">
                      {RESOURCES.map((r) => <option key={r} value={r}>{tradeRatio(s, who!, r)}× {RES_ICON[r]} {RES_LABEL[r]}</option>)}
                    </select>
                    →
                    <select value={bankGet} onChange={(e) => setBankGet(e.target.value as Resource)} className="rounded bg-secondary px-1 py-1">
                      {RESOURCES.map((r) => <option key={r} value={r}>1 {RES_ICON[r]} {RES_LABEL[r]}</option>)}
                    </select>
                    <button className={btn} disabled={!legal.some((a) => a.type === "BANK_TRADE" && a.give === bankGive && a.get === bankGet)} onClick={() => act({ type: "BANK_TRADE", player: who!, give: bankGive, get: bankGet })}>OK</button>
                  </div>
                </div>
                <div className="space-y-1 border-t pt-2">
                  <h4 className="text-sm font-semibold">Proposer un échange</h4>
                  <select value={tradeTo} onChange={(e) => setTradeTo(Number(e.target.value))} className="w-full rounded bg-secondary px-1 py-1 text-sm">
                    <option value={-1}>Choisir un joueur…</option>
                    {s.players.filter((p) => p.id !== who).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">Je donne</p>
                  <Counter value={give} onChange={setGive} max={me!.hand} />
                  <p className="text-xs text-muted-foreground">Je reçois</p>
                  <Counter value={get} onChange={setGet} />
                  <button className={btn} disabled={tradeTo < 0 || !canAfford(me!.hand, give) || !handTotal(give) || !handTotal(get)} onClick={() => { act({ type: "OFFER_TRADE", player: who!, to: tradeTo, give: { ...give }, get: { ...get } }); setGive(emptyRes()); setGet(emptyRes()); }}>Proposer</button>
                </div>
                <button className="w-full rounded-lg bg-primary py-2 font-bold text-primary-foreground" onClick={() => act({ type: "END_TURN", player: who! })}>Fin du tour</button>
              </>
            )}
          </section>
        )}
        {s.phase === "GAME_OVER" && <button className="rounded-lg bg-primary py-2 font-bold text-primary-foreground" onClick={onQuit}>Nouvelle partie</button>}

        <section className="panel max-h-72 overflow-y-auto text-xs">
          {s.log.slice().reverse().map((l, i) => <p key={i} className="border-b border-border/40 py-0.5">{l}</p>)}
        </section>
      </aside>
    </div>
  );
}
void COSTS;
