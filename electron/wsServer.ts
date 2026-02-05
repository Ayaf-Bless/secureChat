import { WebSocketServer } from 'ws'

export type NewMessagePayload = {
  chatId: string
  messageId: string
  ts: number
  sender: string
  body: string
}

const SENDERS = ['Alice', 'Bob', 'Mallory', 'Trent']

export class SyncServer {
  private wss: WebSocketServer
  private interval: NodeJS.Timeout | null = null

  constructor(private port = 8123) {
    this.wss = new WebSocketServer({ port })
    this.wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString()) as { type?: string }
          if (payload.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
          }
        } catch {
          // ignore malformed
        }
      })
    })
  }

  startEmitting(chatIds: string[]) {
    if (this.interval) return
    this.interval = setInterval(() => {
      if (this.wss.clients.size === 0) return
      const chatId = chatIds[Math.floor(Math.random() * chatIds.length)]
      const now = Date.now()
      const payload: NewMessagePayload = {
        chatId,
        messageId: `live-${now}-${Math.random().toString(36).slice(2, 8)}`,
        ts: now,
        sender: SENDERS[Math.floor(Math.random() * SENDERS.length)],
        body: 'New message from sync simulator'
      }
      const message = JSON.stringify({ type: 'new-message', payload })
      this.wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message)
        }
      })
    }, 1000 + Math.random() * 2000)
  }

  dropConnections() {
    this.wss.clients.forEach((client) => client.close())
  }

  getPort() {
    return this.port
  }
}
