// js/app.js
import { auth } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");

  if (!statusEl) {
    console.error("Elemento #status não encontrado");
    return;
  }

  if (auth) {
    statusEl.textContent = "Conectado ao Firebase ✅";
    statusEl.style.color = "green";
  } else {
    statusEl.textContent = "Erro ao conectar ❌";
    statusEl.style.color = "red";
  }
});

