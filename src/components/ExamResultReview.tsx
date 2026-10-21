import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RotateCcw, 
  PlusCircle, 
  Printer, 
  Award, 
  Clock, 
  Check, 
  X, 
  Lightbulb, 
  Filter,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Target,
  Sparkles
} from 'lucide-react';
import { QuizSubmission } from '../types';

interface ExamResultReviewProps {
  submission: QuizSubmission;
  onRetake: () => void;
  onNewQuiz: () => void;
}

export const ExamResultReview: React.FC<ExamResultReviewProps> = ({
  submission,
  onRetake,
  onNewQuiz,
}) => {
  const { quiz, userAnswers, flaggedQuestions, timeSpentSeconds } = submission;
  const [filterType, setFilterType] = useState<'all' | 'wrong' | 'correct' | 'unanswered' | 'flagged'>('all');

  // Compute stats
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  quiz.questions.forEach((q, idx) => {
    const userChoice = userAnswers[idx];
    if (userChoice === undefined || userChoice === null) {
      unansweredCount++;
    } else if (userChoice === q.correctAnswerIndex) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const totalQuestions = quiz.questions.length;
  const totalMarks = totalQuestions * quiz.marksPerQuestion;
  const obtainedMarks = correctCount * quiz.marksPerQuestion;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const accuracy = totalQuestions - unansweredCount > 0 
    ? Math.round((correctCount / (totalQuestions - unansweredCount)) * 100) 
    : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} মিনিট ${s} সেকেন্ড`;
  };

  const optionLetters = ['a', 'b', 'c', 'd', 'e', 'f'];

  // Filter questions
  const filteredQuestions = quiz.questions
    .map((q, idx) => ({ ...q, originalIndex: idx }))
    .filter((q) => {
      const userChoice = userAnswers[q.originalIndex];
      const isAnswered = userChoice !== undefined && userChoice !== null;
      const isCorrect = isAnswered && userChoice === q.correctAnswerIndex;
      const isWrong = isAnswered && userChoice !== q.correctAnswerIndex;
      const isFlagged = !!flaggedQuestions[q.originalIndex];

      if (filterType === 'correct') return isCorrect;
      if (filterType === 'wrong') return isWrong;
      if (filterType === 'unanswered') return !isAnswered;
      if (filterType === 'flagged') return isFlagged;
      return true;
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                পরীক্ষার ফলাফল ও মূল্যায়ন রিপোর্ট (Exam Review)
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                উৎস ফাইল: <span className="font-semibold text-slate-700">{quiz.pdfName}</span> • নির্বাচিত পৃষ্ঠা:{' '}
                <span className="font-mono font-semibold text-blue-600">[{quiz.selectedPages.join(', ')}]</span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <button
                type="button"
                onClick={onRetake}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                পুনরায় পরীক্ষা দিন
              </button>
              <button
                type="button"
                onClick={onNewQuiz}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                নতুন পরীক্ষা তৈরি
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="ফলাফল প্রিন্ট বা পিডিএফ সেভ করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                প্রিন্ট
              </button>
            </div>
          </div>

          {/* Results Scoreboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-6">
            {/* Total Score */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                প্রাপ্ত নম্বর
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-900 font-mono tracking-tight">
                {obtainedMarks.toFixed(1)} / {totalMarks.toFixed(1)}
              </span>
              <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                {percentage}% অর্জন
              </span>
            </div>

            {/* Correct Answers */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                সঠিক উত্তর
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900 font-mono">
                {correctCount}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium block mt-1">
                {totalQuestions}টির মধ্যে
              </span>
            </div>

            {/* Incorrect Answers */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                ভুল উত্তর
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-900 font-mono">
                {incorrectCount}
              </span>
              <span className="text-[11px] text-rose-700 font-medium block mt-1">
                প্রশ্ন সংখ্যা
              </span>
            </div>

            {/* Accuracy Rate */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
                <Target className="w-3.5 h-3.5 text-slate-500" />
                নির্ভুলতার হার
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {accuracy}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                চেষ্টাকৃত প্রশ্নে
              </span>
            </div>

            {/* Time Taken */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                ব্যয়িত সময়
              </span>
              <span className="text-base sm:text-lg font-extrabold text-amber-950 mt-1 block">
                {formatTime(timeSpentSeconds)}
              </span>
              <span className="text-[11px] text-amber-700 font-medium block mt-0.5">
                বরাদ্দ: {quiz.timeLimitMinutes} মি.
              </span>
            </div>

            {/* Evaluation Grade */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 text-center shadow-2xs">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                ফলাফল গ্রেড
              </span>
              <span className="text-base sm:text-lg font-extrabold text-indigo-950 mt-1 block">
                {percentage >= 80 ? 'চমৎকার (A+)' : percentage >= 60 ? 'উত্তম (Pass)' : 'পুনরাবৃত্তি প্রয়োজন'}
              </span>
              <span className="text-[11px] text-indigo-700 font-medium block mt-0.5">
                {percentage >= 50 ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>ফিল্টার:</span>
              </div>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                সব প্রশ্ন ({totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('wrong')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === 'wrong'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                }`}
              >
                ভুল উত্তরসমূহ ({incorrectCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('correct')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === 'correct'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                }`}
              >
                সঠিক উত্তরসমূহ ({correctCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unanswered')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === 'unanswered'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                উত্তর দেওয়া হয়নি ({unansweredCount})
              </button>
            </div>

            {/* Quick jump question numbers */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {quiz.questions.map((_, idx) => {
                const userChoice = userAnswers[idx];
                const isAnswered = userChoice !== undefined && userChoice !== null;
                const isCorrect = isAnswered && userChoice === quiz.questions[idx].correctAnswerIndex;
                const isWrong = isAnswered && userChoice !== quiz.questions[idx].correctAnswerIndex;

                let badgeColor = 'bg-slate-100 text-slate-600 border-slate-300';
                if (isCorrect) badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold';
                if (isWrong) badgeColor = 'bg-rose-100 text-rose-800 border-rose-400 font-bold';

                return (
                  <a
                    key={idx}
                    href={`#question-review-${idx}`}
                    className={`w-7 h-7 shrink-0 text-xs rounded border flex items-center justify-center transition-all hover:scale-105 font-mono ${badgeColor}`}
                    title={`প্রশ্ন ${idx + 1}: ${isCorrect ? 'সঠিক' : isWrong ? 'ভুল' : 'উত্তরহীন'}`}
                  >
                    {idx + 1}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Question Review Cards */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              এই ফিল্টারে কোনো প্রশ্ন নেই।
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const originalIdx = q.originalIndex;
              const userChoice = userAnswers[originalIdx];
              const isAnswered = userChoice !== undefined && userChoice !== null;
              const isCorrect = isAnswered && userChoice === q.correctAnswerIndex;
              const isWrong = isAnswered && userChoice !== q.correctAnswerIndex;

              return (
                <div
                  key={originalIdx}
                  id={`question-review-${originalIdx}`}
                  className="bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden scroll-mt-20 transition-all"
                >
                  {/* Top Bar for Question */}
                  <div className="bg-slate-50/90 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 text-base">
                        Question {originalIdx + 1}
                      </span>
                      {q.pageNumber && (
                        <span className="text-slate-500 font-medium flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          উৎস: পৃষ্ঠা {q.pageNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          সঠিক (Correct) • প্রাপ্ত নম্বর: {quiz.marksPerQuestion.toFixed(2)}
                        </span>
                      )}
                      {isWrong && (
                        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1.5 shadow-2xs">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          ভুল (Incorrect) • প্রাপ্ত নম্বর: 0.00
                        </span>
                      )}
                      {!isAnswered && (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          উত্তর দেওয়া হয়নি • 0.00
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 space-y-5">
                    {/* Question text in soft blue container matching exam mode */}
                    <div className="bg-[#eef6fc] border border-[#d2e4f3] rounded-lg p-5 text-base sm:text-[17px] text-slate-900 leading-relaxed font-normal">
                      {q.question}
                    </div>

                    {/* Options list with annotations */}
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        বিকল্পসমূহ ও ফলাফল (Options):
                      </span>

                      {q.options.map((optionText, optIdx) => {
                        const letter = optionLetters[optIdx] || String.fromCharCode(97 + optIdx);
                        const isCorrectOption = optIdx === q.correctAnswerIndex;
                        const isUserChoice = userChoice === optIdx;

                        let rowStyle = 'bg-white border-slate-200 text-slate-700';
                        let badge = null;

                        if (isCorrectOption) {
                          rowStyle = 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-semibold shadow-2xs';
                          badge = (
                            <span className="ml-auto text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              সঠিক উত্তর (Correct)
                            </span>
                          );
                        } else if (isUserChoice && !isCorrectOption) {
                          rowStyle = 'bg-rose-50/90 border-rose-400 text-rose-950 font-semibold shadow-2xs';
                          badge = (
                            <span className="ml-auto text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md flex items-center gap-1 shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-rose-700" />
                              আপনার ভুল উত্তর (Your Choice)
                            </span>
                          );
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm sm:text-[15px] transition-all ${rowStyle}`}
                          >
                            <span className="w-6 text-center font-bold text-slate-600 shrink-0">
                              {letter}.
                            </span>
                            <span className="leading-snug flex-1">{optionText}</span>
                            {badge}
                          </div>
                        );
                      })}
                    </div>

                    {/* Prominent Detailed Academic Explanation Box */}
                    <div className="bg-gradient-to-r from-amber-50/90 to-yellow-50/70 border border-amber-300 rounded-xl p-5 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm sm:text-base mb-2.5">
                        <Lightbulb className="w-5 h-5 text-amber-600" />
                        <span>সঠিক উত্তরের পূর্ণাঙ্গ অ্যাকাডেমিক ব্যাখ্যা (Detailed Explanation):</span>
                      </div>
                      <div className="text-slate-800 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line pl-6 border-l-2 border-amber-400">
                        {q.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 py-6 print:hidden">
          <button
            type="button"
            onClick={onRetake}
            className="w-full sm:w-auto px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
            পুনরায় এই পরীক্ষাটি দিন
          </button>

          <button
            type="button"
            onClick={onNewQuiz}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            নতুন পিডিএফ থেকে পরীক্ষা তৈরি করুন
          </button>
        </div>
      </div>
    </div>
  );
};
