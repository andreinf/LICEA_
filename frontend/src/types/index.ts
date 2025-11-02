// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  email_verified: boolean;
  is_active: boolean;
  registration_date: string;
  last_login?: string;
  privacy_consent?: boolean;
  terms_accepted?: boolean;
}

// Authentication types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor' | 'admin';
  institution_id: number;
  privacyConsent: boolean;
  termsAccepted: boolean;
}

// Course types
export interface Course {
  id: number;
  name: string;
  description?: string;
  code: string;
  instructor_id: number;
  instructor_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  max_students: number;
  enrolled_students: number;
  total_tasks?: number;
  total_materials?: number;
  created_at: string;
}

// Task types
export interface Task {
  id: number;
  course_id: number;
  title: string;
  description: string;
  instructions?: string;
  due_date: string;
  max_grade: number;
  submission_type: 'file' | 'text' | 'both';
  is_published: boolean;
  late_submission_allowed: boolean;
  late_penalty: number;
  created_at: string;
  course_name?: string;
}

// Submission types
export interface Submission {
  id: number;
  task_id: number;
  student_id: number;
  submission_text?: string;
  file_path?: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  submitted_at?: string;
  graded_at?: string;
  created_at: string;
  task_title?: string;
  student_name?: string;
}

// Material types
export interface Material {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  file_path?: string;
  file_url?: string;
  file_type: 'document' | 'video' | 'audio' | 'image' | 'link' | 'other';
  file_size?: number;
  is_downloadable: boolean;
  order_index: number;
  upload_date: string;
}

// Attendance types
export interface Attendance {
  id: number;
  course_id: number;
  student_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by?: number;
  student_name?: string;
  course_name?: string;
}

// Alert types
export interface Alert {
  id: number;
  student_id: number;
  course_id?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  alert_type: 'performance' | 'attendance' | 'submission' | 'engagement';
  title: string;
  description: string;
  recommendation?: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  student_name?: string;
  course_name?: string;
}

// Schedule types
export interface Schedule {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  activity_type: 'task' | 'exam' | 'class' | 'meeting' | 'study' | 'other';
  start_time: string;
  end_time?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reminder_sent: boolean;
  reminder_time?: string;
  course_id?: number;
  task_id?: number;
  course_name?: string;
  task_title?: string;
}

// Chat types
export interface ChatConversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'ai';
  message: string;
  metadata?: any;
  created_at: string;
}

// Analytics types
export interface DashboardStats {
  totalStudents?: number;
  totalInstructors?: number;
  totalCourses?: number;
  totalTasks?: number;
  completionRate?: number;
  averageGrade?: number;
  upcomingDeadlines?: number;
  recentActivity?: number;
}

export interface PerformanceMetrics {
  averageGrade: number;
  attendanceRate: number;
  submissionRate: number;
  lateSubmissions: number;
  totalTasks: number;
  completedTasks: number;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export interface CourseFormData {
  name: string;
  description: string;
  code: string;
  start_date: string;
  end_date: string;
  max_students: number;
}

// Pagination types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// API Response types
export interface APIError {
  message: string;
  code?: string;
  details?: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIError;
  pagination?: PaginationInfo;
}

// Navigation types
export interface NavigationItem {
  name: string;
  href: string;
  icon: any; // Heroicon component
  current?: boolean;
  badge?: number;
  children?: NavigationItem[];
}

// Filter types
export interface FilterOptions {
  search?: string;
  status?: string;
  role?: string;
  course?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface ChartOptions {
  responsive: boolean;
  plugins?: {
    title?: {
      display: boolean;
      text: string;
    };
    legend?: {
      display: boolean;
      position?: 'top' | 'left' | 'bottom' | 'right';
    };
  };
  scales?: {
    [key: string]: {
      beginAtZero?: boolean;
      title?: {
        display: boolean;
        text: string;
      };
    };
  };
}

// Theme types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

export default {};
