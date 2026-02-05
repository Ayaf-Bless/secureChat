import { contextBridge, ipcRenderer } from "electron";
import type { ChatRow, MessageRow, NewMessage } from "./db";

console.log("Preload script loaded");

const api = {
  seed: () => ipcRenderer.invoke("db:seed"),
  seedIfEmpty: () => ipcRenderer.invoke("db:seedIfEmpty"),
  getChats: (limit: number, offset: number) =>
    ipcRenderer.invoke("db:getChats", { limit, offset }) as Promise<ChatRow[]>,
  getMessages: (chatId: string, limit: number, beforeTs?: number) =>
    ipcRenderer.invoke("db:getMessages", {
      chatId,
      limit,
      beforeTs,
    }) as Promise<MessageRow[]>,
  searchMessages: (chatId: string, query: string) =>
    ipcRenderer.invoke("db:searchMessages", { chatId, query }) as Promise<
      MessageRow[]
    >,
  insertMessage: (message: NewMessage) =>
    ipcRenderer.invoke("db:insertMessage", message),
  markRead: (chatId: string) => ipcRenderer.invoke("db:markRead", { chatId }),
  dropConnection: () => ipcRenderer.invoke("sync:drop"),
  getSyncPort: () => ipcRenderer.invoke("sync:getPort"),
  onChatUpdated: (callback: (chat: ChatRow) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chat: ChatRow) =>
      callback(chat);
    ipcRenderer.on("db:chatUpdated", listener);
    return () => ipcRenderer.removeListener("db:chatUpdated", listener);
  },
};

contextBridge.exposeInMainWorld("secureApi", api);

export type SecureApi = typeof api;
