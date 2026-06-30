export interface Message {
  id: string;
  sender: 'student' | 'bot' | 'counselor' | 'system';
  text: string;
  timestamp: string;
}

export interface StudentInfo {
  studentId: string;
  name: string;
  department: string;
  gpa: number;
  completedCredits: number;
  warnings: number;
  scholarshipStatus: string;
  email?: string;
  phone?: string;
}

export interface ChatSession {
  studentId: string;
  studentName: string;
  status: 'AI_BOT' | 'COUNSELOR';
  messages: Message[];
  lastActive: string;
  studentInfo?: StudentInfo;
}

export interface EncryptionLog {
  id: string;
  timestamp: string;
  action: 'ENCRYPT' | 'DECRYPT';
  dataType: string;
  rawText: string;
  encryptedHex: string;
  ivHex: string;
  tagHex: string;
  keyUsed: string;
}

export interface AcademicRule {
  id: string;
  category: string;
  title: string;
  content: string;
  updatedAt: string;
}
