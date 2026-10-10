export type Resource = "sucre" | "basalte" | "the" | "ananas" | "poisson";
export const RESOURCES: Resource[] = ["sucre", "basalte", "the", "ananas", "poisson"];
export type Terrain = Resource | "desert";
export type ResMap = Record<Resource, number>;
export type DevType = "sega" | "bazar" | "route" | "cyclone" | "lieux";
export type PortType = "generic" | Resource;
export type PlayerColor = "rouge" | "bleu" | "jaune" | "vert";
export type Phase =
  | "SETUP_1"
  | "SETUP_2"
  | "ROLL"
  | "DISCARD"
  | "MOVE_MONKEY"
  | "STEAL"
  | "MAIN"
  | "GAME_OVER";

export interface Hex {
  id: number;
  q: number;
  r: number;
  x: number;
  y: number;
  terrain: Terrain;
  token: number | null;
  vertices: number[];
}
export interface Vertex {
  id: number;
  x: number;
  y: number;
  hexes: number[];
  adj: number[];
  edges: number[];
  port: PortType | null;
}
export interface Edge {
  id: number;
  a: number;
  b: number;
}
export interface Port {
  type: PortType;
  vertices: [number, number];
  x: number;
  y: number;
}
export interface Board {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
  sea: { x: number; y: number }[];
}
export interface Player {
  id: number;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  hand: ResMap;
  dev: DevType[];
  newDev: DevType[];
  knightsPlayed: number;
  settlementsLeft: number;
  citiesLeft: number;
  roadsLeft: number;
}
export interface Building {
  owner: number;
  kind: "campement" | "cottage";
}
export interface TradeOffer {
  from: number;
  to: number;
  give: Partial<ResMap>;
  get: Partial<ResMap>;
}
export interface GameState {
  seed: number;
  rng: number;
  board: Board;
  players: Player[];
  current: number;
  phase: Phase;
  setupStep: "settlement" | "road";
  setupIndex: number;
  setupOrder: number[];
  lastSetupVertex: number | null;
  buildings: Record<number, Building>;
  roads: Record<number, number>;
  monkey: number;
  bank: ResMap;
  devDeck: DevType[];
  dice: [number, number] | null;
  discardQueue: { player: number; amount: number }[];
  afterMonkey: "ROLL" | "MAIN";
  devPlayedThisTurn: boolean;
  freeRoads: number;
  pendingTrade: TradeOffer | null;
  longestRoad: number | null;
  largestArmy: number | null;
  roadLengths: number[];
  winner: number | null;
  log: string[];
  turn: number;
}

type A<T extends string, X = object> = { type: T; player: number } & X;
export type Action =
  | A<"PLACE_SETTLEMENT", { vertex: number }>
  | A<"PLACE_ROAD", { edge: number }>
  | A<"ROLL">
  | A<"DISCARD", { cards: ResMap }>
  | A<"MOVE_MONKEY", { hex: number }>
  | A<"STEAL", { victim: number }>
  | A<"BUILD_ROAD", { edge: number }>
  | A<"BUILD_SETTLEMENT", { vertex: number }>
  | A<"BUILD_CITY", { vertex: number }>
  | A<"BUY_DEV">
  | A<"PLAY_SEGA">
  | A<"PLAY_ROUTE">
  | A<"PLAY_BAZAR", { res: [Resource, Resource] }>
  | A<"PLAY_CYCLONE", { res: Resource }>
  | A<"BANK_TRADE", { give: Resource; get: Resource }>
  | A<"OFFER_TRADE", { to: number; give: Partial<ResMap>; get: Partial<ResMap> }>
  | A<"ACCEPT_TRADE">
  | A<"DECLINE_TRADE">
  | A<"SKIP_FREE_ROADS">
  | A<"END_TURN">;

export interface SeatConfig {
  name: string;
  color: PlayerColor;
  isBot: boolean;
}
export interface GameConfig {
  seats: SeatConfig[];
}
