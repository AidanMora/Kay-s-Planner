// Optional dev banner
const banner = document.createElement("div");
banner.textContent = "Kay's Planner Active";
banner.style.position = "fixed";
banner.style.bottom = "0";
banner.style.left = "0";
banner.style.background = "pink";
banner.style.padding = "8px";
banner.style.zIndex = "99999";
document.body.appendChild(banner);

// Prevent injecting twice
if (!document.getElementById("kays-launcher-btn")) {
    const launcherBtn = document.createElement("button");
    launcherBtn.id = "kays-launcher-btn";
    launcherBtn.textContent = "Kay's Planner";
    document.body.appendChild(launcherBtn);

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
          <div id="kays-nav-row">
            <button id="kays-taskCreation-btn">Create</button>
          </div>

          <div id="kays-view"></div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        const view = document.getElementById("kays-view");
        let tasks = await loadTasks();

        // Render list from tasks array
        const renderTasks = () => {
            if (!tasks.length) {
                view.innerHTML = `<p style="opacity:.7;">No tasks yet.</p>`;
                return;
            }

            const itemsHtml = [...tasks]
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .map(
                    (t) => `
            <li class="kays-task-item" data-id="${t.id}">
              <div class="kays-task-left">
                <input class="kays-task-checkbox" type="checkbox" ${t.completed ? "checked" : ""} />
                <span class="kays-task-title">${escapeHtml(t.title)}</span>
              </div>

              <div class="kays-task-actions">
                <button class="kays-edit-btn" type="button" aria-label="Edit">✎</button>
                <button class="kays-delete-btn" type="button" aria-label="Delete">✕</button>
              </div>
            </li>
          `
                )
                .join("");

            view.innerHTML = `<ul id="kays-task-list">${itemsHtml}</ul>`;
        };

        // Create/Edit form view
        const showTaskForm = (opts) => {
            const isEdit = opts?.mode === "edit";
            const t = opts?.task || null;

            view.innerHTML = `
        <h3 class="kays-section-title">${isEdit ? "Edit Task" : "Create Task"}</h3>

        <input id="newTitle" placeholder="Task title" value="${t ? escapeHtml(t.title) : ""}" />

        <div style="margin-top:10px;">
          <input type="datetime-local" id="dueDate" value="${t?.due ? escapeHtml(t.due) : ""}">
        </div>

        <div style="margin-top:10px;">
          <textarea id="descriptionBox" rows="5" cols="35" placeholder="Description">${t?.description ? escapeHtml(t.description) : ""}</textarea>
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

            view.querySelector("#backBtn")?.addEventListener("click", renderTasks);

            view.querySelector("#saveTaskBtn")?.addEventListener("click", async () => {
                const title = view.querySelector("#newTitle")?.value.trim();
                if (!title) return;

                const due = view.querySelector("#dueDate")?.value || "";
                const description = view.querySelector("#descriptionBox")?.value.trim() || "";
                const notes = view.querySelector("#freeNotes")?.value.trim() || "";
                const location = view.querySelector("#location")?.value.trim() || "";
                const url = view.querySelector("#urlField")?.value.trim() || "";

                if (isEdit && t) {
                    t.title = title;
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

                // Create new
                tasks.push({
                    id: makeId(),
                    title,
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

        // Event delegation: clicks (edit/delete)
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
        });

        // Event delegation: checkbox completion
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

        // Nav: Create
        document.getElementById("kays-taskCreation-btn")?.addEventListener("click", () => {
            showTaskForm({ mode: "create" });
        });

        // Default view on open
        renderTasks();

        // Drag & drop popup
        const popup = document.getElementById("kays-planner-popup");
        const header = document.getElementById("kays-planner-header");

        // Center popup
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

        // Close
        document.getElementById("kays-planner-close")?.addEventListener("click", () => overlay.remove());
    };

    launcherBtn.addEventListener("click", openPlanner);
}