import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let lancamentos = [];
let graficoMes, graficoCategoria;
let editandoId = null;

document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  async function carregarCategorias(tipo) {
    $("categoria").innerHTML = "";
    const snap = await getDocs(collection(db, "categorias"));
    snap.forEach(d => {
      if (d.data().tipo === tipo) {
        const o = document.createElement("option");
        o.value = d.id;
        o.textContent = d.data().nome;
        $("categoria").appendChild(o);
      }
    });
  }

  function render(lista) {
    $("listaLancamentos").innerHTML = "";
    lista.forEach(l => {
      $("listaLancamentos").innerHTML += `
        <tr>
          <td>${l.data}</td>
          <td>${l.tipo}</td>
          <td>${l.categoriaNome}</td>
          <td>R$ ${l.valor.toFixed(2)}</td>
          <td>${l.descricao || ""}</td>
          <td>
            <button onclick="editar('${l.id}')">✏️</button>
            <button onclick="excluir('${l.id}')">🗑️</button>
          </td>
        </tr>`;
    });
    atualizarKPIs(lista);
    atualizarGraficos(lista);
  }

  function atualizarKPIs(lista) {
    let e = 0, s = 0;
    lista.forEach(l => l.tipo === "entrada" ? e += l.valor : s += l.valor);
    $("kpiEntradas").textContent = `R$ ${e.toFixed(2)}`;
    $("kpiSaidas").textContent = `R$ ${s.toFixed(2)}`;
    $("kpiSaldo").textContent = `R$ ${(e - s).toFixed(2)}`;
    $("kpiPercentual").textContent = e ? `${((s / e) * 100).toFixed(1)}%` : "0%";
  }

  function atualizarGraficos(lista) {
    const porMes = {}, porCat = {};
    lista.forEach(l => {
      const mes = l.data.slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + l.valor;
      porCat[l.categoriaNome] = (porCat[l.categoriaNome] || 0) + l.valor;
    });

    if (graficoMes) graficoMes.destroy();
    if (graficoCategoria) graficoCategoria.destroy();

    graficoMes = new Chart($("graficoMes"), {
      type: "bar",
      data: { labels: Object.keys(porMes), datasets: [{ data: Object.values(porMes) }] }
    });

    graficoCategoria = new Chart($("graficoCategoria"), {
      type: "pie",
      data: { labels: Object.keys(porCat), datasets: [{ data: Object.values(porCat) }] }
    });
  }

  $("btnSalvar").onclick = async () => {
    const user = auth.currentUser;
    if (!user || !$("valor").value || !$("data").value) return;

    const dados = {
      tipo: $("tipo").value,
      categoriaId: $("categoria").value,
      categoriaNome: $("categoria").selectedOptions[0].text,
      valor: Number($("valor").value),
      data: $("data").value,
      descricao: $("descricao").value,
      usuarioId: user.uid,
      criadoEm: serverTimestamp()
    };

    editandoId
      ? await updateDoc(doc(db, "lancamentos", editandoId), dados)
      : await addDoc(collection(db, "lancamentos"), dados);

    editandoId = null;
    carregar();
  };

  async function carregar() {
    const q = query(collection(db, "lancamentos"), where("usuarioId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    lancamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(lancamentos);
  }

  onAuthStateChanged(auth, u => {
    if (u) {
      $("login-section").style.display = "none";
      $("user-section").style.display = "block";
      $("finance-section").style.display = "block";
      $("userEmail").textContent = u.email;
      carregarCategorias($("tipo").value);
      carregar();
    }
  });

  $("btnLogin").onclick = () =>
    signInWithEmailAndPassword(auth, $("email").value, $("password").value);

  $("btnLogout").onclick = () => signOut(auth);
});

window.editar = id => editandoId = id;
window.excluir = async id => {
  await deleteDoc(doc(db, "lancamentos", id));
  location.reload();
};
