import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // <-- garante que o Tailwind e o CSS global carreguem
import "./i18n"; // ✅ inicializa o sistema de idiomas antes de renderizar o app

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
