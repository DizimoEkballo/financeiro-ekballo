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

  // ===============================
  // ELEMENTOS GERAIS
  // ===============================
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

  // ===============================
  // ELEMENTOS FINANCEIROS (ETAPA 4.1)
  // ===============================
  const selectTipo = document.getElementById("tipo");
  const selectCategoria = document.getElementById("categoria");
  const inputValor = document.getElementById("valor");
  const inputData = document.getElementById("data");
  const inputDescricao = document.getElementById("descricao");
  const btnSalvar = document.getElementById("btnSalvar");
  const msgFinanceiro = document.getElementById("msgFinanceiro");

  // ===============================
  // FUNÇÃO: CARREGAR CATEGORIAS
  // ===============================
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

  // ===============================
  // EVENTO: MUDANÇA DE TIPO
  // ===============================
  if (selectTipo) {
    selectTipo.addEventListener("change", () => {
      carregarCategorias(selectTipo.value);
    });

    carregarCategorias(selectTipo.value);
  }

  // ===============================
  // ETAPA 4.2 — VALIDAR LANÇAMENTO
  // ===============================
  if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
      msgFinanceiro.textContent = "";
      msgFinanceiro.style.color = "red";

      const tipo = selectTipo.value;
      const categoria = selectCategoria.value;
      const valor = parseFloat(inputValor.value);
      const data = inputData.value;
      const descricao = inputDescricao.value;

      if (!tipo || !categoria || !data || isNaN(valor) || valor <= 0) {
        msgFinanceiro.textContent =
          "Preencha todos os campos obrigatórios corretamente.";
        return;
      }

      // Validação OK (ainda não salva)
      msgFinanceiro.style.color = "green";
      msgFinanceiro.textContent =
        "Dados válidos ✔️ Pronto para salvar no sistema.";
    });
  }

  // ===============================
  // STATUS FIREBASE
  // ===============================
  if (statusEl) {
    statusEl.textContent = "Conectado ao Firebase ✅";
    statusEl.style.color = "green";
  }

  // ===============================
  // LOGIN
  // ===============================
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

  // ===============================
  // LOGOUT
  // ===============================
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  // ===============================
  // CONTROLE DE ESTADO
  // ===============================
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
