import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type ChatRow = {
  id: string
  title: string
  lastMessageAt: number
  unreadCount: number
}

export type MessageRow = {
  id: string
  chatId: string
  ts: number
  sender: string
  body: string
}

export type NewMessage = MessageRow

const DB_NAME = 'secure-messenger.db'

export class SqliteStore {
  private db: Database.Database

  constructor() {
    const userData = app.getPath('userData')
    mkdirSync(userData, { recursive: true })
    const dbPath = join(userData, DB_NAME)
    this.db = new Database(dbPath)
    this.initialize()
  }

  private initialize() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        lastMessageAt INTEGER NOT NULL,
        unreadCount INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        ts INTEGER NOT NULL,
        sender TEXT NOT NULL,
        body TEXT NOT NULL,
        FOREIGN KEY(chatId) REFERENCES chats(id)
      );
      CREATE INDEX IF NOT EXISTS idx_chats_lastMessageAt ON chats(lastMessageAt DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chatId, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_body ON messages(body);
    `)
  }

  seedIfEmpty() {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number }
    if (count.count > 0) return false

    const insertChat = this.db.prepare(
      'INSERT INTO chats (id, title, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?)'
    )
    const insertMessage = this.db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)'
    )

    const seed = this.db.transaction(() => {
      const chatIds: string[] = []
      const now = Date.now()
      for (let i = 1; i <= 200; i += 1) {
        const id = `chat-${i}`
        chatIds.push(id)
        insertChat.run(id, `Secure Chat ${i}`, now - i * 1000, 0)
      }

      for (let i = 1; i <= 20000; i += 1) {
        const chatId = chatIds[i % chatIds.length]
        const ts = now - (20000 - i) * 500
        insertMessage.run(`msg-${i}`, chatId, ts, i % 2 === 0 ? 'Alice' : 'Bob', `Seed message ${i}`)
        this.db
          .prepare('UPDATE chats SET lastMessageAt = ? WHERE id = ?')
          .run(ts, chatId)
      }
    })

    seed()
    return true
  }

  seedNow() {
    this.db.exec('DELETE FROM messages; DELETE FROM chats;')
    return this.seedIfEmpty()
  }

  getChats(limit: number, offset: number): ChatRow[] {
    return this.db
      .prepare(
        'SELECT id, title, lastMessageAt, unreadCount FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?'
      )
      .all(limit, offset) as ChatRow[]
  }

  getMessages(chatId: string, limit: number, beforeTs?: number): MessageRow[] {
    if (beforeTs) {
      return this.db
        .prepare(
          'SELECT id, chatId, ts, sender, body FROM messages WHERE chatId = ? AND ts < ? ORDER BY ts DESC LIMIT ?'
        )
        .all(chatId, beforeTs, limit) as MessageRow[]
    }
    return this.db
      .prepare(
        'SELECT id, chatId, ts, sender, body FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT ?'
      )
      .all(chatId, limit) as MessageRow[]
  }

  searchMessages(chatId: string, query: string): MessageRow[] {
    return this.db
      .prepare(
        'SELECT id, chatId, ts, sender, body FROM messages WHERE chatId = ? AND body LIKE ? ORDER BY ts DESC LIMIT 50'
      )
      .all(chatId, `%${query}%`) as MessageRow[]
  }

  insertMessage(message: NewMessage) {
    const insert = this.db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)'
    )
    const updateChat = this.db.prepare(
      'UPDATE chats SET lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?'
    )
    const tx = this.db.transaction(() => {
      insert.run(message.id, message.chatId, message.ts, message.sender, message.body)
      updateChat.run(message.ts, message.chatId)
    })
    tx()
  }

  markChatRead(chatId: string) {
    this.db.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?').run(chatId)
  }

  getChat(chatId: string): ChatRow | undefined {
    return this.db
      .prepare('SELECT id, title, lastMessageAt, unreadCount FROM chats WHERE id = ?')
      .get(chatId) as ChatRow | undefined
  }
}
