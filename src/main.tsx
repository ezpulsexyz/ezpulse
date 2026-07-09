import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { processMobileWalletCallback } from "./terminal/mobileWalletConnect";

// Handle wallet-app redirect before React routing can strip callback params.
processMobileWalletCallback();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
