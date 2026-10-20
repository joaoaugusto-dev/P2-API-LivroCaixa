// PONTO DE ENTRADA do front-end: liga o React à página.
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Ponto de entrada: monta o componente <App /> na div #root do index.html
createRoot(document.getElementById("root")).render(<App />);
