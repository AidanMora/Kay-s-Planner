const banner = document.createElement("div");
banner.textContent = "Kay's Planner Active";
banner.style.position = "fixed";
banner.style.bottom = "0";
banner.style.left = "0";
banner.style.background = "pink";
banner.style.padding = "8px";
banner.style.zIndex = "99999";
document.body.appendChild(banner);

if (!document.getElementById("kays-launcher-btn")) {
    const launcherBtn = document.createElement("button");
    launcherBtn.id = "kays-launcher-btn";
    launcherBtn.textContent = "Kay's Planner";
    document.body.appendChild(launcherBtn);

    const CATEGORY_META = {
        work: { label: "Work", color: "#e74c3c" },
        personal: { label: "Personal", color: "#2ecc71" },
        school: { label: "School", color: "#3498db" },
        other: { label: "Other", color: "#9b59b6" },
    };

    const DEFAULT_CATEGORY = "personal";
    const KAYS_STORAGE_KEY = "kaysPlannerTasks";

    function loadTasks() {
        return new Promise((resolve) => {
            chrome.storage.local.get([KAYS_STORAGE_KEY], (result) => {
                resolve(Array.isArray(result[KAYS_STORAGE_KEY]) ? result[KAYS_STORAGE_KEY] : []);
            });
        });
    }

    function saveTasks(tasks) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [KAYS_STORAGE_KEY]: tasks }, () => resolve());
        });
    }

    function makeId() {
        return "t_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function safeCategory(cat) {
        return CATEGORY_META[cat] ? cat : DEFAULT_CATEGORY;
    }

    function formatDateTimeLocal(dt) {
        if (!dt) return "";
        try {
            const d = new Date(dt);
            if (isNaN(d.getTime())) return dt;
            return d.toLocaleString();
        } catch {
            return dt;
        }
    }

    const openPlanner = async () => {
        if (document.getElementById("kays-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "kays-overlay";

        overlay.innerHTML = `
      <div id="kays-planner-popup" role="dialog">
        <div id="kays-planner-header">
          <h2>Kay’s Planner</h2>
          <button id="kays-planner-close">✕</button>
        </div>

        <div id="kays-planner-body">
          <div id="kays-nav-row" style="display:flex; gap:8px; align-items:center;">
            <button id="kays-taskCreation-btn">Create</button>

            <div style="position:relative;">
              <button id="kays-filter-btn" type="button" style="display:flex; align-items:center; gap:8px;">
                <span style="opacity:.85;">Filter:</span>
                <span id="kays-filter-dot" style="width:10px; height:10px; border-radius:50%; background:#777; display:inline-block;"></span>
                <span id="kays-filter-label">All</span>
                <span style="opacity:.85;">▾</span>
              </button>

              <div id="kays-filter-menu" style="display:none; position:absolute; right:0; top:calc(100% + 6px); z-index:999999;"></div>
            </div>
          </div>

          <div id="kays-view"></div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        const view = document.getElementById("kays-view");
        const filterBtn = document.getElementById("kays-filter-btn");
        const filterLabel = document.getElementById("kays-filter-label");
        const filterDot = document.getElementById("kays-filter-dot");
        const filterMenu = document.getElementById("kays-filter-menu");

        let tasks = await loadTasks();
        let activeCategoryFilter = "all";

        const renderFilterMenu = () => {
            const rows = [];

            rows.push(`
        <button class="kays-filter-item" data-filter="all" type="button">
          <span class="kays-filter-dot" style="width:10px; height:10px; border-radius:50%; background:#777; display:inline-block;"></span>
          <span>All</span>
        </button>
      `);

            for (const [key, meta] of Object.entries(CATEGORY_META)) {
                rows.push(`
          <button class="kays-filter-item" data-filter="${escapeHtml(key)}" type="button">
            <span class="kays-filter-dot" style="width:10px; height:10px; border-radius:50%; background:${escapeHtml(meta.color)}; display:inline-block;"></span>
            <span>${escapeHtml(meta.label)}</span>
          </button>
        `);
            }

            filterMenu.innerHTML = `<div class="kays-filter-menu-inner">${rows.join("")}</div>`;
        };

        const closeFilterMenu = () => {
            filterMenu.style.display = "none";
        };

        const toggleFilterMenu = () => {
            filterMenu.style.display = filterMenu.style.display === "none" ? "block" : "none";
        };

        const renderTasks = () => {
            const filtered =
                activeCategoryFilter === "all"
                    ? tasks
                    : tasks.filter((t) => safeCategory(t.category) === activeCategoryFilter);

            if (!filtered.length) {
                const msg =
                    activeCategoryFilter === "all"
                        ? "No tasks yet."
                        : `No tasks in ${CATEGORY_META[activeCategoryFilter]?.label ?? "this category"}.`;
                view.innerHTML = `<p style="opacity:.7;">${escapeHtml(msg)}</p>`;
                return;
            }

            const sorted = [...filtered].sort((a, b) => {
                const aDone = !!a.completed;
                const bDone = !!b.completed;
                if (aDone !== bDone) return aDone ? 1 : -1;

                const au = a.updatedAt || 0;
                const bu = b.updatedAt || 0;
                if (bu !== au) return bu - au;

                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            const itemsHtml = sorted
                .map((t) => {
                    const cat = safeCategory(t.category);
                    const meta = CATEGORY_META[cat];
                    const dot = meta?.color ?? "#777";
                    const label = meta?.label ?? "Other";

                    return `
            <li class="kays-task-item" data-id="${t.id}">
              <div class="kays-task-left">
                <input class="kays-task-checkbox" type="checkbox" ${t.completed ? "checked" : ""} />
                <span class="kays-color-dot" title="${escapeHtml(label)}" style="width:10px; height:10px; border-radius:50%; background:${escapeHtml(dot)}; display:inline-block;"></span>
                <span class="kays-task-title">${escapeHtml(t.title)}</span>
              </div>

              <div class="kays-task-actions">
                <button class="kays-view-btn" type="button" aria-label="View Details">👁</button>
                <button class="kays-edit-btn" type="button" aria-label="Edit">✎</button>
                <button class="kays-delete-btn" type="button" aria-label="Delete">✕</button>
              </div>
            </li>
          `;
                })
                .join("");

            view.innerHTML = `<ul id="kays-task-list">${itemsHtml}</ul>`;
        };

        const setFilter = (filterValue) => {
            activeCategoryFilter = filterValue;

            if (filterValue === "all") {
                filterLabel.textContent = "All";
                if (filterDot) filterDot.style.background = "#777";
            } else {
                const meta = CATEGORY_META[filterValue];
                filterLabel.textContent = meta?.label ?? "All";
                if (filterDot) filterDot.style.background = meta?.color ?? "#777";
            }

            renderTasks();
        };

        const showTaskDetails = (t) => {
            const cat = safeCategory(t.category);
            const meta = CATEGORY_META[cat];
            const dot = meta?.color ?? "#777";
            const label = meta?.label ?? "Other";

            const due = formatDateTimeLocal(t.due);
            const description = (t.description || "").trim();
            const notes = (t.notes || "").trim();
            const location = (t.location || "").trim();
            const url = (t.url || "").trim();

            view.innerHTML = `
        <div class="kays-details">
          <h3 class="kays-section-title">Task Details</h3>

          <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
            <span style="width:12px; height:12px; border-radius:50%; background:${escapeHtml(dot)}; display:inline-block;"></span>
            <div style="font-weight:600;">${escapeHtml(t.title)}</div>
          </div>

          <div style="margin-top:10px; opacity:.9;">
            <div style="margin:6px 0;"><strong>Category:</strong> ${escapeHtml(label)}</div>
            <div style="margin:6px 0;"><strong>Completed:</strong> ${t.completed ? "Yes" : "No"}</div>
            <div style="margin:6px 0;"><strong>Due:</strong> ${escapeHtml(due || "—")}</div>
            <div style="margin:6px 0;"><strong>Location:</strong> ${escapeHtml(location || "—")}</div>
            <div style="margin:6px 0;"><strong>URL:</strong> ${
                url
                    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
                    : "—"
            }</div>
          </div>

          <div style="margin-top:12px;">
            <div style="font-size:12px; opacity:.75; margin-bottom:4px;">Description</div>
            <div style="white-space:pre-wrap; opacity:.95;">${escapeHtml(description || "—")}</div>
          </div>

          <div style="margin-top:12px;">
            <div style="font-size:12px; opacity:.75; margin-bottom:4px;">Notes</div>
            <div style="white-space:pre-wrap; opacity:.95;">${escapeHtml(notes || "—")}</div>
          </div>

          <div style="margin-top:14px; display:flex; gap:8px;">
            <button id="detailsBackBtn" type="button">Back</button>
          </div>
        </div>
      `;

            view.querySelector("#detailsBackBtn")?.addEventListener("click", renderTasks);
        };

        const showTaskForm = (opts) => {
            const isEdit = opts?.mode === "edit";
            const t = opts?.task || null;

            const currentCategory = safeCategory(t?.category || DEFAULT_CATEGORY);

            const categoryOptionsHtml = Object.entries(CATEGORY_META)
                .map(([key, meta]) => {
                    const selected = key === currentCategory ? "selected" : "";
                    return `<option value="${escapeHtml(key)}" ${selected}>${escapeHtml(meta.label)}</option>`;
                })
                .join("");

            const currentColor = CATEGORY_META[currentCategory]?.color ?? "#777";

            view.innerHTML = `
        <h3 class="kays-section-title">${isEdit ? "Edit Task" : "Create Task"}</h3>

        <input id="newTitle" placeholder="Task title" value="${t ? escapeHtml(t.title) : ""}" />

        <div style="margin-top:10px;">
          <label style="display:block; font-size:12px; opacity:.75; margin-bottom:4px;">Category / Color</label>

          <div style="display:flex; align-items:center; gap:10px;">
            <select id="categorySelect">
              ${categoryOptionsHtml}
            </select>

            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; opacity:.7;">Color:</span>
              <span id="categoryColorSwatch" style="width:14px; height:14px; border-radius:50%; background:${escapeHtml(
                currentColor
            )}; display:inline-block; border:1px solid rgba(0,0,0,0.15);"></span>
            </div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <input type="datetime-local" id="dueDate" value="${t?.due ? escapeHtml(t.due) : ""}">
        </div>

        <div style="margin-top:10px;">
          <textarea id="descriptionBox" rows="5" cols="35" placeholder="Description">${t?.description ? escapeHtml(
                t.description
            ) : ""}</textarea>
        </div>

        <div style="margin-top:10px;">
          <textarea id="freeNotes" rows="4" cols="24" placeholder="Notes">${t?.notes ? escapeHtml(t.notes) : ""}</textarea>
        </div>

        <div style="margin-top:10px;">
          <input id="location" placeholder="Location" value="${t?.location ? escapeHtml(t.location) : ""}">
        </div>

        <div style="margin-top:10px;">
          <input type="url" id="urlField" placeholder="URL" value="${t?.url ? escapeHtml(t.url) : ""}">
        </div>

        <div style="margin-top:10px; display:flex; gap:8px;">
          <button id="saveTaskBtn">${isEdit ? "Update" : "Save"}</button>
          <button id="backBtn">Back</button>
        </div>
      `;

            const categorySelect = view.querySelector("#categorySelect");
            const swatch = view.querySelector("#categoryColorSwatch");

            categorySelect?.addEventListener("change", () => {
                const cat = safeCategory(categorySelect.value);
                const newColor = CATEGORY_META[cat]?.color ?? "#777";
                if (swatch) swatch.style.background = newColor;
            });

            view.querySelector("#backBtn")?.addEventListener("click", renderTasks);

            view.querySelector("#saveTaskBtn")?.addEventListener("click", async () => {
                const title = view.querySelector("#newTitle")?.value.trim();
                if (!title) return;

                const category = safeCategory(view.querySelector("#categorySelect")?.value || DEFAULT_CATEGORY);

                const due = view.querySelector("#dueDate")?.value || "";
                const description = view.querySelector("#descriptionBox")?.value.trim() || "";
                const notes = view.querySelector("#freeNotes")?.value.trim() || "";
                const location = view.querySelector("#location")?.value.trim() || "";
                const url = view.querySelector("#urlField")?.value.trim() || "";

                if (isEdit && t) {
                    t.title = title;
                    t.category = category;
                    t.due = due;
                    t.description = description;
                    t.notes = notes;
                    t.location = location;
                    t.url = url;
                    t.updatedAt = Date.now();

                    await saveTasks(tasks);
                    renderTasks();
                    return;
                }

                tasks.push({
                    id: makeId(),
                    title,
                    category,
                    due,
                    description,
                    notes,
                    location,
                    url,
                    completed: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await saveTasks(tasks);
                renderTasks();
            });
        };

        view.addEventListener("click", async (e) => {
            const item = e.target.closest(".kays-task-item");
            if (!item) return;

            const id = item.getAttribute("data-id");
            const idx = tasks.findIndex((t) => t.id === id);
            if (idx === -1) return;

            if (e.target.closest(".kays-delete-btn")) {
                tasks.splice(idx, 1);
                await saveTasks(tasks);
                renderTasks();
                return;
            }

            if (e.target.closest(".kays-edit-btn")) {
                showTaskForm({ mode: "edit", task: tasks[idx] });
                return;
            }

            if (e.target.closest(".kays-view-btn")) {
                showTaskDetails(tasks[idx]);
                return;
            }
        });

        view.addEventListener("change", async (e) => {
            if (!e.target.classList.contains("kays-task-checkbox")) return;

            const item = e.target.closest(".kays-task-item");
            if (!item) return;

            const id = item.getAttribute("data-id");
            const idx = tasks.findIndex((t) => t.id === id);
            if (idx === -1) return;

            tasks[idx].completed = e.target.checked;
            tasks[idx].updatedAt = Date.now();
            await saveTasks(tasks);
        });

        document.getElementById("kays-taskCreation-btn")?.addEventListener("click", () => {
            showTaskForm({ mode: "create" });
            closeFilterMenu();
        });

        renderFilterMenu();

        filterBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFilterMenu();
        });

        filterMenu.addEventListener("click", (e) => {
            const btn = e.target.closest(".kays-filter-item");
            if (!btn) return;
            const val = btn.getAttribute("data-filter");
            if (!val) return;
            setFilter(val);
            closeFilterMenu();
        });

        document.addEventListener("click", (e) => {
            if (!overlay.contains(e.target)) return;
            if (e.target.closest("#kays-filter-btn")) return;
            if (e.target.closest("#kays-filter-menu")) return;
            closeFilterMenu();
        });

        setFilter("all");

        const popup = document.getElementById("kays-planner-popup");
        const header = document.getElementById("kays-planner-header");

        const rect = popup.getBoundingClientRect();
        popup.style.position = "fixed";
        popup.style.left = `${(window.innerWidth - rect.width) / 2}px`;
        popup.style.top = `${(window.innerHeight - rect.height) / 2}px`;
        popup.style.transform = "none";

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener("mousedown", (e) => {
            if (e.target.id === "kays-planner-close") return;

            const r = popup.getBoundingClientRect();
            offsetX = e.clientX - r.left;
            offsetY = e.clientY - r.top;

            isDragging = true;
            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            const r = popup.getBoundingClientRect();
            const maxLeft = window.innerWidth - r.width;
            const maxTop = window.innerHeight - r.height;

            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            popup.style.left = `${newLeft}px`;
            popup.style.top = `${newTop}px`;
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "auto";
        });

        document.getElementById("kays-planner-close")?.addEventListener("click", () => overlay.remove());
    };

    launcherBtn.addEventListener("click", openPlanner);
}