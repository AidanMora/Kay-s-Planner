// console.log("Kay's Planner loaded.");

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

    const openPlanner = () => {

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
            <button id="kays-viewTasks-btn">View All</button>
            <button id="kays-taskCreation-btn">Create</button>
          </div>

          <div id="kays-view"></div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);
        const view = document.getElementById("kays-view");

        const showHomeView = () => {
            view.innerHTML = `
        <div style="margin-top:12px; color:white;">
          Choose an option above.
        </div>
      `;
        };

        const showCreateView = () => {
            view.innerHTML = `
        <h3 class="kays-section-title">Create Task</h3>
        <input id="newTitle" placeholder="Task title" />
        <div style="margin-top:10px; display:flex; gap:8px;">
            <input type="datetime-local" id="dueDate" >
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
            <textarea id="descriptionBox" name="descriptionBox" rows="5" cols="35" placeholder="Description"> </textarea><br><br>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
           <textarea id="freeNotes" name="freeNotes" rows="4" cols="24" placeholder="Notes" ></textarea><br><br>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
            <input id="location" placeholder="Location" >
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
            <input type="url" id="urlField" placeholder="URL">
        </div>
        
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button id="saveTaskBtn">Save</button>
          <button id="backBtn">Back</button>
        </div>
      `;

            document.getElementById("backBtn").addEventListener("click", showHomeView);

            document.getElementById("saveTaskBtn").addEventListener("click", () => {
                const title = document.getElementById("newTitle").value.trim();
                if (!title) return;

                console.log("Saving:", title);
                showHomeView();
            });
        };

        // ✅ DROP-IN FIX: repaired showViewAll() (your version had stray HTML outside the template string)
        const showViewAll = () => {
            view.innerHTML = `
        <h3 class="kays-section-title">All Tasks</h3>

        <ul id="kays-task-list">
          <li class="kays-task-item">
            <div class="kays-task-left">
              <input class="kays-task-checkbox" type="checkbox" />
              <span class="kays-task-title">Example Task 1</span>
            </div>
            <button class="kays-delete-btn" type="button" aria-label="Delete">✕</button>
          </li>

          <li class="kays-task-item">
            <div class="kays-task-left">
              <input class="kays-task-checkbox" type="checkbox" />
              <span class="kays-task-title">Example Task 2</span>
            </div>
            <button class="kays-delete-btn" type="button" aria-label="Delete">✕</button>
          </li>
        </ul>

        <div class="kays-footer-row">
          <button id="backBtn" class="kays-secondary-btn" type="button">Back</button>
        </div>
      `;

            // wire delete buttons
            document.querySelectorAll(".kays-delete-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    btn.closest(".kays-task-item")?.remove();
                });
            });

            document.getElementById("backBtn").addEventListener("click", showHomeView);
        };

        document.getElementById("kays-taskCreation-btn").addEventListener("click", showCreateView);
        document.getElementById("kays-viewTasks-btn").addEventListener("click", showViewAll);

        showHomeView();

        const popup = document.getElementById("kays-planner-popup");
        const header = document.getElementById("kays-planner-header");

        // Center popup
        const rect = popup.getBoundingClientRect();
        popup.style.position = "fixed";
        popup.style.left = `${(window.innerWidth - rect.width) / 2}px`;
        popup.style.top = `${(window.innerHeight - rect.height) / 2}px`;
        popup.style.transform = "none";

        // DRAG & DROP
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener("mousedown", (e) => {
            if (e.target.id === "kays-planner-close") return;

            const rect = popup.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            isDragging = true;
            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            const rect = popup.getBoundingClientRect();
            const maxLeft = window.innerWidth - rect.width;
            const maxTop = window.innerHeight - rect.height;

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
        document.getElementById("kays-planner-close")
            .addEventListener("click", () => overlay.remove());
    };

    launcherBtn.addEventListener("click", openPlanner);
}