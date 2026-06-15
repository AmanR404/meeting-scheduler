import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, unwrap } from '@/lib/api';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error?: string;
}

const initialState: AuthState = { user: null, status: 'idle' };

/** Load the current user from the session cookie. */
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await unwrap<User>(api.get('/auth/me'));
  } catch {
    return rejectWithValue('unauthenticated');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

/** Switch the current user's role (demo/evaluation). */
export const setRole = createAsyncThunk('auth/setRole', async (role: UserRole) => {
  return await unwrap<User>(api.patch('/auth/role', { role }));
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(setRole.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export default authSlice.reducer;
