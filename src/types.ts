export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0: a, 1: b, 2: c, 3: d
  explanation: string; // বিস্তারিত ব্যাখ্যা
  pageNumber?: number;
  marks: number;
}

export interface QuizData {
  title: string;
  description?: string;
  questions: Question[];
  timeLimitMinutes: number;
  marksPerQuestion: number;
  selectedPages: number[];
  pdfName: string;
  createdAt: string;
}

export interface QuizSubmission {
  quiz: QuizData;
  userAnswers: Record<number, number | null>; // question index -> option index
  flaggedQuestions: Record<number, boolean>;
  timeSpentSeconds: number;
  submittedAt: string;
}

export interface QuizScoreSummary {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  incorrectCount: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeSpentSeconds: number;
}
