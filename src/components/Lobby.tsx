import { useMemo, useState, type ReactNode } from "react";
import { BOARD_LAYOUTS } from "../game/boards";
import { DEFAULT_LOBBY_SETTINGS, PLAYER_COLOR_OPTIONS, RULE_DESCRIPTIONS, RULE_LABELS } from "../game/rules";
import type { DiceCount, GameMode, LobbySettings, RuleSettings } from "../game/types";

type LobbyStep = "play" | "mode" | "players" | "colors" | "rules";

interface LobbyProps {
  settings: LobbySettings;
  activeBoard?: unknown;
  onChange: (settings: LobbySettings) => void;
  onStart: (settings: LobbySettings) => void;
}

export function Lobby({ settings, onChange, onStart }: LobbyProps) {
  const [step, setStep] = useState<LobbyStep>("play");
  const playerSlots = useMemo(() => Array.from({ length: settings.playerCount }, (_, index) => index), [settings.playerCount]);

  function update(patch: Partial<LobbySettings>) {
    onChange({
      ...settings,
      ...patch
    });
  }

  function updateRule(rule: keyof RuleSettings, value: boolean) {
    update({
      rules: {
        ...settings.rules,
        [rule]: value
      }
    });
  }

  function selectMode(mode: GameMode) {
    update({
      mode,
      playerCount: Math.max(2, settings.playerCount)
    });
    setStep("players");
  }

  function updateColor(playerIndex: number, color: string) {
    const playerColors = [...settings.playerColors];
    playerColors[playerIndex] = color;
    update({ playerColors });
  }

  function getPlayerName(playerIndex: number) {
    if (settings.mode === "pvc" && playerIndex > 0) {
      return `Robot ${playerIndex}`;
    }

    return `Player ${playerIndex + 1}`;
  }

  return (
    <section className={`lobby-flow ${step === "play" ? "start" : ""}`} aria-label="Game lobby">
      <div className="panel lobby-stage">
        {step !== "play" ? <StepDots step={step} /> : null}

        {step === "play" ? (
          <div className="play-screen">
            <img className="play-logo" src="/icons/logo.svg" alt="Snake and Ladder" />
            <p className="eyebrow">Snake and Ladder</p>
            <h2>Journey Board</h2>
            <button className="play-button" type="button" onClick={() => setStep("mode")}>
              Play
            </button>
          </div>
        ) : null}

        {step === "mode" ? (
          <WizardScreen title="Select Opponents" eyebrow="Play setup">
            <div className="mode-choice-grid">
              <button
                className={`mode-choice ${settings.mode === "pvp" ? "selected" : ""}`}
                type="button"
                onClick={() => selectMode("pvp")}
              >
                <span className="mode-icon">P vs P</span>
                <strong>Player vs Player</strong>
                <small>Local players on the same device</small>
              </button>
              <button
                className={`mode-choice ${settings.mode === "pvc" ? "selected" : ""}`}
                type="button"
                onClick={() => selectMode("pvc")}
              >
                <span className="mode-icon">P vs AI</span>
                <strong>Player vs Robot</strong>
                <small>One human with robot opponents</small>
              </button>
            </div>
            <WizardActions onBack={() => setStep("play")} />
          </WizardScreen>
        ) : null}

        {step === "players" ? (
          <WizardScreen title="Select Players" eyebrow={settings.mode === "pvc" ? "Player vs Robot" : "Player vs Player"}>
            <fieldset className="control-group">
              <legend>Total players</legend>
              <SegmentedControl<number>
                value={settings.playerCount}
                options={[2, 3, 4].map((value) => ({
                  label:
                    settings.mode === "pvc"
                      ? `1 + ${value - 1} robot${value - 1 === 1 ? "" : "s"}`
                      : `${value} players`,
                  value
                }))}
                onChange={(playerCount) => update({ playerCount })}
              />
            </fieldset>

            <fieldset className="control-group">
              <legend>Chips per player</legend>
              <SegmentedControl<number>
                value={settings.chipsPerPlayer}
                options={[1, 2, 3, 4].map((value) => ({ label: `${value}`, value }))}
                onChange={(chipsPerPlayer) => update({ chipsPerPlayer })}
              />
            </fieldset>

            <fieldset className="control-group">
              <legend>Dice</legend>
              <SegmentedControl<DiceCount>
                value={settings.diceCount}
                options={[
                  { label: "1 dice", value: 1 },
                  { label: "2 dice", value: 2 }
                ]}
                onChange={(diceCount) => update({ diceCount })}
              />
            </fieldset>

            <WizardActions onBack={() => setStep("mode")} onNext={() => setStep("colors")} nextLabel="Colors" />
          </WizardScreen>
        ) : null}

        {step === "colors" ? (
          <WizardScreen title="Select Colors" eyebrow={`${settings.playerCount} players`}>
            <div className="color-player-list">
              {playerSlots.map((playerIndex) => (
                <div className="color-player" key={playerIndex}>
                  <div>
                    <strong>{getPlayerName(playerIndex)}</strong>
                    <small>{settings.mode === "pvc" && playerIndex > 0 ? "Robot opponent" : "Human player"}</small>
                  </div>
                  <div className="color-swatches" aria-label={`${getPlayerName(playerIndex)} color`}>
                    {PLAYER_COLOR_OPTIONS.map((color) => {
                      const usedByOther = settings.playerColors.some(
                        (selectedColor, selectedIndex) => selectedColor === color.value && selectedIndex !== playerIndex
                      );

                      return (
                        <button
                          className={settings.playerColors[playerIndex] === color.value ? "selected" : ""}
                          type="button"
                          key={color.value}
                          disabled={usedByOther}
                          onClick={() => updateColor(playerIndex, color.value)}
                          aria-label={`${getPlayerName(playerIndex)} ${color.name}`}
                          title={color.name}
                          style={{ backgroundColor: color.value }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <WizardActions onBack={() => setStep("players")} onNext={() => setStep("rules")} nextLabel="Rules" />
          </WizardScreen>
        ) : null}

        {step === "rules" ? (
          <WizardScreen title="Rules & Board" eyebrow="Final setup">
            <fieldset className="control-group">
              <legend>Board</legend>
              <div className="board-choice-grid compact">
                {BOARD_LAYOUTS.map((board) => (
                  <button
                    className={`board-choice ${board.id === settings.boardId ? "selected" : ""}`}
                    type="button"
                    key={board.id}
                    onClick={() => update({ boardId: board.id })}
                    aria-pressed={board.id === settings.boardId}
                  >
                    <span>{board.name}</span>
                    <small>{board.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="control-group">
              <legend>Rules</legend>
              <div className="switch-list">
                {(Object.keys(RULE_LABELS) as Array<keyof RuleSettings>).map((rule) => (
                  <label className="switch-row" key={rule}>
                    <span>
                      <strong>{RULE_LABELS[rule]}</strong>
                      <small>{RULE_DESCRIPTIONS[rule]}</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={settings.rules[rule]}
                      onChange={(event) => updateRule(rule, event.target.checked)}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <WizardActions onBack={() => setStep("colors")} onNext={() => onStart(settings)} nextLabel="Go to game" />
          </WizardScreen>
        ) : null}
      </div>

      <button className="button ghost reset-setup" type="button" onClick={() => onChange(DEFAULT_LOBBY_SETTINGS)}>
        Reset setup
      </button>
    </section>
  );
}

function WizardScreen({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="wizard-screen">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

function StepDots({ step }: { step: LobbyStep }) {
  const steps: Array<{ id: LobbyStep; label: string }> = [
    { id: "mode", label: "Mode" },
    { id: "players", label: "Players" },
    { id: "colors", label: "Colors" },
    { id: "rules", label: "Rules" }
  ];
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="step-dots" aria-label="Lobby progress">
      {steps.map((item, index) => (
        <li className={index <= currentIndex ? "active" : ""} key={item.id}>
          <span>{index + 1}</span>
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function WizardActions({
  onBack,
  onNext,
  nextLabel = "Next"
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="wizard-actions">
      <button className="button ghost" type="button" onClick={onBack}>
        Back
      </button>
      {onNext ? (
        <button className="button primary" type="button" onClick={onNext}>
          {nextLabel}
        </button>
      ) : null}
    </div>
  );
}

interface SegmentedControlProps<T extends string | number> {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string | number>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          className={option.value === value ? "selected" : ""}
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
