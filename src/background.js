chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CREATE_EVENT") {
        createCalendarEvent(request.task)
            .then(event => sendResponse({ success: true, event }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // required for async response
    }
});

async function getTokenInteractive() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || "No token"));
            } else {
                resolve(token);
            }
        });
    });
}

async function createCalendarEvent(task) {
    const token = await getTokenInteractive();

    const event = {
        summary: task.title,
        description: task.description || "",
        start: { dateTime: task.start },
        end: { dateTime: task.end }
    };

    const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(event)
        }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to create event");
    }

    return data;
}