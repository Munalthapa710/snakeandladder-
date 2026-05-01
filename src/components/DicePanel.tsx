import { DiceFace } from "./DiceFace";
import { getCurrentPlayer } from "../game/engine";
import type { GameState } from "../game/types";

interface DicePanelProps {
  state: GameState;
  isHumanTurn: boolean;
  onRoll: () => void;
}

export function DicePanel({ state, isHumanTurn, onRoll }: DicePanelProps) {
  const player = getCurrentPlayer(state);
  const canRoll = isHumanTurn && state.phase === "awaitingRoll";

  return (
    <section className="panel dice-panel" aria-label="Dice controls">
      <button
        className="dice-roller dice-only"
        type="button"
        disabled={!canRoll}
        onClick={onRoll}
        aria-label={canRoll ? "Roll dice" : `${player.name} cannot roll right now`}
      >
        <div className="dice-table">
          {Array.from({ length: state.settings.diceCount }, (_, index) => (
            <DiceFace value={state.dice?.values[index] ?? (index === 0 ? 6 : 1)} idle={!state.dice} key={index} />
          ))}
        </div>
      </button>
    </section>
  );
}
