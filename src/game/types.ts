export type GameMode = "pvp" | "pvc";
export type PlayerType = "human" | "computer";
export type ChipStatus = "outside" | "active" | "finished";
export type ChipDirection = "up" | "down" | null;
export type GamePhase = "awaitingRoll" | "awaitingMove" | "awaitingPenalty" | "gameOver";
export type DiceCount = 1 | 2;
export type BoardId = "classic" | "easy" | "hard" | "balanced" | "mixed";

export interface RuleSettings {
  canEat: boolean;
  sixExtraTurn: boolean;
  oneToEnter: boolean;
  tripleOnePenalty: boolean;
  cutExtraTurn: boolean;
  mustCutIfPossible: boolean;
}

export interface LobbySettings {
  mode: GameMode;
  playerCount: number;
  chipsPerPlayer: number;
  diceCount: DiceCount;
  boardId: BoardId;
  playerColors: string[];
  rules: RuleSettings;
}

export interface BoardLayout {
  id: BoardId;
  name: string;
  description: string;
  ladders: Record<number, number>;
  snakes: Record<number, number>;
}

export interface Chip {
  id: string;
  playerId: string;
  label: string;
  status: ChipStatus;
  direction: ChipDirection;
  position: number | null;
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  color: string;
  chips: Chip[];
}

export interface DiceResult {
  values: number[];
  total: number;
}

export interface TransportMove {
  type: "snake" | "ladder";
  from: number;
  to: number;
}

export interface MoveOption {
  id: string;
  playerId: string;
  chipId: string;
  chipLabel: string;
  from: number | null;
  to: number;
  finalPosition: number;
  enters: boolean;
  finishes: boolean;
  canCut: boolean;
  cutChipIds: string[];
  transport?: TransportMove;
  directionBefore: ChipDirection;
  directionAfter: ChipDirection;
  progressScore: number;
}

export interface ChipStepAnimation {
  chipId: string;
  positions: number[];
  index: number;
}

export interface PendingPenalty {
  playerId: string;
  chipIds: string[];
}

export type TurnEventType =
  | "info"
  | "roll"
  | "move"
  | "enter"
  | "transport"
  | "cut"
  | "extra"
  | "invalid"
  | "penalty"
  | "win";

export interface TurnEvent {
  id: string;
  turn: number;
  playerId?: string;
  type: TurnEventType;
  message: string;
}

export interface GameState {
  settings: LobbySettings;
  board: BoardLayout;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  dice?: DiceResult;
  validMoves: MoveOption[];
  lastMove?: MoveOption;
  forcedCut: boolean;
  pendingPenalty?: PendingPenalty;
  winnerId?: string;
  log: TurnEvent[];
  turnNumber: number;
  eventCounter: number;
  consecutiveOnes: Record<string, number>;
  message?: string;
}
