import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import GlobalFx from "./GlobalFx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalFx />
    <App />
  </StrictMode>
);
