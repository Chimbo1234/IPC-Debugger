// IPC Debugger - Vanilla JavaScript Implementation

// ============== Data Types & Constants ==============
const IPC_TYPES = ['pipe', 'socket', 'message_queue', 'shared_memory', 'signal'];
const OPERATIONS_BY_TYPE = {
  pipe: ['read', 'write'],
  socket: ['send', 'recv', 'connect', 'accept'],
  message_queue: ['msgsnd', 'msgrcv'],
  shared_memory: ['shmat', 'shmdt', 'read', 'write'],
  signal: ['kill', 'sigaction', 'sigwait']
};
const STATUSES = ['success', 'success', 'success', 'success', 'pending', 'failed']; // Weighted toward success
const PROCESS_STATUSES = ['running', 'running', 'running', 'blocked', 'waiting']; // Weighted toward running
const ISSUE_TYPES = ['deadlock', 'timeout', 'missing_response', 'delay', 'error'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const PROCESS_NAMES = [
  'nginx', 'postgres', 'redis', 'node', 'python',
  'systemd', 'docker', 'kubelet', 'etcd', 'prometheus'
];


let startTime = Date.now();
setInterval(() => {
  const diff = Date.now() - startTime;
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
  const s = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
  document.getElementById('uptime').textContent = `${h}:${m}:${s}`;
}, 1000);


// ============== State ==============
let state = {
  processes: [],
  events: [],
  issues: [],
  stats: {
    totalEvents: 0,
    activeProcesses: 0,
    avgLatency: 0,
    activeIssues: 0
  }
};

// ============== Data Generation ==============
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProcesses(count = 8) {
  const processes = [];
  const usedNames = new Set();
  
  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = randomItem(PROCESS_NAMES);
    } while (usedNames.has(name));
    usedNames.add(name);
    
    processes.push({
      pid: 1000 + i * randomInt(1, 100),
      name: name,
      status: Math.random() > 0.2 ? 'running' : randomItem(['blocked', 'waiting', 'terminated']),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      startTime: Date.now() - randomInt(0, 86400000)
    });
  }
  
  return processes;
}

function generateEvent(processes) {
  const sourceProcess = randomItem(processes);
  let targetProcess;
  do {
    targetProcess = randomItem(processes);
  } while (targetProcess.pid === sourceProcess.pid && processes.length > 1);
  
  const ipcType = randomItem(IPC_TYPES);
  const operation = randomItem(OPERATIONS_BY_TYPE[ipcType]);
  
  // Realistic message sizes based on IPC type
  let messageSize;
  switch (ipcType) {
    case 'signal': messageSize = 0; break;
    case 'shared_memory': messageSize = randomInt(1024, 1048576); break;
    case 'socket': messageSize = randomInt(64, 65536); break;
    default: messageSize = randomInt(8, 8192);
  }
  
  // Realistic latency based on IPC type (in ms)
  let latency;
  switch (ipcType) {
    case 'shared_memory': latency = Math.random() * 0.5; break;
    case 'signal': latency = Math.random() * 2; break;
    case 'pipe': latency = Math.random() * 10 + 0.5; break;
    default: latency = Math.random() * 50 + 2;
  }
  
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now() - randomInt(0, 60000),
    ipcType: ipcType,
    operation: operation,
    sourcePid: sourceProcess.pid,
    sourceName: sourceProcess.name,
    targetPid: targetProcess.pid,
    targetName: targetProcess.name,
    status: randomItem(STATUSES),
    messageSize: messageSize,
    latency: Math.round(latency * 100) / 100
  };
}

function generateIssue(processes) {
  const affectedCount = randomInt(1, 3);
  const affectedProcesses = [];
  for (let i = 0; i < affectedCount && i < processes.length; i++) {
    const proc = processes[randomInt(0, processes.length - 1)];
    if (!affectedProcesses.includes(proc.name)) {
      affectedProcesses.push(proc.name);
    }
  }
  
  const type = randomItem(ISSUE_TYPES);
  const descriptions = {
    deadlock: 'Circular wait detected between processes',
    timeout: 'Connection timeout after 30s',
    missing_response: 'Expected ACK not received within timeout',
    delay: 'Message delivery exceeds threshold (>50ms)',
    error: 'EPIPE: Broken pipe'
  };
  
  const icons = {
    deadlock: '🔒',
    timeout: '⏰',
    missing_response: '❓',
    delay: '⏱️',
    error: '⚠️'
  };
  
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: type,
    icon: icons[type],
    severity: randomItem(SEVERITIES),
    description: descriptions[type],
    affectedProcesses: affectedProcesses,
    timestamp: Date.now() - randomInt(0, 300000),
    resolved: Math.random() > 0.75
  };
}

// ============== UI Rendering ==============
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatTimeWithMs(timestamp) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${time}.${ms}`;
}

function updateStats() {
async function updateStats() {
  try {
    const res = await fetch('http://localhost:5000/api/stats');
    const data = await res.json();

    document.getElementById('total-events').textContent = data.totalEvents;
    document.getElementById('active-processes').textContent = data.activeProcesses;
    document.getElementById('avg-latency').textContent = data.avgLatency + 'ms';
    document.getElementById('active-issues').textContent = data.activeIssues;
    document.getElementById('issue-count').textContent = data.activeIssues + ' active';
  } catch (err) {
    console.error('Stats fetch failed', err);
  }
}
}

function renderEventList() {
  const container = document.getElementById('event-list');
  const searchTerm = document.getElementById('event-search').value.toLowerCase();
  const filterType = document.getElementById('event-filter').value;
  
  let filteredEvents = state.events
    .filter(e => {
      const matchesSearch = e.sourceName.toLowerCase().includes(searchTerm) ||
                           e.targetName.toLowerCase().includes(searchTerm);
      const matchesType = filterType === 'all' || e.ipcType === filterType;
      return matchesSearch && matchesType;
    })
    .slice(0, 50);
  
  container.innerHTML = filteredEvents.map(event => `
    <div class="event-item">
      <div class="event-status ${event.status}"></div>
      <div class="event-info">
        <div class="event-source">
          ${event.sourceName} <span>→</span> ${event.targetName}
        </div>
        <div class="event-meta">
          <span class="badge badge-${event.ipcType}">${event.ipcType}</span>
          <span>${event.operation}</span>
          <span>${(event.messageSize / 1024).toFixed(1)}KB</span>
        </div>
      </div>
      <div class="event-time">${formatTimeWithMs(event.timestamp)}</div>
    </div>
  `).join('');
}

function renderTimeline() {
  const container = document.getElementById('timeline-track');
  const sortedEvents = [...state.events].sort((a, b) => a.timestamp - b.timestamp);
  
  if (sortedEvents.length === 0) return;
  
  const minTime = sortedEvents[0].timestamp;
  const maxTime = sortedEvents[sortedEvents.length - 1].timestamp;
  const timeRange = maxTime - minTime || 1;
  
  // Update axis labels
  document.getElementById('time-start').textContent = formatTime(minTime);
  document.getElementById('time-mid').textContent = formatTime(minTime + timeRange / 2);
  document.getElementById('time-end').textContent = formatTime(maxTime);
  
  // Clear existing events (keep scan line)
  const scanLine = container.querySelector('.scan-line');
  container.innerHTML = '';
  container.appendChild(scanLine);
  
  // Add events
  sortedEvents.slice(-30).forEach((event, index) => {
    const position = ((event.timestamp - minTime) / timeRange) * 100;
    const verticalOffset = (index % 3) * 22 + 10;
    
    const dot = document.createElement('div');
    dot.className = `timeline-event ${event.ipcType} status-${event.status}`;
    dot.style.left = `${Math.min(Math.max(position, 2), 96)}%`;
    dot.style.top = `${verticalOffset}px`;
    dot.title = `${event.sourceName} → ${event.targetName} (${event.ipcType})`;
    
    container.appendChild(dot);
  });
}

function renderProcessGraph() {
  const canvas = document.getElementById('process-canvas');
  const ctx = canvas.getContext('2d');

  ctx.shadowBlur = 10;
ctx.shadowColor = 'rgba(0,255,255,0.3)';

  
  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
canvas.height = rect.height * 2;

ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
ctx.scale(2, 2);

  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const radius = Math.min(centerX, centerY) - 60;
  
  const statusColors = {
    running: '#22c55e',
    blocked: '#ef4444',
    waiting: '#f59e0b',
    terminated: '#6b7280'
  };

  ctx.shadowBlur = 0;

  
  // Calculate positions
  const positions = state.processes.map((_, index) => {
    const angle = (index / state.processes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
  
  // Calculate connections
  const connections = {};
  state.events.forEach(event => {
    const key = `${event.sourcePid}-${event.targetPid}`;
    if (!connections[key]) {
      connections[key] = { count: 0, sourcePid: event.sourcePid, targetPid: event.targetPid };
    }
    connections[key].count++;
  });
  
  // Clear canvas
  ctx.clearRect(0, 0, rect.width, rect.height);
  
  // Draw connections
  Object.values(connections).forEach(({ sourcePid, targetPid, count }) => {
    const sourceIndex = state.processes.findIndex(p => p.pid === sourcePid);
    const targetIndex = state.processes.findIndex(p => p.pid === targetPid);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    const source = positions[sourceIndex];
    const target = positions[targetIndex];
    const intensity = Math.min(count / 10, 1);
    
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + intensity * 0.4})`;
    ctx.lineWidth = 1 + intensity * 2;
    ctx.moveTo(source.x, source.y);
    
    // Curved line
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const offsetX = (target.y - source.y) * 0.2;
    const offsetY = (source.x - target.x) * 0.2;
    
    ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, target.x, target.y);
    ctx.stroke();
  });
  
  // Draw process nodes
  state.processes.forEach((process, index) => {
    const pos = positions[index];
    const color = statusColors[process.status];
    
    // Glow effect
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 30);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Node circle
    ctx.beginPath();
    ctx.fillStyle = '#0a1628';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Process name
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(process.name, pos.x, pos.y - 30);
    
    // PID
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(`PID: ${process.pid}`, pos.x, pos.y + 4);
  });
}

function renderIssues() {
  const container = document.getElementById('issue-list');
  const activeIssues = state.issues.filter(i => !i.resolved);
  
  if (activeIssues.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
        <p style="font-size: 0.875rem;">No active issues detected</p>
        <p style="font-size: 0.75rem; margin-top: 0.5rem;">System operating normally</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = activeIssues.slice(0, 5).map(issue => `
    <div class="issue-item">
      <div class="issue-icon ${issue.severity}">
        ${issue.icon || '⚠️'}
      </div>
      <div class="issue-content">
        <div class="issue-header">
          <span class="issue-title">${issue.type.replace(/_/g, ' ')}</span>
          <span class="badge badge-${issue.severity === 'critical' || issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'warning' : 'secondary'}">${issue.severity}</span>
        </div>
        <p class="issue-desc">${issue.description}</p>
        <div class="issue-meta">
          <span>${issue.affectedProcesses.join(', ')}</span>
          <span>•</span>
          <span>${formatTime(issue.timestamp)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderDistribution() {
  const container = document.getElementById('distribution-bars');
  const distribution = {};
  
  IPC_TYPES.forEach(type => distribution[type] = 0);
  state.events.forEach(e => distribution[e.ipcType]++);
  
  const total = state.events.length || 1;
  const labels = {
    pipe: 'Pipes',
    socket: 'Sockets',
    message_queue: 'Message Queues',
    shared_memory: 'Shared Memory',
    signal: 'Signals'
  };
  
  const sortedTypes = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a);
  
  container.innerHTML = sortedTypes.map(([type, count]) => {
    const percentage = (count / total) * 100;
    return `
      <div class="distribution-item">
        <div class="distribution-header">
          <span class="distribution-label">${labels[type]}</span>
          <span class="distribution-value">${count} <span style="color: var(--muted-foreground)">(${percentage.toFixed(1)}%)</span></span>
        </div>
        <div class="distribution-bar">
          <div class="distribution-fill ${type}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ============== Initialization & Updates ==============
function initializeData() {
  state.processes = generateProcesses(8);
  state.events = Array.from({ length: 30 }, () => generateEvent(state.processes));
  state.issues = Array.from({ length: 5 }, () => generateIssue(state.processes));
  
  // updateStatsData();
}

function updateStatsData() {
  state.stats.totalEvents = state.events.length;
  state.stats.activeProcesses = state.processes.filter(p => p.status === 'running').length;
  state.stats.avgLatency = state.events.length > 0 
    ? state.events.reduce((sum, e) => sum + e.latency, 0) / state.events.length 
    : 0;
  state.stats.activeIssues = state.issues.filter(i => !i.resolved).length;
}

function addNewEvent() {
  const newEvent = generateEvent(state.processes);
  state.events.unshift(newEvent);
  
  // Keep only last 100 events
  if (state.events.length > 100) {
    state.events = state.events.slice(0, 100);
  }
  
  updateStatsData();
}

function addNewIssue() {
  if (Math.random() > 0.3) return; // Only add issue 30% of the time
  
  const newIssue = generateIssue(state.processes);
  state.issues.unshift(newIssue);
  
  // Keep only last 20 issues
  if (state.issues.length > 20) {
    state.issues = state.issues.slice(0, 20);
  }
  
  // Randomly resolve some issues
  state.issues.forEach(issue => {
    if (!issue.resolved && Math.random() > 0.9) {
      issue.resolved = true;
    }
  });
  
  updateStatsData();
}

function render() {
  updateStats();
  renderEventList();
  renderTimeline();
  renderProcessGraph();
  renderIssues();
  renderDistribution();
}

function setupEventListeners() {
  document.getElementById('event-search').addEventListener('input', renderEventList);
  document.getElementById('event-filter').addEventListener('change', renderEventList);
  
  // Handle window resize for canvas
  window.addEventListener('resize', () => {
    renderProcessGraph();
  });
}

// ============== Main ==============
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('DOMContentLoaded', () => {
  let startTime = Date.now();
  setInterval(() => {
    const diff = Date.now() - startTime;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
    const s = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
    document.getElementById('uptime').textContent = `${h}:${m}:${s}`;
  }, 1000);
});

    initializeData();
  render();
  setupEventListeners();
  
  // Simulate real-time updates
  setInterval(() => {
    addNewEvent();
    render();
  }, 2000);
  
  setInterval(() => {
    addNewIssue();
    render();
  }, 5000);
});
