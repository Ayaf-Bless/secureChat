import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ChatRow } from '../../../electron/db'

export type ChatsState = {
  items: ChatRow[]
  offset: number
  status: 'idle' | 'loading'
}

const initialState: ChatsState = {
  items: [],
  offset: 0,
  status: 'idle'
}

export const loadChats = createAsyncThunk('chats/load', async (limit: number) => {
  const data = await window.secureApi.getChats(limit, 0)
  return { items: data, offset: data.length }
})

export const loadMoreChats = createAsyncThunk('chats/loadMore', async (payload: { limit: number; offset: number }) => {
  const data = await window.secureApi.getChats(payload.limit, payload.offset)
  return { items: data, offset: payload.offset + data.length }
})

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    upsertChat(state, action: PayloadAction<ChatRow>) {
      const index = state.items.findIndex((chat) => chat.id === action.payload.id)
      if (index >= 0) {
        state.items[index] = action.payload
      } else {
        state.items.unshift(action.payload)
      }
      state.items.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChats.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadChats.fulfilled, (state, action) => {
        state.status = 'idle'
        state.items = action.payload.items
        state.offset = action.payload.offset
      })
      .addCase(loadMoreChats.fulfilled, (state, action) => {
        state.items = [...state.items, ...action.payload.items]
        state.offset = action.payload.offset
      })
  }
})

export const { upsertChat } = chatsSlice.actions
export default chatsSlice.reducer
