
import React, { useEffect, useState } from "react";

const COUNTDOWN_NUMBERS = ["3", "2", "1"];

export default function Countdown({ onEnd }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= COUNTDOWN_NUMBERS.length) {
      onEnd(); // Callback à la fin du countdown
      return;
    }
    const timer = setTimeout(() => {
      setIndex(index + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [index, onEnd]);

  if (index >= COUNTDOWN_NUMBERS.length) return null;

  return (
    <div className="countdown-overlay">
      <div className="countdown-number">{COUNTDOWN_NUMBERS[index]}</div>
    </div>
  );
}
