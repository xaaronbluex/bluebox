import { useState } from "react";
import "./theme.css";
import StyleTestScene from "./style-test/StyleTestScene.jsx";
import SiegeRun from "./siege/SiegeRun.jsx";

const MODES = [
  { id: "siege", label: "Siege Run", enabled: true },
  { id: "style-test", label: "Style Test", enabled: true },
  { id: "hideout", label: "Hideout", enabled: false },
];

/**
 * Hub for Siege Run + Hideout. Phase 2: Siege Run playable; Hideout stub.
 */
export default function SiegeHideoutHub() {
  const [mode, setMode] = useState("siege");

  return (
    <div className="siege-hideout" data-siege-hub="true">
      <header className="siege-hideout__header">
        <div>
          <h2 className="siege-hideout__title">Siege Run</h2>
          <p className="siege-hideout__subtitle">
            Hideout hub — Phase 2 combat slice
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
        <SiegeRun onExit={() => setMode("style-test")} />
      )}

      {mode === "style-test" && <StyleTestScene />}

      {mode === "hideout" && (
        <p className="siege-hideout__stub">
          Hideout production — not implemented yet (Phase 3).
        </p>
      )}
    </div>
  );
}
