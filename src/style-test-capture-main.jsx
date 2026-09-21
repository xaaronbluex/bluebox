import { createRoot } from "react-dom/client";
import StyleTestScene from "./components/siege-hideout/style-test/StyleTestScene.jsx";
import "./components/siege-hideout/theme.css";

createRoot(document.getElementById("root")).render(
  <div className="siege-hideout" data-siege-hub="true">
    <StyleTestScene />
  </div>
);
