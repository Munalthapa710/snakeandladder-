import type { TurnEvent } from "../game/types";

interface TurnLogProps {
  events: TurnEvent[];
}

export function TurnLog({ events }: TurnLogProps) {
  const visibleEvents = [...events].slice(-18).reverse();

  return (
    <section className="panel turn-log" aria-label="Turn history">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">History</p>
          <h2>Turn log</h2>
        </div>
      </div>

      <ol>
        {visibleEvents.map((event) => (
          <li key={event.id}>
            <span className={`event-type ${event.type}`}>{event.type}</span>
            <p>{event.message}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
