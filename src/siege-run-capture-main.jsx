import { createRoot } from "react-dom/client";
import SiegeRun from "./components/siege-hideout/siege/SiegeRun.jsx";
import "./components/siege-hideout/theme.css";

createRoot(document.getElementById("root")).render(
  <div className="siege-hideout" data-siege-hub="true">
    <SiegeRun />
  </div>
);
