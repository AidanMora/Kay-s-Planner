console.log("Kay's Planner loaded.");

// Optional dev banner (keep if you want)
const banner = document.createElement("div");
banner.textContent = "Kay's Planner Active";
banner.style.position = "fixed";
banner.style.bottom = "0";
banner.style.left = "0";
banner.style.background = "pink";
banner.style.padding = "8px";
banner.style.zIndex = "99999";
document.body.appendChild(banner);

// Prevent injecting twice if Google Calendar re-renders
if (!document.getElementById("kays-launcher-btn")) {
    // Launcher button (always available)
    const launcherBtn = document.createElement("button");
    launcherBtn.id = "kays-launcher-btn";
    launcherBtn.textContent = "Kay's Planner";
    document.body.appendChild(launcherBtn);

    const openPlanner = () => {
        // If already open, don't recreate
        if (document.getElementById("kays-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "kays-overlay";

        overlay.innerHTML = `
      <div id="kays-planner-popup" role="dialog" aria-modal="true">
        <div id="kays-planner-header">
          <h2 id="kays-planner-title">Kay’s Planner</h2>
          <button id="kays-planner-close" aria-label="Close">✕</button>
        </div>

        <div id="kays-planner-body">
          <div id="kays-input-row">
            <input id="kays-task-input" type="text" placeholder="Add a task…" />
            <button id="kays-add-btn">Add</button>
          </div>

          <ul id="kays-task-list"></ul>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        const popup = document.getElementById("kays-planner-popup");
        const header = document.getElementById("kays-planner-header");

        // Center it once (exact centering without CSS hacks)
        const centerPopup = () => {
            const rect = popup.getBoundingClientRect();
            popup.style.left = `${(window.innerWidth - rect.width) / 2}px`;
            popup.style.top = `${(window.innerHeight - rect.height) / 2}px`;
            popup.style.transform = "none";
        };
        centerPopup();

        // Drag logic + prevent "click outside to close" from firing after drag
        let isDragging = false;
        let didDrag = false;

        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;

        header.addEventListener("mousedown", (e) => {
            // Don't start a drag when clicking the close button
            if (e.target && e.target.id === "kays-planner-close") return;

            // Lock current position (prevents snap/jump)
            const rect = popup.getBoundingClientRect();
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.top}px`;
            popup.style.transform = "none";

            isDragging = true;
            didDrag = false;

            startX = e.clientX;
            startY = e.clientY;

            startLeft = rect.left;
            startTop = rect.top;

            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // mark that this interaction was a drag (so overlay click won't close it)
            if (Math.abs(dx) + Math.abs(dy) > 2) didDrag = true;

            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Keep it on-screen (basic bounds)
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
        });

        // Close on X
        document.getElementById("kays-planner-close").addEventListener("click", () => {
            overlay.remove();
        });

        // Close when clicking outside popup (but NOT right after dragging)
        overlay.addEventListener("click", (e) => {
            if (didDrag) {
                didDrag = false; // consume the drag-generated click
                return;
            }
            if (e.target === overlay) overlay.remove();
        });
    };

    // Open modal on launcher click
    launcherBtn.addEventListener("click", openPlanner);
}