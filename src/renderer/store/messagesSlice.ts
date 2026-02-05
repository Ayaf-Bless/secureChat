import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { MessageRow } from '../../../electron/db'

export type MessagesState = {
  byChat: Record<string, MessageRow[]>
  status: 'idle' | 'loading'
  activeChatId: string | null
}

const initialState: MessagesState = {
  byChat: {},
  status: 'idle',
  activeChatId: null
}

export const loadMessages = createAsyncThunk(
  'messages/load',
  async (payload: { chatId: string; limit: number; beforeTs?: number }) => {
    const data = await window.secureApi.getMessages(payload.chatId, payload.limit, payload.beforeTs)
    return { chatId: payload.chatId, items: data, beforeTs: payload.beforeTs }
  }
)

export const searchMessages = createAsyncThunk(
  'messages/search',
  async (payload: { chatId: string; query: string }) => {
    const data = await window.secureApi.searchMessages(payload.chatId, payload.query)
    return { chatId: payload.chatId, items: data }
  }
)

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveChat(state, action) {
      state.activeChatId = action.payload
    },
    appendMessage(state, action) {
      const { chatId, message } = action.payload as { chatId: string; message: MessageRow }
      const current = state.byChat[chatId] ?? []
      state.byChat[chatId] = [message, ...current].slice(0, 200)
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMessages.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        state.status = 'idle'
        if (action.payload.beforeTs) {
          const current = state.byChat[action.payload.chatId] ?? []
          state.byChat[action.payload.chatId] = [...current, ...action.payload.items]
        } else {
          state.byChat[action.payload.chatId] = action.payload.items
        }
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.byChat[action.payload.chatId] = action.payload.items
      })
  }
})

export const { setActiveChat, appendMessage } = messagesSlice.actions
export default messagesSlice.reducer
