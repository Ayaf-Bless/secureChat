import { store } from '../store/store'
import { setHeartbeat, setStatus } from '../store/connectionSlice'
import { appendMessage } from '../store/messagesSlice'
import type { NewMessage } from '../../electron/db'

export class SyncClient {
  private socket: WebSocket | null = null
  private heartbeatTimer: number | null = null
  private reconnectDelay = 1000
  private readonly maxDelay = 10000
  private readonly heartbeatInterval = 10000

  async connect() {
    const port = await window.secureApi.getSyncPort()
    const url = `ws://localhost:${port}`
    this.open(url)
  }

  private open(url: string) {
    store.dispatch(setStatus('reconnecting'))
    this.socket = new WebSocket(url)

    this.socket.addEventListener('open', () => {
      store.dispatch(setStatus('connected'))
      this.reconnectDelay = 1000
      this.startHeartbeat()
    })

    this.socket.addEventListener('close', () => {
      store.dispatch(setStatus('offline'))
      this.stopHeartbeat()
      this.scheduleReconnect(url)
    })

    this.socket.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as {
          type: string
          payload?: NewMessage
        }
        if (parsed.type === 'pong') {
          store.dispatch(setHeartbeat(Date.now()))
          return
        }
        if (parsed.type === 'new-message' && parsed.payload) {
          const message = parsed.payload
          window.secureApi.insertMessage(message)
          store.dispatch(appendMessage({ chatId: message.chatId, message }))
        }
      } catch {
        // ignore malformed
      }
    })
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.socket?.send(JSON.stringify({ type: 'ping' }))
    }, this.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(url: string) {
    window.setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
      this.open(url)
    }, this.reconnectDelay)
  }

  simulateDrop() {
    window.secureApi.dropConnection()
  }
}
