import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Add a version query to force update
    navigator.serviceWorker.register("/sw.js?v=2").catch(() => undefined);
  });
}

window.addEventListener("beforeinstallprompt", (event: Event) => {
  event.preventDefault();
  window.deferredPwaPrompt = event as any;
});
