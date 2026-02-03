const panels = document.querySelectorAll(".panel");
const cards = document.querySelectorAll(".card");
const backButtons = document.querySelectorAll("[data-target]");
const parentToggle = document.getElementById("parentToggle");

const pdfInput = document.getElementById("pdfInput");
const pdfFrame = document.getElementById("pdfFrame");
const pdfNote = document.getElementById("pdfNote");
const pdfNoteList = document.getElementById("pdfNoteList");
const savePdfNote = document.getElementById("savePdfNote");
const highlightButtons = document.querySelectorAll("[data-highlight]");
const addBookmark = document.getElementById("addBookmark");

const subjectTabs = document.querySelectorAll(".tab");
const notesInput = document.getElementById("notesInput");
const emojiButtons = document.querySelectorAll("[data-emoji]");
const doodle = document.getElementById("doodle");
const clearDoodle = document.getElementById("clearDoodle");

const timeDisplay = document.getElementById("timeDisplay");
const progressBar = document.getElementById("progressBar");
const timerStatus = document.getElementById("timerStatus");
const startTimer = document.getElementById("startTimer");
const pauseTimer = document.getElementById("pauseTimer");
const resetTimer = document.getElementById("resetTimer");
const dayCap = document.getElementById("dayCap");
const dayMessage = document.getElementById("dayMessage");

const activityIndicator = document.getElementById("activityIndicator");
const activityText = document.getElementById("activityText");

const parentCode = document.getElementById("parentCode");
const parentAccess = document.getElementById("parentAccess");
const parentSummary = document.getElementById("parentSummary");
const parentTime = document.getElementById("parentTime");
const parentSubjects = document.getElementById("parentSubjects");

const STORAGE = {
  notes: "tempo-notes",
  pdfNotes: "tempo-pdf-notes",
  highlights: "tempo-highlights",
  bookmarks: "tempo-bookmarks",
  timer: "tempo-timer",
  activity: "tempo-activity",
};

const DAILY_LIMIT_MINUTES = 240;
const WORK_BLOCK = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const INACTIVITY_LIMIT = 90;
const FAMILY_CODE = "2510";

let currentSubject = "Francais";
let timerInterval = null;
let remaining = WORK_BLOCK;
let isRunning = false;
let session = { blockIndex: 1, isBreak: false };
let lastActivity = Date.now();
let workToday = 0;
let activeSubjects = new Set();

function showPanel(id) {
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
}

cards.forEach((card) =>
  card.addEventListener("click", () => showPanel(card.dataset.target))
);

backButtons.forEach((btn) => {
  if (btn.classList.contains("card")) return;
  btn.addEventListener("click", () => showPanel(btn.dataset.target));
});

parentToggle.addEventListener("click", () => showPanel("parents"));

function loadNotes() {
  const stored = JSON.parse(localStorage.getItem(STORAGE.notes) || "{}");
  notesInput.value = stored[currentSubject] || "";
}

function saveNotes() {
  const stored = JSON.parse(localStorage.getItem(STORAGE.notes) || "{}");
  stored[currentSubject] = notesInput.value;
  localStorage.setItem(STORAGE.notes, JSON.stringify(stored));
  markSubject(currentSubject);
}

subjectTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    subjectTabs.forEach((btn) => btn.classList.remove("active"));
    tab.classList.add("active");
    currentSubject = tab.dataset.subject;
    loadNotes();
  });
});

notesInput.addEventListener("input", saveNotes);

emojiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    notesInput.value += ` ${button.dataset.emoji} `;
    saveNotes();
  });
});

let drawing = false;
const ctx = doodle.getContext("2d");
ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.strokeStyle = "#7a7aff";

function startDraw(event) {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(event.offsetX, event.offsetY);
}

function draw(event) {
  if (!drawing) return;
  ctx.lineTo(event.offsetX, event.offsetY);
  ctx.stroke();
  markSubject(currentSubject);
}

function stopDraw() {
  drawing = false;
}

doodle.addEventListener("mousedown", startDraw);
// Touch support

doodle.addEventListener("mousemove", draw);
window.addEventListener("mouseup", stopDraw);
clearDoodle.addEventListener("click", () => {
  ctx.clearRect(0, 0, doodle.width, doodle.height);
  markSubject(currentSubject);
});

pdfInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  pdfFrame.src = url;
  markSubject("PDF");
});

function renderPdfNotes() {
  pdfNoteList.innerHTML = "";
  const notes = JSON.parse(localStorage.getItem(STORAGE.pdfNotes) || "[]");
  notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = `${note.time} — ${note.text}`;
    pdfNoteList.appendChild(li);
  });
}

savePdfNote.addEventListener("click", () => {
  const text = pdfNote.value.trim();
  if (!text) return;
  const notes = JSON.parse(localStorage.getItem(STORAGE.pdfNotes) || "[]");
  const entry = {
    text,
    time: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  notes.unshift(entry);
  localStorage.setItem(STORAGE.pdfNotes, JSON.stringify(notes));
  pdfNote.value = "";
  renderPdfNotes();
  markSubject("PDF");
});

highlightButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const highlights = JSON.parse(localStorage.getItem(STORAGE.highlights) || "[]");
    highlights.unshift({
      color: button.dataset.highlight,
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    localStorage.setItem(STORAGE.highlights, JSON.stringify(highlights));
    markSubject("PDF");
  });
});

addBookmark.addEventListener("click", () => {
  const bookmarks = JSON.parse(localStorage.getItem(STORAGE.bookmarks) || "[]");
  bookmarks.unshift(new Date().toLocaleTimeString("fr-FR"));
  localStorage.setItem(STORAGE.bookmarks, JSON.stringify(bookmarks));
  markSubject("PDF");
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function loadTimerState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE.timer) || "{}");
  if (saved.remaining) remaining = saved.remaining;
  if (saved.session) session = saved.session;
  updateTimerDisplay();
  updateDayCap();
}

function saveTimerState() {
  localStorage.setItem(
    STORAGE.timer,
    JSON.stringify({ remaining, session })
  );
}

function updateTimerDisplay() {
  timeDisplay.textContent = formatTime(remaining);
  const total = session.isBreak
    ? session.blockIndex === 3
      ? LONG_BREAK
      : SHORT_BREAK
    : WORK_BLOCK;
  progressBar.style.width = `${((total - remaining) / total) * 100}%`;
  timerStatus.textContent = session.isBreak
    ? "Pause douce"
    : `Bloc de travail ${session.blockIndex} sur 2 (25 min)`;
}

function updateDayCap() {
  dayCap.textContent = `Temps travaillé aujourd'hui : ${workToday} min / 240 min`;
  parentTime.textContent = `Temps de travail réel : ${workToday} min`;
}

function updateDayMessage() {
  if (workToday >= DAILY_LIMIT_MINUTES) {
    dayMessage.textContent =
      "Bravo 🎉 tu as atteint ton temps de travail pour aujourd'hui. Repose-toi.";
  } else {
    dayMessage.textContent = "";
  }
}

function tick() {
  if (!isRunning) return;
  if (workToday >= DAILY_LIMIT_MINUTES && !session.isBreak) {
    pauseSession("Cap atteint");
    updateDayMessage();
    return;
  }
  if (remaining > 0) {
    remaining -= 1;
    if (!session.isBreak) {
      workToday += 1 / 60;
      updateDayCap();
      updateDayMessage();
    }
    updateTimerDisplay();
    saveTimerState();
    return;
  }
  if (!session.isBreak) {
    session.isBreak = true;
    remaining = session.blockIndex === 2 ? LONG_BREAK : SHORT_BREAK;
  } else {
    session.isBreak = false;
    session.blockIndex = session.blockIndex === 2 ? 1 : 2;
    remaining = WORK_BLOCK;
  }
  updateTimerDisplay();
  saveTimerState();
}

function startSession() {
  if (isRunning) return;
  if (workToday >= DAILY_LIMIT_MINUTES) {
    updateDayMessage();
    return;
  }
  isRunning = true;
  timerInterval = setInterval(tick, 1000);
}

function pauseSession(reason) {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  if (reason) {
    activityText.textContent = reason;
  }
}

function resetSession() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  session = { blockIndex: 1, isBreak: false };
  remaining = WORK_BLOCK;
  updateTimerDisplay();
  saveTimerState();
}

startTimer.addEventListener("click", startSession);
pauseTimer.addEventListener("click", () => pauseSession("Pause en cours."));
resetTimer.addEventListener("click", resetSession);

function updateActivity(status) {
  if (status === "active") {
    activityIndicator.textContent = "🙂";
    activityText.textContent = "Tout va bien, tu es dans ton rythme.";
  }
  if (status === "idle") {
    activityIndicator.textContent = "🫧";
    activityText.textContent = "On dirait que tu fais une pause 🙂";
  }
  if (status === "away") {
    activityIndicator.textContent = "🧭";
    activityText.textContent = "Tu es peut-être sur un autre onglet.";
  }
}

function registerActivity() {
  lastActivity = Date.now();
  if (isRunning) updateActivity("active");
}

["mousemove", "keydown", "scroll", "click"].forEach((eventName) => {
  window.addEventListener(eventName, registerActivity);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseSession("Tu es peut-être sur un autre onglet.");
    updateActivity("away");
  }
});

setInterval(() => {
  const diff = (Date.now() - lastActivity) / 1000;
  if (diff > INACTIVITY_LIMIT && isRunning) {
    pauseSession("On dirait que tu fais une pause 🙂");
    updateActivity("idle");
  }
}, 4000);

function markSubject(name) {
  activeSubjects.add(name);
  parentSubjects.textContent = `Matières travaillées : ${
    activeSubjects.size ? Array.from(activeSubjects).join(", ") : "-"
  }`;
}

function loadDailyData() {
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem(STORAGE.activity) || "{}");
  if (stored.date === today) {
    workToday = stored.workToday || 0;
    activeSubjects = new Set(stored.subjects || []);
  } else {
    workToday = 0;
    activeSubjects = new Set();
    localStorage.setItem(
      STORAGE.activity,
      JSON.stringify({ date: today, workToday: 0, subjects: [] })
    );
  }
  updateDayCap();
  parentSubjects.textContent = `Matières travaillées : ${
    activeSubjects.size ? Array.from(activeSubjects).join(", ") : "-"
  }`;
}

function saveDailyData() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(
    STORAGE.activity,
    JSON.stringify({
      date: today,
      workToday: Math.round(workToday),
      subjects: Array.from(activeSubjects),
    })
  );
}

parentAccess.addEventListener("click", () => {
  if (parentCode.value === FAMILY_CODE) {
    parentSummary.classList.remove("hidden");
  } else {
    parentSummary.classList.add("hidden");
  }
});

window.addEventListener("beforeunload", saveDailyData);

loadNotes();
renderPdfNotes();
loadDailyData();
loadTimerState();
updateTimerDisplay();
updateDayMessage();
