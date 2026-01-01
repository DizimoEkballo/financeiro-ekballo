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
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let graficoMes = null;
let graficoCategoria = null;
let lancamentoEditandoId = null;
let lancamentosCache = [];

document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // ELEMENTOS
  // ===============================
  const selectTipo = document.getElementById("tipo");
  const selectCategoria = document.getElementById("categoria");
  const inputValor = document.getElementById("valor");
  const inputData = document.getElementById("data");
  const inputDescricao = document.getElementById("descricao");
  const btnSalvar = document.getElementById("btnSalvar");
  const msgFinanceiro = document.getElementById("msgFinanceiro");
  const listaLancamentos = document.getElementById("listaLancamentos");

  const filtroInicio = document.getElementById("filtroInicio");
  const filtroFim = document.getElementById("filtroFim");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnLimparFiltro = document.getElementById("btnLimparFiltro");

  const btnExportarPDF = document.getElementById("btnExportarPDF");
  const btnExportarExcel = document.getElementById("btnExportarExcel");

  // ===============================
  // CATEGORIAS
  // ===============================
  async function carregarCategorias(tipo) {
    selectCategoria.innerHTML = "";
    const snapshot = await getDocs(collection(db, "categorias"));
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      if (c.tipo === tipo) {
        const opt = document.createElement("option");
        opt.value = docSnap.id;
        opt.textContent = c.nome;
        selectCategoria.appendChild(opt);
      }
    });
  }

  selectTipo.addEventListener("change", () => {
    carregarCategorias(selectTipo.value);
  });

  // ===============================
  // LISTAR + CACHE
  // ===============================
  function renderizarLista(lista) {
    listaLancamentos.innerHTML = "";

    if (lista.length === 0) {
      listaLancamentos.innerHTML =
        "<tr><td colspan='6'>Nenhum lançamento encontrado</td></tr>";
      return;
    }

    lista.forEach(l => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.data}</td>
        <td>${l.tipo}</td>
        <td>${l.categoriaNome}</td>
        <td>R$ ${l.valor.toFixed(2)}</td>
        <td>${l.descricao || ""}</td>
        <td>
          <button onclick="editarLancamento('${l.id}')">✏️</button>
          <button onclick="excluirLancamento('${l.id}')">🗑️</button>
        </td>
      `;
      listaLancamentos.appendChild(tr);
    });
  }

  async function carregarLancamentos(userId) {
    const q = query(
      collection(db, "lancamentos"),
      where("usuarioId", "==", userId)
    );

    const snapshot = await getDocs(q);
    lancamentosCache = [];

    snapshot.forEach(docSnap => {
      lancamentosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    aplicarFiltro();
  }

  // ===============================
  // FILTRO
  // ===============================
  function aplicarFiltro() {
    let lista = [...lancamentosCache];

    if (filtroInicio.value) {
      lista = lista.filter(l => l.data >= filtroInicio.value);
    }

    if (filtroFim.value) {
      lista = lista.filter(l => l.data <= filtroFim.value);
    }

    renderizarLista(lista);
    atualizarKPIs(lista);
    atualizarGraficos(lista);
  }

  btnFiltrar.onclick = aplicarFiltro;
  btnLimparFiltro.onclick = () => {
    filtroInicio.value = "";
    filtroFim.value = "";
    aplicarFiltro();
  };

  // ===============================
  // SALVAR / EDITAR
  // ===============================
  btnSalvar.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!inputValor.value || !inputData.value) {
      msgFinanceiro.textContent = "Preencha os campos obrigatórios";
      msgFinanceiro.style.color = "red";
      return;
    }

    const dados = {
      tipo: selectTipo.value,
      categoriaId: selectCategoria.value,
      categoriaNome: selectCategoria.options[selectCategoria.selectedIndex].text,
      valor: Number(inputValor.value),
      data: inputData.value,
      descricao: inputDescricao.value,
      usuarioId: user.uid,
      usuarioEmail: user.email
    };

    if (lancamentoEditandoId) {
      await updateDoc(doc(db, "lancamentos", lancamentoEditandoId), dados);
      lancamentoEditandoId = null;
      btnSalvar.textContent = "Salvar Lançamento";
    } else {
      await addDoc(collection(db, "lancamentos"), {
        ...dados,
        criadoEm: serverTimestamp()
      });
    }

    inputValor.value = "";
    inputData.value = "";
    inputDescricao.value = "";

    carregarLancamentos(user.uid);
  };

  // ===============================
  // KPIs
  // ===============================
  function atualizarKPIs(lista) {
    let entradas = 0;
    let saidas = 0;

    lista.forEach(l => {
      if (l.tipo === "entrada") entradas += l.valor;
      if (l.tipo === "saida") saidas += l.valor;
    });

    document.getElementById("kpiEntradas").textContent = `R$ ${entradas.toFixed(2)}`;
    document.getElementById("kpiSaidas").textContent = `R$ ${saidas.toFixed(2)}`;
    document.getElementById("kpiSaldo").textContent = `R$ ${(entradas - saidas).toFixed(2)}`;
    document.getElementById("kpiPercentual").textContent =
      entradas ? `${((saidas / entradas) * 100).toFixed(1)}%` : "0%";
  }

  // ===============================
  // GRÁFICOS
  // ===============================
  function atualizarGraficos(lista) {
    const porMes = {};
    const porCategoria = {};

    lista.forEach(l => {
      const mes = l.data.slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + l.valor;
      porCategoria[l.categoriaNome] = (porCategoria[l.categoriaNome] || 0) + l.valor;
    });

    if (graficoMes) graficoMes.destroy();
    if (graficoCategoria) graficoCategoria.destroy();

    graficoMes = new Chart(document.getElementById("graficoFinanceiro"), {
      type: "bar",
      data: {
        labels: Object.keys(porMes),
        datasets: [{ label: "Valor por mês", data: Object.values(porMes) }]
      }
    });

    graficoCategoria = new Chart(document.getElementById("graficoCategoria"), {
      type: "pie",
      data: {
        labels: Object.keys(porCategoria),
        datasets: [{ data: Object.values(porCategoria) }]
      }
    });
  }

  // ===============================
  // EXPORTAÇÃO
  // ===============================
  btnExportarExcel.onclick = () => {
    let csv = "Data,Tipo,Categoria,Valor,Descrição\n";
    lancamentosCache.forEach(l => {
      csv += `${l.data},${l.tipo},${l.categoriaNome},${l.valor},${l.descricao || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lancamentos.csv";
    a.click();
  };

  btnExportarPDF.onclick = () => {
    window.print();
  };

  // ===============================
  // AUTH
  // ===============================
  onAuthStateChanged(auth, user => {
    if (user) {
      carregarCategorias(selectTipo.value);
      carregarLancamentos(user.uid);
    }
  });

});

// ===============================
// FUNÇÕES GLOBAIS
// ===============================
window.excluirLancamento = async (id) => {
  if (!confirm("Deseja excluir este lançamento?")) return;
  await deleteDoc(doc(db, "lancamentos", id));
  location.reload();
};

window.editarLancamento = (id) => {
  const l = lancamentosCache.find(x => x.id === id);
  if (!l) return;

  selectTipo.value = l.tipo;
  carregarCategorias(l.tipo).then(() => {
    selectCategoria.value = l.categoriaId;
  });

  inputValor.value = l.valor;
  inputData.value = l.data;
  inputDescricao.value = l.descricao;

  lancamentoEditandoId = id;
  btnSalvar.textContent = "Atualizar Lançamento";
};
