import { DiceFace } from "./DiceFace";
import { getCurrentPlayer } from "../game/engine";
import type { BoardLayout, Chip, ChipStepAnimation, GameState, MoveOption, Player } from "../game/types";

interface GameBoardProps {
  state: GameState;
  isHumanTurn: boolean;
  chipAnimation: ChipStepAnimation | null;
  onMove: (chipId: string) => void;
  onPenalty: (chipId: string) => void;
}

export function GameBoard({ state, isHumanTurn, chipAnimation, onMove, onPenalty }: GameBoardProps) {
  const cells = buildBoardCells();
  const currentPlayer = getCurrentPlayer(state);
  const animatedPosition = getAnimatedPosition(chipAnimation);
  const activeChips = getBoardChips(state, chipAnimation, animatedPosition);
  const canChooseMove = isHumanTurn && state.phase === "awaitingMove" && !chipAnimation;
  const canChoosePenalty = isHumanTurn && state.phase === "awaitingPenalty" && !chipAnimation;
  const currentOutsideChips = currentPlayer.chips.filter(
    (chip) => chip.status === "outside" && chip.id !== chipAnimation?.chipId
  );

  return (
    <section className="panel board-panel" aria-label="Snake and ladder board">
      <div className="board-header">
        <div>
          <p className="eyebrow">Turn</p>
          <h2 style={{ color: currentPlayer.color }}>{currentPlayer.name}</h2>
          {state.message ? <p className="board-message">{state.message}</p> : null}
        </div>
        <div className="journey-badge">1 to 100 to 1</div>
      </div>

      <div className="board-stage">
        <div className="game-board" role="grid" aria-label="100 cell snake and ladder board">
          {cells.map((cell) => {
            const occupants = activeChips.filter(({ chip }) => chip.position === cell);
            const ladderEnd = state.board.ladders[cell];
            const snakeEnd = state.board.snakes[cell];

            return (
              <div
                className={`board-cell ${ladderEnd ? "ladder" : ""} ${snakeEnd ? "snake" : ""}`}
                role="gridcell"
                key={cell}
                aria-label={`Cell ${cell}`}
              >
                <span className="cell-number">{cell}</span>
                {ladderEnd ? <span className="cell-route ladder">L {ladderEnd}</span> : null}
                {snakeEnd ? <span className="cell-route snake">S {snakeEnd}</span> : null}
                <div className="chip-stack">
                  {occupants.map(({ chip, player }) => (
                    <ChipDot
                      key={chip.id}
                      chip={chip}
                      player={player}
                      canChooseMove={canChooseMove && player.id === currentPlayer.id}
                      canChoosePenalty={canChoosePenalty && player.id === currentPlayer.id}
                      forcedCut={state.forcedCut}
                      isSelectable={Boolean(state.validMoves.find((move) => move.chipId === chip.id))}
                      isCutMove={Boolean(state.validMoves.find((move) => move.chipId === chip.id)?.canCut)}
                      isPenalty={Boolean(state.pendingPenalty?.chipIds.includes(chip.id))}
                      isLastMoved={state.lastMove?.chipId === chip.id}
                      lastMoveTransport={state.lastMove?.chipId === chip.id ? state.lastMove.transport?.type : undefined}
                      isStepping={chipAnimation?.chipId === chip.id}
                      onMove={onMove}
                      onPenalty={onPenalty}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <BoardDecorations board={state.board} lastMove={state.lastMove} />
        <BoardDiceRoll state={state} />
      </div>

      {currentOutsideChips.length > 0 ? (
        <div className="home-row" aria-label={`${currentPlayer.name} outside chips`}>
          <span className="home-label">Home</span>
          <div className="home-chips">
            {currentOutsideChips.map((chip) => {
              const move = state.validMoves.find((option) => option.chipId === chip.id);
              const enabled = canChooseMove && Boolean(move) && (!state.forcedCut || Boolean(move?.canCut));

              return (
                <ChipDot
                  key={chip.id}
                  chip={chip}
                  player={currentPlayer}
                  canChooseMove={canChooseMove}
                  canChoosePenalty={false}
                  forcedCut={state.forcedCut}
                  isSelectable={Boolean(move)}
                  isCutMove={Boolean(move?.canCut)}
                  isPenalty={false}
                  isLastMoved={false}
                  isStepping={false}
                  onMove={enabled ? onMove : () => undefined}
                  onPenalty={onPenalty}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ChipDot({
  chip,
  player,
  canChooseMove,
  canChoosePenalty,
  forcedCut,
  isSelectable,
  isCutMove,
  isPenalty,
  isLastMoved,
  isStepping,
  lastMoveTransport,
  onMove,
  onPenalty
}: {
  chip: Chip;
  player: Player;
  canChooseMove: boolean;
  canChoosePenalty: boolean;
  forcedCut: boolean;
  isSelectable: boolean;
  isCutMove: boolean;
  isPenalty: boolean;
  isLastMoved: boolean;
  isStepping: boolean;
  lastMoveTransport?: "snake" | "ladder";
  onMove: (chipId: string) => void;
  onPenalty: (chipId: string) => void;
}) {
  const canMoveChip = canChooseMove && isSelectable && (!forcedCut || isCutMove);
  const canPenaltyChip = canChoosePenalty && isPenalty;
  const enabled = canMoveChip || canPenaltyChip;
  const shortLabel = chip.label.replace("P", "").replace("-C", ".");
  const className = `chip-dot ${isLastMoved ? "moved" : ""} ${isStepping ? "stepping" : ""} ${
    lastMoveTransport ?? ""
  }`.trim();

  if (!enabled) {
    return (
      <span className={className} style={{ backgroundColor: player.color }} title={chip.label}>
        {shortLabel}
      </span>
    );
  }

  return (
    <button
      className={`${className} selectable ${isCutMove ? "cut" : ""}`}
      style={{ backgroundColor: player.color }}
      type="button"
      onClick={() => (canPenaltyChip ? onPenalty(chip.id) : onMove(chip.id))}
      title={canPenaltyChip ? `Penalty cut ${chip.label}` : `Move ${chip.label}`}
      aria-label={canPenaltyChip ? `Penalty cut ${chip.label}` : `Move ${chip.label}`}
    >
      {shortLabel}
    </button>
  );
}

function getAnimatedPosition(animation: ChipStepAnimation | null): number | null {
  if (!animation) {
    return null;
  }

  return animation.positions[animation.index] ?? animation.positions.at(-1) ?? null;
}

function getBoardChips(
  state: GameState,
  animation: ChipStepAnimation | null,
  animatedPosition: number | null
): Array<{ chip: Chip; player: Player }> {
  const activeChips = state.players.flatMap((player) =>
    player.chips
      .filter((chip) => chip.status === "active" && chip.position !== null)
      .map((chip) => ({
        chip:
          chip.id === animation?.chipId && animatedPosition !== null
            ? {
                ...chip,
                position: animatedPosition
              }
            : chip,
        player
      }))
  );

  if (!animation || animatedPosition === null) {
    return activeChips;
  }

  const animatedChip = state.players.flatMap((player) =>
    player.chips
      .filter((chip) => chip.id === animation.chipId && chip.status === "outside")
      .map((chip) => ({
        chip: {
          ...chip,
          status: "active" as const,
          direction: "up" as const,
          position: animatedPosition
        },
        player
      }))
  );

  return [...activeChips, ...animatedChip];
}

function BoardDiceRoll({ state }: { state: GameState }) {
  if (!state.dice) {
    return null;
  }

  return (
    <div className="board-dice-roll" aria-label="Dice rolled on board">
      {state.dice.values.map((value, index) => (
        <DiceFace value={value} boardRoll key={`${state.turnNumber}-${index}-${value}`} />
      ))}
    </div>
  );
}

function BoardDecorations({ board, lastMove }: { board: BoardLayout; lastMove?: MoveOption }) {
  const ladders = Object.entries(board.ladders).map(([from, to]) => ({
    from: Number(from),
    to
  }));
  const snakes = Object.entries(board.snakes).map(([from, to]) => ({
    from: Number(from),
    to
  }));

  return (
    <svg className="board-decorations" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="route-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodColor="#0f172a" floodOpacity="0.28" />
        </filter>
      </defs>

      {ladders.map((ladder, index) => (
        <LadderDecoration
          key={`${ladder.from}-${ladder.to}`}
          from={ladder.from}
          to={ladder.to}
          active={lastMove?.transport?.type === "ladder" && lastMove.transport.from === ladder.from}
          index={index}
        />
      ))}

      {snakes.map((snake, index) => (
        <SnakeDecoration
          key={`${snake.from}-${snake.to}`}
          from={snake.from}
          to={snake.to}
          active={lastMove?.transport?.type === "snake" && lastMove.transport.from === snake.from}
          index={index}
        />
      ))}
    </svg>
  );
}

function LadderDecoration({ from, to, active, index }: { from: number; to: number; active: boolean; index: number }) {
  const start = getCellCenter(from);
  const end = getCellCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / length) * 0.9;
  const offsetY = (dx / length) * 0.9;
  const rungCount = Math.max(4, Math.min(9, Math.round(length / 8)));
  const rungs = Array.from({ length: rungCount }, (_, rungIndex) => (rungIndex + 1) / (rungCount + 1));

  return (
    <g className={`ladder-art ${active ? "active" : ""}`} style={{ animationDelay: `${index * 90}ms` }}>
      <line
        x1={start.x - offsetX}
        y1={start.y - offsetY}
        x2={end.x - offsetX}
        y2={end.y - offsetY}
        className="ladder-rail"
      />
      <line
        x1={start.x + offsetX}
        y1={start.y + offsetY}
        x2={end.x + offsetX}
        y2={end.y + offsetY}
        className="ladder-rail"
      />
      {rungs.map((step) => {
        const x = start.x + dx * step;
        const y = start.y + dy * step;

        return (
          <line
            key={step}
            x1={x - offsetX * 1.45}
            y1={y - offsetY * 1.45}
            x2={x + offsetX * 1.45}
            y2={y + offsetY * 1.45}
            className="ladder-rung"
          />
        );
      })}
      {active ? <circle className="route-spark ladder-spark" cx={end.x} cy={end.y} r="1.8" /> : null}
    </g>
  );
}

function SnakeDecoration({ from, to, active, index }: { from: number; to: number; active: boolean; index: number }) {
  const start = getCellCenter(from);
  const end = getCellCenter(to);
  const path = getSnakePath(start, end, index);
  const color = getSnakeColor(index);
  const headAngle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

  return (
    <g className={`snake-art ${active ? "active" : ""}`} style={{ animationDelay: `${index * 110}ms` }}>
      <path d={path} className="snake-body-shadow" />
      <path d={path} className="snake-body" style={{ stroke: color.body }} />
      <path d={path} className="snake-belly" />
      <g transform={`translate(${start.x} ${start.y}) rotate(${headAngle})`}>
        <ellipse cx="0" cy="0" rx="2.9" ry="2.1" className="snake-head" style={{ fill: color.head }} />
        <circle cx="0.8" cy="-0.7" r="0.32" className="snake-eye" />
        <circle cx="0.8" cy="0.7" r="0.32" className="snake-eye" />
        <path d="M2.6 0 L4.4 -0.55 M2.6 0 L4.4 0.55" className="snake-tongue" />
      </g>
      <circle cx={end.x} cy={end.y} r="1.35" className="snake-tail" style={{ fill: color.head }} />
      {active ? <circle className="route-spark snake-spark" cx={end.x} cy={end.y} r="1.8" /> : null}
    </g>
  );
}

function getSnakePath(start: Point, end: Point, index: number): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(9, Math.max(4, length / 5));
  const c1 = {
    x: start.x + dx * 0.28 + normalX * bend,
    y: start.y + dy * 0.28 + normalY * bend
  };
  const c2 = {
    x: start.x + dx * 0.72 - normalX * bend,
    y: start.y + dy * 0.72 - normalY * bend
  };

  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function getCellCenter(cell: number): Point {
  const rowFromBottom = Math.floor((cell - 1) / 10);
  const visualRow = 9 - rowFromBottom;
  const columnInRow = (cell - 1) % 10;
  const visualColumn = rowFromBottom % 2 === 0 ? columnInRow : 9 - columnInRow;

  return {
    x: visualColumn * 10 + 5,
    y: visualRow * 10 + 5
  };
}

function getSnakeColor(index: number) {
  const colors = [
    { body: "#16a34a", head: "#15803d" },
    { body: "#f97316", head: "#c2410c" },
    { body: "#7c3aed", head: "#6d28d9" },
    { body: "#0f766e", head: "#115e59" },
    { body: "#db2777", head: "#be185d" }
  ];

  return colors[index % colors.length];
}

interface Point {
  x: number;
  y: number;
}

function buildBoardCells(): number[] {
  const rows: number[] = [];

  for (let visualRow = 0; visualRow < 10; visualRow += 1) {
    const boardRow = 9 - visualRow;
    const start = boardRow * 10 + 1;
    const row = Array.from({ length: 10 }, (_, index) => start + index);

    rows.push(...(boardRow % 2 === 0 ? row : row.reverse()));
  }

  return rows;
}
