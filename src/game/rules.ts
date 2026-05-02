import type { LobbySettings, RuleSettings } from "./types";

export const DEFAULT_RULES: RuleSettings = {
  canEat: true,
  sixExtraTurn: true,
  oneToEnter: true,
  tripleOnePenalty: false,
  cutExtraTurn: true,
  mustCutIfPossible: true
};

export const PLAYER_COLOR_OPTIONS = [
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#9333ea" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#0f766e" }
];

export const DEFAULT_PLAYER_COLORS: string[] = ["#dc2626", "#2563eb", "#16a34a", "#9333ea"];

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
  mode: "pvc",
  playerCount: 2,
  chipsPerPlayer: 2,
  diceCount: 1,
  boardId: "classic",
  playerColors: DEFAULT_PLAYER_COLORS,
  rules: DEFAULT_RULES
};

export const RULE_LABELS: Record<keyof RuleSettings, string> = {
  canEat: "Rule 1: One can eat another chip",
  sixExtraTurn: "Rule 2: Rolling 6 gives another turn",
  oneToEnter: "Rule 3: Rolling 1 or 6 brings chip out",
  tripleOnePenalty: "Rule 4: Three consecutive rolls of 1 cut one own coin",
  cutExtraTurn: "Rule 5: Gain another turn by cutting a coin",
  mustCutIfPossible: "Rule 6: Must cut the coin if it is cuttable"
};

export const RULE_DESCRIPTIONS: Record<keyof RuleSettings, string> = {
  canEat: "Opponent chips are sent outside, except on cell 1 and snake-tail safe cells where chips stack.",
  sixExtraTurn: "With two dice, both dice must show 6 to grant the extra turn.",
  oneToEnter: "With two dice, any die showing 1 or 6 can bring a chip to cell 1.",
  tripleOnePenalty: "A player chooses one active own chip to send outside after the third consecutive 1 roll.",
  cutExtraTurn: "A successful cut keeps the same player on turn.",
  mustCutIfPossible: "Cutting moves are forced when at least one is available."
};

export function normalizeLobbySettings(settings: LobbySettings): LobbySettings {
  const mode = settings.mode === "pvp" ? "pvp" : "pvc";
  const playerCount = clampInteger(settings.playerCount, 1, 4);
  const chipsPerPlayer = clampInteger(settings.chipsPerPlayer, 1, 4);
  const diceCount = settings.diceCount === 2 ? 2 : 1;
  const playerColors = normalizePlayerColors(settings.playerColors);

  return {
    mode,
    playerCount,
    chipsPerPlayer,
    diceCount,
    boardId: settings.boardId,
    playerColors,
    rules: {
      ...DEFAULT_RULES,
      ...settings.rules
    }
  };
}

function normalizePlayerColors(colors: string[] | undefined): string[] {
  return DEFAULT_PLAYER_COLORS.map((fallback, index) => {
    const color = colors?.[index];
    const isAllowed = PLAYER_COLOR_OPTIONS.some((option) => option.value === color);
    return isAllowed && color ? color : fallback;
  });
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
}
