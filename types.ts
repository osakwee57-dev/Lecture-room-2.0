
export interface Chapter {
  title: string;
  description: string;
  durationMinutes: number;
}

export interface CourseOutline {
  topic: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  chapters: Chapter[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'pdf';
  mimeType: string;
  data: string; // Base64 string for API
  uri: string; // Blob URL for preview
  name: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 data string (Legacy/Model response)
  attachments?: Attachment[]; // User uploads
  timestamp: number;
}

export type ViewState = 'ONBOARDING_UNI' | 'ONBOARDING_FLOW' | 'LOGIN' | 'DASHBOARD' | 'COURSE' | 'QUIZ';

export interface LearningStats {
  coursesCompleted: number;
  quizzesTaken: number;
  averageScore: number;
  hoursLearned: number;
}

export interface UserProfile {
  university: string;
  program: string; // e.g., "Computer Science"
  level: string;   // e.g., "100 Level"
  name: string;
  email: string;   // Replaced age with email for login
}

export interface Subject {
  code: string;
  title: string;
  description?: string;
}

export interface Book {
  title: string;
  author: string;
  description: string;
  link?: string;
}
