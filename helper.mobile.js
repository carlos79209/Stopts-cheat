(function () {
  console.log("📱 Stopots Helper Mobile ativo");

  // ======================
  // STORAGE
  // ======================
  const loadDictionary = () =>
    JSON.parse(localStorage.getItem("stopots_dictionary") || "{}");

  const saveDictionary = (dict) =>
    localStorage.setItem("stopots_dictionary", JSON.stringify(dict));

  let dictionary = loadDictionary();

  // ======================
  // UTILS
  // ======================
  function getCurrentLetter() {
    const spans = [...document.querySelectorAll("span")];
    const s = spans.find(e => /^[A-Z]$/.test(e.textContent.trim()));
    return s ? s.textContent.trim().toUpperCase() : null;
  }

  function getCategories() {
    return [...document.querySelectorAll("label")]
      .map(l => l.innerText.trim().toUpperCase())
      .filter(Boolean);
  }

  function getSuggestion(letter, category) {
    return (
      dictionary?.[letter]?.[category]?.[
        Math.floor(Math.random() * dictionary[letter][category].length)
      ] || "Sem resposta"
    );
  }

  // ======================
  // OVERLAY UI
  // ======================
  const overlay = document.createElement("div");
  overlay.id = "stopots-helper-overlay";
  overlay.innerHTML = `
    <div id="sh-btn">📘</div>
    <div id="sh-panel">
      <div id="sh-header">Stopots Helper</div>
      <div id="sh-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.innerHTML = `
    #stopots-helper-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: sans-serif;
    }
    #sh-btn {
      width: 56px;
      height: 56px;
      background: #29d3b2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    #sh-panel {
      display: none;
      width: 260px;
      max-height: 60vh;
      overflow-y: auto;
      background: #312b99;
      border-radius: 16px;
      margin-bottom: 10px;
      color: #fff;
      padding: 10px;
    }
    #sh-header {
      text-align: center;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .sh-item {
      background: #61f7c4;
      color: #40405e;
      border-radius: 10px;
      padding: 6px;
      margin-bottom: 6px;
      text-align: center;
    }
    .sh-actions {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .sh-actions button {
      flex: 1;
      border: none;
      border-radius: 8px;
      padding: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy { background: #ff8995; color: #fff; }
    .next { background: #fabdc3; }
  `;
  document.head.appendChild(style);

  document.getElementById("sh-btn").onclick = () => {
    const panel = document.getElementById("sh-panel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  };

  // ======================
  // RENDER
  // ======================
  function render() {
    const content = document.getElementById("sh-content");
    content.innerHTML = "";

    const letter = getCurrentLetter();
    const categories = getCategories();

    categories.forEach(cat => {
      let currentWord = getSuggestion(letter, cat);

      const item = document.createElement("div");
      item.className = "sh-item";
      item.innerHTML = `
        <div><b>${cat}</b></div>
        <div class="word">${currentWord}</div>
        <div class="sh-actions">
          <button class="copy">Copiar</button>
          <button class="next">↻</button>
        </div>
      `;

      item.querySelector(".copy").onclick = () => {
        navigator.clipboard.writeText(currentWord);
      };

      item.querySelector(".next").onclick = () => {
        currentWord = getSuggestion(letter, cat);
        item.querySelector(".word").innerText = currentWord;
      };

      content.appendChild(item);
    });
  }

  // ======================
  // OBSERVER
  // ======================
  const observer = new MutationObserver(render);
  observer.observe(document.body, { childList: true, subtree: true });

  render();
})();
