import { useEffect, useMemo, useRef, useState } from "react";
import { DicePanel } from "./components/DicePanel";
import { GameBoard } from "./components/GameBoard";
import { Lobby } from "./components/Lobby";
import { BOARD_LAYOUTS, getBoardLayout } from "./game/boards";
import {
  applyMove,
  chooseComputerMove,
  choosePenaltyChip,
  createInitialState,
  getCurrentPlayer,
  rollDice
} from "./game/engine";
import { DEFAULT_LOBBY_SETTINGS, DEFAULT_RULES, normalizeLobbySettings } from "./game/rules";
import type { ChipStepAnimation, GameState, LobbySettings, MoveOption } from "./game/types";

const SETTINGS_STORAGE_KEY = "snake-ladder-settings";
const GAME_STORAGE_KEY = "snake-ladder-game";

export default function App() {
  const [settings, setSettings] = useState<LobbySettings>(() => loadStoredSettings());
  const [game, setGame] = useState<GameState | null>(() => loadStoredGame());
  const [chipAnimation, setChipAnimation] = useState<ChipStepAnimation | null>(null);
  const automationKey = useRef<string>("");
  const gameRef = useRef<GameState | null>(game);
  const chipAnimationRef = useRef<ChipStepAnimation | null>(chipAnimation);
  const animationTimers = useRef<number[]>([]);

  const currentPlayer = game ? getCurrentPlayer(game) : null;
  const isHumanTurn = currentPlayer?.type === "human" && !chipAnimation;

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    chipAnimationRef.current = chipAnimation;
  }, [chipAnimation]);

  useEffect(() => {
    return () => clearAnimationTimers();
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (game) {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
    } else {
      localStorage.removeItem(GAME_STORAGE_KEY);
    }
  }, [game]);

  useEffect(() => {
    if (!game || chipAnimation) {
      return;
    }

    const player = getCurrentPlayer(game);

    if (player.type !== "computer" || game.phase === "gameOver") {
      return;
    }

    const key = [
      game.turnNumber,
      game.phase,
      player.id,
      game.dice?.values.join("-") ?? "none",
      game.pendingPenalty?.chipIds.join("-") ?? "none",
      game.validMoves.map((move) => move.id).join("-")
    ].join(":");

    if (automationKey.current === key) {
      return;
    }

    automationKey.current = key;
    const delay = game.phase === "awaitingRoll" ? 700 : 850;

    const timer = window.setTimeout(() => {
      const current = gameRef.current;

      if (!current || chipAnimationRef.current) {
        return;
      }

      const activePlayer = getCurrentPlayer(current);

      if (activePlayer.id !== player.id || activePlayer.type !== "computer" || current.phase !== game.phase) {
        return;
      }

      if (current.phase === "awaitingRoll") {
        setGame(rollDice(current));
        return;
      }

      if (current.phase === "awaitingPenalty" && current.pendingPenalty) {
        setGame(choosePenaltyChip(current, chooseComputerPenaltyChip(current)));
        return;
      }

      if (current.phase === "awaitingMove") {
        const move = chooseComputerMove(current);

        if (move) {
          animateMove(current, move);
        }
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [game, chipAnimation]);

  const activeBoard = useMemo(
    () => BOARD_LAYOUTS.find((board) => board.id === settings.boardId) ?? BOARD_LAYOUTS[0],
    [settings.boardId]
  );

  function startGame(nextSettings = settings) {
    const normalized = normalizeLobbySettings(nextSettings);
    setSettings(normalized);
    setGame(createInitialState(normalized));
  }

  function restartGame() {
    if (!game) {
      return;
    }

    clearAnimationTimers();
    setChipAnimation(null);
    setGame(createInitialState(game.settings));
  }

  function backToLobby() {
    if (game) {
      setSettings(game.settings);
    }

    clearAnimationTimers();
    setChipAnimation(null);
    setGame(null);
  }

  function handleMove(chipId: string) {
    const current = gameRef.current;

    if (!current || chipAnimationRef.current) {
      return;
    }

    const move = current.validMoves.find((option) => option.chipId === chipId);

    if (!move || current.phase !== "awaitingMove") {
      setGame(applyMove(current, chipId));
      return;
    }

    animateMove(current, move);
  }

  function animateMove(state: GameState, move: MoveOption) {
    const positions = buildStepPositions(move);

    if (positions.length === 0) {
      setGame(applyMove(state, move.chipId));
      return;
    }

    clearAnimationTimers();

    const firstFrame: ChipStepAnimation = {
      chipId: move.chipId,
      positions,
      index: 0
    };
    const stepDelay = positions.length > 10 ? 95 : 130;

    chipAnimationRef.current = firstFrame;
    setChipAnimation(firstFrame);

    positions.slice(1).forEach((_, offset) => {
      const index = offset + 1;
      const timer = window.setTimeout(() => {
        setChipAnimation((current) => (current?.chipId === move.chipId ? { ...current, index } : current));
      }, stepDelay * index);
      animationTimers.current.push(timer);
    });

    const finalTimer = window.setTimeout(() => {
      chipAnimationRef.current = null;
      setChipAnimation(null);
      setGame(applyMove(state, move.chipId));
    }, stepDelay * positions.length + 180);
    animationTimers.current.push(finalTimer);
  }

  function clearAnimationTimers() {
    animationTimers.current.forEach((timer) => window.clearTimeout(timer));
    animationTimers.current = [];
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div>
            <h1>Snake and Ladder Journey</h1>
          </div>
          {game ? (
            <div className="header-actions">
              <button className="button secondary" type="button" onClick={restartGame}>
                Restart
              </button>
              <button className="button ghost" type="button" onClick={backToLobby}>
                Lobby
              </button>
            </div>
          ) : null}
        </header>

        {!game ? (
          <Lobby settings={settings} activeBoard={activeBoard} onChange={setSettings} onStart={startGame} />
        ) : (
          <section className="game-layout" aria-label="Game table">
            <div className="board-column">
              <GameBoard
                state={game}
                isHumanTurn={Boolean(isHumanTurn)}
                chipAnimation={chipAnimation}
                onMove={handleMove}
                onPenalty={(chipId) => setGame((state) => (state ? choosePenaltyChip(state, chipId) : state))}
              />
            </div>

            <aside className="side-column" aria-label="Game controls">
              <DicePanel
                state={game}
                isHumanTurn={Boolean(isHumanTurn)}
                onRoll={() => setGame((state) => (state ? rollDice(state) : state))}
              />
            </aside>
          </section>
        )}
      </div>

    </main>
  );
}

function buildStepPositions(move: MoveOption): number[] {
  if (move.enters || move.from === null) {
    return [move.finalPosition];
  }

  const step = move.directionBefore === "down" ? -1 : 1;
  const positions: number[] = [];

  for (let position = move.from + step; step > 0 ? position <= move.to : position >= move.to; position += step) {
    positions.push(position);
  }

  if (move.transport && move.finalPosition !== move.to) {
    positions.push(move.finalPosition);
  }

  return positions;
}

function loadStoredSettings(): LobbySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_LOBBY_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<LobbySettings>;

    return normalizeLobbySettings({
      ...DEFAULT_LOBBY_SETTINGS,
      ...parsed,
      playerColors: parsed.playerColors ?? DEFAULT_LOBBY_SETTINGS.playerColors,
      rules: {
        ...DEFAULT_RULES,
        ...parsed.rules
      }
    });
  } catch {
    return DEFAULT_LOBBY_SETTINGS;
  }
}

function loadStoredGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as GameState;
    const settings = normalizeLobbySettings({
      ...DEFAULT_LOBBY_SETTINGS,
      ...parsed.settings,
      playerColors: parsed.settings?.playerColors ?? DEFAULT_LOBBY_SETTINGS.playerColors,
      rules: {
        ...DEFAULT_RULES,
        ...parsed.settings?.rules
      }
    });

    return {
      ...parsed,
      settings,
      board: getBoardLayout(settings.boardId)
    };
  } catch {
    return null;
  }
}

function chooseComputerPenaltyChip(state: GameState): string {
  const pendingIds = state.pendingPenalty?.chipIds ?? [];
  const chips = state.players.flatMap((player) => player.chips).filter((chip) => pendingIds.includes(chip.id));

  return (
    [...chips].sort((a, b) => {
      const aPosition = a.position ?? 0;
      const bPosition = b.position ?? 0;
      return aPosition - bPosition;
    })[0]?.id ?? pendingIds[0]
  );
}
