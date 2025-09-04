import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'licea_access_token';
const REFRESH_TOKEN_KEY = 'licea_refresh_token';

export const tokenManager = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken,
          });

          const { accessToken } = response.data.data;
          tokenManager.setToken(accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid, redirect to login
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API interface types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication API
export const authAPI = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'instructor' | 'admin';
    privacyConsent: boolean;
    termsAccepted: boolean;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/register', data);
  },

  login: (data: {
    email: string;
    password: string;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/login', data);
  },

  logout: (): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/logout');
  },

  verifyEmail: (token: string): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/verify-email', { token });
  },

  forgotPassword: (email: string): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword: (data: {
    token: string;
    password: string;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/auth/reset-password', data);
  },

  getCurrentUser: (): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/auth/me');
  },
};

// Users API
export const usersAPI = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/users', { params });
  },

  getUserById: (id: number): Promise<AxiosResponse<APIResponse>> => {
    return api.get(`/users/${id}`);
  },

  updateUser: (id: number, data: any): Promise<AxiosResponse<APIResponse>> => {
    return api.put(`/users/${id}`, data);
  },

  deactivateUser: (id: number): Promise<AxiosResponse<APIResponse>> => {
    return api.patch(`/users/${id}/deactivate`);
  },

  activateUser: (id: number): Promise<AxiosResponse<APIResponse>> => {
    return api.patch(`/users/${id}/activate`);
  },

  getUserStats: (): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/users/stats');
  },
};

// Courses API
export const coursesAPI = {
  getCourses: (params?: {
    page?: number;
    limit?: number;
    instructor_id?: number;
    is_active?: boolean;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/courses', { params });
  },

  getCourseById: (id: number): Promise<AxiosResponse<APIResponse>> => {
    return api.get(`/courses/${id}`);
  },

  createCourse: (data: {
    name: string;
    description?: string;
    code: string;
    start_date?: string;
    end_date?: string;
    max_students?: number;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/courses', data);
  },

  updateCourse: (id: number, data: any): Promise<AxiosResponse<APIResponse>> => {
    return api.put(`/courses/${id}`, data);
  },

  enrollInCourse: (id: number): Promise<AxiosResponse<APIResponse>> => {
    return api.post(`/courses/${id}/enroll`);
  },
};

// Chat API
export const chatAPI = {
  getConversations: (): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/chat/conversations');
  },

  createConversation: (data: {
    title?: string;
  }): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/chat/conversations', data);
  },

  getMessages: (conversationId: number): Promise<AxiosResponse<APIResponse>> => {
    return api.get(`/chat/conversations/${conversationId}/messages`);
  },

  sendMessage: (conversationId: number, message: string): Promise<AxiosResponse<APIResponse>> => {
    return api.post(`/chat/conversations/${conversationId}/messages`, { message });
  },

  quickHelp: (message: string): Promise<AxiosResponse<APIResponse>> => {
    return api.post('/chat/quick-help', { message });
  },
};

// Materials API
export const materialsAPI = {
  getMaterials: (courseId?: number): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/materials', { params: { courseId } });
  },
};

// Tasks API
export const tasksAPI = {
  getTasks: (courseId?: number): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/tasks', { params: { courseId } });
  },
};

// Submissions API
export const submissionsAPI = {
  getSubmissions: (params?: any): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/submissions', { params });
  },
};

// Attendance API
export const attendanceAPI = {
  getAttendance: (params?: any): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/attendance', { params });
  },
};

// Alerts API
export const alertsAPI = {
  getAlerts: (): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/alerts');
  },
};

// Schedules API
export const schedulesAPI = {
  getSchedules: (): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/schedules');
  },
};

// Reports API
export const reportsAPI = {
  getReports: (params?: any): Promise<AxiosResponse<APIResponse>> => {
    return api.get('/reports', { params });
  },
};

// Error handler utility
export const handleAPIError = (error: any): string => {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;
