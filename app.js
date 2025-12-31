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
  where
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
  // KPIs
  // ===============================
  const kpiEntradas = document.getElementById("kpiEntradas");
  const kpiSaidas = document.getElementById("kpiSaidas");
  const kpiSaldo = document.getElementById("kpiSaldo");
  const kpiPercentual = document.getElementById("kpiPercentual");

  // ===============================
  // CARREGAR CATEGORIAS
  // ===============================
  async function carregarCategorias(tipo) {
    selectCategoria.innerHTML = "<option>Carregando...</option>";

    const snapshot = await getDocs(collection(db, "categorias"));
    selectCategoria.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const c = docSnap.data();
      if (c.tipo === tipo) {
        const opt = document.createElement("option");
        opt.value = docSnap.id;
        opt.textContent = c.nome;
        selectCategoria.appendChild(opt);
      }
    });
  }

  // ===============================
  // LISTAR LANÇAMENTOS
  // ===============================
  async function listarLancamentos(userId) {
    listaLancamentos.innerHTML =
      "<tr><td colspan='5'>Carregando...</td></tr>";

    const q = query(
      collection(db, "lancamentos"),
      where("usuarioId", "==", userId)
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
  }

  // ===============================
  // CALCULAR KPIs
  // ===============================
  async function calcularKPIs(userId) {
    let entradas = 0;
    let saidas = 0;

    const q = query(
      collection(db, "lancamentos"),
      where("usuarioId", "==", userId)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
      const l = docSnap.data();
      if (l.tipo === "entrada") entradas += l.valor;
      if (l.tipo === "saida") saidas += l.valor;
    });

    const saldo = entradas - saidas;
    const percentual = entradas > 0 ? (saidas / entradas) * 100 : 0;

    kpiEntradas.textContent = `R$ ${entradas.toFixed(2)}`;
    kpiSaidas.textContent = `R$ ${saidas.toFixed(2)}`;
    kpiSaldo.textContent = `R$ ${saldo.toFixed(2)}`;
    kpiPercentual.textContent = `${percentual.toFixed(1)}%`;
  }

  // ===============================
  // 🔥 ETAPA 6.4 — GRÁFICOS
  // ===============================
  let graficoFinanceiro;

  async function carregarGrafico(userId) {
    let entradas = 0;
    let saidas = 0;

    const q = query(
      collection(db, "lancamentos"),
      where("usuarioId", "==", userId)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
      const l = docSnap.data();
      if (l.tipo === "entrada") entradas += l.valor;
      if (l.tipo === "saida") saidas += l.valor;
    });

    const ctx = document.getElementById("graficoFinanceiro");

    if (graficoFinanceiro) {
      graficoFinanceiro.destroy();
    }

    graficoFinanceiro = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Entradas", "Saídas"],
        datasets: [{
          label: "Valores (R$)",
          data: [entradas, saidas]
        }]
      }
    });
  }

  // ===============================
  // EVENTOS
  // ===============================
  selectTipo.addEventListener("change", () => {
    carregarCategorias(selectTipo.value);
  });

  btnSalvar.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "lancamentos"), {
      tipo: selectTipo.value,
      categoriaId: selectCategoria.value,
      categoriaNome: selectCategoria.options[selectCategoria.selectedIndex].text,
      valor: Number(inputValor.value),
      data: inputData.value,
      descricao: inputDescricao.value,
      usuarioId: user.uid,
      usuarioEmail: user.email,
      criadoEm: serverTimestamp()
    });

    inputValor.value = "";
    inputData.value = "";
    inputDescricao.value = "";

    listarLancamentos(user.uid);
    calcularKPIs(user.uid);
    carregarGrafico(user.uid);
  });

  btnLogin.addEventListener("click", async () => {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  });

  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });

  // ===============================
  // AUTH STATE
  // ===============================
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loginSection.style.display = "none";
      userSection.style.display = "block";
      financeSection.style.display = "block";

      userEmailEl.textContent = user.email;

      const snap = await getDoc(doc(db, "usuarios", user.uid));
      userPerfilEl.textContent = snap.exists()
        ? snap.data().perfil
        : "perfil não encontrado";

      carregarCategorias(selectTipo.value);
      listarLancamentos(user.uid);
      calcularKPIs(user.uid);
      carregarGrafico(user.uid);

    } else {
      loginSection.style.display = "block";
      userSection.style.display = "none";
      financeSection.style.display = "none";
    }
  });

  statusEl.textContent = "Conectado ao Firebase ✅";
  statusEl.style.color = "green";
});
