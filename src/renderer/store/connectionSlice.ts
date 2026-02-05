import { createSlice } from '@reduxjs/toolkit'

export type ConnectionState = {
  status: 'connected' | 'reconnecting' | 'offline'
  lastHeartbeatAt: number | null
}

const initialState: ConnectionState = {
  status: 'offline',
  lastHeartbeatAt: null
}

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setStatus(state, action) {
      state.status = action.payload
    },
    setHeartbeat(state, action) {
      state.lastHeartbeatAt = action.payload
    }
  }
})

export const { setStatus, setHeartbeat } = connectionSlice.actions
export default connectionSlice.reducer
