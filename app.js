import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  // ELEMENTOS
  const statusEl = document.getElementById("status");

  const loginSection = document.getElementById("login-section");
  const userSection = document.getElementById("user-section");
  const financeSection = document.getElementById("finance-section");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  const userEmailEl = document.getElementById("userEmail");
  const userPerfilEl = document.getElementById("userPerfil");
  const loginErrorEl = document.getElementById("loginError");

  // STATUS FIREBASE
  if (statusEl) {
    statusEl.textContent = "Conectado ao Firebase ✅";
    statusEl.style.color = "green";
  }

  // LOGIN
  btnLogin.addEventListener("click", async () => {
    loginErrorEl.textContent = "";

    try {
      const email = emailInput.value;
      const password = passwordInput.value;

      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      loginErrorEl.textContent = "Erro ao fazer login";
      console.error(error);
    }
  });

  // LOGOUT
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  // CONTROLE DE ESTADO
  onAuthStateChanged(auth, async (user) => {

    if (user) {
      // USUÁRIO LOGADO
      loginSection.style.display = "none";
      userSection.style.display = "block";

      if (financeSection) {
        financeSection.style.display = "block";
      }

      userEmailEl.textContent = user.email;

      // BUSCAR PERFIL NO FIRESTORE
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const dados = userSnap.data();
        userPerfilEl.textContent = dados.perfil;
      } else {
        userPerfilEl.textContent = "perfil não encontrado";
      }

    } else {
      // VISITANTE
      loginSection.style.display = "block";
      userSection.style.display = "none";

      if (financeSection) {
        financeSection.style.display = "none";
      }
    }

  });

});

