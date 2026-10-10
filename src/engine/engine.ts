import { generateBoard } from "./board";
import { randInt, shuffle } from "./rng";
import {
  RESOURCES,
  type Action,
  type DevType,
  type GameConfig,
  type GameState,
  type ResMap,
  type Resource,
} from "./types";

export const WIN_VP = 10;
export const COSTS = {
  pirogue: { basalte: 1, sucre: 1 },
  campement: { basalte: 1, sucre: 1, the: 1, ananas: 1 },
  cottage: { poisson: 3, ananas: 2 },
  sirandane: { the: 1, ananas: 1, poisson: 1 },
} satisfies Record<string, Partial<ResMap>>;

export const RES_LABEL: Record<Resource, string> = {
  sucre: "Sucre",
  basalte: "Basalte",
  the: "Thé",
  ananas: "Ananas",
  poisson: "Poisson",
};
export const DEV_LABEL: Record<DevType, string> = {
  sega: "Séga Tipik",
  bazar: "Bazar Port-Louis",
  route: "Route du Thé",
  cyclone: "Cyclone",
  lieux: "Lieux Célèbres",
};

export const emptyRes = (): ResMap => ({ sucre: 0, basalte: 0, the: 0, ananas: 0, poisson: 0 });
export const handTotal = (h: Partial<ResMap>) => RESOURCES.reduce((a, r) => a + (h[r] ?? 0), 0);
export const canAfford = (h: ResMap, c: Partial<ResMap>) => RESOURCES.every((r) => h[r] >= (c[r] ?? 0));
const fmtRes = (c: Partial<ResMap>) =>
  RESOURCES.filter((r) => (c[r] ?? 0) > 0)
    .map((r) => `${c[r]} ${RES_LABEL[r]}`)
    .join(", ");

function pay(s: GameState, p: number, c: Partial<ResMap>) {
  for (const r of RESOURCES) {
    s.players[p].hand[r] -= c[r] ?? 0;
    s.bank[r] += c[r] ?? 0;
  }
}
function log(s: GameState, msg: string) {
  s.log.push(msg);
  if (s.log.length > 300) s.log.shift();
}
const nm = (s: GameState, p: number) => s.players[p].name;

// ---------- creation ----------
export function createGame(config: GameConfig, seed: number): GameState {
  const n = config.seats.length;
  if (n < 3 || n > 4) throw new Error("MORIS se joue à 3 ou 4 sièges.");
  const h = { rng: seed >>> 0 || 1 };
  const board = generateBoard(h);
  const logs: string[] = ["Nouvelle partie — graine " + seed];
  let contenders = [...Array(n).keys()];
  let first = 0;
  for (;;) {
    const rolls = contenders.map((p) => ({ p, v: randInt(h, 6) + randInt(h, 6) + 2 }));
    logs.push("Dés de départ : " + rolls.map((x) => `${config.seats[x.p].name} ${x.v}`).join(", "));
    const max = Math.max(...rolls.map((x) => x.v));
    const top = rolls.filter((x) => x.v === max);
    if (top.length === 1) {
      first = top[0].p;
      break;
    }
    contenders = top.map((x) => x.p);
    logs.push("Égalité, on relance.");
  }
  logs.push(`${config.seats[first].name} commence le placement.`);
  const order = [...Array(n).keys()].map((i) => (first + i) % n);
  const deck = shuffle<DevType>(h, [
    ...Array<DevType>(14).fill("sega"),
    "bazar", "bazar", "route", "route", "cyclone", "cyclone",
    ...Array<DevType>(5).fill("lieux"),
  ]);
  const desert = board.hexes.find((x) => x.terrain === "desert")!.id;
  return {
    seed,
    rng: h.rng,
    board,
    players: config.seats.map((st, id) => ({
      id,
      name: st.name,
      color: st.color,
      isBot: st.isBot,
      hand: emptyRes(),
      dev: [],
      newDev: [],
      knightsPlayed: 0,
      settlementsLeft: 5,
      citiesLeft: 4,
      roadsLeft: 15,
    })),
    current: first,
    phase: "SETUP_1",
    setupStep: "settlement",
    setupIndex: 0,
    setupOrder: [...order, ...order.slice().reverse()],
    lastSetupVertex: null,
    buildings: {},
    roads: {},
    monkey: desert,
    bank: { sucre: 19, basalte: 19, the: 19, ananas: 19, poisson: 19 },
    devDeck: deck,
    dice: null,
    discardQueue: [],
    afterMonkey: "MAIN",
    devPlayedThisTurn: false,
    freeRoads: 0,
    pendingTrade: null,
    longestRoad: null,
    largestArmy: null,
    roadLengths: Array(n).fill(0),
    winner: null,
    log: logs,
    turn: 0,
  };
}

// ---------- queries ----------
export function actor(s: GameState): number | null {
  if (s.phase === "GAME_OVER") return null;
  if (s.phase === "SETUP_1" || s.phase === "SETUP_2") return s.setupOrder[s.setupIndex];
  if (s.phase === "DISCARD") return s.discardQueue[0]?.player ?? null;
  if (s.pendingTrade) return s.pendingTrade.to;
  return s.current;
}

export function vp(s: GameState, p: number, includeHidden: boolean): number {
  let v = 0;
  for (const b of Object.values(s.buildings)) if (b.owner === p) v += b.kind === "cottage" ? 2 : 1;
  if (s.longestRoad === p) v += 2;
  if (s.largestArmy === p) v += 2;
  if (includeHidden) v += s.players[p].dev.filter((d) => d === "lieux").length;
  return v;
}

export function vertexFree(s: GameState, v: number): boolean {
  if (s.buildings[v]) return false;
  return s.board.vertices[v].adj.every((a) => !s.buildings[a]);
}
export function roadConnected(s: GameState, p: number, e: number): boolean {
  const ed = s.board.edges[e];
  return [ed.a, ed.b].some((v) => {
    const b = s.buildings[v];
    if (b && b.owner === p) return true;
    if (b && b.owner !== p) return false;
    return s.board.vertices[v].edges.some((o) => o !== e && s.roads[o] === p);
  });
}
export function roadSpots(s: GameState, p: number): number[] {
  return s.board.edges.filter((e) => s.roads[e.id] === undefined && roadConnected(s, p, e.id)).map((e) => e.id);
}
export function settlementSpots(s: GameState, p: number): number[] {
  return s.board.vertices
    .filter((v) => vertexFree(s, v.id) && v.edges.some((e) => s.roads[e] === p))
    .map((v) => v.id);
}
export function tradeRatio(s: GameState, p: number, r: Resource): number {
  let best = 4;
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner !== p) continue;
    const port = s.board.vertices[Number(v)].port;
    if (port === r) best = 2;
    else if (port === "generic") best = Math.min(best, 3);
  }
  return best;
}
export function playableDev(s: GameState, p: number, t: DevType): boolean {
  if (s.devPlayedThisTurn) return false;
  const pl = s.players[p];
  return pl.dev.filter((d) => d === t).length - pl.newDev.filter((d) => d === t).length > 0;
}

function devPlays(s: GameState, p: number): Action[] {
  const out: Action[] = [];
  if (playableDev(s, p, "sega")) out.push({ type: "PLAY_SEGA", player: p });
  if (playableDev(s, p, "route") && s.players[p].roadsLeft > 0) out.push({ type: "PLAY_ROUTE", player: p });
  if (playableDev(s, p, "bazar"))
    for (let i = 0; i < 5; i++)
      for (let j = i; j < 5; j++) {
        const a = RESOURCES[i];
        const b = RESOURCES[j];
        if (a === b ? s.bank[a] >= 2 : s.bank[a] >= 1 && s.bank[b] >= 1)
          out.push({ type: "PLAY_BAZAR", player: p, res: [a, b] });
      }
  if (playableDev(s, p, "cyclone")) for (const r of RESOURCES) out.push({ type: "PLAY_CYCLONE", player: p, res: r });
  return out;
}

/** Enumerates every concrete legal action. DISCARD and OFFER_TRADE are parametric:
 *  they are validated by `isLegal` instead of being enumerated. */
export function legalActions(s: GameState, p: number): Action[] {
  if (actor(s) !== p) return [];
  const pl = s.players[p];
  const out: Action[] = [];
  switch (s.phase) {
    case "SETUP_1":
    case "SETUP_2":
      if (s.setupStep === "settlement") {
        for (const v of s.board.vertices) if (vertexFree(s, v.id)) out.push({ type: "PLACE_SETTLEMENT", player: p, vertex: v.id });
      } else {
        for (const e of s.board.vertices[s.lastSetupVertex!].edges)
          if (s.roads[e] === undefined) out.push({ type: "PLACE_ROAD", player: p, edge: e });
      }
      return out;
    case "DISCARD":
      return out;
    case "MOVE_MONKEY":
      for (const h of s.board.hexes) if (h.id !== s.monkey) out.push({ type: "MOVE_MONKEY", player: p, hex: h.id });
      return out;
    case "STEAL":
      for (const v of stealVictims(s)) out.push({ type: "STEAL", player: p, victim: v });
      return out;
  }
  if (s.freeRoads > 0) {
    for (const e of roadSpots(s, p)) out.push({ type: "BUILD_ROAD", player: p, edge: e });
    out.push({ type: "SKIP_FREE_ROADS", player: p });
    return out;
  }
  if (s.pendingTrade) {
    if (canAfford(pl.hand, s.pendingTrade.get)) out.push({ type: "ACCEPT_TRADE", player: p });
    out.push({ type: "DECLINE_TRADE", player: p });
    return out;
  }
  if (s.phase === "ROLL") return [{ type: "ROLL", player: p }, ...devPlays(s, p)];
  // MAIN
  if (pl.roadsLeft > 0 && canAfford(pl.hand, COSTS.pirogue))
    for (const e of roadSpots(s, p)) out.push({ type: "BUILD_ROAD", player: p, edge: e });
  if (pl.settlementsLeft > 0 && canAfford(pl.hand, COSTS.campement))
    for (const v of settlementSpots(s, p)) out.push({ type: "BUILD_SETTLEMENT", player: p, vertex: v });
  if (pl.citiesLeft > 0 && canAfford(pl.hand, COSTS.cottage))
    for (const [v, b] of Object.entries(s.buildings))
      if (b.owner === p && b.kind === "campement") out.push({ type: "BUILD_CITY", player: p, vertex: Number(v) });
  if (s.devDeck.length > 0 && canAfford(pl.hand, COSTS.sirandane)) out.push({ type: "BUY_DEV", player: p });
  out.push(...devPlays(s, p));
  for (const give of RESOURCES) {
    const ratio = tradeRatio(s, p, give);
    if (pl.hand[give] < ratio) continue;
    for (const get of RESOURCES) if (get !== give && s.bank[get] > 0) out.push({ type: "BANK_TRADE", player: p, give, get });
  }
  out.push({ type: "END_TURN", player: p });
  return out;
}

export function stealVictims(s: GameState): number[] {
  const set = new Set<number>();
  for (const v of s.board.hexes[s.monkey].vertices) {
    const b = s.buildings[v];
    if (b && b.owner !== s.current && handTotal(s.players[b.owner].hand) > 0) set.add(b.owner);
  }
  return [...set];
}

const canon = (o: unknown) => JSON.stringify(o, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

export function isLegal(s: GameState, a: Action): string | null {
  if (actor(s) !== a.player) return "Ce n'est pas à ce joueur d'agir.";
  if (a.type === "DISCARD") {
    if (s.phase !== "DISCARD") return "Pas de défausse en cours.";
    const need = s.discardQueue[0].amount;
    if (RESOURCES.some((r) => a.cards[r] < 0 || !Number.isInteger(a.cards[r]))) return "Quantités invalides.";
    if (handTotal(a.cards) !== need) return `Il faut défausser exactement ${need} cartes.`;
    if (!canAfford(s.players[a.player].hand, a.cards)) return "Cartes insuffisantes.";
    return null;
  }
  if (a.type === "OFFER_TRADE") {
    if (s.phase !== "MAIN" || s.pendingTrade || s.freeRoads > 0 || a.player !== s.current) return "Échange impossible maintenant.";
    if (a.to === a.player || !s.players[a.to]) return "Partenaire invalide.";
    if (RESOURCES.some((r) => (a.give[r] ?? 0) < 0 || (a.get[r] ?? 0) < 0)) return "Quantités invalides.";
    if (handTotal(a.give) === 0 || handTotal(a.get) === 0) return "Pas de don : chaque côté doit donner quelque chose.";
    if (RESOURCES.some((r) => (a.give[r] ?? 0) > 0 && (a.get[r] ?? 0) > 0)) return "Pas d'échange de ressources identiques.";
    if (!canAfford(s.players[a.player].hand, a.give)) return "Vous n'avez pas ces cartes.";
    return null;
  }
  const c = canon(a);
  return legalActions(s, a.player).some((l) => canon(l) === c) ? null : "Action illégale.";
}

// ---------- titles ----------
export function longestRoadOf(s: GameState, p: number): number {
  const mine = s.board.edges.filter((e) => s.roads[e.id] === p);
  if (!mine.length) return 0;
  let best = 0;
  const used = new Set<number>();
  const blocked = (v: number) => {
    const b = s.buildings[v];
    return !!b && b.owner !== p;
  };
  const dfs = (v: number, len: number) => {
    if (len > best) best = len;
    if (len > 0 && blocked(v)) return;
    for (const e of s.board.vertices[v].edges) {
      if (used.has(e) || s.roads[e] !== p) continue;
      used.add(e);
      const ed = s.board.edges[e];
      dfs(ed.a === v ? ed.b : ed.a, len + 1);
      used.delete(e);
    }
  };
  for (const e of mine) {
    dfs(e.a, 0);
    dfs(e.b, 0);
  }
  return best;
}

function updateLongestRoad(s: GameState) {
  s.roadLengths = s.players.map((p) => longestRoadOf(s, p.id));
  const max = Math.max(...s.roadLengths);
  const before = s.longestRoad;
  let holder: number | null;
  if (max < 5) holder = null;
  else {
    const leaders = s.players.filter((p) => s.roadLengths[p.id] === max).map((p) => p.id);
    if (before !== null && leaders.includes(before)) holder = before;
    else holder = leaders.length === 1 ? leaders[0] : null;
  }
  if (holder !== before) {
    s.longestRoad = holder;
    if (holder !== null) log(s, `🛶 ${nm(s, holder)} prend la Pirogue la plus Longue (${max}).`);
    else log(s, "🛶 Pirogue la plus Longue mise de côté.");
  }
}

// ---------- apply ----------
export function applyAction(state: GameState, a: Action): GameState {
  const err = isLegal(state, a);
  if (err) throw new Error(err);
  const s: GameState = structuredClone(state);
  const p = a.player;
  const pl = s.players[p];
  const n = s.players.length;

  switch (a.type) {
    case "PLACE_SETTLEMENT": {
      s.buildings[a.vertex] = { owner: p, kind: "campement" };
      pl.settlementsLeft--;
      s.lastSetupVertex = a.vertex;
      s.setupStep = "road";
      log(s, `${nm(s, p)} pose un Campement.`);
      if (s.phase === "SETUP_2") {
        const got = emptyRes();
        for (const h of s.board.vertices[a.vertex].hexes) {
          const t = s.board.hexes[h].terrain;
          if (t !== "desert" && s.bank[t] > 0) {
            s.bank[t]--;
            pl.hand[t]++;
            got[t]++;
          }
        }
        if (handTotal(got)) log(s, `${nm(s, p)} reçoit ${fmtRes(got)}.`);
      }
      updateLongestRoad(s);
      break;
    }
    case "PLACE_ROAD": {
      s.roads[a.edge] = p;
      pl.roadsLeft--;
      s.setupIndex++;
      s.setupStep = "settlement";
      if (s.setupIndex === n) s.phase = "SETUP_2";
      if (s.setupIndex === 2 * n) {
        s.phase = "ROLL";
        s.current = s.setupOrder[2 * n - 1];
        s.turn = 1;
        log(s, `La partie commence ! À ${nm(s, s.current)} de lancer les dés.`);
      }
      updateLongestRoad(s);
      break;
    }
    case "ROLL": {
      const d1 = randInt(s, 6) + 1;
      const d2 = randInt(s, 6) + 1;
      s.dice = [d1, d2];
      const sum = d1 + d2;
      log(s, `🎲 ${nm(s, p)} lance ${d1} + ${d2} = ${sum}.`);
      if (sum === 7) {
        s.discardQueue = s.players
          .filter((x) => handTotal(x.hand) >= 8)
          .map((x) => ({ player: x.id, amount: Math.floor(handTotal(x.hand) / 2) }));
        s.afterMonkey = "MAIN";
        s.phase = s.discardQueue.length ? "DISCARD" : "MOVE_MONKEY";
        log(s, "🐒 Sept ! Pas de production, le Curepipe Monkey bouge.");
      } else {
        produce(s, sum);
        s.phase = "MAIN";
      }
      break;
    }
    case "DISCARD": {
      pay(s, p, a.cards);
      log(s, `${nm(s, p)} défausse ${handTotal(a.cards)} cartes.`);
      s.discardQueue.shift();
      if (!s.discardQueue.length) s.phase = "MOVE_MONKEY";
      break;
    }
    case "MOVE_MONKEY": {
      s.monkey = a.hex;
      log(s, `🐒 ${nm(s, p)} déplace le Monkey.`);
      const v = stealVictims(s);
      if (v.length === 0) s.phase = s.afterMonkey;
      else if (v.length === 1) {
        steal(s, v[0]);
        s.phase = s.afterMonkey;
      } else s.phase = "STEAL";
      break;
    }
    case "STEAL":
      steal(s, a.victim);
      s.phase = s.afterMonkey;
      break;
    case "BUILD_ROAD":
      if (s.freeRoads > 0) {
        s.freeRoads--;
      } else pay(s, p, COSTS.pirogue);
      s.roads[a.edge] = p;
      pl.roadsLeft--;
      log(s, `${nm(s, p)} construit une Pirogue.`);
      if (s.freeRoads > 0 && (pl.roadsLeft === 0 || roadSpots(s, p).length === 0)) s.freeRoads = 0;
      updateLongestRoad(s);
      break;
    case "BUILD_SETTLEMENT":
      pay(s, p, COSTS.campement);
      s.buildings[a.vertex] = { owner: p, kind: "campement" };
      pl.settlementsLeft--;
      log(s, `${nm(s, p)} construit un Campement.`);
      updateLongestRoad(s);
      break;
    case "BUILD_CITY":
      pay(s, p, COSTS.cottage);
      s.buildings[a.vertex] = { owner: p, kind: "cottage" };
      pl.citiesLeft--;
      pl.settlementsLeft++;
      log(s, `${nm(s, p)} construit un Cottage Créole.`);
      break;
    case "BUY_DEV": {
      pay(s, p, COSTS.sirandane);
      const c = s.devDeck.pop()!;
      pl.dev.push(c);
      pl.newDev.push(c);
      log(s, `${nm(s, p)} achète une carte Sirandane.`);
      break;
    }
    case "PLAY_SEGA": {
      removeDev(s, p, "sega");
      pl.knightsPlayed++;
      log(s, `💃 ${nm(s, p)} joue un Séga Tipik.`);
      if (pl.knightsPlayed >= 3 && (s.largestArmy === null || pl.knightsPlayed > s.players[s.largestArmy].knightsPlayed) && s.largestArmy !== p) {
        s.largestArmy = p;
        log(s, `⚔️ ${nm(s, p)} prend l'Armée de Ravanne.`);
      }
      s.afterMonkey = s.phase === "ROLL" ? "ROLL" : "MAIN";
      s.phase = "MOVE_MONKEY";
      break;
    }
    case "PLAY_ROUTE":
      removeDev(s, p, "route");
      s.freeRoads = Math.min(2, pl.roadsLeft);
      if (roadSpots(s, p).length === 0) s.freeRoads = 0;
      log(s, `${nm(s, p)} joue Route du Thé (2 Pirogues gratuites).`);
      break;
    case "PLAY_BAZAR":
      removeDev(s, p, "bazar");
      for (const r of a.res) {
        s.bank[r]--;
        pl.hand[r]++;
      }
      log(s, `${nm(s, p)} joue Bazar Port-Louis : ${RES_LABEL[a.res[0]]} + ${RES_LABEL[a.res[1]]}.`);
      break;
    case "PLAY_CYCLONE": {
      removeDev(s, p, "cyclone");
      let tot = 0;
      for (const o of s.players)
        if (o.id !== p) {
          tot += o.hand[a.res];
          o.hand[a.res] = 0;
        }
      pl.hand[a.res] += tot;
      log(s, `🌀 ${nm(s, p)} joue Cyclone : ${tot} ${RES_LABEL[a.res]} raflé(s).`);
      break;
    }
    case "BANK_TRADE": {
      const ratio = tradeRatio(s, p, a.give);
      pl.hand[a.give] -= ratio;
      s.bank[a.give] += ratio;
      s.bank[a.get]--;
      pl.hand[a.get]++;
      log(s, `${nm(s, p)} échange ${ratio} ${RES_LABEL[a.give]} contre 1 ${RES_LABEL[a.get]} (${ratio}:1).`);
      break;
    }
    case "OFFER_TRADE":
      s.pendingTrade = { from: p, to: a.to, give: a.give, get: a.get };
      log(s, `${nm(s, p)} propose à ${nm(s, a.to)} : ${fmtRes(a.give)} contre ${fmtRes(a.get)}.`);
      break;
    case "ACCEPT_TRADE": {
      const t = s.pendingTrade!;
      for (const r of RESOURCES) {
        const g = t.give[r] ?? 0;
        const w = t.get[r] ?? 0;
        s.players[t.from].hand[r] += w - g;
        s.players[t.to].hand[r] += g - w;
      }
      s.pendingTrade = null;
      log(s, `🤝 ${nm(s, t.to)} accepte l'échange.`);
      break;
    }
    case "DECLINE_TRADE":
      log(s, `${nm(s, p)} refuse l'échange.`);
      s.pendingTrade = null;
      break;
    case "SKIP_FREE_ROADS":
      s.freeRoads = 0;
      break;
    case "END_TURN":
      pl.newDev = [];
      s.devPlayedThisTurn = false;
      s.current = (s.current + 1) % n;
      s.phase = "ROLL";
      s.dice = null;
      s.turn++;
      log(s, `— Tour de ${nm(s, s.current)} —`);
      break;
  }

  if (s.phase !== "SETUP_1" && s.phase !== "SETUP_2" && s.phase !== "GAME_OVER") {
    if (vp(s, s.current, true) >= WIN_VP) {
      s.phase = "GAME_OVER";
      s.winner = s.current;
      s.pendingTrade = null;
      log(s, `🏆 ${nm(s, s.current)} gagne avec ${vp(s, s.current, true)} PV !`);
    }
  }
  return s;
}

function removeDev(s: GameState, p: number, t: DevType) {
  const d = s.players[p].dev;
  d.splice(d.indexOf(t), 1);
  s.devPlayedThisTurn = true;
}

function steal(s: GameState, victim: number) {
  const h = s.players[victim].hand;
  const pool = RESOURCES.flatMap((r) => Array<Resource>(h[r]).fill(r));
  if (!pool.length) return;
  const r = pool[randInt(s, pool.length)];
  h[r]--;
  s.players[s.current].hand[r]++;
  log(s, `${nm(s, s.current)} vole une carte à ${nm(s, victim)}.`);
}

function produce(s: GameState, sum: number) {
  const need = s.players.map(() => emptyRes());
  for (const h of s.board.hexes) {
    if (h.token !== sum || h.id === s.monkey || h.terrain === "desert") continue;
    for (const v of h.vertices) {
      const b = s.buildings[v];
      if (b) need[b.owner][h.terrain] += b.kind === "cottage" ? 2 : 1;
    }
  }
  for (const r of RESOURCES) {
    const tot = need.reduce((a, x) => a + x[r], 0);
    if (!tot) continue;
    const who = need.map((x, i) => (x[r] > 0 ? i : -1)).filter((i) => i >= 0);
    if (tot <= s.bank[r]) {
      for (const i of who) {
        s.players[i].hand[r] += need[i][r];
        s.bank[r] -= need[i][r];
      }
    } else if (who.length === 1) {
      const g = s.bank[r];
      s.players[who[0]].hand[r] += g;
      s.bank[r] = 0;
      log(s, `Pénurie de ${RES_LABEL[r]} : ${nm(s, who[0])} reçoit le reste (${g}).`);
    } else log(s, `Pénurie de ${RES_LABEL[r]} : personne n'en reçoit.`);
  }
  for (const pl of s.players) {
    if (handTotal(need[pl.id]) === 0) continue;
    const got = emptyRes();
    for (const r of RESOURCES) if (need[pl.id][r]) got[r] = need[pl.id][r];
    log(s, `${pl.name} produit ${fmtRes(got)}.`);
  }
}
