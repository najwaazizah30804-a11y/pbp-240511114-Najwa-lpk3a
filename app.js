// ===== STATE =====
const STORAGE_KEY = "todos";
const MUTE_KEY = "todos-muted";

function muatTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => ({
      id: Number(item.id) || Date.now() + idx,
      teks: String(item.teks ?? ""),
      selesai: Boolean(item.selesai),
      prioritas: ["penting", "biasa", "santai"].includes(item.prioritas)
        ? item.prioritas
        : "biasa"
    }));
  } catch {
    return [];
  }
}

let todos = muatTodos();
let filterAktif = "semua";
let muted = localStorage.getItem(MUTE_KEY) === "true";
let editingId = null;
let audioCtx = null;

const PRIORITAS_META = {
  penting: { label: "🔥 Penting", className: "sticker-penting" },
  biasa: { label: "⭐ Biasa", className: "sticker-biasa" },
  santai: { label: "🌱 Santai", className: "sticker-santai" }
};

// ===== DOM ELEMENTS =====
const form = document.querySelector("#form-todo");
const input = document.querySelector("#input-todo");
const list = document.querySelector("#list-todo");
const stats = document.querySelector("#stats");
const btnClearDone = document.querySelector("#btn-clear-done");
const btnMute = document.querySelector("#btn-mute");
const filterButtons = document.querySelectorAll(".filter-btn");
const progressText = document.querySelector("#progress-text");
const progressBarFill = document.querySelector("#progress-bar-fill");
const todoCard = document.querySelector("#todo-card");

// ===== AUDIO & CONFETTI =====
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playPopSound() {
  if (muted) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // Abaikan jika browser memblokir audio
  }
}

function triggerConfetti() {
  if (prefersReducedMotion()) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999"
  });
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const colors = ["#ff8ab5", "#cdb4ff", "#98ebca", "#ffd875", "#ff9e8a"];
  const particles = Array.from({ length: 42 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    const speed = 5 + Math.random() * 8;
    return {
      x: w * (0.35 + Math.random() * 0.3),
      y: h * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      isHeart: Math.random() < 0.35
    };
  });

  const start = performance.now();
  const duration = 1200;

  function drawHeart(c, size) {
    const s = size * 0.55;
    c.beginPath();
    c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s, -s * 0.4, -s * 1.4, s * 0.6, 0, s * 1.3);
    c.bezierCurveTo(s * 1.4, s * 0.6, s, -s * 0.4, 0, s * 0.35);
    c.fill();
  }

  function frame(now) {
    const elapsed = now - start;
    const t = elapsed / duration;
    if (t >= 1) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, w, h);
    const alpha = t > 0.65 ? Math.max(0, 1 - (t - 0.65) / 0.35) : 1;

    for (const p of particles) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.isHeart) {
        drawHeart(ctx, p.size);
      } else {
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
      }
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ===== FUNCTIONS =====
function simpan() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function updateMuteUI() {
  btnMute.textContent = muted ? "🔇" : "🔊";
  btnMute.setAttribute("aria-pressed", String(muted));
  btnMute.setAttribute("aria-label", muted ? "Nyalakan suara efek" : "Matikan suara efek");
  btnMute.title = muted ? "Suara efek dimatikan" : "Suara efek aktif";
}

function getFilteredTodos() {
  if (filterAktif === "aktif") return todos.filter((t) => !t.selesai);
  if (filterAktif === "selesai") return todos.filter((t) => t.selesai);
  return todos;
}

function publishStats() {
  const total = todos.length;
  const selesai = todos.filter((t) => t.selesai).length;
  const belum = total - selesai;
  const pct = total === 0 ? 0 : Math.round((selesai / total) * 100);

  stats.textContent = `${belum} tugas belum selesai`;
  if (progressText) {
    progressText.textContent = `${pct}% selesai (${selesai}/${total})`;
  }
  if (progressBarFill) {
    progressBarFill.style.width = `${pct}%`;
  }

  btnClearDone.textContent = `Hapus yang selesai (${selesai})`;
  btnClearDone.disabled = selesai === 0;

  window.todoStats = { total, selesai, belum };
  document.dispatchEvent(
    new CustomEvent("todos:changed", { detail: window.todoStats })
  );
}

function startInlineEdit(li, todo) {
  if (editingId === todo.id) return;
  editingId = todo.id;

  const span = li.querySelector("span.teks");
  if (!span) return;

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = todo.teks;
  editInput.maxLength = 140;
  editInput.setAttribute("aria-label", "Edit teks tugas");

  span.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  let finished = false;

  const commit = (shouldSave) => {
    if (finished) return;
    finished = true;
    editingId = null;

    const trimmed = editInput.value.trim();
    if (shouldSave && trimmed && trimmed !== todo.teks) {
      editTodo(todo.id, trimmed);
    } else {
      render();
    }
  };

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      commit(false);
    }
  });

  editInput.addEventListener("blur", () => {
    commit(true);
  });
}

function render(baruDitambahId = null) {
  list.innerHTML = "";
  const visible = getFilteredTodos();

  if (todos.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    const span = document.createElement("span");
    span.className = "teks";
    span.textContent = "Belum ada tugas. Tambahkan! 🐾";
    emptyLi.appendChild(span);
    list.appendChild(emptyLi);
    publishStats();
    return;
  }

  if (visible.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    const span = document.createElement("span");
    span.className = "teks";
    span.textContent =
      filterAktif === "aktif"
        ? "Semua tugas sudah beres! Keren 🎉"
        : "Belum ada tugas yang selesai nih 🌸";
    emptyLi.appendChild(span);
    list.appendChild(emptyLi);
    publishStats();
    return;
  }

  const allowReorder = filterAktif === "semua";

  visible.forEach((todo) => {
    const li = document.createElement("li");
    li.dataset.id = String(todo.id);
    li.dataset.prioritas = todo.prioritas || "biasa";
    if (todo.selesai) li.classList.add("selesai");
    if (baruDitambahId === todo.id) li.classList.add("masuk");

    if (allowReorder) {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "drag-handle";
      handle.dataset.id = String(todo.id);
      handle.textContent = "⠿";
      handle.title = "Seret atau tekan Panah Atas/Bawah untuk ubah urutan";
      handle.setAttribute(
        "aria-label",
        `Urutkan tugas "${todo.teks}", tekan panah atas atau bawah`
      );
      li.appendChild(handle);
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-check";
    checkbox.checked = todo.selesai;
    checkbox.dataset.id = String(todo.id);
    checkbox.setAttribute(
      "aria-label",
      `Tandai "${todo.teks}" ${todo.selesai ? "belum selesai" : "selesai"}`
    );
    li.appendChild(checkbox);

    const body = document.createElement("div");
    body.className = "todo-body";

    const meta = document.createElement("div");
    meta.className = "todo-meta";
    const pMeta = PRIORITAS_META[todo.prioritas] || PRIORITAS_META.biasa;
    const sticker = document.createElement("span");
    sticker.className = `sticker-tag ${pMeta.className}`;
    sticker.textContent = pMeta.label;
    meta.appendChild(sticker);

    const spanTeks = document.createElement("span");
    spanTeks.className = "teks";
    spanTeks.textContent = todo.teks;
    spanTeks.title = "Klik ganda untuk mengedit";

    body.appendChild(meta);
    body.appendChild(spanTeks);
    li.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-btn";
    editBtn.dataset.id = String(todo.id);
    editBtn.textContent = "✏️";
    editBtn.title = "Edit tugas";
    editBtn.setAttribute("aria-label", `Edit tugas "${todo.teks}"`);

    const hapusBtn = document.createElement("button");
    hapusBtn.type = "button";
    hapusBtn.className = "hapus";
    hapusBtn.dataset.id = String(todo.id);
    hapusBtn.textContent = "Hapus";
    hapusBtn.setAttribute("aria-label", `Hapus tugas "${todo.teks}"`);

    actions.appendChild(editBtn);
    actions.appendChild(hapusBtn);
    li.appendChild(actions);

    list.appendChild(li);
  });

  publishStats();
}

function tambahTodo(teks, prioritas = "biasa") {
  const clean = teks.trim();
  if (!clean) return;

  const id = Date.now() + Math.floor(Math.random() * 100);
  todos.push({
    id,
    teks: clean,
    selesai: false,
    prioritas: ["penting", "biasa", "santai"].includes(prioritas) ? prioritas : "biasa"
  });
  simpan();
  render(id);
}

function hapusTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  simpan();
  render();
}

function toggleSelesai(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const jadiSelesai = !todo.selesai;
  todo.selesai = jadiSelesai;
  simpan();
  render();

  if (jadiSelesai) {
    playPopSound();
    triggerConfetti();
    const allDone = todos.length > 0 && todos.every((t) => t.selesai);
    document.dispatchEvent(
      new CustomEvent("todo:completed", { detail: { id, allDone } })
    );
  }
}

function editTodo(id, teksBaru) {
  const clean = teksBaru.trim();
  if (!clean) {
    render();
    return;
  }
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.teks = clean;
    simpan();
  }
  render();
}

function hapusSelesai() {
  todos = todos.filter((t) => !t.selesai);
  simpan();
  render();
}

function pindahTodo(id, indexBaru) {
  const oldIndex = todos.findIndex((t) => t.id === id);
  if (oldIndex === -1) return;
  const clamped = Math.max(0, Math.min(todos.length - 1, indexBaru));
  if (oldIndex === clamped) return;

  const [item] = todos.splice(oldIndex, 1);
  todos.splice(clamped, 0, item);
  simpan();
  render();
}

// ===== POINTER DRAG & DROP REORDER =====
let dragState = null;

list.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".drag-handle");
  if (!handle || filterAktif !== "semua") return;
  if (e.button !== 0 && e.pointerType === "mouse") return;

  const li = handle.closest("li");
  if (!li) return;

  const items = Array.from(list.querySelectorAll("li[data-id]"));
  const startIndex = items.indexOf(li);
  if (startIndex === -1) return;

  e.preventDefault();
  handle.setPointerCapture(e.pointerId);

  const rects = items.map((el) => el.getBoundingClientRect());
  dragState = {
    id: Number(li.dataset.id),
    pointerId: e.pointerId,
    handle,
    li,
    startY: e.clientY,
    startIndex,
    targetIndex: startIndex,
    items,
    midpoints: rects.map((r) => r.top + r.height / 2)
  };

  li.classList.add("sedang-geser");
});

list.addEventListener("pointermove", (e) => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const dy = e.clientY - dragState.startY;
  dragState.li.style.transform = `translateY(${dy}px) scale(1.02)`;

  const currentCenter = dragState.midpoints[dragState.startIndex] + dy;
  let newIndex = dragState.startIndex;
  for (let i = 0; i < dragState.midpoints.length; i++) {
    if (i < dragState.startIndex && currentCenter < dragState.midpoints[i]) {
      newIndex = Math.min(newIndex, i);
    } else if (i > dragState.startIndex && currentCenter > dragState.midpoints[i]) {
      newIndex = Math.max(newIndex, i);
    }
  }

  dragState.targetIndex = newIndex;
  dragState.items.forEach((el, idx) => {
    el.classList.toggle("drop-target", idx === newIndex && idx !== dragState.startIndex);
  });
});

function finishDrag(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const { id, li, targetIndex, startIndex, items, handle, pointerId } = dragState;
  try {
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
  } catch {
    // Abaikan jika capture sudah dilepas
  }

  li.classList.remove("sedang-geser");
  li.style.transform = "";
  items.forEach((el) => el.classList.remove("drop-target"));
  dragState = null;

  if (targetIndex !== startIndex) {
    pindahTodo(id, targetIndex);
  }
}

list.addEventListener("pointerup", finishDrag);
list.addEventListener("pointercancel", finishDrag);

// Keyboard reorder pada drag handle
list.addEventListener("keydown", (e) => {
  const handle = e.target.closest(".drag-handle");
  if (!handle || filterAktif !== "semua") return;
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

  e.preventDefault();
  const id = Number(handle.dataset.id);
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const nextIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= todos.length) return;

  pindahTodo(id, nextIdx);
  const nextHandle = list.querySelector(`.drag-handle[data-id="${id}"]`);
  if (nextHandle) nextHandle.focus();
});

// ===== EVENTS =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const selectedRadio = form.querySelector('input[name="prioritas"]:checked');
    const prioritas = selectedRadio ? selectedRadio.value : "biasa";
    tambahTodo(input.value, prioritas);
    input.value = "";
    input.focus();
  }
});

list.addEventListener("change", (e) => {
  if (e.target.type === "checkbox") {
    toggleSelesai(Number(e.target.dataset.id));
  }
});

list.addEventListener("click", (e) => {
  const hapusBtn = e.target.closest(".hapus");
  if (hapusBtn) {
    const id = Number(hapusBtn.dataset.id);
    const li = hapusBtn.closest("li");
    if (!li || prefersReducedMotion()) {
      hapusTodo(id);
      return;
    }

    li.classList.add("keluar");
    let done = false;
    const removeNow = () => {
      if (done) return;
      done = true;
      hapusTodo(id);
    };
    li.addEventListener("animationend", removeNow, { once: true });
    setTimeout(removeNow, 260);
    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const id = Number(editBtn.dataset.id);
    const li = editBtn.closest("li");
    const todo = todos.find((t) => t.id === id);
    if (li && todo) startInlineEdit(li, todo);
  }
});

list.addEventListener("dblclick", (e) => {
  const span = e.target.closest("span.teks");
  if (!span) return;
  const li = span.closest("li[data-id]");
  if (!li) return;
  const id = Number(li.dataset.id);
  const todo = todos.find((t) => t.id === id);
  if (todo) startInlineEdit(li, todo);
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterAktif = btn.dataset.filter || "semua";
    filterButtons.forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
    render();
  });
});

btnClearDone.addEventListener("click", () => {
  hapusSelesai();
});

btnMute.addEventListener("click", () => {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, String(muted));
  updateMuteUI();
  if (!muted) playPopSound();
});

// Subtle 3D perspective tilt on desktop pointer hover (max 4 deg)
if (
  todoCard &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !prefersReducedMotion()
) {
  let tiltRaf = null;
  todoCard.addEventListener("pointermove", (e) => {
    if (dragState) return;
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      const rect = todoCard.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const rotY = (nx * 3.2).toFixed(2);
      const rotX = (-ny * 3.2).toFixed(2);
      todoCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
  });

  todoCard.addEventListener("pointerleave", () => {
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    todoCard.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

// ===== INIT =====
updateMuteUI();
render();
