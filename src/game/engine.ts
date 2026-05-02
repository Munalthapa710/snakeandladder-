import { getBoardLayout } from "./boards";
import { DEFAULT_LOBBY_SETTINGS, DEFAULT_PLAYER_COLORS, normalizeLobbySettings } from "./rules";
import type {
  BoardLayout,
  Chip,
  ChipDirection,
  DiceResult,
  GameState,
  LobbySettings,
  MoveOption,
  Player,
  TransportMove,
  TurnEventType
} from "./types";

export function createInitialState(settings: LobbySettings = DEFAULT_LOBBY_SETTINGS): GameState {
  const normalized = normalizeLobbySettings(settings);
  const board = getBoardLayout(normalized.boardId);
  const players = createPlayers(normalized);
  const consecutiveOnes = Object.fromEntries(players.map((player) => [player.id, 0]));

  const state: GameState = {
    settings: normalized,
    board,
    players,
    currentPlayerIndex: 0,
    phase: "awaitingRoll",
    validMoves: [],
    forcedCut: false,
    log: [],
    turnNumber: 0,
    eventCounter: 0,
    consecutiveOnes
  };

  return addEvent(
    state,
    "info",
    `Game started on ${board.name} with ${normalized.playerCount} player${
      normalized.playerCount === 1 ? "" : "s"
    }.`
  );
}

export function rollDice(state: GameState, values?: number[]): GameState {
  if (state.phase !== "awaitingRoll") {
    return addEvent(state, "invalid", "Roll is not available right now.", getCurrentPlayer(state).id);
  }

  const player = getCurrentPlayer(state);
  const dice = createDiceResult(state.settings.diceCount, values);
  let next: GameState = {
    ...state,
    dice,
    validMoves: [],
    lastMove: undefined,
    forcedCut: false,
    pendingPenalty: undefined,
    turnNumber: state.turnNumber + 1,
    message: `${player.name} rolled ${formatDice(dice)}.`
  };

  next = addEvent(next, "roll", `${player.name} rolled ${formatDice(dice)}.`, player.id);
  next = updateConsecutiveOnes(next, player.id, dice);

  if (shouldApplyTripleOnePenalty(next, player.id)) {
    const activeChipIds = getPlayer(next, player.id).chips
      .filter((chip) => chip.status === "active")
      .map((chip) => chip.id);

    next = {
      ...next,
      consecutiveOnes: {
        ...next.consecutiveOnes,
        [player.id]: 0
      }
    };

    if (activeChipIds.length > 0) {
      return addEvent(
        {
          ...next,
          phase: "awaitingPenalty",
          pendingPenalty: { playerId: player.id, chipIds: activeChipIds },
          message: `${player.name} must send one own active chip outside.`
        },
        "penalty",
        `${player.name} rolled 1 three times and must cut one own coin.`,
        player.id
      );
    }

    next = addEvent(
      next,
      "penalty",
      `${player.name} rolled 1 three times, but has no active chip to cut.`,
      player.id
    );
  }

  return continueAfterRoll(next);
}

export function choosePenaltyChip(state: GameState, chipId: string): GameState {
  if (state.phase !== "awaitingPenalty" || !state.pendingPenalty) {
    return addEvent(state, "invalid", "There is no penalty chip to choose.", getCurrentPlayer(state).id);
  }

  if (!state.pendingPenalty.chipIds.includes(chipId)) {
    return addEvent(state, "invalid", "Choose one of your active chips for the penalty.", state.pendingPenalty.playerId);
  }

  const chip = findChip(state.players, chipId);
  let next: GameState = {
    ...state,
    players: setChipOutside(state.players, chipId),
    pendingPenalty: undefined,
    lastMove: undefined,
    phase: "awaitingRoll",
    message: `${chip?.label ?? "A chip"} was sent outside.`
  };

  next = addEvent(
    next,
    "penalty",
    `${chip?.label ?? "A chip"} was sent outside by the three-1 penalty.`,
    state.pendingPenalty.playerId
  );

  return continueAfterRoll(next);
}

export function applyMove(state: GameState, chipId: string): GameState {
  if (state.phase !== "awaitingMove" || !state.dice) {
    return addEvent(state, "invalid", "Choose a move after rolling the dice.", getCurrentPlayer(state).id);
  }

  const option = state.validMoves.find((move) => move.chipId === chipId);
  const player = getCurrentPlayer(state);

  if (!option) {
    return addEvent(state, "invalid", "That chip cannot move with this roll.", player.id);
  }

  if (state.forcedCut && !option.canCut) {
    return addEvent(state, "invalid", "A cutting move is available and must be used.", player.id);
  }

  const chip = findChip(state.players, chipId);
  const cutLabels = option.cutChipIds
    .map((cutChipId) => findChip(state.players, cutChipId)?.label)
    .filter(Boolean)
    .join(", ");

  let next: GameState = {
    ...state,
    players: applyMoveToPlayers(state.players, option),
    validMoves: [],
    lastMove: option,
    forcedCut: false,
    pendingPenalty: undefined,
    message: `${option.chipLabel} moved to cell ${option.finalPosition}.`
  };

  if (option.enters) {
    next = addEvent(next, "enter", `${option.chipLabel} entered the board on cell ${option.finalPosition}.`, player.id);
  } else {
    next = addEvent(
      next,
      "move",
      `${option.chipLabel} moved from cell ${option.from} to ${option.finalPosition}.`,
      player.id
    );
  }

  if (option.transport) {
    next = addEvent(
      next,
      "transport",
      `${option.transport.type === "ladder" ? "Ladder climb" : "Snake bite"}: ${option.chipLabel} moved from ${
        option.transport.from
      } to ${option.transport.to}.`,
      player.id
    );
  }

  if (option.canCut) {
    next = addEvent(next, "cut", `${option.chipLabel} cut ${cutLabels}.`, player.id);
  }

  if (option.finishes) {
    next = addEvent(next, "move", `${option.chipLabel} completed the 1 to 100 to 1 journey.`, player.id);
  }

  const updatedPlayer = getPlayer(next, player.id);
  if (updatedPlayer.chips.every((playerChip) => playerChip.status === "finished")) {
    return addEvent(
      {
        ...next,
        phase: "gameOver",
        winnerId: player.id,
        dice: undefined,
        validMoves: [],
        forcedCut: false,
        message: `${player.name} won the game.`
      },
      "win",
      `${player.name} won the game.`,
      player.id
    );
  }

  return completeTurn(next, state.dice, option.canCut, chip?.label);
}

export function getValidMoves(state: GameState): MoveOption[] {
  if (!state.dice) {
    return [];
  }

  const player = getCurrentPlayer(state);

  return player.chips.flatMap((chip) => {
    const option = buildMoveOption(state, chip);
    return option ? [option] : [];
  });
}

export function hasOneRoll(dice: DiceResult): boolean {
  return dice.values.some((value) => value === 1);
}

export function hasEntryRoll(dice: DiceResult): boolean {
  return dice.values.some((value) => value === 1 || value === 6);
}

export function hasSixForExtraTurn(dice: DiceResult): boolean {
  return dice.values.length === 1 ? dice.values[0] === 6 : dice.values.every((value) => value === 6);
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function chooseComputerMove(state: GameState): MoveOption | undefined {
  const forcedCuts = state.validMoves.filter((move) => move.canCut);

  if (state.forcedCut && forcedCuts.length > 0) {
    return rankMoves(forcedCuts, state)[0];
  }

  const priorityGroups = [
    state.validMoves.filter((move) => move.finishes),
    state.validMoves.filter((move) => move.canCut),
    state.validMoves.filter((move) => move.transport?.type === "ladder"),
    state.validMoves
  ];

  const selectedGroup = priorityGroups.find((group) => group.length > 0) ?? [];
  return rankMoves(selectedGroup, state)[0];
}

export function describeChipStatus(chip: Chip): string {
  if (chip.status === "outside") {
    return "Outside";
  }

  if (chip.status === "finished") {
    return "Finished";
  }

  return chip.direction === "down" ? "Returning: 100 to 1" : "Going up: 1 to 100";
}

export function getTransport(board: BoardLayout, cell: number): TransportMove | undefined {
  if (board.ladders[cell]) {
    return { type: "ladder", from: cell, to: board.ladders[cell] };
  }

  if (board.snakes[cell]) {
    return { type: "snake", from: cell, to: board.snakes[cell] };
  }

  return undefined;
}

function createPlayers(settings: LobbySettings): Player[] {
  let computerIndex = 1;

  return Array.from({ length: settings.playerCount }, (_, playerIndex) => {
    const isComputer = settings.mode === "pvc" && playerIndex > 0;
    const playerNumber = playerIndex + 1;
    const playerId = `p${playerNumber}`;
    const name = isComputer ? `Computer ${computerIndex++}` : `Player ${playerNumber}`;

    return {
      id: playerId,
      name,
      type: isComputer ? "computer" : "human",
      color: settings.playerColors[playerIndex] ?? DEFAULT_PLAYER_COLORS[playerIndex],
      chips: Array.from({ length: settings.chipsPerPlayer }, (_, chipIndex) => ({
        id: `${playerId}-c${chipIndex + 1}`,
        playerId,
        label: `P${playerNumber}-C${chipIndex + 1}`,
        status: "outside",
        direction: null,
        position: null
      }))
    };
  });
}

function createDiceResult(diceCount: 1 | 2, values?: number[]): DiceResult {
  const rolledValues = values ?? Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);

  if (
    rolledValues.length !== diceCount ||
    rolledValues.some((value) => !Number.isInteger(value) || value < 1 || value > 6)
  ) {
    throw new Error(`Expected ${diceCount} dice value${diceCount === 1 ? "" : "s"} between 1 and 6.`);
  }

  return {
    values: rolledValues,
    total: rolledValues.reduce((sum, value) => sum + value, 0)
  };
}

function updateConsecutiveOnes(state: GameState, playerId: string, dice: DiceResult): GameState {
  const count = hasOneRoll(dice) ? (state.consecutiveOnes[playerId] ?? 0) + 1 : 0;

  return {
    ...state,
    consecutiveOnes: {
      ...state.consecutiveOnes,
      [playerId]: count
    }
  };
}

function shouldApplyTripleOnePenalty(state: GameState, playerId: string): boolean {
  return state.settings.rules.tripleOnePenalty && (state.consecutiveOnes[playerId] ?? 0) >= 3;
}

function continueAfterRoll(state: GameState): GameState {
  const moves = getValidMoves(state);
  const forcedCut = state.settings.rules.canEat && state.settings.rules.mustCutIfPossible && moves.some((move) => move.canCut);

  if (moves.length === 0) {
    const player = getCurrentPlayer(state);
    const next = addEvent(state, "move", `${player.name} has no valid moves.`, player.id);
    return completeTurn(next, state.dice, false);
  }

  return {
    ...state,
    phase: "awaitingMove",
    validMoves: moves,
    forcedCut,
    message: forcedCut ? "A cutting move is available and must be used." : "Choose a chip to move."
  };
}

function buildMoveOption(state: GameState, chip: Chip): MoveOption | undefined {
  if (!state.dice || chip.status === "finished") {
    return undefined;
  }

  const diceTotal = state.dice.total;
  let rawTarget: number;
  let finalPosition: number;
  let directionAfter: ChipDirection = chip.direction;
  let transport: TransportMove | undefined;
  let enters = false;
  let finishes = false;

  if (chip.status === "outside") {
    if (state.settings.rules.oneToEnter && !hasEntryRoll(state.dice)) {
      return undefined;
    }

    enters = true;
    rawTarget = state.settings.rules.oneToEnter ? 1 : diceTotal;
    transport = state.settings.rules.oneToEnter ? undefined : getTransport(state.board, rawTarget);
    finalPosition = transport?.to ?? rawTarget;
    directionAfter = "up";
  } else if (chip.direction === "up" && chip.position !== null) {
    rawTarget = chip.position + diceTotal;

    if (rawTarget > 100) {
      return undefined;
    }

    if (rawTarget === 100) {
      finalPosition = 100;
      directionAfter = "down";
    } else {
      transport = getTransport(state.board, rawTarget);
      finalPosition = transport?.to ?? rawTarget;
      directionAfter = "up";
    }
  } else if (chip.direction === "down" && chip.position !== null) {
    rawTarget = chip.position - diceTotal;

    if (rawTarget < 1) {
      return undefined;
    }

    if (rawTarget === 1) {
      finalPosition = 1;
      directionAfter = null;
      finishes = true;
    } else {
      // Returning chips trigger the same snake or ladder mapping after landing.
      // The direction remains "down"; the mapping can either help or delay the return.
      transport = getTransport(state.board, rawTarget);
      finalPosition = transport?.to ?? rawTarget;
      directionAfter = "down";
    }
  } else {
    return undefined;
  }

  const cutChipIds =
    state.settings.rules.canEat && !finishes
      ? getCuttableOpponentChipIds(state, chip.playerId, finalPosition)
      : [];

  return {
    id: chip.id,
    playerId: chip.playerId,
    chipId: chip.id,
    chipLabel: chip.label,
    from: chip.position,
    to: rawTarget,
    finalPosition,
    enters,
    finishes,
    canCut: cutChipIds.length > 0,
    cutChipIds,
    transport,
    directionBefore: chip.direction,
    directionAfter,
    progressScore: getProgressScore(finalPosition, directionAfter, finishes)
  };
}

function getCuttableOpponentChipIds(state: GameState, playerId: string, position: number): string[] {
  if (isSafeStackCell(state, position)) {
    return [];
  }

  return state.players.flatMap((player) => {
    if (player.id === playerId) {
      return [];
    }

    return player.chips
      .filter((chip) => chip.status === "active" && chip.position === position)
      .map((chip) => chip.id);
  });
}

function isSafeStackCell(state: GameState, position: number): boolean {
  return position === 1 || Object.values(state.board.snakes).includes(position);
}

function applyMoveToPlayers(players: Player[], option: MoveOption): Player[] {
  return players.map((player) => ({
    ...player,
    chips: player.chips.map((chip) => {
      if (option.cutChipIds.includes(chip.id)) {
        return {
          ...chip,
          status: "outside",
          direction: null,
          position: null
        };
      }

      if (chip.id !== option.chipId) {
        return chip;
      }

      return {
        ...chip,
        status: option.finishes ? "finished" : "active",
        direction: option.directionAfter,
        position: option.finalPosition
      };
    })
  }));
}

function setChipOutside(players: Player[], chipId: string): Player[] {
  return players.map((player) => ({
    ...player,
    chips: player.chips.map((chip) =>
      chip.id === chipId
        ? {
            ...chip,
            status: "outside",
            direction: null,
            position: null
          }
        : chip
    )
  }));
}

function completeTurn(state: GameState, dice: DiceResult | undefined, cutOccurred: boolean, movedLabel?: string): GameState {
  if (!dice) {
    return advanceTurn(state);
  }

  const reasons: string[] = [];

  if (state.settings.rules.sixExtraTurn && hasSixForExtraTurn(dice)) {
    reasons.push("rolling 6");
  }

  if (state.settings.rules.cutExtraTurn && cutOccurred) {
    reasons.push("cutting a coin");
  }

  if (reasons.length > 0) {
    const player = getCurrentPlayer(state);
    return addEvent(
      {
        ...state,
        phase: "awaitingRoll",
        dice: undefined,
        validMoves: [],
        forcedCut: false,
        message: `${player.name} gets another turn.`
      },
      "extra",
      `${player.name} gets another turn for ${reasons.join(" and ")}${movedLabel ? ` after moving ${movedLabel}` : ""}.`,
      player.id
    );
  }

  return advanceTurn(state);
}

function advanceTurn(state: GameState): GameState {
  return {
    ...state,
    phase: "awaitingRoll",
    dice: undefined,
    validMoves: [],
    forcedCut: false,
    pendingPenalty: undefined,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    message: `${state.players[(state.currentPlayerIndex + 1) % state.players.length].name}'s turn.`
  };
}

function addEvent(state: GameState, type: TurnEventType, message: string, playerId?: string): GameState {
  const eventCounter = state.eventCounter + 1;

  return {
    ...state,
    eventCounter,
    message,
    log: [
      ...state.log,
      {
        id: `event-${eventCounter}`,
        turn: state.turnNumber,
        playerId,
        type,
        message
      }
    ].slice(-80)
  };
}

function getPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((item) => item.id === playerId);

  if (!player) {
    throw new Error(`Player ${playerId} not found.`);
  }

  return player;
}

function findChip(players: Player[], chipId: string): Chip | undefined {
  return players.flatMap((player) => player.chips).find((chip) => chip.id === chipId);
}

function getProgressScore(position: number, direction: ChipDirection, finishes: boolean): number {
  if (finishes) {
    return 200;
  }

  if (direction === "down") {
    return 100 + (100 - position);
  }

  return position;
}

function rankMoves(moves: MoveOption[], state: GameState): MoveOption[] {
  return [...moves].sort((a, b) => getMoveRankScore(b, state) - getMoveRankScore(a, state));
}

function getMoveRankScore(move: MoveOption, state: GameState): number {
  const dangerPenalty = estimateDanger(move, state) * 8;
  const ladderBonus = move.transport?.type === "ladder" ? 14 : 0;
  const cutBonus = move.canCut ? 25 : 0;
  const finishBonus = move.finishes ? 100 : 0;

  return move.progressScore + ladderBonus + cutBonus + finishBonus - dangerPenalty;
}

function estimateDanger(move: MoveOption, state: GameState): number {
  if (move.finishes) {
    return 0;
  }

  const minRoll = state.settings.diceCount;
  const maxRoll = state.settings.diceCount * 6;

  return state.players.reduce((danger, player) => {
    if (player.id === move.playerId) {
      return danger;
    }

    const canReach = player.chips.some((chip) => {
      if (chip.status !== "active" || chip.position === null) {
        return false;
      }

      const distance = chip.direction === "down" ? chip.position - move.finalPosition : move.finalPosition - chip.position;
      return distance >= minRoll && distance <= maxRoll;
    });

    return canReach ? danger + 1 : danger;
  }, 0);
}

function formatDice(dice: DiceResult): string {
  return dice.values.length === 1 ? `${dice.total}` : `${dice.values.join(" + ")} = ${dice.total}`;
}
