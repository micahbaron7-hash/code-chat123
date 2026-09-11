const socket = io();

const joinScreen = document.getElementById("joinScreen");
const chatScreen = document.getElementById("chatScreen");
const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");
const joinButton = document.getElementById("joinButton");
const joinError = document.getElementById("joinError");
const roomTitle = document.getElementById("roomTitle");
const onlineCount = document.getElementById("onlineCount");
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const leaveButton = document.getElementById("leaveButton");

joinButton.addEventListener("click", join);

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    join();
  }
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    join();
  }
});

function join() {
  joinError.textContent = "";

  const name = nameInput.value.trim();
  const code = codeInput.value.trim();

  if (!name || !code) {
    joinError.textContent = "Enter both a display name and a chat code.";
    return;
  }

  socket.emit("joinRoom", {
    name,
    code
  });
}

socket.on("joinError", (error) => {
  joinError.textContent = error;
});

socket.on("joined", ({ code }) => {
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  roomTitle.textContent = `Code: ${code}`;

  messages.innerHTML = "";

  messageInput.focus();
});

function displayMessage(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "message";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${message.name} • ${message.time}`;

  const body = document.createElement("div");
  body.className = "text";
  body.textContent = message.text;

  wrapper.appendChild(meta);
  wrapper.appendChild(body);

  messages.appendChild(wrapper);
}

socket.on("messageHistory", (history) => {
  messages.innerHTML = "";

  for (const message of history) {
    displayMessage(message);
  }

  messages.scrollTop = messages.scrollHeight;
});

socket.on("message", (message) => {
  displayMessage(message);

  messages.scrollTop = messages.scrollHeight;
});

socket.on("systemMessage", (text) => {
  const item = document.createElement("div");

  item.className = "system";
  item.textContent = text;

  messages.appendChild(item);

  messages.scrollTop = messages.scrollHeight;
});

socket.on("userCount", (count) => {
  onlineCount.textContent =
    `${count} ${count === 1 ? "person" : "people"} online`;
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = messageInput.value.trim();

  if (!text) {
    return;
  }

  socket.emit("sendMessage", text);

  messageInput.value = "";
  messageInput.focus();
});

leaveButton.addEventListener("click", () => {
  window.location.reload();
});
