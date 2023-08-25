const request = indexedDB.open("TodoDB", 1);

let db;

request.onsuccess = (event) => {
    db = event.target.result;
    loadTasks();
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    const objectStore = db.createObjectStore("tasks", {
        keyPath: "id",
        autoIncrement: true,
    });
    objectStore.createIndex("done", "done", { unique: false });
    objectStore.createIndex("timestamp", "timestamp", { unique: false });
};

function addTask() {
    const taskInput = document.getElementById("taskInput");
    const taskText = taskInput.value.trim();
    if (taskText === "") return;

    const task = {
        text: taskText,
        done: false,
        timestamp: Date.now(),
    };

    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.add(task);

    taskInput.value = "";
    loadTasks();
}

function loadTasks() {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    const objectStore = db.transaction("tasks").objectStore("tasks");
    objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const task = cursor.value;
            const li = document.createElement("li");
            const timeLeft = task.dueTime
                ? (task.dueTime - Date.now()) / 1000
                : 0;
            const formattedTime =
                timeLeft > 0 ? formatTime(timeLeft) : "Expired";
            li.innerHTML = `
                            <input type="checkbox" ${task.done ? "checked" : ""} onchange="toggleDone(${task.id}, this)">
                            <span id="taskText-${task.id}">${task.text}</span>
                            <input type="datetime-local" id="dueTime-${task.id}" onchange="setDueTime(${task.id}, this)" ${task.dueTime ? `value="${formatDate(task.dueTime)}"` : ""}>
                            <span id="tine-${task.id}">Time left: ${formattedTime}</span>
                            <div>
                                <button onclick="editTask(${task.id})">Edit</button>
                                <button onclick="removeTask(${task.id})">Remove</button>
                            </div>
                `;
            taskList.appendChild(li);
            cursor.continue();
        }
    };
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = parseInt(seconds % 60);
    if (minutes == 0) return `${remainingSeconds}s`
    else if (hours == 0) return `${minutes}m ${remainingSeconds}s`
    else return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toggleDone(taskId, checkbox) {
    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.get(taskId).onsuccess = (event) => {
        const task = event.target.result;
        task.done = checkbox.checked;
        objectStore.put(task);
        loadTasks();
    };
}

function removeTask(taskId) {
    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.delete(taskId);
    loadTasks();
}

function editTask(taskId) {
    const taskTextSpan = document.getElementById(`taskText-${taskId}`);
    const newText = prompt("Edit task:", taskTextSpan.textContent);

    if (newText !== null && newText.trim() !== "") {
        const transaction = db.transaction("tasks", "readwrite");
        const objectStore = transaction.objectStore("tasks");
        objectStore.get(taskId).onsuccess = (event) => {
            const task = event.target.result;
            task.text = newText;
            objectStore.put(task);
            taskTextSpan.textContent = newText;
        };
    }
}

function setDueTime(taskId, input) {
    const dueTime = input.valueAsNumber - 1000 * 60 * 330;
    if (!isNaN(dueTime)) {
        const transaction = db.transaction("tasks", "readwrite");
        const objectStore = transaction.objectStore("tasks");
        objectStore.get(taskId).onsuccess = (event) => {
            const task = event.target.result;
            task.dueTime = dueTime;
            objectStore.put(task);
            loadTasks();
        };
    }
}

function checkDueTasks() {
    const currentTime = Date.now();
    const objectStore = db.transaction("tasks", "readwrite").objectStore("tasks");
    objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const task = cursor.value;
            const timeLeft = task.dueTime ? (task.dueTime - Date.now()) / 1000 : 0;
            const formattedTime = timeLeft > 0 ? formatTime(timeLeft) : "Expired";
            const taskTextSpan = document.getElementById(`tine-${task.id}`);
            taskTextSpan.textContent = `Time left: ${formattedTime}`
            if (!task.done && task.dueTime <= currentTime) {
                const confirmed = confirm(
                    `Task "${task.text}" is due now!\nMark as done?`
                );
                if (confirmed) {
                    task.done = true;
                    objectStore.put(task);
                    loadTasks();
                }
            }
            cursor.continue();
        }
    };
}

setInterval(checkDueTasks, 1000); // Check for due tasks every second