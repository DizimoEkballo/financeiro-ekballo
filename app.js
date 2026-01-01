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
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let graficoMes = null;
let graficoCategoria = null;
let lancamentosCache = [];

// LOGIN
document.getElementById("btnLogin").onclick = async () => {
  const email = email.value;
  const password = password.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    loginError.textContent = "Erro no login";
  }
};

// AUTH
onAuthStateChanged(auth, async user => {
  if (user) {
    login-section.style.display = "none";
    user-section.style.display = "block";
    finance-section.style.display = "block";
    carregarLancamentos(user.uid);
  }
});

// SALVAR
btnSalvar.onclick = async () => {
  if (!valor.value || !data.value) return alert("Preencha os campos");

  await addDoc(collection(db, "lancamentos"), {
    tipo: tipo.value,
    categoriaNome: categoria.options[categoria.selectedIndex].text,
    valor: Number(valor.value),
    data: data.value,
    usuarioId: auth.currentUser.uid
  });

  carregarLancamentos(auth.currentUser.uid);
};

// LISTAR + GRÁFICOS
async function carregarLancamentos(uid) {
  const q = query(collection(db, "lancamentos"), where("usuarioId", "==", uid));
  const snap = await getDocs(q);
  lancamentosCache = snap.docs.map(d => d.data());
  renderizar();
}

function renderizar() {
  listaLancamentos.innerHTML = "";
  let porMes = {};
  let porCategoria = {};

  lancamentosCache.forEach(l => {
    listaLancamentos.innerHTML += `
      <tr>
        <td>${l.data}</td>
        <td>${l.tipo}</td>
        <td>${l.categoriaNome}</td>
        <td>R$ ${l.valor}</td>
        <td></td>
      </tr>`;

    const mes = l.data.slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + l.valor;
    porCategoria[l.categoriaNome] =
      (porCategoria[l.categoriaNome] || 0) + l.valor;
  });

  if (graficoMes) graficoMes.destroy();
  graficoMes = new Chart(graficoFinanceiro, {
    type: "bar",
    data: { labels: Object.keys(porMes), datasets: [{ data: Object.values(porMes) }] }
  });

  if (graficoCategoria) graficoCategoria.destroy();
  graficoCategoria = new Chart(graficoCategoria, {
    type: "pie",
    data: { labels: Object.keys(porCategoria), datasets: [{ data: Object.values(porCategoria) }] }
  });
}

