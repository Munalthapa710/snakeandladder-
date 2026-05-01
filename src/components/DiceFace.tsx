interface DiceFaceProps {
  value: number;
  idle?: boolean;
  rolled?: boolean;
  boardRoll?: boolean;
}

export function DiceFace({ value, idle = false, rolled = false, boardRoll = false }: DiceFaceProps) {
  return (
    <span
      className={`die-face ${idle ? "idle" : ""} ${rolled ? "rolled" : ""} ${boardRoll ? "board-roll" : ""}`}
      aria-label={`${value}`}
    >
      {getPips(value).map((pip) => (
        <span className={`pip ${pip}`} key={pip} />
      ))}
    </span>
  );
}

function getPips(value: number): string[] {
  const pips: Record<number, string[]> = {
    1: ["center"],
    2: ["top-left", "bottom-right"],
    3: ["top-left", "center", "bottom-right"],
    4: ["top-left", "top-right", "bottom-left", "bottom-right"],
    5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
    6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"]
  };

  return pips[value] ?? pips[1];
}
