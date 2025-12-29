// js/app.js
import { auth } from "./firebase.js";

const statusEl = document.getElementById("status");

if (auth) {
  statusEl.textContent = "Conectado ao Firebase ✅";
  statusEl.style.color = "green";
} else {
  statusEl.textContent = "Erro ao conectar ❌";
  statusEl.style.color = "red";
}
