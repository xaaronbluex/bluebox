import { useState } from "react";
import "./theme.css";
import StyleTestScene from "./style-test/StyleTestScene.jsx";
import SiegeRun from "./siege/SiegeRun.jsx";
import Hideout from "./hideout/Hideout.jsx";

const MODES = [
  { id: "siege", label: "Siege Run", enabled: true },
  { id: "hideout", label: "Hideout", enabled: true },
  { id: "style-test", label: "Style Test", enabled: true },
];

/**
 * Hub for Siege Run + Hideout. Phase 3: both modes playable.
 */
export default function SiegeHideoutHub() {
  const [mode, setMode] = useState("siege");

  return (
    <div className="siege-hideout" data-siege-hub="true">
      <header className="siege-hideout__header">
        <div>
          <h2 className="siege-hideout__title">
            {mode === "hideout" ? "Hideout" : "Siege Run"}
          </h2>
          <p className="siege-hideout__subtitle">
            {mode === "hideout"
              ? "AFK settlement · collect · upgrade · feed Siege bonuses"
              : "Defend the keep · Hideout spoils & permanent bonuses"}
          </p>
        </div>
        <nav className="siege-hideout__modes" aria-label="Siege Hideout modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`siege-hideout__mode${mode === m.id ? " is-active" : ""}`}
              disabled={!m.enabled}
              onClick={() => m.enabled && setMode(m.id)}
              title={m.enabled ? m.label : "Coming in a later phase"}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      {mode === "siege" && (
        <SiegeRun onExit={() => setMode("hideout")} />
      )}

      {mode === "hideout" && (
        <Hideout onExit={() => setMode("siege")} />
      )}

      {mode === "style-test" && <StyleTestScene />}
    </div>
  );
}
