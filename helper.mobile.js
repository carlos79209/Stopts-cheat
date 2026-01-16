(function () {
  console.log("📱 Stopots Helper Mobile ativo");

  // ======================
  // STORAGE (localStorage)
  // ======================
  const LS_KEY = "stopots_dictionary";
  const LS_BKP = "stopots_dictionary_backup";

  const loadDictionary = () => JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  const saveDictionary = (dict) => localStorage.setItem(LS_KEY, JSON.stringify(dict));

  const backupDictionary = () => {
    const current = localStorage.getItem(LS_KEY) || "{}";
    localStorage.setItem(LS_BKP, JSON.stringify({ ts: Date.now(), dict: JSON.parse(current) }));
  };

  const restoreBackup = () => {
    const bkp = JSON.parse(localStorage.getItem(LS_BKP) || "null");
    if (!bkp?.dict) return false;
    saveDictionary(bkp.dict);
    dictionary = bkp.dict;
    return true;
  };

  let dictionary = loadDictionary();

  // ======================
  // NORMALIZAÇÃO
  // ======================
  const norm = (s) =>
    (s || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

  // ======================
  // UTIL: detectar letra e categorias (tela de respostas)
  // ======================
  function getCurrentLetter() {
    const spans = [...document.querySelectorAll("span,div,strong")];
    const el = spans.find((e) => /^[A-Z]$/.test((e.textContent || "").trim()));
    return el ? el.textContent.trim().toUpperCase() : null;
  }

  function getCategories() {
    // Stopots costuma usar label; mantemos fallback para textos curtos em cabeçalhos
    const labels = [...document.querySelectorAll("label")].map((l) => norm(l.innerText));
    if (labels.length) return [...new Set(labels)];

    const heads = [...document.querySelectorAll("h3,h4,span")]
      .map((x) => norm(x.textContent))
      .filter((t) => t && t.length <= 30 && !/VALIDAD|AVALIAR|TEMA|PONT|TEMPO/.test(t));
    return [...new Set(heads)];
  }

  function getSuggestion(letter, category) {
    const list = dictionary?.[letter]?.[category];
    if (!list || !list.length) return "Sem resposta";
    return list[Math.floor(Math.random() * list.length)];
  }

  // ======================
  // DETECTAR TELA DE AVALIAÇÃO
  // ======================
  function findEvaluateButton() {
    const btns = [...document.querySelectorAll("button")];
    return btns.find((b) => norm(b.innerText) === "AVALIAR");
  }

  // Tenta descobrir o TÓPICO da seção em que uma palavra validada aparece
  function inferTopicFromValidatedNode(node) {
    const section = node.closest("section,article,div");
    if (!section) return null;

    // busca um título acima dentro da mesma seção
    const titleCandidate =
      section.querySelector("h3,h2,h4") ||
      [...section.querySelectorAll("span,strong,div")].find((x) => {
        const t = norm(x.textContent);
        return t && t.length <= 35 && !/VALIDAD|AVALIAR|TEMA|PONT|TEMPO/.test(t);
      });

    const t = norm(titleCandidate?.textContent);
    return t || null;
  }

  // Tenta extrair a PALAVRA “validada” na linha/cartão
  function inferWordFromValidatedNode(node) {
    const box = node.closest("div,li,button");
    if (!box) return null;

    // preferir botões/chips que contenham só a palavra
    const chip =
      box.querySelector("button") ||
      box.closest("button") ||
      box;

    // limpa textos de status
    const raw = norm(chip.textContent)
      .replace(/VALIDAD[AO!]+/g, "")
      .replace(/PONTOS?.*/g, "")
      .replace(/✓|✅/g, "")
      .trim();

    // heurística: palavras muito longas (frases) ainda valem; mas ignora vazias
    return raw || null;
  }

  // Coleta tudo que estiver marcado como validado
  function collectValidatedAnswers() {
    const markers = [...document.querySelectorAll("*")]
      .filter((el) => {
        const t = norm(el.textContent);
        return t === "VALIDADO" || t === "VALIDADO!" || t.includes("VALIDADO");
      })
      .slice(0, 500); // proteção

    const results = [];
    for (const m of markers) {
      const word = inferWordFromValidatedNode(m);
      const topic = inferTopicFromValidatedNode(m);
      if (word && topic) results.push({ topic, word });
    }
    return results;
  }

  function mergeIntoDictionary(letter, additions) {
    let added = 0;
    const newTopics = new Set();

    dictionary[letter] = dictionary[letter] || {};

    for (const { topic, word } of additions) {
      const T = norm(topic);
      const W = norm(word);

      if (!T || !W) continue;

      if (!dictionary[letter][T]) {
        dictionary[letter][T] = [];
        newTopics.add(T);
      }

      if (!dictionary[letter][T].includes(W)) {
        dictionary[letter][T].push(W);
        added++;
      }
    }

    saveDictionary(dictionary);
    return { added, newTopicsCount: newTopics.size };
  }

  // ======================
  // OVERLAY UI (minimalista)
  // ======================
  const overlay = document.createElement("div");
  overlay.id = "stopots-helper-overlay";
  overlay.innerHTML = `
    <div id="sh-panel">
      <div id="sh-header">
        <span>Stopots Helper</span>
        <div id="sh-actions"></div>
      </div>
      <div id="sh-content"></div>
      <div id="sh-toast" style="display:none;"></div>
    </div>
    <div id="sh-btn">📘</div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.innerHTML = `
    #stopots-helper-overlay{position:fixed;bottom:18px;right:18px;z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
    #sh-btn{width:54px;height:54px;background:#29d3b2;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 6px 16px rgba(0,0,0,.28);user-select:none}
    #sh-panel{display:none;width:270px;max-height:64vh;overflow:auto;background:#312b99;border-radius:16px;margin-bottom:10px;color:#fff;padding:10px;box-shadow:0 10px 24px rgba(0,0,0,.35)}
    #sh-header{display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:8px}
    #sh-actions{display:flex;gap:6px}
    .sh-topbtn{border:none;border-radius:10px;padding:6px 8px;font-size:12px;font-weight:700;cursor:pointer}
    .sh-topbtn.primary{background:#61f7c4;color:#222}
    .sh-topbtn.ghost{background:rgba(255,255,255,.15);color:#fff}
    .sh-item{background:#61f7c4;color:#40405e;border-radius:12px;padding:8px;margin-bottom:8px}
    .sh-item b{display:block;font-size:12px;margin-bottom:4px}
    .sh-word{font-weight:800;font-size:14px;text-align:center}
    .sh-actions-row{display:flex;gap:6px;margin-top:6px}
    .sh-actions-row button{flex:1;border:none;border-radius:10px;padding:6px 8px;font-size:12px;font-weight:800;cursor:pointer}
    .copy{background:#ff8995;color:#fff}
    .next{background:#fabdc3;color:#222}
    #sh-toast{margin-top:8px;background:rgba(0,0,0,.25);padding:8px;border-radius:12px;font-size:12px}
    #sh-toast button{margin-left:8px;border:none;border-radius:10px;padding:6px 8px;font-size:12px;font-weight:800;cursor:pointer;background:#ff8995;color:#fff}
  `;
  document.head.appendChild(style);

  const panel = document.getElementById("sh-panel");
  const btn = document.getElementById("sh-btn");
  const content = document.getElementById("sh-content");
  const actions = document.getElementById("sh-actions");
  const toast = document.getElementById("sh-toast");

  btn.onclick = () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    if (panel.style.display === "block") render();
  };

  function showToast(msg, withUndo = false) {
    toast.style.display = "block";
    toast.innerHTML = withUndo ? `${msg} <button id="sh-undo">DESFAZER</button>` : msg;

    if (withUndo) {
      const undo = document.getElementById("sh-undo");
      undo.onclick = () => {
        const ok = restoreBackup();
        showToast(ok ? "✅ Alterações desfeitas." : "⚠️ Sem backup para desfazer.");
        render();
      };
    }

    setTimeout(() => {
      toast.style.display = "none";
      toast.innerHTML = "";
    }, 4500);
  }

  // ======================
  // RENDER
  // ======================
  function renderActions() {
    actions.innerHTML = "";

    const evalBtn = findEvaluateButton();
    if (!evalBtn) return;

    // Botão: Avaliar + Add
    const b1 = document.createElement("button");
    b1.className = "sh-topbtn primary";
    b1.textContent = "AVALIAR + ADD";

    b1.onclick = async () => {
      const letter = getCurrentLetter();
      if (!letter) {
        showToast("⚠️ Não encontrei a letra atual.");
        return;
      }

      backupDictionary();

      // dispara avaliação nativa
      evalBtn.click();

      // espera DOM atualizar
      await new Promise((r) => setTimeout(r, 900));

      const validated = collectValidatedAnswers();
      if (!validated.length) {
        showToast("⚠️ Não encontrei itens VALIDADO. Tente de novo após carregar.");
        return;
      }

      const { added, newTopicsCount } = mergeIntoDictionary(letter, validated);
      showToast(`✅ ${added} palavras adicionadas (${newTopicsCount} tópicos novos).`, true);
      render();
    };

    // Botão: Undo sempre que existir backup
    const b2 = document.createElement("button");
    b2.className = "sh-topbtn ghost";
    b2.textContent = "DESFAZER";
    b2.onclick = () => {
      const ok = restoreBackup();
      showToast(ok ? "✅ Alterações desfeitas." : "⚠️ Sem backup para desfazer.");
      render();
    };

    actions.appendChild(b1);
    actions.appendChild(b2);
  }

  function renderSuggestions() {
    content.innerHTML = "";

    const letter = getCurrentLetter();
    const categories = getCategories();

    if (!letter || !categories.length) {
      content.innerHTML = `<div style="opacity:.85;font-size:12px;line-height:1.3">
        Abra uma sala e vá para a tela de respostas ou avaliação.<br/>
        (Não encontrei letra/categorias ainda)
      </div>`;
      return;
    }

    for (const cat0 of categories) {
      const cat = norm(cat0);
      let currentWord = getSuggestion(letter, cat);

      const item = document.createElement("div");
      item.className = "sh-item";
      item.innerHTML = `
        <b>${cat}</b>
        <div class="sh-word">${currentWord}</div>
        <div class="sh-actions-row">
          <button class="copy">COPIAR</button>
          <button class="next">↻</button>
        </div>
      `;

      item.querySelector(".copy").onclick = () => {
        navigator.clipboard.writeText(currentWord);
        showToast("📋 Copiado!");
      };

      item.querySelector(".next").onclick = () => {
        currentWord = getSuggestion(letter, cat);
        item.querySelector(".sh-word").innerText = currentWord;
      };

      content.appendChild(item);
    }
  }

  function render() {
    renderActions();
    renderSuggestions();
  }

  // ======================
  // OBSERVER com throttle
  // ======================
  let t = null;
  const observer = new MutationObserver(() => {
    if (panel.style.display !== "block") return;
    clearTimeout(t);
    t = setTimeout(render, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // render inicial
  render();
})();
