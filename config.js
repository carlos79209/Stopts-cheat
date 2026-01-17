const LS_KEY = "stopots_dictionary";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const previewEl = $("preview");
const jsonArea = $("jsonArea");

const norm = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, " ");

function loadDict() {
  return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
}
function saveDict(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}

function mergeDictionaries(oldDict = {}, newDict = {}) {
  const result = JSON.parse(JSON.stringify(oldDict));

  for (const letter in newDict) {
    if (!result[letter]) result[letter] = {};
    for (const cat in newDict[letter]) {
      if (!result[letter][cat]) result[letter][cat] = [];
      const set = new Set(result[letter][cat].map(norm));
      (newDict[letter][cat] || []).forEach((w) => {
        const W = norm(w);
        if (W && !set.has(W)) {
          result[letter][cat].push(W);
          set.add(W);
        }
      });
    }
  }
  return result;
}

function updatePreview() {
  const d = loadDict();
  let letters = Object.keys(d).length;
  let cats = 0;
  let words = 0;
  for (const L in d) {
    cats += Object.keys(d[L] || {}).length;
    for (const C in d[L]) words += (d[L][C] || []).length;
  }
  previewEl.textContent = `Letras: ${letters} | Categorias: ${cats} | Palavras: ${words}`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

$("btnExport").onclick = () => {
  const d = loadDict();
  const str = JSON.stringify(d);
  jsonArea.value = str;
  jsonArea.focus();
  setStatus("✅ Exportado para o campo acima. Você pode copiar.");
  updatePreview();
};

$("btnImportMerge").onclick = () => {
  try {
    const incoming = JSON.parse(jsonArea.value || "{}");
    const current = loadDict();
    const merged = mergeDictionaries(current, incoming);
    saveDict(merged);
    setStatus("✅ Importado e mesclado (sem apagar o anterior).");
    updatePreview();
  } catch (e) {
    setStatus("❌ JSON inválido: " + e.message);
  }
};

$("btnReset").onclick = () => {
  if (!confirm("Tem certeza que deseja resetar o dicionário?")) return;
  saveDict({});
  jsonArea.value = "";
  setStatus("⚠️ Dicionário resetado.");
  updatePreview();
};

$("btnAdd").onclick = () => {
  const letter = norm($("inpLetter").value).slice(0, 1);
  const cat = norm($("inpCategory").value);
  const word = norm($("inpWord").value);

  if (!letter || !/^[A-Z]$/.test(letter)) return setStatus("❌ Letra inválida.");
  if (!cat) return setStatus("❌ Categoria vazia.");
  if (!word) return setStatus("❌ Palavra vazia.");

  const d = loadDict();
  d[letter] = d[letter] || {};
  d[letter][cat] = d[letter][cat] || [];

  if (!d[letter][cat].includes(word)) {
    d[letter][cat].push(word);
    saveDict(d);
    setStatus(`✅ Adicionado: ${letter} → ${cat} → ${word}`);
  } else {
    setStatus("ℹ️ Essa palavra já existe nessa categoria.");
  }

  updatePreview();
};

$("btnReload").onclick = () => {
  setStatus("🔄 Recarregado do armazenamento.");
  updatePreview();
};

updatePreview();
