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
  // ELEMENTOS
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

  const selectTipo = document.getElementById("tipo");
  const selectCategoria = document.getElementById("categoria");
  const inputValor = document.getElementById("valor");
  const inputData = document.getElementById("data");
  const inputDescricao = document.getElementById("descricao");
  const btnSalvar = document.getElementById("btnSalvar");
  const msgFinanceiro = document.getElementById("msgFinanceiro");

  const listaLancamentos = document.getElementById("listaLancamentos");

  const kpiEntradas = document.getElementById("kpiEntradas");
  const kpiSaidas = document.getElementById("kpiSaidas");
  const kpiSaldo = document.getElementById("kpiSaldo");
  const kpiPercentual = document.getElementById("kpiPercentual");

  // ===============================
  // CATEGORIAS
  // ===============================
  async function carregarCategorias(tipo) {
    selectCategoria.innerHTML = "<option value=''>Selecione</option>";
    const snap = await getDocs(collection(db, "categorias"));
    snap.forEach(d => {
      const c = d.data();
      if (c.tipo === tipo) {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = c.nome;
        selectCategoria.appendChild(opt);
      }
    });
  }

  // ===============================
  // LISTA
  // ===============================
  async function listarLancamentos(userId) {
    listaLancamentos.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    const q = query(
      collection(db, "lancamentos"),
      where("usuarioId", "==", userId)
    );

    const snap = await getDocs(q);
    listaLancamentos.innerHTML = "";

    if (snap.empty) {
      listaLancamentos.innerHTML =
        "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
      return;
    }

    snap.forEach(d => {
      const l = d.data();
      listaLancamentos.innerHTML += `
        <tr>
          <td>${l.data}</td>
          <td>${l.tipo}</td>
          <td>${l.categoriaNome}</td>
          <td>R$ ${l.valor.toFixed(2)}</td>
          <td>${l.descricao || ""}</td>
        </tr>`;
    });
  }

  // ===============================
  // KPIs
  // ===============================
  async function calcularKPIs(userId) {
    let entradas = 0, saidas = 0;

    const q = query(collection(db, "lancamentos"), where("usuarioId", "==", userId));
    const snap = await getDocs(q);

    snap.forEach(d => {
      const l = d.data();
      l.tipo === "entrada" ? entradas += l.valor : saidas += l.valor;
    });

    kpiEntradas.textContent = `R$ ${entradas.toFixed(2)}`;
    kpiSaidas.textContent = `R$ ${saidas.toFixed(2)}`;
    kpiSaldo.textContent = `R$ ${(entradas - saidas).toFixed(2)}`;
    kpiPercentual.textContent =
      entradas ? `${((saidas / entradas) * 100).toFixed(1)}%` : "0%";
  }

  // ===============================
  // 🔥 GRÁFICOS
  // ===============================
  let gGeral, gMes, gCategoria;

  async function carregarGraficos(userId) {
    const q = query(collection(db, "lancamentos"), where("usuarioId", "==", userId));
    const snap = await getDocs(q);

    let entradas = 0, saidas = 0;
    const porMes = {};
    const porCategoria = {};

    snap.forEach(d => {
      const l = d.data();

      if (l.tipo === "entrada") entradas += l.valor;
      if (l.tipo === "saida") {
        saidas += l.valor;
        porCategoria[l.categoriaNome] =
          (porCategoria[l.categoriaNome] || 0) + l.valor;
      }

      const mes = l.data.slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + l.valor;
    });

    gGeral?.destroy();
    gMes?.destroy();
    gCategoria?.destroy();

    gGeral = new Chart(graficoFinanceiro, {
      type: "bar",
      data: {
        labels: ["Entradas", "Saídas"],
        datasets: [{ data: [entradas, saidas] }]
      }
    });

    gMes = new Chart(graficoMes, {
      type: "line",
      data: {
        labels: Object.keys(porMes),
        datasets: [{ label: "Movimentação", data: Object.values(porMes) }]
      }
    });

    gCategoria = new Chart(graficoCategoria, {
      type: "pie",
      data: {
        labels: Object.keys(porCategoria),
        datasets: [{ data: Object.values(porCategoria) }]
      }
    });
  }

  // ===============================
  // EVENTOS
  // ===============================
  selectTipo.addEventListener("change", () => carregarCategorias(selectTipo.value));

  btnSalvar.addEventListener("click", async () => {
    msgFinanceiro.textContent = "";

    const valor = parseFloat(inputValor.value);
    if (!selectCategoria.value || !inputData.value || isNaN(valor) || valor <= 0) {
      msgFinanceiro.textContent = "Preencha todos os campos corretamente.";
      return;
    }

    const user = auth.currentUser;

    await addDoc(collection(db, "lancamentos"), {
      tipo: selectTipo.value,
      categoriaId: selectCategoria.value,
      categoriaNome: selectCategoria.options[selectCategoria.selectedIndex].text,
      valor,
      data: inputData.value,
      descricao: inputDescricao.value,
      usuarioId: user.uid,
      criadoEm: serverTimestamp()
    });

    inputValor.value = "";
    inputData.value = "";
    inputDescricao.value = "";

    listarLancamentos(user.uid);
    calcularKPIs(user.uid);
    carregarGraficos(user.uid);
  });

  btnLogin.addEventListener("click", () =>
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
  );

  btnLogout.addEventListener("click", () => signOut(auth));

  // ===============================
  // AUTH
  // ===============================
  onAuthStateChanged(auth, async user => {
    if (user) {
      loginSection.style.display = "none";
      userSection.style.display = financeSection.style.display = "block";

      userEmailEl.textContent = user.email;

      const snap = await getDoc(doc(db, "usuarios", user.uid));
      userPerfilEl.textContent = snap.exists() ? snap.data().perfil : "-";

      carregarCategorias(selectTipo.value);
      listarLancamentos(user.uid);
      calcularKPIs(user.uid);
      carregarGraficos(user.uid);
    } else {
      loginSection.style.display = "block";
      userSection.style.display = financeSection.style.display = "none";
    }
  });

  statusEl.textContent = "Conectado ao Firebase ✅";
  statusEl.style.color = "green";
});
