(function () {
  console.log("📱 Stopots Helper Mobile ativo");

  // ======================
  // STORAGE
  // ======================
  const LS_KEY = "stopots_dictionary";
  const loadDictionary = () => JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  const saveDictionary = (dict) => localStorage.setItem(LS_KEY, JSON.stringify(dict));
  let dictionary = loadDictionary();

  // ======================
  // UTILS
  // ======================
  const norm = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, " ");

  function getCurrentLetter() {
    const spans = [...document.querySelectorAll("span,div,strong")];
    const el = spans.find((e) => /^[A-Z]$/.test((e.textContent || "").trim()));
    return el ? el.textContent.trim().toUpperCase() : null;
  }

  function getCategories() {
    const labels = [...document.querySelectorAll("label")]
      .map((l) => norm(l.innerText))
      .filter(Boolean);
    if (labels.length) return [...new Set(labels)];

    const heads = [...document.querySelectorAll("h3,h4,span")]
      .map((x) => norm(x.textContent))
      .filter((t) => t && t.length <= 40 && !/VALIDAD|AVALIAR|PONT|TEMPO|RODADA|RESULT/.test(t));
    return [...new Set(heads)];
  }

  function getSuggestion(letter, category) {
    const list = dictionary?.[letter]?.[category];
    if (!list || !list.length) return "Sem resposta";
    return list[Math.floor(Math.random() * list.length)];
  }

  function findEvaluateButton() {
    const btns = [...document.querySelectorAll("button")];
    return btns.find((b) => norm(b.innerText) === "AVALIAR");
  }

  function getInputCandidates() {
    return [...document.querySelectorAll("input, textarea")].filter((el) => {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (el.disabled || el.readOnly) return false;
      if (type === "hidden" || type === "button" || type === "submit") return false;
      return true;
    });
  }

  function findInputForLabel(label) {
    if (!label) return null;
    if (label.htmlFor) {
      const byId = document.getElementById(label.htmlFor);
      if (byId) return byId;
    }
    const inside = label.querySelector("input, textarea");
    if (inside) return inside;
    const parent = label.parentElement;
    if (parent) {
      const inParent = parent.querySelector("input, textarea");
      if (inParent) return inParent;
    }
    return null;
  }

  function buildCategoryInputMap(categories) {
    const map = new Map();
    const catSet = new Set(categories.map(norm));

    const labels = [...document.querySelectorAll("label")];
    labels.forEach((label) => {
      const txt = norm(label.innerText);
      if (!txt || !catSet.has(txt) || map.has(txt)) return;
      const input = findInputForLabel(label);
      if (input) map.set(txt, input);
    });

    const inputs = getInputCandidates();
    inputs.forEach((input) => {
      const attrs = [
        input.getAttribute("aria-label"),
        input.getAttribute("placeholder"),
        input.getAttribute("name"),
        input.getAttribute("id"),
      ];
      for (const a of attrs) {
        const key = norm(a);
        if (key && catSet.has(key) && !map.has(key)) {
          map.set(key, input);
          break;
        }
      }
    });

    if (map.size < catSet.size) {
      const textEls = [...document.querySelectorAll("h3,h4,span,div")];
      textEls.forEach((el) => {
        const key = norm(el.textContent);
        if (!key || !catSet.has(key) || map.has(key)) return;
        const parent = el.parentElement;
        if (!parent) return;
        const near = parent.querySelector("input, textarea");
        if (near) map.set(key, near);
      });
    }

    return map;
  }

  let currentCategories = [];
  let suggestionsMap = {};

  function setSuggestion(category, word) {
    suggestionsMap[norm(category)] = word;
  }

  function fillAnswers() {
    if (!currentCategories.length) {
      showToast("Nao encontrei categorias para preencher.");
      return;
    }

    const map = buildCategoryInputMap(currentCategories);
    let filled = 0;
    let missing = 0;

    currentCategories.forEach((cat0) => {
      const key = norm(cat0);
      const word = suggestionsMap[key];
      const input = map.get(key);
      if (input && word) {
        input.value = word;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        filled += 1;
      } else {
        missing += 1;
      }
    });

    if (filled) {
      showToast(`Preenchido: ${filled} (faltando: ${missing})`);
    } else {
      showToast("Nenhum campo compativel foi encontrado.");
    }
  }

  // ======================
  // OVERLAY UI (menu + painel)
  // ======================
  const overlay = document.createElement("div");
  overlay.id = "stopots-helper-overlay";
  overlay.innerHTML = `
    <div id="sh-menu" aria-hidden="true">
      <div class="sh-menu-title">Stopots Helper</div>
      <button class="sh-menu-btn" id="sh-go-play">Jogar</button>
      <button class="sh-menu-btn" id="sh-go-config">Configurar dicionário</button>
      <button class="sh-menu-btn sh-menu-close" id="sh-menu-close">Fechar</button>
    </div>

    <div id="sh-panel" aria-hidden="true">
      <div id="sh-header">
        <div class="sh-header-left">
          <span class="sh-title">Sugestões</span>
          <span class="sh-sub" id="sh-subtitle"></span>
        </div>
        <div class="sh-header-right">
          <button class="sh-topbtn ghost" id="sh-back-menu">Menu</button>
        </div>
      </div>

      <div id="sh-actions"></div>
      <div id="sh-content"></div>
      <div id="sh-toast" style="display:none;"></div>
    </div>

    <div id="sh-btn" title="Stopots Helper">📘</div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.innerHTML = `
    #stopots-helper-overlay{
      position:fixed; right:16px; bottom:16px; z-index:999999;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
      -webkit-tap-highlight-color: transparent;
    }

    #sh-btn{
      width:54px;height:54px;border-radius:999px;
      background:#29d3b2; display:flex;align-items:center;justify-content:center;
      font-size:24px; box-shadow:0 6px 16px rgba(0,0,0,.28);
      user-select:none;
    }

    /* MENU */
    #sh-menu{
      display:none;
      width:230px;
      background:#312b99;
      border-radius:16px;
      padding:10px;
      margin-bottom:10px;
      color:#fff;
      box-shadow:0 10px 24px rgba(0,0,0,.35);
    }
    .sh-menu-title{
      font-weight:800;
      text-align:center;
      margin-bottom:10px;
    }
    .sh-menu-btn{
      width:100%;
      border:none;
      border-radius:12px;
      padding:10px 12px;
      font-weight:800;
      margin-bottom:8px;
      cursor:pointer;
      background:rgba(255,255,255,.14);
      color:#fff;
    }
    .sh-menu-btn:active{ transform:scale(.99); }
    .sh-menu-close{ background:#ff8995; }

    /* PANEL */
    #sh-panel{
      display:none;
      width:min(86vw, 320px);
      max-height:min(70vh, 520px);
      background:#312b99;
      border-radius:16px;
      padding:10px;
      margin-bottom:10px;
      color:#fff;
      box-shadow:0 10px 24px rgba(0,0,0,.35);

      overflow:auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain; /* evita puxar a página junto */
      touch-action: pan-y;          /* rolagem suave no mobile */
    }

    #sh-header{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:8px;
    }
    .sh-title{ font-weight:900; }
    .sh-sub{ font-size:12px; opacity:.85; margin-left:8px; }

    .sh-topbtn{
      border:none;border-radius:10px;padding:6px 10px;
      font-size:12px;font-weight:900;cursor:pointer;
    }
    .sh-topbtn.ghost{ background:rgba(255,255,255,.14); color:#fff; }

    #sh-actions{ display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
    .sh-actionbtn{
      border:none;border-radius:12px;padding:8px 10px;
      font-size:12px;font-weight:900;cursor:pointer;
    }
    .sh-actionbtn.primary{ background:#61f7c4; color:#1d1d1d; }
    .sh-actionbtn.danger{ background:#ff8995; color:#fff; }
    .sh-actionbtn.ghost{ background:rgba(255,255,255,.14); color:#fff; }

    .sh-item{
      background:#61f7c4;
      color:#40405e;
      border-radius:12px;
      padding:8px;
      margin-bottom:8px;
    }
    .sh-item b{ display:block; font-size:12px; margin-bottom:4px; }
    .sh-word{ font-weight:900; font-size:14px; text-align:center; }

    .sh-actions-row{ display:flex; gap:6px; margin-top:6px; }
    .sh-actions-row button{
      flex:1; border:none; border-radius:10px;
      padding:7px 8px; font-size:12px; font-weight:900; cursor:pointer;
    }
    .copy{ background:#ff8995; color:#fff; }
    .next{ background:#fabdc3; color:#1d1d1d; }

    #sh-toast{
      margin-top:8px;
      background:rgba(0,0,0,.22);
      padding:8px;
      border-radius:12px;
      font-size:12px;
      line-height:1.2;
    }
    #sh-toast button{
      margin-left:8px;border:none;border-radius:10px;padding:6px 8px;
      font-size:12px;font-weight:900;cursor:pointer;background:#ff8995;color:#fff;
    }
  `;
  document.head.appendChild(style);

  const btn = document.getElementById("sh-btn");
  const menu = document.getElementById("sh-menu");
  const panel = document.getElementById("sh-panel");

  const goPlay = document.getElementById("sh-go-play");
  const goConfig = document.getElementById("sh-go-config");
  const closeMenu = document.getElementById("sh-menu-close");
  const backMenu = document.getElementById("sh-back-menu");

  const actions = document.getElementById("sh-actions");
  const content = document.getElementById("sh-content");
  const toast = document.getElementById("sh-toast");
  const subtitle = document.getElementById("sh-subtitle");

  // Evita “scroll da página” interferindo com o painel
  function lockBodyScroll(lock) {
    document.documentElement.style.overscrollBehavior = lock ? "none" : "";
    document.body.style.overscrollBehavior = lock ? "none" : "";
    // não vamos mexer em position fixed do body pra não quebrar o site
  }

  // Impede o toque no painel de “vazar” pra página
  ["touchstart", "touchmove", "wheel"].forEach((evt) => {
    panel.addEventListener(
      evt,
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );
  });

  function showMenu() {
    panel.style.display = "none";
    menu.style.display = "block";
    lockBodyScroll(false);
  }

  function showPanel() {
    menu.style.display = "none";
    panel.style.display = "block";
    lockBodyScroll(true);
    render(); // atualiza ao abrir
  }

  btn.onclick = () => {
    const menuOpen = menu.style.display === "block";
    const panelOpen = panel.style.display === "block";

    if (!menuOpen && !panelOpen) {
      showMenu();
    } else {
      // fecha tudo
      menu.style.display = "none";
      panel.style.display = "none";
      lockBodyScroll(false);
    }
  };

  closeMenu.onclick = () => {
    menu.style.display = "none";
    lockBodyScroll(false);
  };

  backMenu.onclick = showMenu;

  goPlay.onclick = showPanel;

  // >>> CONFIG: abre nova guia
  // Ajuste este caminho para onde você hospedar a página config:
  // Ex: https://seusite.com/config.html
  const CONFIG_URL = "https://carlos79209.github.io/Stopts-cheat/config.html";
  goConfig.onclick = () => {
    window.open(CONFIG_URL, "_blank");
  };

  // ======================
  // Toast
  // ======================
  function showToast(msg, withUndo = false, undoFn = null) {
    toast.style.display = "block";
    toast.innerHTML = withUndo ? `${msg} <button id="sh-undo">DESFAZER</button>` : msg;

    if (withUndo && undoFn) {
      const undo = document.getElementById("sh-undo");
      undo.onclick = undoFn;
    }

    setTimeout(() => {
      toast.style.display = "none";
      toast.innerHTML = "";
    }, 3500);
  }

  // ======================
  // Avaliar + adicionar (mantive simples aqui: só aparece se tiver botão AVALIAR)
  // Você pode plugar sua lógica completa de "validado" depois, se quiser.
  // ======================
  function renderActions() {
    actions.innerHTML = "";
    const evalBtn = findEvaluateButton();

    const fillBtn = document.createElement("button");
    fillBtn.className = "sh-actionbtn primary";
    fillBtn.textContent = "PREENCHER";
    fillBtn.onclick = fillAnswers;
    actions.appendChild(fillBtn);

    if (evalBtn) {
      const b = document.createElement("button");
      b.className = "sh-actionbtn primary";
      b.textContent = "AVALIAR (usar botão do site)";
      b.onclick = () => evalBtn.click();
      actions.appendChild(b);
    }

    const reloadDict = document.createElement("button");
    reloadDict.className = "sh-actionbtn ghost";
    reloadDict.textContent = "Recarregar dicionário";
    reloadDict.onclick = () => {
      dictionary = loadDictionary();
      showToast("📚 Dicionário recarregado");
      render();
    };
    actions.appendChild(reloadDict);
  }

  // ======================
  // Render inteligente + preserva scroll
  // ======================
  let lastSignature = "";
  function computeSignature(letter, categories) {
    return `${letter || ""}::${categories.join("|")}`;
  }

  function renderSuggestions(letter, categories) {
    content.innerHTML = "";
    suggestionsMap = {};

    if (!letter || !categories.length) {
      content.innerHTML = `
        <div style="opacity:.85;font-size:12px;line-height:1.35">
          Entre em uma sala e vá para a tela do jogo.<br/>
          (Não encontrei letra/categorias ainda)
        </div>`;
      return;
    }

    categories.forEach((cat0) => {
      const cat = norm(cat0);
      let currentWord = getSuggestion(letter, cat);
      setSuggestion(cat, currentWord);

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
        setSuggestion(cat, currentWord);
      };

      content.appendChild(item);
    });
  }

  function render(force = false) {
    if (panel.style.display !== "block") return;

    const scrollBefore = panel.scrollTop;

    const letter = getCurrentLetter();
    const categories = getCategories();
    currentCategories = categories.slice();
    subtitle.textContent = letter ? `Letra: ${letter}` : "";

    const signature = computeSignature(letter, categories);
    if (!force && signature === lastSignature) {
      // nada mudou, preserva scroll e evita rerender
      return;
    }
    lastSignature = signature;

    renderActions();
    renderSuggestions(letter, categories);

    // restaura scroll para não “voltar pro topo”
    panel.scrollTop = scrollBefore;
  }

  // MutationObserver throttled
  let t = null;
  const observer = new MutationObserver(() => {
    if (panel.style.display !== "block") return;
    clearTimeout(t);
    t = setTimeout(() => render(false), 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Inicial
  showMenu();
})();
