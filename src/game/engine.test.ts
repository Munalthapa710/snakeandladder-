import { describe, expect, it } from "vitest";
import { applyMove, createInitialState, rollDice } from "./engine";
import { DEFAULT_LOBBY_SETTINGS, DEFAULT_RULES } from "./rules";
import type { Chip, GameState, LobbySettings } from "./types";

describe("snake and ladder engine", () => {
  it("requires rolling 1 or 6 to enter when Rule 3 is on", () => {
    let state = createTestState({ playerCount: 1, chipsPerPlayer: 1 });

    state = rollDice(state, [2]);
    expect(getChip(state, "p1-c1").status).toBe("outside");
    expect(state.phase).toBe("awaitingRoll");

    state = rollDice(state, [1]);
    expect(state.phase).toBe("awaitingMove");
    expect(state.validMoves[0]).toMatchObject({
      chipId: "p1-c1",
      enters: true,
      finalPosition: 1
    });

    state = applyMove(state, "p1-c1");
    expect(getChip(state, "p1-c1")).toMatchObject({
      status: "active",
      position: 1,
      direction: "up"
    });
  });

  it("also allows rolling 6 to enter", () => {
    const state = rollDice(createTestState({ playerCount: 1, chipsPerPlayer: 1 }), [6]);

    expect(state.phase).toBe("awaitingMove");
    expect(state.validMoves[0]).toMatchObject({
      enters: true,
      finalPosition: 1
    });
  });

  it("allows two-dice entry when at least one die shows 1 or 6", () => {
    let state = rollDice(createTestState({ playerCount: 1, chipsPerPlayer: 1, diceCount: 2 }), [1, 5]);

    expect(state.validMoves[0]).toMatchObject({
      enters: true,
      finalPosition: 1
    });

    state = rollDice(createTestState({ playerCount: 1, chipsPerPlayer: 1, diceCount: 2 }), [6, 5]);
    expect(state.validMoves[0]).toMatchObject({
      enters: true,
      finalPosition: 1
    });
  });

  it("does not count 6 toward the three consecutive 1 penalty", () => {
    let state = createTestState({
      playerCount: 1,
      chipsPerPlayer: 1,
      rules: { ...DEFAULT_RULES, tripleOnePenalty: true }
    });

    state = applyMove(rollDice(state, [6]), "p1-c1");

    expect(state.consecutiveOnes.p1).toBe(0);
  });

  it("uses normal movement from outside when Rule 3 is off", () => {
    const state = rollDice(
      createTestState({
        playerCount: 1,
        chipsPerPlayer: 1,
        rules: { ...DEFAULT_RULES, oneToEnter: false }
      }),
      [4]
    );

    expect(state.validMoves[0]).toMatchObject({
      enters: true,
      to: 4,
      finalPosition: 14,
      transport: { type: "ladder", from: 4, to: 14 }
    });
  });

  it("turns a chip around at 100 and finishes only after returning to 1", () => {
    let state = withChip(createTestState({ playerCount: 1, chipsPerPlayer: 1 }), "p1-c1", {
      status: "active",
      direction: "up",
      position: 97
    });

    state = applyMove(rollDice(state, [3]), "p1-c1");
    expect(getChip(state, "p1-c1")).toMatchObject({
      status: "active",
      direction: "down",
      position: 100
    });
    expect(state.phase).toBe("awaitingRoll");

    state = withChip(state, "p1-c1", {
      status: "active",
      direction: "down",
      position: 4
    });
    state = applyMove(rollDice(state, [3]), "p1-c1");

    expect(getChip(state, "p1-c1")).toMatchObject({
      status: "finished",
      direction: null,
      position: 1
    });
    expect(state.phase).toBe("gameOver");
    expect(state.winnerId).toBe("p1");
  });

  it("blocks movement beyond the current journey target", () => {
    const state = rollDice(
      withChip(createTestState({ playerCount: 1, chipsPerPlayer: 1 }), "p1-c1", {
        status: "active",
        direction: "up",
        position: 98
      }),
      [3]
    );

    expect(getChip(state, "p1-c1")).toMatchObject({
      status: "active",
      position: 98
    });
    expect(state.phase).toBe("awaitingRoll");
  });

  it("uses the same snake and ladder mapping while returning", () => {
    const state = rollDice(
      withChip(createTestState({ playerCount: 1, chipsPerPlayer: 1 }), "p1-c1", {
        status: "active",
        direction: "down",
        position: 5
      }),
      [1]
    );

    expect(state.validMoves[0]).toMatchObject({
      to: 4,
      finalPosition: 14,
      directionAfter: "down",
      transport: { type: "ladder", from: 4, to: 14 }
    });
  });

  it("cuts opponent chips when landing on their cell", () => {
    let state = createTestState({
      mode: "pvp",
      playerCount: 2,
      chipsPerPlayer: 1,
      rules: { ...DEFAULT_RULES, sixExtraTurn: false, cutExtraTurn: false }
    });
    state = withChip(state, "p1-c1", { status: "active", direction: "up", position: 4 });
    state = withChip(state, "p2-c1", { status: "active", direction: "up", position: 7 });

    state = applyMove(rollDice(state, [3]), "p1-c1");

    expect(getChip(state, "p1-c1").position).toBe(7);
    expect(getChip(state, "p2-c1")).toMatchObject({
      status: "outside",
      position: null,
      direction: null
    });
  });

  it("prevents non-cutting moves when Rule 6 forces a cut", () => {
    let state = createTestState({
      mode: "pvp",
      playerCount: 2,
      chipsPerPlayer: 2,
      rules: { ...DEFAULT_RULES, sixExtraTurn: false, cutExtraTurn: false }
    });
    state = withChip(state, "p1-c1", { status: "active", direction: "up", position: 4 });
    state = withChip(state, "p1-c2", { status: "active", direction: "up", position: 10 });
    state = withChip(state, "p2-c1", { status: "active", direction: "up", position: 7 });
    state = rollDice(state, [3]);

    expect(state.forcedCut).toBe(true);
    const blocked = applyMove(state, "p1-c2");

    expect(blocked.phase).toBe("awaitingMove");
    expect(getChip(blocked, "p1-c2").position).toBe(10);
    expect(blocked.log.at(-1)?.type).toBe("invalid");

    const moved = applyMove(blocked, "p1-c1");
    expect(getChip(moved, "p2-c1").status).toBe("outside");
  });

  it("keeps the same player after a 6 when Rule 2 is on", () => {
    let state = createTestState({ mode: "pvp", playerCount: 2, chipsPerPlayer: 1 });
    state = withChip(state, "p1-c1", { status: "active", direction: "up", position: 1 });
    state = applyMove(rollDice(state, [6]), "p1-c1");

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe("awaitingRoll");
    expect(state.log.at(-1)?.type).toBe("extra");
  });
});

function createTestState(overrides: Partial<LobbySettings> = {}): GameState {
  return createInitialState({
    ...DEFAULT_LOBBY_SETTINGS,
    mode: "pvp",
    playerCount: 1,
    chipsPerPlayer: 1,
    ...overrides,
    rules: {
      ...DEFAULT_RULES,
      ...overrides.rules
    }
  });
}

function withChip(state: GameState, chipId: string, patch: Partial<Chip>): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      chips: player.chips.map((chip) => (chip.id === chipId ? { ...chip, ...patch } : chip))
    }))
  };
}

function getChip(state: GameState, chipId: string): Chip {
  const chip = state.players.flatMap((player) => player.chips).find((item) => item.id === chipId);

  if (!chip) {
    throw new Error(`Chip ${chipId} not found`);
  }

  return chip;
}
