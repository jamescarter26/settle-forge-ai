import { hexCorners, HEX_SIZE } from "@/engine/board";
import type { GameState } from "@/engine/types";
import { RES_ICON, playerFill, portLabel, terrainFill } from "./theme";

interface Props {
  state: GameState;
  vertexSpots: Set<number>;
  edgeSpots: Set<number>;
  hexSpots: Set<number>;
  onVertex: (v: number) => void;
  onEdge: (e: number) => void;
  onHex: (h: number) => void;
}
const pts = (c: { x: number; y: number }[]) => c.map((p) => `${p.x},${p.y}`).join(" ");
const pips = (t: number) => 6 - Math.abs(7 - t);

export function BoardView({ state, vertexSpots, edgeSpots, hexSpots, onVertex, onEdge, onHex }: Props) {
  const { board } = state;
  const R = HEX_SIZE * 5.7;
  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="h-full w-full select-none">
      {board.sea.map((s, i) => (
        <polygon key={i} points={pts(hexCorners(s.x, s.y, HEX_SIZE - 1))} fill="var(--sea)" stroke="var(--sea-light)" strokeWidth={1} />
      ))}
      {board.ports.map((p, i) => {
        const a = board.vertices[p.vertices[0]];
        const b = board.vertices[p.vertices[1]];
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={a.x} y2={a.y} stroke="var(--sand)" strokeWidth={3} strokeDasharray="4 3" />
            <line x1={p.x} y1={p.y} x2={b.x} y2={b.y} stroke="var(--sand)" strokeWidth={3} strokeDasharray="4 3" />
            <circle cx={p.x} cy={p.y} r={20} fill="var(--sand)" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={p.type === "generic" ? 14 : 11} fontWeight={700} fill="var(--token-ink)">
              {portLabel(p.type)}
            </text>
          </g>
        );
      })}
      {board.hexes.map((h) => {
        const spot = hexSpots.has(h.id);
        return (
          <g key={h.id} onClick={() => spot && onHex(h.id)} className={spot ? "cursor-pointer" : ""}>
            <polygon points={pts(hexCorners(h.x, h.y, HEX_SIZE - 2))} fill={terrainFill(h.terrain)} stroke="var(--sand)" strokeWidth={2} />
            <text x={h.x} y={h.y - 24} textAnchor="middle" fontSize={20}>
              {h.terrain === "desert" ? "🌈" : RES_ICON[h.terrain]}
            </text>
            {h.token !== null && (
              <g>
                <circle cx={h.x} cy={h.y + 6} r={18} fill="var(--token)" />
                <text x={h.x} y={h.y + 12} textAnchor="middle" fontSize={17} fontWeight={800} fill={h.token === 6 || h.token === 8 ? "var(--token-hot)" : "var(--token-ink)"}>
                  {h.token}
                </text>
                <text x={h.x} y={h.y + 21} textAnchor="middle" fontSize={7} fill="var(--token-ink)">
                  {"•".repeat(pips(h.token))}
                </text>
              </g>
            )}
            {h.terrain === "desert" && (
              <text x={h.x} y={h.y + 10} textAnchor="middle" fontSize={10} fill="var(--token)" fontWeight={600}>
                Chamarel
              </text>
            )}
            {state.monkey === h.id && (
              <text x={h.x + 22} y={h.y + 26} textAnchor="middle" fontSize={28}>
                🐒
              </text>
            )}
            {spot && <polygon className="spot" points={pts(hexCorners(h.x, h.y, HEX_SIZE - 6))} fill="none" stroke="var(--foreground)" strokeWidth={4} />}
          </g>
        );
      })}
      {board.edges.map((e) => {
        const a = board.vertices[e.a];
        const b = board.vertices[e.b];
        const owner = state.roads[e.id];
        if (owner !== undefined)
          return (
            <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={playerFill(state.players[owner].color)} strokeWidth={9} strokeLinecap="round" style={{ filter: "drop-shadow(0 1px 1px rgb(0 0 0 / .5))" }} />
          );
        if (!edgeSpots.has(e.id)) return null;
        return (
          <line key={e.id} className="spot" onClick={() => onEdge(e.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--foreground)" strokeWidth={10} strokeLinecap="round" />
        );
      })}
      {board.vertices.map((v) => {
        const b = state.buildings[v.id];
        const spot = vertexSpots.has(v.id);
        return (
          <g key={v.id} onClick={() => spot && onVertex(v.id)}>
            {b &&
              (b.kind === "campement" ? (
                <polygon points={`${v.x - 9},${v.y + 8} ${v.x + 9},${v.y + 8} ${v.x + 9},${v.y - 3} ${v.x},${v.y - 11} ${v.x - 9},${v.y - 3}`} fill={playerFill(state.players[b.owner].color)} stroke="var(--token-ink)" strokeWidth={2} />
              ) : (
                <polygon points={`${v.x - 14},${v.y + 10} ${v.x + 14},${v.y + 10} ${v.x + 14},${v.y - 4} ${v.x + 4},${v.y - 4} ${v.x + 4},${v.y - 10} ${v.x - 5},${v.y - 17} ${v.x - 14},${v.y - 10}`} fill={playerFill(state.players[b.owner].color)} stroke="var(--token-ink)" strokeWidth={2.5} />
              ))}
            {spot && <circle className="spot" cx={v.x} cy={v.y} r={10} fill="var(--foreground)" stroke="var(--token-ink)" strokeWidth={2} />}
          </g>
        );
      })}
    </svg>
  );
}
