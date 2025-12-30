import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs
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

  const selectCategoria = document.getElementById("categoria");
  const selectTipo = document.getElementById("tipo");

  // FUNÇÃO: CARREGAR CATEGORIAS
  async function carregarCategorias(tipoSelecionado) {
    if (!selectCategoria) return;

    selectCategoria.innerHTML = "<option>Carregando categorias...</option>";

    try {
      const snapshot = await getDocs(collection(db, "categorias"));

      selectCategoria.innerHTML = "";

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.tipo === tipoSelecionado) {
          const option = document.createElement("option");
          option.value = docSnap.id;
          option.textContent = data.nome;
          selectCategoria.appendChild(option);
        }
      });

      if (selectCategoria.children.length === 0) {
        selectCategoria.innerHTML =
          "<option>Nenhuma categoria encontrada</option>";
      }

    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      selectCategoria.innerHTML = "<option>Erro ao carregar</option>";
    }
  }

  // EVENTO: MUDANÇA DE TIPO
  if (selectTipo) {
    selectTipo.addEventListener("change", () => {
      carregarCategorias(selectTipo.value);
    });

    // CARREGAR INICIAL (entrada)
    carregarCategorias(selectTipo.value);
  }

  // STATUS FIREBASE
  if (statusEl) {
    statusEl.textContent = "Conectado ao Firebase ✅";
    statusEl.style.color = "green";
  }

  // LOGIN
  btnLogin.addEventListener("click", async () => {
    loginErrorEl.textContent = "";

    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value
      );
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
      loginSection.style.display = "none";
      userSection.style.display = "block";
      if (financeSection) financeSection.style.display = "block";

      userEmailEl.textContent = user.email;

      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        userPerfilEl.textContent = userSnap.data().perfil;
      } else {
        userPerfilEl.textContent = "perfil não encontrado";
      }

    } else {
      loginSection.style.display = "block";
      userSection.style.display = "none";
      if (financeSection) financeSection.style.display = "none";
    }

  });

});


