import React from "react";
import { createRoot } from "react-dom/client";
import Hideout from "./components/siege-hideout/hideout/Hideout.jsx";
import "./components/siege-hideout/theme.css";

createRoot(document.getElementById("root")).render(
  <div className="siege-hideout" data-siege-hub="true">
    <Hideout />
  </div>,
);
