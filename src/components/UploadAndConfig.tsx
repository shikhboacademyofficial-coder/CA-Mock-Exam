import React, { useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  Award, 
  BookOpen, 
  Sparkles, 
  AlertCircle, 
  Layers, 
  Play,
  RotateCcw,
  Sliders,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { 
  extractPDFPages, 
  fileToBase64, 
  parsePageRangeString, 
  ExtractedPDFData, 
  SAMPLE_DATASETS 
} from '../utils/pdfHelper';
import { QuizData } from '../types';

interface UploadAndConfigProps {
  onStartQuiz: (quiz: QuizData) => void;
}

export const UploadAndConfig: React.FC<UploadAndConfigProps> = ({ onStartQuiz }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ExtractedPDFData | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Quiz Configurations
  const [quizTitle, setQuizTitle] = useState<string>('Assurance: Chapter 1');
  const [selectedPages, setSelectedPages] = useState<number[]>([1, 2]);
  const [pageRangeInput, setPageRangeInput] = useState<string>('1-2');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(90);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(2.0);
  const [language, setLanguage] = useState<'auto' | 'bn' | 'en'>('auto');

  // Loading & Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.pdf') && uploadedFile.type !== 'application/pdf') {
      setErrorMessage('অনুগ্রহ করে একটি বৈধ পিডিএফ (.pdf) ফাইল সিলেক্ট করুন।');
      return;
    }

    setErrorMessage(null);
    setFile(uploadedFile);
    setIsExtracting(true);
    setQuizTitle(uploadedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    try {
      const data = await extractPDFPages(uploadedFile, (current, total) => {
        setExtractProgress({ current, total });
      });
      setPdfData(data);
      const initialPages = Array.from({ length: Math.min(3, data.totalPages) }, (_, i) => i + 1);
      setSelectedPages(initialPages);
      setPageRangeInput(initialPages.length > 1 ? `1-${initialPages.length}` : '1');
    } catch (err: any) {
      console.error('Failed to parse PDF pages:', err);
      setErrorMessage('পিডিএফ পড়তে সামান্য সমস্যা হয়েছে। তবে আপনি সরাসরি পরীক্ষা তৈরি করার চেষ্টা করতে পারেন।');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePageRangeChange = (value: string) => {
    setPageRangeInput(value);
    const max = pdfData ? pdfData.totalPages : 50;
    const parsed = parsePageRangeString(value, max);
    setSelectedPages(parsed);
  };

  const togglePage = (pageNum: number) => {
    let next: number[];
    if (selectedPages.includes(pageNum)) {
      if (selectedPages.length <= 1) return;
      next = selectedPages.filter(p => p !== pageNum);
    } else {
      next = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(next);
    setPageRangeInput(next.join(', '));
  };

  const selectAllPages = () => {
    if (!pdfData) return;
    const all = Array.from({ length: pdfData.totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setPageRangeInput(`1-${pdfData.totalPages}`);
  };

  const applyPreset = (preset: 'quick' | 'standard' | 'full') => {
    if (preset === 'quick') {
      setQuestionCount(5);
      setTimeLimitMinutes(15);
    } else if (preset === 'standard') {
      setQuestionCount(10);
      setTimeLimitMinutes(30);
    } else {
      setQuestionCount(50);
      setTimeLimitMinutes(90);
    }
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!file && !pdfData) {
      setErrorMessage('অনুগ্রহ করে প্রথমে একটি পিডিএফ ফাইল আপলোড করুন অথবা নিচের ইনস্ট্যান্ট ডেমো থেকে সিলেক্ট করুন।');
      return;
    }

    if (selectedPages.length === 0) {
      setErrorMessage('কমপক্ষে ১টি পৃষ্ঠা সিলেক্ট করুন।');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('পিডিএফ পৃষ্ঠাগুলো বিশ্লেষণ করা হচ্ছে...');

    try {
      let combinedText = '';
      if (pdfData) {
        for (const p of selectedPages) {
          const text = pdfData.pagesText[p] || '';
          if (text) {
            combinedText += `\n--- PAGE ${p} ---\n${text}\n`;
          }
        }
      }

      let pdfBase64 = '';
      if (file && combinedText.trim().length < 50) {
        setStatusMessage('পিডিএফ ফাইলটি সরাসরি এনালাইসিসের জন্য প্রস্তুত হচ্ছে...');
        pdfBase64 = await fileToBase64(file);
      }

      setStatusMessage(`পৃষ্ঠা ${selectedPages.join(', ')} থেকে ${questionCount}টি প্রশ্ন তৈরি হচ্ছে...`);

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfText: combinedText,
          pdfBase64: pdfBase64 || undefined,
          pageNumbers: selectedPages,
          questionCount: questionCount,
          quizTitle: quizTitle || 'Mock Test',
          language,
          marksPerQuestion,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `সার্ভার ত্রুটি: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('কোনো প্রশ্ন তৈরি করা সম্ভব হয়নি। অন্য পৃষ্ঠা সিলেক্ট করে আবার চেষ্টা করুন।');
      }

      const quiz: QuizData = {
        title: data.title || quizTitle,
        description: data.description,
        questions: data.questions,
        timeLimitMinutes: timeLimitMinutes,
        marksPerQuestion: marksPerQuestion,
        selectedPages: selectedPages,
        pdfName: file ? file.name : (pdfData?.fileName || 'Document.pdf'),
        createdAt: new Date().toISOString(),
      };

      onStartQuiz(quiz);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'প্রশ্ন তৈরি করার সময় ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find(s => s.id === sampleId);
    if (!sample) return;

    const quiz: QuizData = {
      title: sample.title,
      description: sample.description,
      questions: sample.questions,
      timeLimitMinutes: 90,
      marksPerQuestion: 2.0,
      selectedPages: Array.from({ length: sample.totalPages }, (_, i) => i + 1),
      pdfName: `${sample.title}.pdf`,
      createdAt: new Date().toISOString(),
    };

    onStartQuiz(quiz);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 pb-16">
      {/* Top Application Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  ExamStudio AI
                </span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hidden sm:inline-block">
                  Mock Simulator
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                পিডিএফ থেকে নির্দিষ্ট পৃষ্ঠাভিত্তিক স্বয়ংক্রিয় মক টেস্ট নির্মাতা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleLoadSample('assurance')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>ছবি অনুযায়ী টেস্ট (Assurance)</span>
            </button>
            <button
              onClick={() => handleLoadSample('bangla_bcs')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer hidden md:inline-flex"
            >
              <span>বাংলা টেস্ট ডেমো</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Hero Banner with Modern Layout */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-10 shadow-lg border border-slate-700/50">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-400/30 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              স্মার্ট একাডেমিক প্রশ্ন তৈরির ইঞ্জিন
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              পিডিএফ থেকে তৈরি করুন প্রফেশনাল অনলাইন মক টেস্ট
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              আপনার আপলোড করা ডকুমেন্টের নির্দিষ্ট পৃষ্ঠার অংশবিশেষ থেকে স্বয়ংক্রিয়ভাবে মানসম্মত MCQ পরীক্ষা তৈরি হবে। বাস্তবসম্মত পরীক্ষার পরিবেশ, টাইমার, নম্বর গ্রিড এবং পরীক্ষা শেষে প্রতিটি প্রশ্নের সঠিক-ভুল ফলাফলসহ সম্পূর্ণ ব্যাখ্যা পেয়ে যাবেন।
            </p>
          </div>

          {/* Quick Capability Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-700/60 mt-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span>নির্দিষ্ট পৃষ্ঠা নির্বাচন</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span>লাইভ টাইম কাউন্টডাউন</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <span>Moodle পরীক্ষার ইন্টারফেস</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <span>পূর্ণাঙ্গ সমাধান ও ব্যাখ্যা</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">ত্রুটি ঘটেছে:</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Page Select (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Upload Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-7 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-blue-500/30">
                    ১
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      পিডিএফ ডকুমেন্ট আপলোড করুন
                    </h2>
                    <p className="text-xs text-slate-500">বই, সিলেবাস, নোট বা চ্যাপ্টার (.pdf ফাইল)</p>
                  </div>
                </div>

                {file && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPdfData(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ফাইল পরিবর্তন
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-slate-800 text-base">
                    আপনার পিডিএফ ফাইলটি এখানে টেনে এনে ছেড়ে দিন
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    অথবা আপনার কম্পিউটার বা ডিভাইস থেকে ব্রাউজ করুন
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors">
                    ফাইল পছন্দ করুন
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        PDF
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          সাইজ: {(file.size / (1024 * 1024)).toFixed(2)} MB • মোট পৃষ্ঠা:{' '}
                          {isExtracting ? 'বিশ্লেষণ চলছে...' : pdfData ? `${pdfData.totalPages}টি পৃষ্ঠা` : 'স্ক্যান হচ্ছে'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> লোড সম্পন্ন
                    </span>
                  </div>

                  {isExtracting && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                        <span>পৃষ্ঠা তথ্য সংগ্রহ হচ্ছে...</span>
                        <span>
                          {extractProgress.current} / {extractProgress.total} পৃষ্ঠা
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${extractProgress.total > 0 ? (extractProgress.current / extractProgress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Page Selector Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-blue-500/30">
                  ২
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    কোন কোন পৃষ্ঠা থেকে প্রশ্ন তৈরি করবেন?
                  </h2>
                  <p className="text-xs text-slate-500">
                    যে কয়টি পৃষ্ঠা সিলেক্ট করবেন শুধুমাত্র সেই পৃষ্ঠাগুলোর মধ্য থেকেই প্রশ্ন তৈরি হবে
                  </p>
                </div>
              </div>

              {/* Range input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    পৃষ্ঠা রেঞ্জ (যেমন: 1-5 অথবা 2, 4, 6)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pageRangeInput}
                      onChange={(e) => handlePageRangeChange(e.target.value)}
                      placeholder="যেমন: 1-3, 5"
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                    />
                    {pdfData && (
                      <button
                        type="button"
                        onClick={selectAllPages}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        সব পৃষ্ঠা ({pdfData.totalPages})
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Page Buttons Grid */}
                {pdfData && pdfData.totalPages > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                      <span className="font-semibold text-slate-700">
                        ক্লিক করে পৃষ্ঠা অন/অফ করুন (নির্বাচিত: {selectedPages.length}টি):
                      </span>
                      <span className="text-blue-600 font-mono text-xs font-bold">
                        [{selectedPages.join(', ')}]
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {Array.from({ length: pdfData.totalPages }, (_, i) => i + 1).map((pageNum) => {
                        const isSelected = selectedPages.includes(pageNum);
                        const charCount = pdfData.pagesText[pageNum]?.length || 0;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => togglePage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600 ring-offset-1'
                                : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
                            }`}
                            title={`পৃষ্ঠা ${pageNum} (${charCount} অক্ষর)`}
                          >
                            <span>পৃষ্ঠা {pageNum}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Launch (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-7 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-blue-500/30">
                  ৩
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    পরীক্ষার ফরম্যাট সেটিংস
                  </h2>
                  <p className="text-xs text-slate-500">প্রশ্ন সংখ্যা, সময় ও মূল্যায়ন নীতি</p>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  দ্রুত টেস্ট প্রিসেট (Quick Presets)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('quick')}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 text-center transition-all cursor-pointer text-xs"
                  >
                    <span className="font-bold text-slate-900 block">কুইক টেস্ট</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">৫টি প্রশ্ন • ১৫ মি.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('standard')}
                    className="p-2.5 rounded-xl border border-blue-500 bg-blue-50/50 text-center transition-all cursor-pointer text-xs shadow-2xs ring-1 ring-blue-500"
                  >
                    <span className="font-bold text-blue-900 block">স্ট্যান্ডার্ড</span>
                    <span className="text-[11px] text-blue-700 block mt-0.5">১০টি প্রশ্ন • ৩০ মি.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 text-center transition-all cursor-pointer text-xs"
                  >
                    <span className="font-bold text-slate-900 block">ফুল লেন্থ</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">৫০টি প্রশ্ন • ৯০ মি.</span>
                  </button>
                </div>
              </div>

              {/* Quiz Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  পরীক্ষার বিষয় / চ্যাপ্টার নাম
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="যেমন: Assurance: Chapter 1"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  পরীক্ষার সময় স্ক্রিনের ডানপাশের নেভিগেশন বক্সে এটি দেখা যাবে
                </span>
              </div>

              {/* Question Count */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    কতটি প্রশ্ন তৈরি করবেন?
                  </label>
                  <span className="text-xs font-extrabold text-blue-600 font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                    {questionCount}টি প্রশ্ন
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        questionCount === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num}টি
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Time & Marks in Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Time Limit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    সময়সীমা
                  </label>
                  <select
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={15}>১৫ মিনিট</option>
                    <option value={30}>৩০ মিনিট</option>
                    <option value={60}>৬০ মিনিট</option>
                    <option value={90}>৯০ মিনিট (ছবির মতো)</option>
                    <option value={120}>১২০ মিনিট</option>
                  </select>
                </div>

                {/* Marks per Question */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    প্রতি প্রশ্নে নম্বর
                  </label>
                  <select
                    value={marksPerQuestion}
                    onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={2.0}>২.০০ নম্বর (Marked out of 2.00)</option>
                    <option value={1.0}>১.০০ নম্বর (Marked out of 1.00)</option>
                    <option value={0.5}>০.৫০ নম্বর</option>
                    <option value={4.0}>৪.০০ নম্বর</option>
                  </select>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  প্রশ্নের ভাষা
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">স্বয়ংক্রিয় (পিডিএফ-এর ভাষা অনুযায়ী)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="en">ইংরেজি (English)</option>
                </select>
              </div>

              {/* Big Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || isExtracting}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base group"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>মক টেস্ট তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-blue-200 group-hover:rotate-12 transition-transform" />
                      <span>মক টেস্ট শুরু করুন</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                {statusMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs text-center font-medium animate-pulse">
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Reference Interface Thumbnail */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  সংযুক্ত ছবির অনুরূপ মক টেস্ট
                </span>
                <span className="text-[11px] text-slate-400">Moodle Standard</span>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <img
                  src="/assets/aistudio/image_7235b0dd.png"
                  alt="Exam Interface Reference"
                  className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
