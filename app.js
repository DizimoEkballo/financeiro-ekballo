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
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy
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
  // ELEMENTOS FINANCEIROS
  // ===============================
  const selectTipo = document.getElementById("tipo");
  const selectCategoria = document.getElementById("categoria");
  const inputValor = document.getElementById("valor");
  const inputData = document.getElementById("data");
  const inputDescricao = document.getElementById("descricao");
  const btnSalvar = document.getElementById("btnSalvar");
  const msgFinanceiro = document.getElementById("msgFinanceiro");

  const listaLancamentos = document.getElementById("listaLancamentos");

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
  // FUNÇÃO: LISTAR LANÇAMENTOS
  // ===============================
  async function listarLancamentos() {
    if (!listaLancamentos) return;

    listaLancamentos.innerHTML =
      "<tr><td colspan='5'>Carregando...</td></tr>";

    try {
      const q = query(
        collection(db, "lancamentos"),
        orderBy("data", "desc")
      );

      const snapshot = await getDocs(q);
      listaLancamentos.innerHTML = "";

      if (snapshot.empty) {
        listaLancamentos.innerHTML =
          "<tr><td colspan='5'>Nenhum lançamento encontrado</td></tr>";
        return;
      }

      snapshot.forEach((docSnap) => {
        const l = docSnap.data();

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${l.data}</td>
          <td>${l.tipo}</td>
          <td>${l.categoriaNome || "-"}</td>
          <td>R$ ${Number(l.valor).toFixed(2)}</td>
          <td>${l.descricao || ""}</td>
        `;

        listaLancamentos.appendChild(tr);
      });

    } catch (error) {
      console.error("Erro ao listar lançamentos:", error);
      listaLancamentos.innerHTML =
        "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
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
  // SALVAR LANÇAMENTO
  // ===============================
  if (btnSalvar) {
    btnSalvar.addEventListener("click", async () => {

      msgFinanceiro.textContent = "";
      msgFinanceiro.style.color = "red";

      const tipo = selectTipo.value;
      const categoriaId = selectCategoria.value;
      const categoriaNome =
        selectCategoria.options[selectCategoria.selectedIndex]?.text;

      const valor = parseFloat(inputValor.value);
      const data = inputData.value;
      const descricao = inputDescricao.value;

      if (!tipo || !categoriaId || !data || isNaN(valor) || valor <= 0) {
        msgFinanceiro.textContent =
          "Preencha todos os campos obrigatórios corretamente.";
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        msgFinanceiro.textContent = "Usuário não autenticado.";
        return;
      }

      try {
        await addDoc(collection(db, "lancamentos"), {
          tipo,
          categoriaId,
          categoriaNome,
          valor,
          data,
          descricao,
          usuarioId: user.uid,
          usuarioEmail: user.email,
          criadoEm: serverTimestamp()
        });

        msgFinanceiro.style.color = "green";
        msgFinanceiro.textContent = "Lançamento salvo com sucesso ✅";

        inputValor.value = "";
        inputData.value = "";
        inputDescricao.value = "";

        listarLancamentos();

      } catch (error) {
        console.error("Erro ao salvar lançamento:", error);
        msgFinanceiro.textContent = "Erro ao salvar lançamento ❌";
      }
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
  // LOGIN / LOGOUT
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

      userPerfilEl.textContent =
        userSnap.exists() ? userSnap.data().perfil : "perfil não encontrado";

      listarLancamentos();

    } else {
      loginSection.style.display = "block";
      userSection.style.display = "none";
      if (financeSection) financeSection.style.display = "none";
    }
  });

});
