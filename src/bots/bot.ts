import {
  COSTS,
  canAfford,
  emptyRes,
  handTotal,
  legalActions,
  playableDev,
  roadSpots,
  settlementSpots,
  tradeRatio,
  vertexFree,
  vp,
} from "@/engine/engine";
import { RESOURCES, type Action, type GameState, type ResMap, type Resource } from "@/engine/types";

const pips = (t: number | null) => (t ? 6 - Math.abs(7 - t) : 0);

function vertexScore(s: GameState, v: number): number {
  const vx = s.board.vertices[v];
  const seen = new Set<string>();
  let sc = 0;
  for (const h of vx.hexes) {
    const hx = s.board.hexes[h];
    if (hx.terrain === "desert") continue;
    sc += pips(hx.token);
    if (!seen.has(hx.terrain)) {
      sc += 1;
      seen.add(hx.terrain);
    }
  }
  if (vx.port) sc += 0.7;
  return sc;
}
const best = <T>(arr: T[], f: (x: T) => number): T | undefined =>
  arr.reduce<T | undefined>((b, x) => (b === undefined || f(x) > f(b) ? x : b), undefined);

function edgeScore(s: GameState, e: number): number {
  const ed = s.board.edges[e];
  return Math.max(...[ed.a, ed.b].map((v) => (vertexFree(s, v) ? vertexScore(s, v) : 0)));
}

/** Picks one action among the legal ones (same API as humans). */
export function botAction(s: GameState, p: number): Action {
  const legal = legalActions(s, p);
  const of = <T extends Action["type"]>(t: T) => legal.filter((a): a is Extract<Action, { type: T }> => a.type === t);
  const pl = s.players[p];

  if (s.phase === "DISCARD") {
    const amount = s.discardQueue[0].amount;
    const h = { ...pl.hand };
    const cards = emptyRes();
    for (let i = 0; i < amount; i++) {
      const r = best(RESOURCES.filter((x) => h[x] > 0), (x) => h[x])!;
      h[r]--;
      cards[r]++;
    }
    return { type: "DISCARD", player: p, cards };
  }
  if (s.phase === "SETUP_1" || s.phase === "SETUP_2") {
    const st = of("PLACE_SETTLEMENT");
    if (st.length) return best(st, (a) => vertexScore(s, a.vertex))!;
    return best(of("PLACE_ROAD"), (a) => edgeScore(s, a.edge))!;
  }
  if (s.phase === "MOVE_MONKEY") {
    return best(of("MOVE_MONKEY"), (a) => {
      const h = s.board.hexes[a.hex];
      let sc = 0;
      for (const v of h.vertices) {
        const b = s.buildings[v];
        if (!b) continue;
        const w = (b.kind === "cottage" ? 2 : 1) * (pips(h.token) + 0.5);
        sc += b.owner === p ? -3 * w : w * (1 + vp(s, b.owner, false) / 5);
      }
      return sc;
    })!;
  }
  if (s.phase === "STEAL") return best(of("STEAL"), (a) => handTotal(s.players[a.victim].hand))!;

  if (s.pendingTrade) {
    const t = s.pendingTrade;
    const receive = handTotal(t.give);
    const give = handTotal(t.get);
    const ok =
      of("ACCEPT_TRADE").length > 0 &&
      receive >= give &&
      vp(s, t.from, false) < 8 &&
      RESOURCES.every((r) => (t.get[r] ?? 0) === 0 || pl.hand[r] - (t.get[r] ?? 0) >= 1);
    return { type: ok ? "ACCEPT_TRADE" : "DECLINE_TRADE", player: p };
  }

  if (s.freeRoads > 0) {
    const r = of("BUILD_ROAD");
    return r.length ? best(r, (a) => edgeScore(s, a.edge))! : { type: "SKIP_FREE_ROADS", player: p };
  }

  const myHexes = new Set<number>();
  for (const [v, b] of Object.entries(s.buildings)) if (b.owner === p) s.board.vertices[Number(v)].hexes.forEach((h) => myHexes.add(h));

  if (s.phase === "ROLL") {
    if (of("PLAY_SEGA").length && myHexes.has(s.monkey)) return of("PLAY_SEGA")[0];
    return { type: "ROLL", player: p };
  }

  // MAIN
  const city = of("BUILD_CITY");
  if (city.length) return best(city, (a) => vertexScore(s, a.vertex))!;
  const sett = of("BUILD_SETTLEMENT");
  if (sett.length) return best(sett, (a) => vertexScore(s, a.vertex))!;

  const spots = settlementSpots(s, p);
  const target: Partial<ResMap> =
    pl.citiesLeft > 0 && Object.values(s.buildings).some((b) => b.owner === p && b.kind === "campement") && spots.length === 0
      ? COSTS.cottage
      : spots.length && pl.settlementsLeft > 0
        ? COSTS.campement
        : pl.roadsLeft > 0 && roadSpots(s, p).length
          ? COSTS.pirogue
          : COSTS.sirandane;

  if (playableDev(s, p, "sega") && myHexes.has(s.monkey) && of("PLAY_SEGA").length) return of("PLAY_SEGA")[0];
  const missing = RESOURCES.filter((r) => pl.hand[r] < (target[r] ?? 0));
  const bazar = of("PLAY_BAZAR");
  if (bazar.length && missing.length)
    return best(bazar, (a) => a.res.filter((r) => missing.includes(r)).length)!;
  const cyc = of("PLAY_CYCLONE");
  if (cyc.length && missing.length) return cyc.find((a) => a.res === missing[0])!;
  const rt = of("PLAY_ROUTE");
  if (rt.length && spots.length === 0) return rt[0];

  const roads = of("BUILD_ROAD");
  if (roads.length && spots.length === 0 && (target === COSTS.pirogue || target === COSTS.campement || pl.roadsLeft > 8))
    return best(roads, (a) => edgeScore(s, a.edge))!;
  if (of("BUY_DEV").length && (target === COSTS.sirandane || canAfford(pl.hand, addCost(target))))
    return of("BUY_DEV")[0];

  if (missing.length) {
    const trade = of("BANK_TRADE").find(
      (a) => missing.includes(a.get) && pl.hand[a.give] - (target[a.give] ?? 0) >= tradeRatio(s, p, a.give),
    );
    if (trade) return trade;
  }
  if (handTotal(pl.hand) > 7 && of("BUY_DEV").length) return of("BUY_DEV")[0];
  return { type: "END_TURN", player: p };
}

function addCost(c: Partial<ResMap>): Partial<ResMap> {
  const out: Partial<ResMap> = {};
  for (const r of RESOURCES as Resource[]) out[r] = (c[r] ?? 0) + ((COSTS.sirandane as Partial<ResMap>)[r] ?? 0);
  return out;
}
