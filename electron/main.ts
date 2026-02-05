import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { SqliteStore, type NewMessage } from "./db";
import { SyncServer } from "./wsServer";

let mainWindow: BrowserWindow | null = null;
let db: SqliteStore;
let syncServer: SyncServer;

app.disableHardwareAcceleration();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

const registerIpc = () => {
  ipcMain.handle("db:seed", () => db.seedNow());
  ipcMain.handle("db:seedIfEmpty", () => db.seedIfEmpty());
  ipcMain.handle("db:getChats", (_event, { limit, offset }) =>
    db.getChats(limit, offset),
  );
  ipcMain.handle("db:getMessages", (_event, { chatId, limit, beforeTs }) =>
    db.getMessages(chatId, limit, beforeTs),
  );
  ipcMain.handle("db:searchMessages", (_event, { chatId, query }) =>
    db.searchMessages(chatId, query),
  );
  ipcMain.handle("db:insertMessage", (_event, message: NewMessage) => {
    db.insertMessage(message);
    const chat = db.getChat(message.chatId);
    if (chat) {
      mainWindow?.webContents.send("db:chatUpdated", chat);
    }
  });
  ipcMain.handle("db:markRead", (_event, { chatId }) => {
    db.markChatRead(chatId);
    const chat = db.getChat(chatId);
    if (chat) {
      mainWindow?.webContents.send("db:chatUpdated", chat);
    }
  });
  ipcMain.handle("sync:drop", () => syncServer.dropConnections());
  ipcMain.handle("sync:getPort", () => syncServer.getPort());
};

app.whenReady().then(() => {
  db = new SqliteStore();
  syncServer = new SyncServer();
  db.seedIfEmpty();

  const chatIds = db.getChats(200, 0).map((chat) => chat.id);
  syncServer.startEmitting(chatIds);

  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
