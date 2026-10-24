import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'সার্ভারে GEMINI_API_KEY কনফিগার করা নেই। অনুগ্রহ করে Vercel-এর Project Settings > Environment Variables-এ GEMINI_API_KEY যোগ করুন।',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const {
      pdfText,
      pageNumbers,
      questionCount = 10,
      quizTitle = 'Mock Test',
      language = 'auto',
      marksPerQuestion = 2.0,
    } = req.body || {};

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const pagesInfo = Array.isArray(pageNumbers) && pageNumbers.length > 0 
      ? `Pages: ${pageNumbers.join(', ')}` 
      : 'Selected pages';

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'কোনো পিডিএফ টেক্সট প্রদান করা হয়নি।' });
    }

    const promptText = `
You are an expert academic examiner and quiz creator.
Your task is to generate exactly ${count} high-quality Multiple Choice Questions (MCQs) strictly based on the provided PDF content from ${pagesInfo}.

Requirements:
1. Generate exactly ${count} questions.
2. If language requested is 'bn' or if the source text is in Bengali, write questions, options, and explanations in fluent Bengali (বাংলা). If English, questions and options in English, with comprehensive, crystal-clear explanations (ব্যাখ্যা) in Bengali and/or English.
3. Each question must have exactly 4 plausible options (a, b, c, d).
4. Provide the 0-based index of the correct answer (0 for a, 1 for b, 2 for c, 3 for d).
5. For EVERY question, write a comprehensive, crystal-clear explanation (ব্যাখ্যা) explaining why the correct option is right and quoting/referencing facts from the text.
6. Return clean JSON matching the required schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `${promptText}\n\nTitle: ${quizTitle}\nSelected Pages Content:\n"""\n${pdfText.slice(0, 100000)}\n"""`,
        },
      ],
      config: {
        systemInstruction:
          'You are a professional educational assessment specialist. Always create accurate, challenging, curriculum-aligned multiple choice questions with thorough explanations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Title or chapter of the quiz' },
            description: { type: Type.STRING, description: 'Brief summary of the quiz' },
            questions: {
              type: Type.ARRAY,
              description: `List of exactly ${count} multiple choice questions`,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING, description: 'Question text' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of 4 options',
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: '0-based index of correct option (0 to 3)',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Detailed explanation (ব্যাখ্যা) of the answer and rationale',
                  },
                  pageNumber: {
                    type: Type.INTEGER,
                    description: 'Source page number if identifiable',
                  },
                },
                required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => ({
      id: q.id || idx + 1,
      question: q.question || `Question ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 4 
        ? q.options.slice(0, 4) 
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex <= 3 
        ? q.correctAnswerIndex 
        : 0,
      explanation: q.explanation || 'সঠিক উত্তরের ব্যাখ্যা শীঘ্রই সংযুক্ত করা হবে।',
      pageNumber: q.pageNumber || (pageNumbers?.[0] || 1),
      marks: Number(marksPerQuestion) || 2.0,
    }));

    return res.status(200).json({
      title: parsedData.title || quizTitle,
      description: parsedData.description || `Generated from ${pagesInfo}`,
      questions: formattedQuestions,
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate quiz questions with Gemini.',
    });
  }
}
