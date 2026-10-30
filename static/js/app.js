const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("file-input");
const chat = document.getElementById("chat");
const emptyState = document.getElementById("empty-state");
const docName = document.getElementById("doc-name");
const docPages = document.getElementById("doc-pages");
const docChunks = document.getElementById("doc-chunks");
const docDot = document.getElementById("doc-dot");
const statusEl = document.getElementById("status");
const composer = document.getElementById("composer");
const questionInput = document.getElementById("question-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");

let isBusy = false;

function setStatus(text, busy = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("busy", busy);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderText(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function addMessage(role, text, sources = []) {
  if (emptyState) emptyState.style.display = "none";

  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = renderText(text);

  if (sources.length) {
    const src = document.createElement("div");
    src.className = "sources";
    sources.forEach((page) => {
      const tag = document.createElement("span");
      tag.className = "source-tag";
      tag.textContent = `Page ${page}`;
      src.appendChild(tag);
    });
    bubble.appendChild(src);
  }

  msg.append(avatar, bubble);
  chat.appendChild(msg);
  scrollToBottom();
  return bubble;
}

function addTyping() {
  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.id = "typing-msg";
  msg.innerHTML =
    '<div class="avatar">AI</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  chat.appendChild(msg);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById("typing-msg");
  if (el) el.remove();
}

/* ---------- Upload ---------- */
async function uploadFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("Only PDF files are allowed");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  setStatus("Processing PDF…", true);
  addMessage("ai", `Uploading and indexing **${file.name}** …`);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed.");

    docName.textContent = data.document.name;
    docPages.textContent = data.document.pages;
    docChunks.textContent = data.document.chunks;
    docDot.classList.add("ready");
    setStatus("Ready");
    addMessage("ai", "Document indexed. Ask me anything about it.");
  } catch (err) {
    docDot.classList.remove("ready");
    setStatus("Error");
    addMessage("ai", `⚠️ ${err.message}`);
  }
}

/* ---------- Chat ---------- */
async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || isBusy) return;

  if (docDot && !docDot.classList.contains("ready")) {
    addMessage("ai", "Please upload a PDF first.");
    return;
  }

  addMessage("user", question);
  questionInput.value = "";
  isBusy = true;
  sendBtn.disabled = true;
  setStatus("Thinking…", true);
  addTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    removeTyping();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    addMessage("ai", data.answer, data.sources || []);
    setStatus("Ready");
  } catch (err) {
    removeTyping();
    addMessage("ai", `⚠️ ${err.message}`);
    setStatus("Error");
  } finally {
    isBusy = false;
    sendBtn.disabled = false;
    questionInput.focus();
  }
}

/* ---------- Clear ---------- */
async function clearSession() {
  await fetch("/clear", { method: "POST" });
  chat.querySelectorAll(".msg").forEach((m) => m.remove());
  if (emptyState) emptyState.style.display = "";
  docName.textContent = "No document loaded";
  docPages.textContent = "0";
  docChunks.textContent = "0";
  docDot.classList.remove("ready");
  setStatus("Ready");
}

/* ---------- Events ---------- */
uploadZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => uploadFile(e.target.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  uploadZone.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  uploadZone.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
  })
);
uploadZone.addEventListener("drop", (e) => uploadFile(e.dataTransfer.files[0]));

composer.addEventListener("submit", (e) => {
  e.preventDefault();
  sendQuestion();
});

clearBtn.addEventListener("click", clearSession);

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    questionInput.value = chip.textContent;
    sendQuestion();
  })
);
