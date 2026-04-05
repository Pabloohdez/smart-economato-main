import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app-scope.css";
import "./styles/interaction.css";
import "./styles/tokens.css";
import "./index.css";
import App from "./App";
import { registerServiceWorker } from "./services/serviceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
