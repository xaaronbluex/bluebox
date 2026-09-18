import { useState } from "react";
import "./theme.css";
import StyleTestScene from "./style-test/StyleTestScene.jsx";

const MODES = [
  { id: "style-test", label: "Style Test", enabled: true },
  { id: "siege", label: "Siege Run", enabled: false },
  { id: "hideout", label: "Hideout", enabled: false },
];

/**
 * Hub for Siege Run + Hideout. Phase 1 defaults to Style Test;
 * full modes are stubs until later phases.
 */
export default function SiegeHideoutHub() {
  const [mode, setMode] = useState("style-test");

  return (
    <div className="siege-hideout" data-siege-hub="true">
      <header className="siege-hideout__header">
        <div>
          <h2 className="siege-hideout__title">Siege Run</h2>
          <p className="siege-hideout__subtitle">Hideout hub — Phase 1 style proof</p>
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

      {mode === "style-test" && <StyleTestScene />}

      {mode === "siege" && (
        <p className="siege-hideout__stub">Siege Run combat — not implemented yet (Phase 2).</p>
      )}
      {mode === "hideout" && (
        <p className="siege-hideout__stub">Hideout production — not implemented yet (Phase 3).</p>
      )}
    </div>
  );
}
