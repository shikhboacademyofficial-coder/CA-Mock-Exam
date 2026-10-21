import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF worker init fallback', e);
}

export interface ExtractedPDFData {
  fileName: string;
  totalPages: number;
  pagesText: Record<number, string>; // 1-indexed page -> extracted text
  totalChars: number;
}

/**
 * Extracts text page by page from an uploaded PDF file
 */
export async function extractPDFPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPDFData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pagesText: Record<number, string> = {};
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      
      const pageFullText = pageStrings.join(' ');
      pagesText[pageNum] = pageFullText;
      totalChars += pageFullText.length;
    } catch (err) {
      console.error(`Error extracting page ${pageNum}:`, err);
      pagesText[pageNum] = '';
    }

    if (onProgress) {
      onProgress(pageNum, totalPages);
    }
  }

  return {
    fileName: file.name,
    totalPages,
    pagesText,
    totalChars,
  };
}

/**
 * Converts a File to Base64 string (without data URL prefix)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Parse a page range string like "1-3, 5, 7-9" into an array of unique sorted page numbers
 */
export function parsePageRangeString(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(/[,，\s]+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pages.add(i);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num);
      }
    }
  }

  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: maxPages }, (_, i) => i + 1);
}

/**
 * Preloaded Demo Sample Data so users can test immediately with 1-click
 */
export const SAMPLE_DATASETS = [
  {
    id: 'assurance',
    title: 'Assurance: Chapter 1 - Bookkeeping & Audit Principles',
    badge: 'যেমনটি আপনার ছবিতে রয়েছে',
    totalPages: 5,
    description: 'In a manual bookkeeping system, original books of entry, nominal ledger, internal control and audit procedures.',
    questions: [
      {
        id: 1,
        question: 'In a manual bookkeeping system, into which of the following would transactions first be recorded before being transferred to the nominal ledger?',
        options: [
          'The trial balance',
          'The extended trial balance',
          'The books of original entry, such as the Sales Day Book',
          'The statement of financial position'
        ],
        correctAnswerIndex: 2,
        explanation: 'লেনদেনগুলো প্রথমে প্রাথমিক হিসাবের বই বা জাবেদায় (Books of Original Entry যেমন Sales Day Book, Purchases Day Book, Cash Book ইত্যাদি) লিপিবদ্ধ করা হয়। এরপরে এই এন্ট্রিগুলো নামমাত্র খতিয়ান বা সাধারণ খতিয়ানে (Nominal / General Ledger) স্থানান্তর করা হয়। ট্রায়াল ব্যালেন্স ও আর্থিক বিবরণী খতিয়ানের ব্যালেন্স নিয়ে পরবর্তীতে প্রস্তুত করা হয়।',
        pageNumber: 1,
        marks: 2.0,
      },
      {
        id: 2,
        question: 'Which of the following describes the primary objective of an external financial statement audit?',
        options: [
          'To detect all instances of employee fraud and error',
          'To express an independent opinion on whether financial statements give a true and fair view',
          'To guarantee the ongoing financial viability and profitability of the company',
          'To prepare and finalize the tax returns on behalf of the management'
        ],
        correctAnswerIndex: 1,
        explanation: 'একটি বাহ্যিক নিরীক্ষার (External Audit) মূল উদ্দেশ্য হলো আর্থিক বিবরণীগুলো প্রযোজ্য হিসাবরক্ষণ মানদণ্ড অনুযায়ী সত্য ও সঠিক চিত্র (True and Fair View) প্রদর্শন করছে কি না সে বিষয়ে একটি নিরপেক্ষ পেশাদার মতামত প্রকাশ করা। সকল ধরণের জালিয়াতি সম্পূর্ণ নির্মূল করা বা মুনাফার নিশ্চয়তা দেওয়া নিরীক্ষকের প্রাথমিক দায়িত্ব নয়।',
        pageNumber: 1,
        marks: 2.0,
      },
      {
        id: 3,
        question: 'What is the key principle behind the "Going Concern" assumption in accounting and auditing?',
        options: [
          'The business will be liquidated within the next accounting period',
          'The entity will continue in operational existence for the foreseeable future without necessity of liquidation',
          'All assets must immediately be recorded at their net realisable liquidation value',
          'Financial statements are only prepared on a pure cash basis rather than accrual basis'
        ],
        correctAnswerIndex: 1,
        explanation: 'চলমান প্রতিষ্ঠান ধারণা (Going Concern assumption) অনুসারে ধরে নেওয়া হয় যে প্রতিষ্ঠানটি অদূর ভবিষ্যতে (সাধারণত অন্তত পরবর্তী ১২ মাস) স্বাভাবিকভাবে কার্যক্রম চালিয়ে যাবে এবং প্রতিষ্ঠানটি গুটিয়ে ফেলার কোনো ইচ্ছা বা বাধ্যবাধকতা নেই। ফলে স্থায়ী সম্পদগুলো ঐতিহাসিক ক্রয়মূল্য ও অবচয় বাদ দিয়ে প্রদর্শন করা হয়, তাৎক্ষণিক লিকুইডেশন মূল্যে নয়।',
        pageNumber: 2,
        marks: 2.0,
      },
      {
        id: 4,
        question: 'Which of the following documents is normally issued by a supplier to acknowledge the return of faulty goods or an overcharge?',
        options: [
          'Debit note',
          'Credit note',
          'Purchase order',
          'Delivery note'
        ],
        correctAnswerIndex: 1,
        explanation: 'ক্রেতা পণ্য ফেরত পাঠালে বা অতিরিক্ত মূল্য ধরা হলে সরবরাহকারী (Supplier) ক্রেতার পাওনা হ্রাস করার স্বীকৃতি হিসেবে একটি ক্রেডিট নোট (Credit Note) ইস্যু করে। পক্ষান্তরে, ক্রেতা ফেরত পাঠানোর সময় ডেবিট নোট পাঠাতে পারে।',
        pageNumber: 2,
        marks: 2.0,
      },
      {
        id: 5,
        question: 'In double-entry bookkeeping, an increase in an asset is recorded by:',
        options: [
          'A credit entry in the asset account',
          'A debit entry in the asset account',
          'A debit entry in the liability account',
          'A credit entry in the revenue account'
        ],
        correctAnswerIndex: 1,
        explanation: 'দুতরফা দাখিলা পদ্ধতির নিয়ম অনুযায়ী, যে কোনো সম্পদের বৃদ্ধি (Increase in Asset) সংশ্লিষ্ট সম্পদ হিসাবে ডেবিট (Debit) করতে হয় এবং সম্পদের হ্রাস ক্রেডিট করতে হয়।',
        pageNumber: 3,
        marks: 2.0,
      },
      {
        id: 6,
        question: 'Which of the following internal control procedures is an example of "Segregation of Duties"?',
        options: [
          'Having the same cashier count the cash, write the receipts, and reconcile the bank account',
          'Requiring regular independent physical inventory counts by staff not involved in warehouse operations',
          'Storing computer backup files on the same hard drive as the accounting database',
          'Leaving cheque signature stamps accessible to all clerical staff'
        ],
        correctAnswerIndex: 1,
        explanation: 'দায়িত্বের বিভাজন (Segregation of Duties) বলতে এমন ব্যবস্থা বোঝায় যেখানে কোনো একটি একক লেনদেনের অনুমোদন, হিসাবভুক্তি ও সম্পদের হেফাজত ভিন্ন ভিন্ন ব্যক্তির হাতে থাকে। গোডাউন কর্মীদের ব্যতিরেকে স্বাধীন কর্মকর্তাদের দিয়ে ইনভেন্টরি গণনা দায়িত্ব বিভাজনের উৎকৃষ্ট উদাহরণ।',
        pageNumber: 4,
        marks: 2.0,
      },
      {
        id: 7,
        question: 'Which book of original entry is used to record non-routine transactions that do not belong to other special journals, such as bad debts write-offs or depreciation?',
        options: [
          'Cash Receipts Journal',
          'The General Journal (Journal Proper)',
          'Purchases Day Book',
          'Sales Return Journal'
        ],
        correctAnswerIndex: 1,
        explanation: 'সাধারণ জাবেদা (General Journal বা Journal Proper) হলো সেই মূল বই যেখানে অন্যান্য বিশেষ জাবেদায় (যেমন নগদ বই, ক্রয় বই, বিক্রয় বই) অন্তর্ভুক্ত হয় না এমন অনিয়মিত বা সমন্বয় দাখিলা (যেমন অবচয় ধার্য, কুঋণ অবলোপন, প্রারম্ভিক ও সমাপনী দাখিলা) লিপিবদ্ধ করা হয়।',
        pageNumber: 4,
        marks: 2.0,
      },
      {
        id: 8,
        question: 'What is the primary function of a Bank Reconciliation Statement?',
        options: [
          'To replace the cash book when errors occur',
          'To explain the difference between the balance in the Cash Book bank column and the Bank Statement balance',
          'To calculate the annual tax deduction for the business',
          'To certify the total sales revenue generated across all retail branches'
        ],
        correctAnswerIndex: 1,
        explanation: 'ব্যাংক সমন্বয় বিবরণী (Bank Reconciliation Statement) ক্যাশ বুকের ব্যাংক কলামের উদ্বৃত্ত এবং ব্যাংকের দেওয়া ব্যাংক বিবরণীর (Bank Statement) উদ্বৃত্তের মধ্যকার পার্থক্য চিহ্নিত ও সমন্বয় করার জন্য তৈরি করা হয়। যেমন: ইস্যুকৃত কিন্তু অপরিশোধিত চেক বা ট্রানজিটে থাকা জমা।',
        pageNumber: 5,
        marks: 2.0,
      },
    ],
  },
  {
    id: 'bangla_bcs',
    title: 'সাধারণ জ্ঞান ও বাংলাদেশ বিষয়াবলী (PDF অধ্যায় ১-৩)',
    badge: 'বাংলা প্রশ্ন ও ব্যাখ্যা',
    totalPages: 3,
    description: 'সংবিধান, মুক্তিযুদ্ধ, অর্থনৈতিক সমীক্ষা ও ভৌগোলিক অবস্থানের গুরুত্বপূর্ণ অধ্যায় থেকে সাজানো প্রশ্ন।',
    questions: [
      {
        id: 1,
        question: 'গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধানের মূলনীতি কয়টি এবং কোন অনুচ্ছেদে এগুলো বর্ণিত রয়েছে?',
        options: [
          '৩টি, অনুচ্ছেদ ৭',
          '৪টি, অনুচ্ছেদ ৮',
          '৫টি, অনুচ্ছেদ ৯',
          '৭টি, অনুচ্ছেদ ১০'
        ],
        correctAnswerIndex: 1,
        explanation: 'বাংলাদেশের সংবিধানের ৮(১) অনুচ্ছেদ অনুসারে রাষ্ট্রীয় পরিচালনার মূলনীতি ৪টি: জাতীয়তাবাদ, সমাজতন্ত্র, গণতন্ত্র এবং ধর্মনিরপেক্ষতা। এগুলো সংবিধানের দ্বিতীয় ভাগে বিস্তৃতভাবে বিবৃত হয়েছে।',
        pageNumber: 1,
        marks: 2.0,
      },
      {
        id: 2,
        question: '১৯৭১ সালের ঐতিহাসিক মুজিবনগর সরকার কত তারিখে আনুষ্ঠানিকভাবে শপথ গ্রহণ করে?',
        options: [
          '১০ এপ্রিল ১৯৭১',
          '১৭ এপ্রিল ১৯৭১',
          '২৫ মার্চ ১৯৭১',
          '২৬ মার্চ ১৯৭১'
        ],
        correctAnswerIndex: 1,
        explanation: '১৯৭১ সালের ১০ এপ্রিল গণপ্রজাতন্ত্রী বাংলাদেশ সরকার (মুজিবনগর সরকার) গঠিত হয় এবং স্বাধীনতা ঘোষণাপত্র গৃহীত হয়। পরবর্তীতে ১৯৭১ সালের ১৭ এপ্রিল তৎকালীন কুষ্টিয়া জেলার মেহেরপুরের বৈদ্যনাথতলার (বর্তমান মুজিবনগর) আম্রকাননে আনুষ্ঠানিকভাবে সরকার শপথ গ্রহণ করে।',
        pageNumber: 1,
        marks: 2.0,
      },
      {
        id: 3,
        question: 'বাংলাদেশের বৃহত্তম ব-দ্বীপ অঞ্চল কোনটি এবং এটি কোন নদীগুলোর পলল দ্বারা গঠিত?',
        options: [
          'মেঘনা নদী উপত্যকা',
          'গঙ্গা-ব্রহ্মপুত্র-মেঘনা ব-দ্বীপ (সুন্দরবন ও দক্ষিণাঞ্চল)',
          'হালদা নদী উপত্যকা',
          'কর্ণফুলী অববাহিকা'
        ],
        correctAnswerIndex: 1,
        explanation: 'বাংলাদেশ বিশ্বের বৃহত্তম ব-দ্বীপ। এটি প্রধানত গঙ্গা (পদ্মা), ব্রহ্মপুত্র (যমুনা) এবং মেঘনা নদীর পলি সঞ্চয়নের ফলে গঠিত হয়েছে। এর বনাঞ্চল ও মোহনা সুন্দরবন পর্যন্ত বিস্তৃত।',
        pageNumber: 2,
        marks: 2.0,
      },
      {
        id: 4,
        question: 'কোন ধরনের করকে প্রত্যক্ষ কর (Direct Tax) বলা হয়?',
        options: [
          'মূল্য সংযোজন কর (মূসক বা VAT)',
          'আয়কর (Income Tax)',
          'আমদানি শুল্ক (Customs Duty)',
          'সম্পূরক শুল্ক (Supplementary Duty)'
        ],
        correctAnswerIndex: 1,
        explanation: 'প্রত্যক্ষ কর হলো সেই কর যার করঘাত ও করপাত একই ব্যক্তির ওপর পড়ে এবং এটি অন্য কারও ওপর চাপানো যায় না, যেমন ব্যক্তিশ্রেণির আয়কর ও কর্পোরেট কর। পক্ষান্তরে ভ্যাট ও শুল্ক হলো পরোক্ষ কর।',
        pageNumber: 2,
        marks: 2.0,
      },
      {
        id: 5,
        question: 'বায়ুমণ্ডলের কোন স্তরে আবহাওয়া ও জলবায়ু সংক্রান্ত যাবতীয় ঘটনা (যেমন বৃষ্টি, মেঘ, বজ্রপাত) সংঘটিত হয়?',
        options: [
          'স্ট্র্যাটোস্ফিয়ার (Stratosphere)',
          'ট্রপোস্ফিয়ার (Troposphere)',
          'মেসোস্ফিয়ার (Mesosphere)',
          'থার্মোস্ফিয়ার (Thermosphere)'
        ],
        correctAnswerIndex: 1,
        explanation: 'ট্রপোস্ফিয়ার হলো পৃথিবীর সবচেয়ে নিকটবর্তী বায়ুমণ্ডলীয় স্তর (ভূ-পৃষ্ঠ থেকে প্রায় ১২-১৮ কিমি)। বায়ুমণ্ডলের মোট জলীয় বাষ্প ও বায়ুর সিংহভাগ এই স্তরে থাকায় মেঘ, বৃষ্টিপাত, কুয়াশা, ঝড় ইত্যাদি এখানেই ঘটে।',
        pageNumber: 3,
        marks: 2.0,
      },
    ],
  },
];
