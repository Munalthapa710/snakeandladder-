import { describeChipStatus, getCurrentPlayer } from "../game/engine";
import type { GameState } from "../game/types";

interface PlayerPanelProps {
  state: GameState;
}

export function PlayerPanel({ state }: PlayerPanelProps) {
  const currentPlayer = getCurrentPlayer(state);

  return (
    <section className="panel player-panel" aria-label="Players">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Players</p>
          <h2>Chip status</h2>
        </div>
      </div>

      <div className="player-list">
        {state.players.map((player) => {
          const finished = player.chips.filter((chip) => chip.status === "finished").length;

          return (
            <article className={`player-card ${player.id === currentPlayer.id ? "active" : ""}`} key={player.id}>
              <header>
                <span className="player-color" style={{ backgroundColor: player.color }} />
                <div>
                  <strong>{player.name}</strong>
                  <small>
                    {player.type === "computer" ? "Computer" : "Human"} · {finished}/{player.chips.length} finished
                  </small>
                </div>
              </header>

              <div className="chip-list">
                {player.chips.map((chip) => (
                  <div className="chip-row" key={chip.id}>
                    <span>{chip.label}</span>
                    <small>
                      {describeChipStatus(chip)}
                      {chip.position !== null && chip.status !== "outside" ? ` · Cell ${chip.position}` : ""}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
