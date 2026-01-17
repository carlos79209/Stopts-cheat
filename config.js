const dictionaryDiv = document.getElementById('dictionary');
let dictionary = {};

const LS_KEY = "stopots_dictionary";
const LS_KEY_API = "openrouterApiKey";

// ===== Storage helpers (mobile) =====
function loadDictionary() {
  return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
}
function saveDictionary(dict) {
  localStorage.setItem(LS_KEY, JSON.stringify(dict));
}

function loadApiKey() {
  return localStorage.getItem(LS_KEY_API) || "";
}

function saveApiKey(key) {
  localStorage.setItem(LS_KEY_API, key);
}

// ===== Init =====
dictionary = loadDictionary();
processDictionary();
handleModal();
handleApiKey();

function handleApiKey() {
  const input = document.getElementById("openrouterKey");
  const btn = document.getElementById("saveKeyBtn");
  if (!input || !btn) return;

  input.value = loadApiKey();

  btn.onclick = () => {
    saveApiKey((input.value || "").trim());
    btn.innerText = "Salvo!";
    setTimeout(() => (btn.innerText = "Salvar"), 1000);
  };
}

// =======================
// Render do dicionário (igual extensão)
// =======================
function processDictionary() {
  let dictionaryHTML = '';

  const letters = Object.keys(dictionary || {}).sort();

  for (const letter of letters) {
    let letterHTML = `<div class='box-letter' data-letter='${letter}'>
                        <span class="title-letter">LETRA: ${letter}</span>
                        <button class="btn-addTopic">Adicionar tópico</button>
                        <div class="box-topics">`;

    const topics = Object.keys(dictionary[letter] || {}).sort();

    for (const topic of topics) {
      let topicHTML = `<div class="box-topic">
                        <div class="row-topic">
                          <span class="title-topic">Tópico:</span>
                          <input type="text" class="topic-input" value="${topic}" />
                          <button class="delete-btn">Apagar</button>
                        </div>
                        <div class="box-answers">`;

      for (const answer of (dictionary[letter][topic] || [])) {
        const answerHTML = `<div class="box-answer">
                              <input type="text" class="answer-input" value="${answer}" />
                              <button class="delete-btn">Apagar</button>
                            </div>`;
        topicHTML += answerHTML;
      }

      topicHTML += `</div>
                    <button class="btn-addAnswer">Adicionar resposta</button>
                  </div>`;

      letterHTML += topicHTML;
    }

    letterHTML += `</div></div>`;
    dictionaryHTML += letterHTML;
  }

  dictionaryDiv.innerHTML = dictionaryHTML;

  // binds
  const deleteBtns = document.getElementsByClassName('delete-btn');
  for (const deleteBtn of deleteBtns) deleteBtn.onclick = deleteBox;

  const addAnswerBtns = document.getElementsByClassName('btn-addAnswer');
  for (const addAnswerBtn of addAnswerBtns) addAnswerBtn.onclick = addAnswer;

  const addTopicBtns = document.getElementsByClassName('btn-addTopic');
  for (const addTopicBtn of addTopicBtns) addTopicBtn.onclick = addTopic;
}

function addTopic({ target }) {
  const boxTopics = target.nextElementSibling;

  const boxTopic = document.createElement('div');
  boxTopic.classList.add('box-topic');

  boxTopic.innerHTML = `
    <div class="row-topic">
      <span class="title-topic">Tópico:</span>
      <input type="text" class="topic-input" value="">
      <button class="deleteTopic-btn">Apagar</button>
    </div>
    <div class="box-answers"></div>
    <button class="btn-addAnswer">Adicionar resposta</button>
  `;

  // bind delete
  boxTopic.querySelector('.deleteTopic-btn').onclick = deleteBox;

  // bind add answer
  const addBtn = boxTopic.querySelector('.btn-addAnswer');
  addBtn.onclick = addAnswer;

  // adiciona 1 resposta por padrão
  addBtn.click();

  boxTopics.prepend(boxTopic);
}

function deleteBox({ target }) {
  target.parentNode.classList.add('deleted');
}

function addAnswer({ target }) {
  const answersContainer = target.parentNode.querySelector('.box-answers');

  const newAnswerBox = document.createElement('div');
  newAnswerBox.classList.add('box-answer');

  newAnswerBox.innerHTML = `
    <input type="text" class="answer-input" value="" />
    <button class="delete-btn">Apagar</button>
  `;

  newAnswerBox.querySelector('.delete-btn').onclick = deleteBox;
  answersContainer.appendChild(newAnswerBox);
}

// =======================
// Salvar alterações
// =======================
const saveBtn = document.getElementById('saveBtn');
saveBtn.onclick = () => {
  try {
    const dictionaryJsonString = convertToJsonString();
    const parsed = JSON.parse(dictionaryJsonString);

    saveDictionary(parsed);

    saveBtn.innerText = 'Alterações salvas!';
    setTimeout(() => (saveBtn.innerText = 'Salvar alterações'), 1000);
  } catch (e) {
    alert('Erro ao salvar alterações! JSON parser: ' + e.message);
  }
};

function convertToJsonString() {
  let jsonString = '{';
  const letterElements = document.getElementsByClassName('box-letter');

  for (let i = 0; i < letterElements.length; i++) {
    const letterElement = letterElements[i];
    if (i !== 0) jsonString += ',';
    jsonString += `"${letterElement.dataset.letter}":{`;

    const topicElements = letterElement.getElementsByClassName('box-topic');

    for (let j = 0; j < topicElements.length; j++) {
      const topicElement = topicElements[j];
      const topic = topicElement
        .getElementsByClassName('topic-input')[0]
        .value.trim()
        .toUpperCase();

      if (topicElement.classList.contains('deleted') || topic.length === 0) continue;

      // separador entre tópicos
      if (jsonString[jsonString.length - 1] === ']') jsonString += ',';

      jsonString += `"${topic}":[`;

      const answerElements = topicElement.getElementsByClassName('box-answer');

      for (let k = 0; k < answerElements.length; k++) {
        const answerElement = answerElements[k];
        const answer = answerElement
          .getElementsByClassName('answer-input')[0]
          .value.trim()
          .toUpperCase();

        if (answerElement.classList.contains('deleted') || answer.length === 0) continue;

        if (jsonString[jsonString.length - 1] === '"') jsonString += ',';
        jsonString += `"${answer}"`;
      }

      jsonString += `]`;
    }

    jsonString += '}';
  }

  jsonString += '}';

  return jsonString;
}

// =======================
// Modal Import / Export (IMPORTA MESCLANDO)
// =======================
function mergeDictionaries(oldDict, newDict) {
  const result = JSON.parse(JSON.stringify(oldDict || {}));

  for (const letter in (newDict || {})) {
    if (!result[letter]) result[letter] = {};

    for (const category in (newDict[letter] || {})) {
      const incoming = (newDict[letter][category] || []).map(w => w.trim().toUpperCase()).filter(Boolean);

      if (!result[letter][category]) {
        result[letter][category] = [...incoming];
      } else {
        const existing = new Set(result[letter][category].map(x => x.trim().toUpperCase()));
        for (const w of incoming) {
          if (!existing.has(w)) {
            result[letter][category].push(w);
            existing.add(w);
          }
        }
      }
    }
  }

  return result;
}

function handleModal() {
  const modal = document.getElementById('myModal');

  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  const closeModalBtn = document.getElementsByClassName('close')[0];
  closeModalBtn.onclick = () => (modal.style.display = 'none');

  function showImport() {
    modalTitle.innerText = 'Importar um dicionário';
    modalBody.innerHTML = `
      <textarea id="modal-textarea" placeholder="Cole um dicionário válido"></textarea>
      <button id="modal-btn">Importar</button>
    `;

    const modalBtn = document.getElementById('modal-btn');

    modalBtn.onclick = () => {
      const dictionaryString = document.getElementById('modal-textarea').value;

      try {
        const imported = JSON.parse(dictionaryString);
        const current = loadDictionary();
        const merged = mergeDictionaries(current, imported);

        saveDictionary(merged);

        modalBtn.innerText = 'Dicionário importado!';
        setTimeout(() => location.reload(), 700);
      } catch (e) {
        alert('Erro ao importar! JSON inválido: ' + e.message);
      }
    };
  }

  function showExport() {
    modalTitle.innerText = 'Exportar meu dicionário';
    const jsonString = JSON.stringify(loadDictionary());

    modalBody.innerHTML = `
      <textarea id="modal-textarea">${jsonString}</textarea>
      <span class="sendUs">
        Dica: salve esse JSON em algum lugar (Drive/Notas) para backup.
      </span>
      <button id="modal-btn">Copiar</button>
    `;

    const modalBtn = document.getElementById('modal-btn');

    modalBtn.onclick = async () => {
      const txt = document.getElementById('modal-textarea').value;
      try {
        await navigator.clipboard.writeText(txt);
        modalBtn.innerText = 'Copiado!';
        setTimeout(() => (modalBtn.innerText = 'Copiar'), 1000);
      } catch {
        // fallback
        document.getElementById('modal-textarea').select();
        document.execCommand('copy');
        modalBtn.innerText = 'Copiado!';
        setTimeout(() => (modalBtn.innerText = 'Copiar'), 1000);
      }
    };
  }

  importBtn.onclick = () => {
    showImport();
    modal.style.display = 'block';
  };

  exportBtn.onclick = () => {
    showExport();
    modal.style.display = 'block';
  };

  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = 'none';
  };
}
