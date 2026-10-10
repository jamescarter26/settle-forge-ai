import type { Board, Hex, Vertex, Edge, Port, Terrain, PortType } from "./types";
import { shuffle, type Rng } from "./rng";

export const HEX_SIZE = 60;
const SQ3 = Math.sqrt(3);
export const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function hexCenter(q: number, r: number) {
  return { x: HEX_SIZE * SQ3 * (q + r / 2), y: HEX_SIZE * 1.5 * r };
}
export function hexCorners(x: number, y: number, size = HEX_SIZE) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: x + size * Math.cos(a), y: y + size * Math.sin(a) };
  });
}
const key = (x: number, y: number) => `${Math.round(x * 10)},${Math.round(y * 10)}`;

export function generateBoard(rng: Rng): Board {
  const coords: [number, number][] = [];
  for (let r = -2; r <= 2; r++)
    for (let q = -2; q <= 2; q++) if (Math.abs(q + r) <= 2) coords.push([q, r]);

  const terrains = shuffle<Terrain>(rng, [
    ...Array<Terrain>(4).fill("sucre"),
    ...Array<Terrain>(3).fill("basalte"),
    ...Array<Terrain>(4).fill("the"),
    ...Array<Terrain>(4).fill("ananas"),
    ...Array<Terrain>(3).fill("poisson"),
    "desert",
  ]);

  const vertices: Vertex[] = [];
  const vmap = new Map<string, number>();
  const getV = (x: number, y: number) => {
    const k = key(x, y);
    let id = vmap.get(k);
    if (id === undefined) {
      id = vertices.length;
      vmap.set(k, id);
      vertices.push({ id, x, y, hexes: [], adj: [], edges: [], port: null });
    }
    return id;
  };
  const edges: Edge[] = [];
  const emap = new Map<string, number>();
  const getE = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (emap.has(k)) return;
    const id = edges.length;
    emap.set(k, id);
    edges.push({ id, a, b });
    vertices[a].edges.push(id);
    vertices[b].edges.push(id);
    vertices[a].adj.push(b);
    vertices[b].adj.push(a);
  };

  const hexes: Hex[] = coords.map(([q, r], id) => {
    const c = hexCenter(q, r);
    const vs = hexCorners(c.x, c.y).map((p) => getV(p.x, p.y));
    vs.forEach((v) => vertices[v].hexes.push(id));
    for (let i = 0; i < 6; i++) getE(vs[i], vs[(i + 1) % 6]);
    return { id, q, r, x: c.x, y: c.y, terrain: terrains[id], token: null, vertices: vs };
  });

  // Tokens: 6 and 8 never adjacent
  const tokensBase = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const nb = (h: Hex) =>
    hexes.filter((o) => DIRS.some(([dq, dr]) => o.q === h.q + dq && o.r === h.r + dr));
  const red = (t: number | null) => t === 6 || t === 8;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const t = shuffle(rng, tokensBase);
    let i = 0;
    hexes.forEach((h) => (h.token = h.terrain === "desert" ? null : t[i++]));
    if (hexes.every((h) => !red(h.token) || nb(h).every((n) => !red(n.token)))) break;
  }

  // Sea ring (18 tiles)
  const sea: { q: number; r: number; x: number; y: number; corner: boolean; i: number }[] = [];
  let q = DIRS[4][0] * 3;
  let r = DIRS[4][1] * 3;
  for (let side = 0; side < 6; side++)
    for (let j = 0; j < 3; j++) {
      const c = hexCenter(q, r);
      sea.push({ q, r, ...c, corner: q === 0 || r === 0 || q + r === 0, i: sea.length });
      q += DIRS[side][0];
      r += DIRS[side][1];
    }

  // Ports: 9 among the 12 non-corner sea tiles, each touching 2 coastal intersections
  const types = shuffle<PortType>(rng, [
    "generic", "generic", "generic", "generic", "sucre", "basalte", "the", "ananas", "poisson",
  ]);
  const candidates = sea.filter((s) => !s.corner);
  let ports: Port[] = [];
  for (let attempt = 0; attempt < 500; attempt++) {
    const chosen = shuffle(rng, candidates).slice(0, 9).sort((a, b) => a.i - b.i);
    const used = new Set<number>();
    ports = [];
    let ok = true;
    for (const [k, c] of chosen.entries()) {
      const cs = hexCorners(c.x, c.y).map((p) => vmap.get(key(p.x, p.y)));
      const opts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = cs[i];
        const b = cs[(i + 1) % 6];
        if (a !== undefined && b !== undefined && !used.has(a) && !used.has(b)) opts.push([a, b]);
      }
      if (!opts.length) {
        ok = false;
        break;
      }
      const pick = shuffle(rng, opts)[0];
      used.add(pick[0]);
      used.add(pick[1]);
      ports.push({ type: types[k], vertices: pick, x: c.x, y: c.y });
    }
    if (ok) break;
  }
  ports.forEach((p) => p.vertices.forEach((v) => (vertices[v].port = p.type)));

  return { hexes, vertices, edges, ports, sea: sea.map((s) => ({ x: s.x, y: s.y })) };
}
