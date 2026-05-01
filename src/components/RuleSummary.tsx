import { RULE_LABELS } from "../game/rules";
import type { GameState, RuleSettings } from "../game/types";

interface RuleSummaryProps {
  state: GameState;
}

export function RuleSummary({ state }: RuleSummaryProps) {
  return (
    <section className="panel rule-summary" aria-label="Rule summary">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Rules</p>
          <h2>{state.board.name}</h2>
        </div>
      </div>

      <p className="rule-note">
        Snakes and ladders trigger on landing cells in both directions using the same start and end mapping.
      </p>

      <div className="rule-list">
        {(Object.keys(RULE_LABELS) as Array<keyof RuleSettings>).map((rule) => (
          <div className="rule-row" key={rule}>
            <span>{RULE_LABELS[rule]}</span>
            <strong className={state.settings.rules[rule] ? "on" : "off"}>
              {state.settings.rules[rule] ? "ON" : "OFF"}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
