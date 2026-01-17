console.log("🔥 Stopots Helper ativo");

const MAX_ANS = 3;

let dictionary = {};
let observerStarted = false;
let debounceTimer = null;
let lastValidationKey = null;

function loadDictionary() {
  chrome.storage.local.get(["dictionary"], (result) => {
    dictionary = result.dictionary || {};
    console.log("📚 Dicionário carregado", dictionary);
  });
}

loadDictionary();

// ======================
// UTILIDADES
// ======================

function getCurrentLetter() {
  const spans = [...document.querySelectorAll("span")];
  const letterSpan = spans.find(s => s.textContent.length === 1 && s.textContent.match(/^[A-Z]$/i));
  return letterSpan ? letterSpan.textContent.toUpperCase() : null;
}

function getAllLabels() {
  return document.querySelectorAll("label");
}

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

// ======================
// ANSWERS PAGE (sugestões)
// ======================

const answerState = {};

function processAnswersPage() {
  const labels = getAllLabels();
  const letter = getCurrentLetter();
  if (!labels.length || !letter) return;

  labels.forEach(label => {
    if (label.querySelector(".stopots-helper-inline")) return;

    const rawTopic = getLabelTopic(label);
    const topic = resolveTopicKey(rawTopic);
    const words = dictionary?.[letter]?.[topic];
    if (!words || !words.length) return;

    answerState[topic] ??= 0;

    const container = document.createElement("div");
    container.className = "stopots-helper-inline";

    const wordSpan = document.createElement("span");
    wordSpan.className = "helper-word";
    wordSpan.textContent = words[answerState[topic]];

    const prev = document.createElement("button");
    prev.textContent = "‹";
    prev.onclick = () => {
      answerState[topic] =
        (answerState[topic] - 1 + words.length) % words.length;
      wordSpan.textContent = words[answerState[topic]];
    };

    const next = document.createElement("button");
    next.textContent = "›";
    next.onclick = () => {
      answerState[topic] =
        (answerState[topic] + 1) % words.length;
      wordSpan.textContent = words[answerState[topic]];
    };

    const copy = document.createElement("button");
    copy.textContent = "Copiar";
    copy.onclick = () =>
      navigator.clipboard.writeText(wordSpan.textContent);

    container.append(copy, prev, wordSpan, next);
    label.appendChild(container);
  });

  ensureAutoFillButton();
}

function getLabelTopic(label) {
  const clone = label.cloneNode(true);
  const helper = clone.querySelector(".stopots-helper-inline");
  if (helper) helper.remove();
  return clone.textContent.trim().toUpperCase();
}

function ensureAutoFillButton() {
  if (document.getElementById("autoFillBtn")) return;

  const autoFillBtn = document.createElement("button");
  autoFillBtn.id = "autoFillBtn";
  autoFillBtn.type = "button";
  autoFillBtn.innerText = "PREENCHER";
  autoFillBtn.onclick = () => {
    fillAnswersFromDictionary();
  };

  document.body.appendChild(autoFillBtn);
}

function getInputForLabel(label) {
  const forId = label.getAttribute("for");
  if (forId) {
    const inputByFor = document.getElementById(forId);
    if (inputByFor) return inputByFor;
  }

  const container = label.closest("div") || label.parentElement;
  if (!container) return null;

  return (
    container.querySelector("input[type='text'], textarea") ||
    container.querySelector("input, textarea")
  );
}

async function fillAnswersFromDictionary() {
  const letter = getCurrentLetter();
  if (!letter) return;

  const labels = getAllLabels();
  const missingTopics = [];
  const inputByTopic = new Map();

  labels.forEach(label => {
    const rawTopic = getLabelTopic(label);
    if (!rawTopic) return;
    const topic = resolveTopicKey(rawTopic);
    const input = getInputForLabel(label);
    if (!input) return;
    if (input.value.trim().length > 0) return;

    const words = dictionary?.[letter]?.[topic];
    if (words && words.length) {
      const helperWord = label.querySelector(".helper-word")?.textContent?.trim();
      const word = helperWord || words[0];
      if (!word) return;
      input.value = word;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (!missingTopics.includes(topic)) {
      missingTopics.push(topic);
      inputByTopic.set(topic, input);
    }
  });

  if (!missingTopics.length) return;

  const suggestions = await requestAiSuggestions(letter, missingTopics);
  if (!suggestions) {
    console.warn("Sem sugestoes de IA");
    return;
  }
  if (!Object.keys(suggestions).length) {
    console.warn("Sugestoes vazias da IA");
    return;
  }

  let added = 0;
  missingTopics.forEach((topic) => {
    const suggestion = suggestions[topic];
    if (!suggestion) return;

    if (suggestion[0] !== letter) return;

    dictionary[letter] ??= {};
    dictionary[letter][topic] ??= [];

    if (!dictionary[letter][topic].includes(suggestion)) {
      dictionary[letter][topic].push(suggestion);
      added++;
    }

    const input = inputByTopic.get(topic);
    if (input && input.value.trim().length === 0) {
      input.value = suggestion;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  if (added > 0) {
    chrome.storage.local.set({ dictionary });
  }
}

function requestAiSuggestions(letter, topics) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "ai_suggest",
        letter,
        topics,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (!response || !response.ok) {
          const errorMessage = response?.error || "OpenAI request failed";
          console.warn(errorMessage);
          if (errorMessage.includes("Missing OpenRouter API key")) {
            alert("Defina sua OpenRouter API Key em Configuracoes antes de usar.");
          }
          resolve(null);
          return;
        }
        resolve(response.suggestions || {});
      }
    );
  });
}

// ======================
// VALIDATION PAGE
// ======================
function addValidAnswersToDictionary() {
  const letter = getCurrentLetter();
  if (!letter) return;

  const topic = getCurrentTopic();
  if (!topic) return;

  const answerBlocks = document.querySelectorAll("div.validate.answer, .validate.answer");
  const blocks = answerBlocks.length
    ? answerBlocks
    : document.querySelectorAll("label, div");

  let addedCount = 0;

  blocks.forEach(block => {
    const statusText = block
      .querySelector?.("span, .status")
      ?.innerText?.toUpperCase();
    const validated =
      block.classList.contains("valid") ||
      (statusText && statusText.includes("VALIDADO"));
    if (!validated) return;

    const word = extractAnswerText(block);
    if (!word) return;

    dictionary[letter] ??= {};
    dictionary[letter][topic] ??= [];

    if (!dictionary[letter][topic].includes(word)) {
      dictionary[letter][topic].push(word);
      addedCount++;
      console.log(`Added ${letter} / ${topic} / ${word}`);
    }
  });

  if (addedCount > 0) {
    chrome.storage.local.set({ dictionary });
  }

  return addedCount;
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

  const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function waitForValidationAndAdd(onDone) {
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const hasValidated =
      document.querySelector(".valid") ||
      [...document.querySelectorAll("div")].some(div =>
        div.innerText.toUpperCase().includes("VALIDADO")
      );

    if (hasValidated || Date.now() - startedAt > 3000) {
      clearInterval(timer);
      const added = addValidAnswersToDictionary() || 0;
      onDone(added);
    }
  }, 200);
}

function processValidationPage() {
  const buttons = [...document.querySelectorAll("button")];

  const avaliarBtn = buttons.find(
    b => b.innerText.trim().toUpperCase() === "AVALIAR"
  );

  if (!avaliarBtn) return;
  const letter = getCurrentLetter();
  const topic = getCurrentTopic();
  const validationKey = `${letter || ""}::${topic || ""}`;

  const existingBtn = document.getElementById("avaliarAdicionarBtn");
  if (existingBtn) {
    if (validationKey !== lastValidationKey) {
      existingBtn.disabled = false;
      existingBtn.classList.remove("disable");
      existingBtn.style.opacity = "";
      existingBtn.style.cursor = "";
      existingBtn.innerText = "AVALIAR E ADICIONAR";
      lastValidationKey = validationKey;
    }
    return;
  }

  const avaliarAdicionarBtn = avaliarBtn.cloneNode(true);
  avaliarAdicionarBtn.id = "avaliarAdicionarBtn";
  avaliarAdicionarBtn.innerText = "AVALIAR E ADICIONAR";
  avaliarAdicionarBtn.disabled = false;
  avaliarAdicionarBtn.classList.remove("disable");
  lastValidationKey = validationKey;

  avaliarAdicionarBtn.onclick = () => {
    avaliarBtn.click();
    waitForValidationAndAdd((added) => {
      avaliarAdicionarBtn.innerText =
        added > 0 ? "ADICIONADO" : "JA ADICIONADO";
    });

    avaliarAdicionarBtn.disabled = true;
    avaliarAdicionarBtn.style.opacity = "0.7";
    avaliarAdicionarBtn.style.cursor = "default";
  };


  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "8px";

  avaliarBtn.parentElement.replaceChild(wrapper, avaliarBtn);

  wrapper.appendChild(avaliarAdicionarBtn);
  wrapper.appendChild(avaliarBtn);
}




// ======================
// OBSERVER COM DEBOUNCE (ANTI TRAVAMENTO)
// ======================

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processAnswersPage();
      processValidationPage();
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log("👀 MutationObserver ativo com debounce");
}

startObserver();

// ======================
// STYLE
// ======================

const style = document.createElement("style");
style.innerHTML = `
.stopots-helper-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.stopots-helper-inline button {
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  border: none;
  font-size: 11px;
  cursor: pointer;
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.stopots-helper-inline button:hover {
  background: rgba(255,255,255,0.35);
}

#autoFillBtn {
  position: fixed;
  right: 16px;
  bottom: 90px;
  z-index: 9999;
  padding: 8px 14px;
  border-radius: 14px;
  border: none;
  font-weight: 700;
  font-size: 12px;
  background: #ffd34a;
  color: #3b3b5f;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.25);
}

#autoFillBtn:hover {
  background: #ffe07c;
}

.helper-word {
  height: 22px;
  min-width: 70px;
  padding: 0 10px;
  border-radius: 11px;
  background: #ffffff;
  color: #3b3b5f;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
  .helper-word {
  opacity: 1;
}

.helper-word:has(:contains("Sem resposta")) {
  opacity: 0.6;
}

`;
document.head.appendChild(style);

