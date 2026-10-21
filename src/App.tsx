/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadAndConfig } from './components/UploadAndConfig';
import { MockTestExam } from './components/MockTestExam';
import { ExamResultReview } from './components/ExamResultReview';
import { QuizData, QuizSubmission } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'config' | 'exam' | 'review'>('config');
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);

  const handleStartQuiz = (quiz: QuizData) => {
    setActiveQuiz(quiz);
    setSubmission(null);
    setCurrentView('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitQuiz = (sub: QuizSubmission) => {
    setSubmission(sub);
    setCurrentView('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    setSubmission(null);
    setCurrentView('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewQuiz = () => {
    setCurrentView('config');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {currentView === 'config' && (
        <UploadAndConfig onStartQuiz={handleStartQuiz} />
      )}

      {currentView === 'exam' && activeQuiz && (
        <MockTestExam
          quiz={activeQuiz}
          onSubmitQuiz={handleSubmitQuiz}
          onExitQuiz={handleNewQuiz}
        />
      )}

      {currentView === 'review' && submission && (
        <ExamResultReview
          submission={submission}
          onRetake={handleRetake}
          onNewQuiz={handleNewQuiz}
        />
      )}
    </div>
  );
}
