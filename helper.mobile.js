(function () {
  console.log("📱 Stopots Helper Mobile ativo");

  // ======================
  // STORAGE
  // ======================
  const LS_KEY = "stopots_dictionary";
  const LS_KEY_API = "openrouterApiKey";
  const LS_KEY_POS = "stopots_helper_pos";
  const LS_KEY_PANEL_POS = "stopots_helper_panel_pos";
  const LS_KEY_MENU_POS = "stopots_helper_menu_pos";
  const loadDictionary = () => JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  const saveDictionary = (dict) => localStorage.setItem(LS_KEY, JSON.stringify(dict));
  let userDictionary = {};
  let repoDictionary = {};
  let dictionary = {};
  let dictionariesReady = null;

  function mergeDictionary(userDict, baseDict) {
    const result = JSON.parse(JSON.stringify(baseDict || {}));

    for (const letter in (userDict || {})) {
      if (!result[letter]) result[letter] = {};
      for (const topic in (userDict[letter] || {})) {
        if (!result[letter][topic]) {
          result[letter][topic] = userDict[letter][topic];
        } else {
          result[letter][topic] = mergeArray(result[letter][topic], userDict[letter][topic]);
        }
      }
    }
    return result;
  }

  function mergeArray(a, b) {
    return a.concat(b.filter((item) => !a.includes(item)));
  }

  function getHelperBaseUrl() {
    const current = document.currentScript?.src;
    const fallback = document.querySelector('script[src*="helper.mobile.js"]')?.src;
    const src = current || fallback;
    if (!src) return "";
    const url = new URL(src, location.href);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/[^\/]*$/, "");
    return url.toString().replace(/\/$/, "");
  }

  function loadRepoDictionary() {
    if (window.repoDictionary && typeof window.repoDictionary === "object") {
      return Promise.resolve(window.repoDictionary);
    }
    const base = getHelperBaseUrl();
    if (!base) return Promise.resolve({});

    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = `${base}/background.js?v=${Date.now()}`;
      s.onload = () => resolve(window.repoDictionary || {});
      s.onerror = () => resolve({});
      document.head.appendChild(s);
    });
  }

  function loadAllDictionaries() {
    return loadRepoDictionary().then((repo) => {
      repoDictionary = repo || {};
      userDictionary = loadDictionary();
      dictionary = mergeDictionary(userDictionary, repoDictionary);
    });
  }

  function refreshDictionary() {
    dictionariesReady = loadAllDictionaries();
    return dictionariesReady;
  }

  dictionariesReady = loadAllDictionaries();

  function loadHelperPosition() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_POS) || "null");
    } catch {
      return null;
    }
  }

  function saveHelperPosition(pos) {
    localStorage.setItem(LS_KEY_POS, JSON.stringify(pos));
  }

  function loadPanelPosition() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_PANEL_POS) || "null");
    } catch {
      return null;
    }
  }

  function savePanelPosition(pos) {
    localStorage.setItem(LS_KEY_PANEL_POS, JSON.stringify(pos));
  }

  function loadMenuPosition() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_MENU_POS) || "null");
    } catch {
      return null;
    }
  }

  function saveMenuPosition(pos) {
    localStorage.setItem(LS_KEY_MENU_POS, JSON.stringify(pos));
  }

  // ======================
  // UTILS
  // ======================
  const norm = (s) => (s || "").toString().trim().toUpperCase().replace(/\s+/g, " ");

  const topicAliases = {
    "FRUTA, LEGUME OU VERDURA": "FLV",
    "CIDADE, ESTADO OU PAIS": "CEP",
    "JORNAL, LIVRO OU REVISTA": "JLR",
    "PERSONAGEM DE DESENHO ANIMADO": "PDA",
    "PARTE DO CORPO HUMANO": "PCH",
  };

  function resolveTopicKey(topic) {
    return topicAliases[topic] || topic;
  }

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

  function getCurrentTopic() {
    const preferred = document.querySelector(
      "#screenGame h3, #screenGame h2, #screenGame h1, h3, h2, h1"
    );
    if (!preferred) return null;

    let text = preferred.textContent || "";
    if (text.includes(":")) {
      text = text.slice(text.indexOf(":") + 1);
    }

    text = text
      .replace(/TEMA|CATEGORIA|ASSUNTO/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return text ? text.toUpperCase() : null;
  }

  function getSuggestion(letter, category) {
    const key = resolveTopicKey(category);
    const list = dictionary?.[letter]?.[key];
    if (!list || !list.length) return "Sem resposta";
    return list[Math.floor(Math.random() * list.length)];
  }

  function extractAnswerText(block) {
    const label = block.matches?.("label") ? block : block.querySelector?.("label");
    if (label) {
      const labelText = label.querySelector("p")?.textContent?.trim();
      if (labelText) return labelText.toUpperCase();
      const labelOwnText = label.textContent?.trim();
      if (labelOwnText) return labelOwnText.toUpperCase();
    }

    const input = block.querySelector("input, textarea");
    if (input && input.value) return input.value.trim().toUpperCase();

    const textParts = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let current = walker.nextNode();
    while (current) {
      textParts.push(current.textContent);
      current = walker.nextNode();
    }

    let text = textParts
      .join(" ")
      .replace(/VALIDADO/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text) return text.toUpperCase();

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const buttonTexts = [...block.querySelectorAll("button")]
      .map((btn) => btn.innerText.trim())
      .filter(Boolean);
    let fallback = block.innerText;
    buttonTexts.forEach((label) => {
      fallback = fallback.replace(new RegExp(escapeRegex(label), "g"), "");
    });

    fallback = fallback
      .replace(/VALIDADO/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return fallback ? fallback.toUpperCase() : "";
  }

  function addValidAnswersToDictionary() {
    const letter = getCurrentLetter();
    if (!letter) return [];

    const topicRaw = getCurrentTopic();
    if (!topicRaw) return [];
    const topic = resolveTopicKey(topicRaw);

    const answerBlocks = document.querySelectorAll("div.validate.answer, .validate.answer");
    const blocks = answerBlocks.length ? answerBlocks : document.querySelectorAll("label, div");

    const addedWords = [];

    blocks.forEach((block) => {
      const statusText = block
        .querySelector?.("span, .status")
        ?.innerText?.toUpperCase();
      const validated =
        block.classList.contains("valid") ||
        (statusText && statusText.includes("VALIDADO"));
      if (!validated) return;

      const word = extractAnswerText(block);
      if (!word) return;

      userDictionary[letter] ??= {};
      userDictionary[letter][topic] ??= [];

      if (!userDictionary[letter][topic].includes(word)) {
        userDictionary[letter][topic].push(word);
        addedWords.push(word);
      }
    });

    if (addedWords.length > 0) {
      saveDictionary(userDictionary);
      dictionary = mergeDictionary(userDictionary, repoDictionary);
    }

    return addedWords;
  }

  function waitForValidationAndAdd(onDone) {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const hasValidated =
        document.querySelector(".valid") ||
        [...document.querySelectorAll("div")].some((div) =>
          div.innerText.toUpperCase().includes("VALIDADO")
        );

      if (hasValidated || Date.now() - startedAt > 3000) {
        clearInterval(timer);
        const added = addValidAnswersToDictionary() || [];
        onDone(added);
      }
    }, 200);
  }

  function findEvaluateButton() {
    const btns = [...document.querySelectorAll("button")];
    return btns.find((b) => norm(b.innerText) === "AVALIAR");
  }

  function getPhaseKey() {
    const hasInputs = document.querySelector("input, textarea");
    const evalBtn = findEvaluateButton();
    if (evalBtn && !hasInputs) return "validation";
    if (hasInputs) return "answers";
    return "other";
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

  function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input),
      "value"
    )?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dataset.shValue = value;
  }

  function fillAnswers() {
    const letter = getCurrentLetter();
    if (!letter) {
      showToast("Nao encontrei a letra atual.");
      return;
    }

    if (!currentCategories.length) {
      showToast("Nao encontrei categorias para preencher.");
      return;
    }

    const map = buildCategoryInputMap(currentCategories);
    let filled = 0;
    let missing = 0;
    const missingTopics = [];
    const inputByTopic = new Map();

    currentCategories.forEach((cat0) => {
      const key = norm(cat0);
      const word = suggestionsMap[key];
      const input = map.get(key);
      if (input && word && norm(word) !== "SEM RESPOSTA") {
        setInputValue(input, word);
        filled += 1;
      } else {
        missing += 1;
        if (input) {
          const resolved = resolveTopicKey(key);
          if (!missingTopics.includes(resolved)) {
            missingTopics.push(resolved);
            inputByTopic.set(resolved, input);
          }
        }
      }
    });

    if (!filled && !missingTopics.length) {
      showToast("Nenhum campo compativel foi encontrado.");
      return;
    }

    const filledBeforeAi = filled;

    if (missingTopics.length) {
      requestAiSuggestions(letter, missingTopics)
        .then((suggestions) => {
          if (!suggestions || !Object.keys(suggestions).length) {
            showToast(`Preenchido: ${filled} (faltando: ${missing})`);
            return;
          }

          let added = 0;
          missingTopics.forEach((topic) => {
            const suggestion = suggestions[topic];
            if (!suggestion) return;
            if (suggestion[0] !== letter) return;

            userDictionary[letter] ??= {};
            userDictionary[letter][topic] ??= [];
            if (!userDictionary[letter][topic].includes(suggestion)) {
              userDictionary[letter][topic].push(suggestion);
              added += 1;
            }

            const input = inputByTopic.get(topic);
            if (input && input.value.trim().length === 0) {
              setInputValue(input, suggestion);
              filled += 1;
              setSuggestion(topic, suggestion);
            }
          });

          if (added > 0) {
            saveDictionary(userDictionary);
            dictionary = mergeDictionary(userDictionary, repoDictionary);
          }
          const filledByAi = filled - filledBeforeAi;
          const missingAfter = Math.max(0, missingTopics.length - filledByAi);
          showToast(`Preenchido: ${filled} (faltando: ${missingAfter})`);
        })
        .catch(() => {
          showToast(`Preenchido: ${filled} (faltando: ${missing})`);
        });
    } else {
      showToast(`Preenchido: ${filled} (faltando: ${missing})`);
    }
  }

  function requestAiSuggestions(letter, topics) {
    return fetchOpenRouterSuggestions(letter, topics).catch((err) => {
      if (err && err.message && err.message.includes("Missing OpenRouter API key")) {
        alert("Defina sua OpenRouter API Key no menu do helper antes de usar.");
      }
      return {};
    });
  }

  async function fetchOpenRouterSuggestions(letter, topics) {
    const openrouterApiKey = localStorage.getItem(LS_KEY_API);
    if (!openrouterApiKey) {
      throw new Error("Missing OpenRouter API key");
    }

    const topicMap = {
      FLV: "FRUTA, LEGUME OU VERDURA",
      CEP: "CIDADE, ESTADO OU PAIS",
      JLR: "JORNAL, LIVRO OU REVISTA",
      PDA: "PERSONAGEM DE DESENHO ANIMADO",
      PCH: "PARTE DO CORPO HUMANO",
    };

    const resolvedTopics = topics.map((topic) => topicMap[topic] || topic);

    const prompt = [
      "Return ONLY valid JSON with no extra text.",
      "Use common everyday Brazilian Portuguese words.",
      "Keys must be exactly the topic names provided.",
      "Values must be a single short answer in Portuguese (string, not array) that starts with the letter.",
      "Do NOT reuse any of the example words below.",
      "Example format (do NOT reuse these words):",
      "{",
      '  "A": {',
      '    "ANIMAL": "ANTA",',
      '    "COR": "AZUL",',
      '    "COMIDA": "ARROZ",',
      '    "NOME": "ANA",',
      '    "PAIS": "ALEMANHA"',
      "  }",
      "}",
      `Letter: ${letter}`,
      `Topics: ${JSON.stringify(resolvedTopics)}`,
    ].join("\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterApiKey}`,
        "HTTP-Referer": "https://stopots.com",
        "X-Title": "Stopots Helper",
      },
      body: JSON.stringify({
        model: "mistralai/devstral-2512:free",
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a game helper." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${errorText}`);
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "{}";
    content = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    const normalized = {};
    const letterBucket = parsed && typeof parsed === "object" ? parsed[letter] : null;

    topics.forEach((topic) => {
      const resolved = topicMap[topic] || topic;
      const value =
        (letterBucket && (letterBucket[resolved] || letterBucket[topic])) ||
        parsed[resolved] ||
        parsed[topic];

      if (typeof value === "string" && value.trim()) {
        normalized[topic] = value.trim().toUpperCase();
      }
    });

    if (!Object.keys(normalized).length) {
      throw new Error(`Empty AI response: ${content}`);
    }

    return normalized;
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
      <button class="sh-menu-btn" id="sh-set-key">API Key</button>
      <button class="sh-menu-btn sh-menu-close" id="sh-menu-close">Fechar</button>
    </div>

    <div id="sh-panel" aria-hidden="true">
      <div id="sh-header">
        <div class="sh-header-left">
          <span class="sh-title" id="sh-title">Sugestões</span>
          <span class="sh-sub" id="sh-subtitle"></span>
        </div>
        <div class="sh-header-right">
          <button class="sh-topbtn ghost" id="sh-back-menu">Menu</button>
        </div>
      </div>

      <div id="sh-actions"></div>
      <div id="sh-content"></div>
      <div id="sh-config" style="display:none;">
        <div class="sh-config-row">
          <button class="sh-actionbtn ghost" id="sh-export">Exportar dicionario</button>
          <button class="sh-actionbtn ghost" id="sh-import">Importar dicionario</button>
        </div>
        <textarea id="sh-config-text" placeholder="Cole o dicionario aqui"></textarea>
      </div>
      <div id="sh-toast" style="display:none;"></div>
    </div>

    <div id="sh-btn" title="Stopots Helper"></div>
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
      width:48px;height:48px;border-radius:999px;
      background:#29d3b2; display:flex;align-items:center;justify-content:center;
      background-size:70% 70%;
      background-repeat:no-repeat;
      background-position:center;
      font-size:22px; box-shadow:0 6px 14px rgba(0,0,0,.22);
      user-select:none;
      opacity:.92;
      cursor:grab;
      touch-action:none;
    }
    #sh-btn:active{ cursor:grabbing; }

    /* MENU */
    #sh-menu{
      display:none;
      position:fixed;
      right:16px;
      bottom:80px;
      width:220px;
      background:rgba(49,43,153,.95);
      border-radius:16px;
      padding:10px;
      margin-bottom:0;
      color:#fff;
      box-shadow:0 10px 20px rgba(0,0,0,.28);
    }
    .sh-menu-title{
      font-weight:800;
      text-align:center;
      margin-bottom:10px;
      cursor:move;
      user-select:none;
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
      position:fixed;
      right:16px;
      bottom:80px;
      width:min(82vw, 300px);
      max-height:min(70vh, 520px);
      background:rgba(49,43,153,.95);
      border-radius:16px;
      padding:10px;
      margin-bottom:0;
      color:#fff;
      box-shadow:0 10px 20px rgba(0,0,0,.28);

      overflow:auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain; /* evita puxar a página junto */
      touch-action: pan-y;          /* rolagem suave no mobile */
    }

    #sh-header{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:8px;
      cursor:move;
      user-select:none;
    }
    .sh-title{ font-weight:900; }
    .sh-sub{ font-size:12px; opacity:.85; margin-left:8px; }

    .sh-topbtn{
      border:none;border-radius:10px;padding:6px 10px;
      font-size:12px;font-weight:900;cursor:pointer;
    }
    .sh-topbtn.ghost{ background:rgba(255,255,255,.14); color:#fff; }

    #sh-actions{ display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .sh-actionbtn{
      border:none;border-radius:12px;padding:7px 9px;
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
    #sh-config{ margin-bottom:8px; }
    .sh-config-row{ display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    #sh-config-text{ width:100%; min-height:120px; border-radius:12px; border:1px solid rgba(255,255,255,.2); padding:10px; background:rgba(0,0,0,.15); color:#fff; font-size:12px; outline:none; }


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
  const menuTitle = document.querySelector(".sh-menu-title");

  const goPlay = document.getElementById("sh-go-play");
  const goConfig = document.getElementById("sh-go-config");
  const setKeyBtn = document.getElementById("sh-set-key");
  const closeMenu = document.getElementById("sh-menu-close");
  const backMenu = document.getElementById("sh-back-menu");

  const actions = document.getElementById("sh-actions");
  const content = document.getElementById("sh-content");
  const toast = document.getElementById("sh-toast");
  const subtitle = document.getElementById("sh-subtitle");
  const titleEl = document.getElementById("sh-title");
  const configView = document.getElementById("sh-config");
  const configText = document.getElementById("sh-config-text");
  const exportBtn = document.getElementById("sh-export");
  const importBtn = document.getElementById("sh-import");

  const helperBase = getHelperBaseUrl();
  if (helperBase) {
    btn.style.backgroundImage = `url('${helperBase}/icon.png')`;
  }

  let panelMode = "suggestions";
  let lastPanelMode = "suggestions";

  function showSuggestionsView() {
    panelMode = "suggestions";
    lastPanelMode = "suggestions";
    if (titleEl) titleEl.textContent = "Sugestoes";
    if (configView) configView.style.display = "none";
    actions.style.display = "flex";
    content.style.display = "block";
    render(true);
  }

  function showConfigView() {
    panelMode = "config";
    lastPanelMode = "config";
    if (titleEl) titleEl.textContent = "Configurar dicionario";
    subtitle.textContent = "";
    actions.style.display = "none";
    content.style.display = "none";
    if (configView) configView.style.display = "block";
  }

  function clampPosition(x, y) {
    const pad = 8;
    const size = 48;
    const maxX = Math.max(pad, window.innerWidth - size - pad);
    const maxY = Math.max(pad, window.innerHeight - size - pad);
    return {
      x: Math.min(Math.max(pad, x), maxX),
      y: Math.min(Math.max(pad, y), maxY),
    };
  }

  function applyPosition(pos) {
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
    overlay.style.left = `${pos.x}px`;
    overlay.style.top = `${pos.y}px`;
  }

  const savedPos = loadHelperPosition();
  if (savedPos) applyPosition(savedPos);

  function clampPanelPosition(x, y) {
    const pad = 8;
    const rect = panel.getBoundingClientRect();
    const maxX = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxY = Math.max(pad, window.innerHeight - rect.height - pad);
    return {
      x: Math.min(Math.max(pad, x), maxX),
      y: Math.min(Math.max(pad, y), maxY),
    };
  }

  function applyPanelPosition(pos) {
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.left = `${pos.x}px`;
    panel.style.top = `${pos.y}px`;
  }

  function positionPanelNearButton(anchorRect = null) {
    const btnRect = anchorRect || btn.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const x = btnRect.left - Math.max(0, panelRect.width - btnRect.width);
    const y = btnRect.top - panelRect.height - 12;
    const pos = clampPanelPosition(x, y);
    applyPanelPosition(pos);
  }

  function clampMenuPosition(x, y) {
    const pad = 8;
    const rect = menu.getBoundingClientRect();
    const maxX = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxY = Math.max(pad, window.innerHeight - rect.height - pad);
    return {
      x: Math.min(Math.max(pad, x), maxX),
      y: Math.min(Math.max(pad, y), maxY),
    };
  }

  function applyMenuPosition(pos) {
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.left = `${pos.x}px`;
    menu.style.top = `${pos.y}px`;
  }

  function positionMenuNearButton() {
    const btnRect = btn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const x = btnRect.left - Math.max(0, menuRect.width - btnRect.width);
    const y = btnRect.top - menuRect.height - 12;
    const pos = clampMenuPosition(x, y);
    applyMenuPosition(pos);
  }

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
    btn.style.display = "none";
    const savedMenuPos = loadMenuPosition();
    if (savedMenuPos) {
      applyMenuPosition(savedMenuPos);
    } else {
      positionMenuNearButton();
    }
  }

  function showPanel(forceMode = null, forcePosition = false) {
    menu.style.display = "none";
    panel.style.display = "block";
    lockBodyScroll(true);
    const anchorRect = btn.getBoundingClientRect();
    btn.style.display = "none";
    if (dictionariesReady) dictionariesReady.then(() => render(true));
    if (forceMode) lastPanelMode = forceMode;
    if (forcePosition) {
      positionPanelNearButton(anchorRect);
    } else {
      const savedPanelPos = loadPanelPosition();
      if (savedPanelPos) {
        applyPanelPosition(savedPanelPos);
      } else {
        positionPanelNearButton(anchorRect);
      }
    }
    if (lastPanelMode === "config") {
      showConfigView();
    } else {
      showSuggestionsView();
    }
  }

  let ignoreClick = false;
  const dragState = {
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    pointerId: null,
  };

  function startDrag(clientX, clientY, pointerId) {
    dragState.active = true;
    dragState.moved = false;
    dragState.startX = clientX;
    dragState.startY = clientY;
    dragState.pointerId = pointerId ?? null;
    const rect = btn.getBoundingClientRect();
    dragState.startLeft = rect.left;
    dragState.startTop = rect.top;
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
    overlay.style.left = `${dragState.startLeft}px`;
    overlay.style.top = `${dragState.startTop}px`;
  }

  function moveDrag(clientX, clientY) {
    if (!dragState.active) return;
    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < 6) return;
    dragState.moved = true;
    const pos = clampPosition(dragState.startLeft + dx, dragState.startTop + dy);
    overlay.style.left = `${pos.x}px`;
    overlay.style.top = `${pos.y}px`;
  }

  function finishDrag() {
    if (!dragState.active) return;
    dragState.active = false;
    dragState.pointerId = null;
    const rect = btn.getBoundingClientRect();
    const pos = clampPosition(rect.left, rect.top);
    overlay.style.left = `${pos.x}px`;
    overlay.style.top = `${pos.y}px`;
    saveHelperPosition(pos);
    if (dragState.moved) {
      ignoreClick = true;
      setTimeout(() => (ignoreClick = false), 0);
    }
  }

  if (window.PointerEvent) {
    btn.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      startDrag(e.clientX, e.clientY, e.pointerId);
      btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener("pointermove", (e) => {
      if (!dragState.active) return;
      if (dragState.pointerId !== null && e.pointerId !== dragState.pointerId) return;
      moveDrag(e.clientX, e.clientY);
    });

    btn.addEventListener("pointerup", (e) => {
      if (dragState.pointerId !== null && e.pointerId !== dragState.pointerId) return;
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch {}
      finishDrag();
    });

    btn.addEventListener("pointercancel", (e) => {
      if (dragState.pointerId !== null && e.pointerId !== dragState.pointerId) return;
      finishDrag();
    });
  } else {
    btn.addEventListener("mousedown", (e) => {
      if (e.button && e.button !== 0) return;
      startDrag(e.clientX, e.clientY, "mouse");
      const onMove = (ev) => moveDrag(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        finishDrag();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp, { once: true });
    });

    btn.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY, "touch");
        const onMove = (ev) => {
          const tt = ev.touches[0];
          if (!tt) return;
          moveDrag(tt.clientX, tt.clientY);
          ev.preventDefault();
        };
        const onEnd = () => {
          window.removeEventListener("touchmove", onMove);
          finishDrag();
        };
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd, { once: true });
        window.addEventListener("touchcancel", onEnd, { once: true });
      },
      { passive: true }
    );
  }

  btn.onclick = () => {
    if (ignoreClick) return;
    const menuOpen = menu.style.display === "block";
    const panelOpen = panel.style.display === "block";

    if (!menuOpen && !panelOpen) {
      showPanel(null, true);
    } else {
      menu.style.display = "none";
      panel.style.display = "none";
      lockBodyScroll(false);
      btn.style.display = "flex";
    }
  };

  closeMenu.onclick = () => {
    menu.style.display = "none";
    lockBodyScroll(false);
    btn.style.display = "flex";
  };

  backMenu.onclick = showMenu;

  goPlay.onclick = () => showPanel("suggestions");

  setKeyBtn.onclick = () => {
    const current = localStorage.getItem(LS_KEY_API) || "";
    const key = prompt("Cole sua OpenRouter API Key:", current || "");
    if (key === null) return;
    localStorage.setItem(LS_KEY_API, key.trim());
    showToast("API Key salva");
  };

  if (exportBtn && importBtn && configText) {
    exportBtn.onclick = async () => {
      const txt = JSON.stringify(userDictionary || {});
      configText.value = txt;
      try {
        await navigator.clipboard.writeText(txt);
        showToast("Dicionario copiado");
      } catch {
        configText.focus();
        configText.select();
        showToast("Dicionario pronto para copiar");
      }
    };

    importBtn.onclick = () => {
      const txt = (configText.value || "").trim();
      if (!txt) {
        showToast("Cole um dicionario valido");
        return;
      }
      try {
        const imported = JSON.parse(txt);
        const merged = mergeDictionary(imported, userDictionary);
        userDictionary = merged;
        saveDictionary(userDictionary);
        dictionary = mergeDictionary(userDictionary, repoDictionary);
        showToast("Dicionario importado");
      } catch (e) {
        showToast("JSON invalido");
      }
    };
  }

  document.addEventListener("pointerdown", (e) => {
    if (overlay.contains(e.target)) return;
    if (menu.style.display === "block" || panel.style.display === "block") {
      menu.style.display = "none";
      panel.style.display = "none";
      lockBodyScroll(false);
      btn.style.display = "flex";
    }
  });

  document.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!input || !input.matches("input, textarea")) return;
    const stored = input.dataset.shValue;
    if (!stored) return;
    if (input.value.trim().length !== 0) return;
    setTimeout(() => {
      if (input.value.trim().length === 0) {
        setInputValue(input, stored);
      }
    }, 0);
  });

  document.addEventListener("input", (e) => {
    const input = e.target;
    if (!input || !input.matches("input, textarea")) return;
    if (input.dataset.shValue === undefined) return;
    input.dataset.shValue = input.value;
  });

  const header = document.getElementById("sh-header");
  if (header) {
    let panelDragActive = false;
    let panelStartX = 0;
    let panelStartY = 0;
    let panelStartLeft = 0;
    let panelStartTop = 0;

    const startPanelDrag = (clientX, clientY) => {
      panelDragActive = true;
      panelStartX = clientX;
      panelStartY = clientY;
      const rect = panel.getBoundingClientRect();
      panelStartLeft = rect.left;
      panelStartTop = rect.top;
    };

    const movePanelDrag = (clientX, clientY) => {
      if (!panelDragActive) return;
      const dx = clientX - panelStartX;
      const dy = clientY - panelStartY;
      const pos = clampPanelPosition(panelStartLeft + dx, panelStartTop + dy);
      applyPanelPosition(pos);
    };

    const endPanelDrag = () => {
      if (!panelDragActive) return;
      panelDragActive = false;
      const rect = panel.getBoundingClientRect();
      const pos = clampPanelPosition(rect.left, rect.top);
      applyPanelPosition(pos);
      savePanelPosition(pos);
    };

    if (window.PointerEvent) {
      header.addEventListener("pointerdown", (e) => {
        if (e.button && e.button !== 0) return;
        if (e.target && e.target.closest("button")) return;
        startPanelDrag(e.clientX, e.clientY);
        header.setPointerCapture(e.pointerId);
      });
      header.addEventListener("pointermove", (e) => {
        movePanelDrag(e.clientX, e.clientY);
      });
      header.addEventListener("pointerup", (e) => {
        try {
          header.releasePointerCapture(e.pointerId);
        } catch {}
        endPanelDrag();
      });
      header.addEventListener("pointercancel", endPanelDrag);
    } else {
      header.addEventListener("mousedown", (e) => {
        if (e.button && e.button !== 0) return;
        if (e.target && e.target.closest("button")) return;
        startPanelDrag(e.clientX, e.clientY);
        const onMove = (ev) => movePanelDrag(ev.clientX, ev.clientY);
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          endPanelDrag();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp, { once: true });
      });
      header.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          if (e.target && e.target.closest("button")) return;
          const t = e.touches[0];
          startPanelDrag(t.clientX, t.clientY);
          const onMove = (ev) => {
            const tt = ev.touches[0];
            if (!tt) return;
            movePanelDrag(tt.clientX, tt.clientY);
            ev.preventDefault();
          };
          const onEnd = () => {
            window.removeEventListener("touchmove", onMove);
            endPanelDrag();
          };
          window.addEventListener("touchmove", onMove, { passive: false });
          window.addEventListener("touchend", onEnd, { once: true });
          window.addEventListener("touchcancel", onEnd, { once: true });
        },
        { passive: true }
      );
    }
  }

  if (menuTitle) {
    let menuDragActive = false;
    let menuStartX = 0;
    let menuStartY = 0;
    let menuStartLeft = 0;
    let menuStartTop = 0;

    const startMenuDrag = (clientX, clientY) => {
      menuDragActive = true;
      menuStartX = clientX;
      menuStartY = clientY;
      const rect = menu.getBoundingClientRect();
      menuStartLeft = rect.left;
      menuStartTop = rect.top;
    };

    const moveMenuDrag = (clientX, clientY) => {
      if (!menuDragActive) return;
      const dx = clientX - menuStartX;
      const dy = clientY - menuStartY;
      const pos = clampMenuPosition(menuStartLeft + dx, menuStartTop + dy);
      applyMenuPosition(pos);
    };

    const endMenuDrag = () => {
      if (!menuDragActive) return;
      menuDragActive = false;
      const rect = menu.getBoundingClientRect();
      const pos = clampMenuPosition(rect.left, rect.top);
      applyMenuPosition(pos);
      saveMenuPosition(pos);
    };

    if (window.PointerEvent) {
      menuTitle.addEventListener("pointerdown", (e) => {
        if (e.button && e.button !== 0) return;
        startMenuDrag(e.clientX, e.clientY);
        menuTitle.setPointerCapture(e.pointerId);
      });
      menuTitle.addEventListener("pointermove", (e) => {
        moveMenuDrag(e.clientX, e.clientY);
      });
      menuTitle.addEventListener("pointerup", (e) => {
        try {
          menuTitle.releasePointerCapture(e.pointerId);
        } catch {}
        endMenuDrag();
      });
      menuTitle.addEventListener("pointercancel", endMenuDrag);
    } else {
      menuTitle.addEventListener("mousedown", (e) => {
        if (e.button && e.button !== 0) return;
        startMenuDrag(e.clientX, e.clientY);
        const onMove = (ev) => moveMenuDrag(ev.clientX, ev.clientY);
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          endMenuDrag();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp, { once: true });
      });
      menuTitle.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          const t = e.touches[0];
          startMenuDrag(t.clientX, t.clientY);
          const onMove = (ev) => {
            const tt = ev.touches[0];
            if (!tt) return;
            moveMenuDrag(tt.clientX, tt.clientY);
            ev.preventDefault();
          };
          const onEnd = () => {
            window.removeEventListener("touchmove", onMove);
            endMenuDrag();
          };
          window.addEventListener("touchmove", onMove, { passive: false });
          window.addEventListener("touchend", onEnd, { once: true });
          window.addEventListener("touchcancel", onEnd, { once: true });
        },
        { passive: true }
      );
    }
  }

  // >>> CONFIG: abre nova guia
  // Ajuste este caminho para onde você hospedar a página config:
  // Ex: https://seusite.com/config.html
  goConfig.onclick = () => {
    menu.style.display = "none";
    panel.style.display = "block";
    lockBodyScroll(true);
    btn.style.display = "none";
    const savedPanelPos = loadPanelPosition();
    if (savedPanelPos) {
      applyPanelPosition(savedPanelPos);
    } else {
      positionPanelNearButton();
    }
    showConfigView();
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

  function handleEvaluateClick() {
    waitForValidationAndAdd((added) => {
      const revealPanel = panel.style.display !== "block";
      if (revealPanel) {
        menu.style.display = "none";
        panel.style.display = "block";
        lockBodyScroll(true);
        showSuggestionsView();
      }

      if (added && added.length) {
        const list = added.slice(0, 5).join(", ");
        const suffix = added.length > 5 ? "..." : "";
        showToast(`Salvo: ${list}${suffix}`);
      } else {
        showToast("Nada para adicionar");
      }

      if (revealPanel) {
        setTimeout(() => {
          panel.style.display = "none";
          lockBodyScroll(false);
        }, 2500);
      }
    });
  }

  function bindEvaluateButtons() {
    const btns = [...document.querySelectorAll("button")];
    btns.forEach((btn) => {
      if (btn.dataset.shAutoAdd) return;
      if (norm(btn.innerText) !== "AVALIAR") return;
      btn.dataset.shAutoAdd = "1";
      btn.addEventListener("click", handleEvaluateClick);
    });
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
      bindEvaluateButtons();
    }

    const reloadDict = document.createElement("button");
    reloadDict.className = "sh-actionbtn ghost";
    reloadDict.textContent = "Recarregar dicionário";
    reloadDict.onclick = () => {
      refreshDictionary().then(() => {
        showToast("Dicionario recarregado");
        render(true);
      });
    };
    actions.appendChild(reloadDict);
  }

  // ======================
  // Render inteligente + preserva scroll
  // ======================
  let lastSignature = "";
  function computeSignature(letter, categories) {
    const phase = getPhaseKey();
    return `${phase}::${letter || ""}::${categories.join("|")}`;
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
      const isEmptySuggestion = norm(currentWord) === "SEM RESPOSTA";
      setSuggestion(cat, isEmptySuggestion ? "" : currentWord);

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
        const emptyNext = norm(currentWord) === "SEM RESPOSTA";
        setSuggestion(cat, emptyNext ? "" : currentWord);
      };

      content.appendChild(item);
    });
  }

  function render(force = false) {
    if (panel.style.display !== "block" || panelMode !== "suggestions") return;

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
    clearTimeout(t);
    t = setTimeout(() => {
      bindEvaluateButtons();
      if (panel.style.display !== "block") return;
      render(false);
    }, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Inicial
  showMenu();
})();









