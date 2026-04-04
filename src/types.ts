import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  totalScore: number;
  teamId?: string;
}

export type GameStatus = 'idle' | 'question_active' | 'showing_results' | 'round_transition' | 'game_over';

export interface GameState {
  status: GameStatus;
  currentQuestionId: string | null;
  startTime: string | null; // ISO string
  round: number;
}

export type QuestionType = 'mcq' | 'image' | 'audio';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctIndex: number;
  mediaUrl?: string;
  points: number;
  duration: number; // in seconds
}

export interface UserResponse {
  userId: string;
  questionId: string;
  selectedIndex: number;
  timeTaken: number;
  pointsEarned: number;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  memberUids: string[];
  totalScore: number;
}
