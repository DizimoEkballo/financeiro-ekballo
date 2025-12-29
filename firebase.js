// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 CONFIGURAÇÃO DO SEU PROJETO
const firebaseConfig = {
  apiKey: "AIzaSyCHPjhADR1Kl5efriBsuNWccL7TVVTe9Q4",
  authDomain: "ekballo-7599a.firebaseapp.com",
  projectId: "ekballo-7599a",
};

// Inicialização
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
