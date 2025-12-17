# 🚀 IPC Debugger – Inter-Process Communication Monitor

## 📌 Project Overview
IPC Debugger is a web-based monitoring and visualization tool designed to **simulate and analyze Inter-Process Communication (IPC)** mechanisms used in Operating Systems.

The project visually demonstrates how processes communicate using **pipes, sockets, message queues, shared memory, and signals** in a real-time, interactive dashboard.

This project is developed as part of an **Operating Systems academic project** to clearly represent theoretical OS concepts using practical implementation.

---

## 🎯 Objectives
- To understand and visualize IPC mechanisms
- To monitor real-time IPC events between processes
- To analyze IPC behavior using latency and distribution graphs
- To demonstrate OS concepts using a client-server architecture

---

## 🧠 Core Concepts Covered
- Inter-Process Communication (IPC)
- Process lifecycle and states
- Event-driven systems
- Client-Server architecture
- Real-time system monitoring
- REST APIs

---

## 🏗️ System Architecture
The system follows a **Client-Server architecture**:

- **Frontend:** Handles visualization, graphs, and user interaction
- **Backend:** Simulates IPC events and provides APIs

---

## 🧩 Module Description

### 1️⃣ Frontend Module
**Responsibilities**
- Display IPC event logs
- Filter IPC events by type
- Show IPC timeline
- Visualize process communication graph
- Display IPC distribution and latency

**Technologies Used**
- HTML5
- CSS3 (Glassmorphism UI)
- Vanilla JavaScript
- Canvas API

---

### 2️⃣ Backend Module
**Responsibilities**
- Simulate IPC events
- Maintain in-memory system state
- Serve IPC data via REST APIs

**Technologies Used**
- Node.js
- Express.js
- CORS Middleware

---

## ⚙️ Main Logic (Powerhouse of the Project)

### 🔹 Backend Logic – IPC Event Simulation
```js
function generateEvent() {
  return {
    sourceName: "process_" + randomId(),
    targetName: "process_" + randomId(),
    ipcType: randomIPC(),
    operation: randomOperation(),
    status: randomStatus(),
    timestamp: Date.now()
  };
}

setInterval(() => {
  events.unshift(generateEvent());
  if (events.length > 100) events.pop();
}, 2000);
