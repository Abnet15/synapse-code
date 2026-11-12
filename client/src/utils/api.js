const getApiBase = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, '')}/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

const getAuthHeaders = () => {
  const token = localStorage.getItem('synapse_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth API
  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  async login(emailOrUsername, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user profile');
    return data;
  },

  // Rooms API
  async createRoom(roomId, language, content, isInterviewMode = false) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId, language, content, isInterviewMode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create room');
    return data;
  },

  async getRooms() {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch rooms');
    return data;
  },

  async getRoom(roomId) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch room');
    return data;
  },

  async saveRoom(roomId, updates) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save room');
    return data;
  },

  // CodeCast Lessons API
  async getLessons() {
    const res = await fetch(`${API_BASE}/lessons`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch CodeCast lessons');
    return data;
  },

  async getLesson(lessonId) {
    const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch lesson');
    return data;
  },

  // Gemini AI Assistant API
  async assistCode(action, language, code) {
    const res = await fetch(`${API_BASE}/ai/assist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, language, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI Assistant failed');
    return data;
  },

  // Payments API (Chapa Gateway)
  async initializePayment() {
    const res = await fetch(`${API_BASE}/payments/initialize`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to initialize payment');
    return data;
  },

  async verifyPayment(tx_ref) {
    const res = await fetch(`${API_BASE}/payments/verify/${tx_ref}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to verify payment');
    return data;
  },
};
