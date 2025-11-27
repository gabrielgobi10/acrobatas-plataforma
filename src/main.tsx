// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// DEV sem StrictMode (evita mount/efeitos duplicados)
const Root = import.meta.env.PROD ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : (
  <App />
);

ReactDOM.createRoot(document.getElementById("root")!).render(Root);

