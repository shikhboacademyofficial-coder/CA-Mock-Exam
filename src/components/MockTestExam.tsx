import React, { useState, useEffect, useCallback } from 'react';
import { 
  Flag, 
  Clock, 
  AlertTriangle, 
  Home, 
  Maximize2, 
  Minimize2, 
  HelpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { QuizData, QuizSubmission } from '../types';

interface MockTestExamProps {
  quiz: QuizData;
  onSubmitQuiz: (submission: QuizSubmission) => void;
  onExitQuiz: () => void;
}

export const MockTestExam: React.FC<MockTestExamProps> = ({
  quiz,
  onSubmitQuiz,
  onExitQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Timer in seconds
  const totalSeconds = (quiz.timeLimitMinutes || 90) * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitFinal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = quiz.questions[currentIndex];
  const selectedAnswer = userAnswers[currentIndex] ?? null;
  const isCurrentFlagged = !!flaggedQuestions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const handleClearChoice = () => {
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showSubmitModal) return;

    if (e.key === 'ArrowRight') {
      if (currentIndex < quiz.questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    } else if (e.key.toLowerCase() === 'f') {
      setFlaggedQuestions((prev) => ({
        ...prev,
        [currentIndex]: !prev[currentIndex],
      }));
    } else if (['1', 'a', 'A'].includes(e.key)) {
      handleSelectOption(0);
    } else if (['2', 'b', 'B'].includes(e.key)) {
      handleSelectOption(1);
    } else if (['3', 'c', 'C'].includes(e.key)) {
      handleSelectOption(2);
    } else if (['4', 'd', 'D'].includes(e.key)) {
      handleSelectOption(3);
    }
  }, [currentIndex, quiz.questions.length, showSubmitModal]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmitFinal = () => {
    const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    onSubmitQuiz({
      quiz,
      userAnswers,
      flaggedQuestions,
      timeSpentSeconds: timeSpent,
      submittedAt: new Date().toISOString(),
    });
  };

  const answeredCount = Object.keys(userAnswers).filter(
    (k) => userAnswers[Number(k)] !== null && userAnswers[Number(k)] !== undefined
  ).length;
  const unansweredCount = quiz.questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / quiz.questions.length) * 100);

  const optionLetters = ['a', 'b', 'c', 'd', 'e', 'f'];

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-800 font-sans pb-16">
      {/* Top Progress bar */}
      <div className="w-full h-1 bg-slate-200 sticky top-0 z-30">
        <div
          className="h-1 bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-1 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitQuiz}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="নতুন সেটিংসে ফিরে যান"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">হোমে ফিরে যান</span>
            </button>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
              {quiz.title}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors hidden md:inline-flex cursor-pointer"
              title={isFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন' : 'ফুলস্ক্রিন করুন'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Time Left Pill (Authentic match to the user screenshot) */}
            <div className="border border-red-300/90 bg-white px-3.5 py-1 rounded-sm text-red-600 font-bold text-sm tracking-wide shadow-2xs flex items-center gap-1.5">
              <span className="text-slate-800 font-normal text-xs">Time left</span>
              <span className="font-mono text-base font-bold text-[#b91c1c] tracking-wider">
                {formatTimer(secondsLeft)}
              </span>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-3.5 py-1.5 bg-[#0d6efd] hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
            >
              Finish attempt ...
            </button>
          </div>
        </div>
      </header>

      {/* Main Exam Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column + Center Question Container (Span 9) */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Column: Question Metadata Card (md:col-span-3) */}
              <div className="md:col-span-3 bg-white border border-slate-300 rounded-sm p-4 text-xs space-y-2 shadow-2xs">
                <div>
                  <span className="text-slate-800 font-bold text-base block">
                    Question <span className="font-mono">{currentIndex + 1}</span>
                  </span>
                </div>

                <div className="text-slate-600 py-1">
                  {selectedAnswer !== null ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Answered
                    </span>
                  ) : (
                    <span className="text-slate-500">Not yet answered</span>
                  )}
                </div>

                <div className="text-slate-600 pt-1 border-t border-slate-100">
                  <span>Marked out of {currentQuestion.marks.toFixed(2)}</span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleToggleFlag}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      isCurrentFlagged
                        ? 'text-red-600 hover:text-red-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        isCurrentFlagged ? 'fill-red-600 text-red-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{isCurrentFlagged ? 'Remove flag' : 'Flag question'}</span>
                  </button>
                </div>
              </div>

              {/* Center Column: Question Box & Options (md:col-span-9) */}
              <div className="md:col-span-9 space-y-4">
                {/* Soft Blue Box matching the provided screenshot */}
                <div className="bg-[#eef6fc] border border-[#d2e4f3] rounded-sm p-6 sm:p-7 shadow-2xs transition-all">
                  {/* Question Statement */}
                  <div className="text-slate-900 text-base sm:text-[17px] leading-relaxed font-normal mb-6">
                    {currentQuestion.question}
                  </div>

                  {/* Options List */}
                  <div className="space-y-3.5">
                    {currentQuestion.options.map((optionText, optIdx) => {
                      const letter = optionLetters[optIdx] || String.fromCharCode(97 + optIdx);
                      const isSelected = selectedAnswer === optIdx;
                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`flex items-start gap-3 p-2.5 rounded-sm cursor-pointer group transition-all select-none ${
                            isSelected
                              ? 'bg-blue-100/70 border border-blue-200'
                              : 'hover:bg-blue-50/60 border border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            checked={isSelected}
                            onChange={() => handleSelectOption(optIdx)}
                            className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="text-[15px] sm:text-base text-slate-800 leading-snug">
                            <span className="font-normal text-slate-700 mr-2">{letter}.</span>
                            <span>{optionText}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Clear my choice link */}
                  <div className="mt-6 pt-3 border-t border-blue-100/60">
                    {selectedAnswer !== null ? (
                      <button
                        type="button"
                        onClick={handleClearChoice}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-normal cursor-pointer"
                      >
                        Clear my choice
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 select-none">Clear my choice</span>
                    )}
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-sm border border-slate-300 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous page</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 bg-[#0d6efd] hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{currentIndex === quiz.questions.length - 1 ? 'Finish attempt ...' : 'Next page'}</span>
                    {currentIndex < quiz.questions.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quiz Navigation Sidebar (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-2xs">
              {/* Header Box */}
              <div className="border border-slate-300 rounded-sm px-3 py-1.5 mb-3 bg-white text-xs font-normal text-slate-800 truncate">
                <span className="font-semibold">{quiz.title.split(':')[0] || 'Assurance'}:</span>{' '}
                <span className="text-slate-600">{quiz.title.split(':')[1] || 'Chapter 1'}</span>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[#0056b3] font-bold text-base mb-1">
                Quiz navigation
              </h3>
              <p className="text-xs text-slate-600 mb-4 font-normal">
                Multiple Choice Questions
              </p>

              {/* Number Grid - Moodle Style */}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 mb-5">
                {quiz.questions.map((_, idx) => {
                  const isCurrent = currentIndex === idx;
                  const isAnswered = userAnswers[idx] !== null && userAnswers[idx] !== undefined;
                  const isFlagged = !!flaggedQuestions[idx];

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative h-9 w-full rounded-[2px] border text-xs flex flex-col items-center justify-start overflow-hidden transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-2 border-black font-extrabold z-10 shadow-xs'
                          : 'border-slate-300 hover:border-slate-400 bg-white'
                      }`}
                      title={`প্রশ্ন ${idx + 1}: ${isAnswered ? 'উত্তর দেওয়া হয়েছে' : 'উত্তর দেওয়া হয়নি'}`}
                    >
                      {/* Flag Indicator (Red triangle in top-right corner) */}
                      {isFlagged && (
                        <div
                          className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-red-600 border-r-red-600"
                          title="Flagged"
                        />
                      )}

                      {/* Number Display */}
                      <span className="pt-0.5 text-slate-900 font-mono text-[11px] leading-tight">
                        {idx + 1}
                      </span>

                      {/* Answered Shaded Bottom Half (Classic Moodle style!) */}
                      <div
                        className={`w-full mt-auto h-[12px] transition-colors ${
                          isAnswered ? 'bg-[#556270]' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Statistics Strip */}
              <div className="text-[11px] text-slate-600 mb-3 space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span>উত্তর দেওয়া হয়েছে:</span>
                  <span className="font-bold text-emerald-700 font-mono">{answeredCount} / {quiz.questions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>বাকি আছে:</span>
                  <span className="font-bold text-amber-700 font-mono">{unansweredCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>অগ্রগতি:</span>
                  <span className="font-bold text-blue-700 font-mono">{progressPercent}%</span>
                </div>
              </div>

              {/* Finish attempt link at bottom */}
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline block pt-1 font-normal cursor-pointer text-left"
              >
                Finish attempt ...
              </button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="hidden sm:block p-3 rounded bg-white border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">কীবোর্ড শর্টকাট:</span>
              <p>• <span className="font-mono bg-slate-100 px-1 rounded">1-4</span> বা <span className="font-mono bg-slate-100 px-1 rounded">A-D</span>: অপশন পছন্দ</p>
              <p>• <span className="font-mono bg-slate-100 px-1 rounded">←</span> / <span className="font-mono bg-slate-100 px-1 rounded">→</span>: পূর্ববর্তী / পরবর্তী প্রশ্ন</p>
              <p>• <span className="font-mono bg-slate-100 px-1 rounded">F</span>: প্রশ্ন ফ্ল্যাগ অন/অফ</p>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  পরীক্ষা সমাপ্তির নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-slate-500">Summary of attempt</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p>
                আপনি কি নিশ্চিত যে আপনার পরীক্ষা শেষ হয়েছে এবং আপনি ফলাফল ও বিস্তারিত সমাধান দেখতে চান?
              </p>
              
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-medium">
                <div className="flex justify-between">
                  <span>মোট প্রশ্ন:</span>
                  <span className="font-bold text-slate-800 font-mono">{quiz.questions.length}টি</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>উত্তর দেওয়া হয়েছে:</span>
                  <span className="font-bold font-mono">{answeredCount}টি</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>উত্তর দেওয়া বাকি:</span>
                  <span className="font-bold font-mono">{unansweredCount}টি</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>অবশিষ্ট সময়:</span>
                  <span className="font-mono font-bold text-red-600">{formatTimer(secondsLeft)}</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  ⚠️ আপনার এখনও {unansweredCount}টি প্রশ্নের উত্তর দেওয়া বাকি রয়েছে।
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                পরীক্ষায় ফিরে যান (Return)
              </button>
              <button
                type="button"
                onClick={handleSubmitFinal}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                জমা দিন ও ফলাফল দেখুন (Submit all)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
