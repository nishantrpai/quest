const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');

// Track active quests and their progress
const activeQuests = new Map();

class Quest {
  constructor(goal) {
    this.goal = goal;
    this.startTime = Date.now();
    this.insights = [];
    this.currentDepth = 0;
    this.maxDepth = 5; // Configurable depth levels
    this.synthesisComplete = false;
  }

  addInsight(insight) {
    this.insights.push({
      content: insight,
      depth: this.currentDepth,
      timestamp: Date.now()
    });
  }

  synthesizeFindings() {
    // Group insights by depth level
    const groupedInsights = this.insights.reduce((acc, insight) => {
      if (!acc[insight.depth]) acc[insight.depth] = [];
      acc[insight.depth].push(insight.content);
      return acc;
    }, {});
    
    return {
      goal: this.goal,
      duration: Date.now() - this.startTime,
      insightsByDepth: groupedInsights,
      totalInsights: this.insights.length
    };
  }
}

function startQuest(goal) {
  const questId = Date.now().toString();
  const newQuest = new Quest(goal);
  activeQuests.set(questId, newQuest);
  return questId;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });
  
  // Create layout with main content and notes section
  win.loadFile('index.html');
  
  // Once the main layout is loaded, create the browser view
  win.webContents.once('did-finish-load', () => {
    const browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    win.setBrowserView(browserView);
    browserView.setBounds({ x: 0, y: 0, width: 1200, height: 600 });
    browserView.webContents.loadURL('https://www.google.com');
  });
}

// IPC handlers for quest management
ipcMain.handle('start-quest', async (event, goal) => {
  return startQuest(goal);
});

ipcMain.handle('add-insight', async (event, { questId, insight }) => {
  const quest = activeQuests.get(questId);
  if (quest) {
    quest.addInsight(insight);
    return true;
  }
  return false;
});

ipcMain.handle('synthesize-quest', async (event, questId) => {
  const quest = activeQuests.get(questId);
  if (quest) {
    return quest.synthesizeFindings();
  }
  return null;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
