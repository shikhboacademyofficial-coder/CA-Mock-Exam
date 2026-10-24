import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev environment requires port 3000.
// Do not use process.env.PORT because in Cloud Run containers it defaults to 8080 (which is used by nginx).
const PORT = 3000;

// Allow large payloads for PDF base64 / extracted text
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize GoogleGenAI SDK as per gemini-api guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Generate Quiz from PDF text or PDF base64
app.post('/api/generate-quiz', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'সার্ভারে GEMINI_API_KEY পাওয়া যায়নি। অনুগ্রহ করে Settings > Secrets বা Environment Variables-এ GEMINI_API_KEY সেট করুন।',
      });
    }
    const {
      pdfText,
      pdfBase64,
      pageNumbers,
      questionCount = 10,
      quizTitle = 'Mock Test',
      language = 'auto',
      marksPerQuestion = 2.0,
    } = req.body;

    const count = Math.max(1, Math.min(Number(questionCount) || 10, 50));
    const pagesInfo = Array.isArray(pageNumbers) && pageNumbers.length > 0 
      ? `Pages: ${pageNumbers.join(', ')}` 
      : 'Selected pages';

    let contentsPayload: any[] = [];

    const promptText = `
You are an expert academic examiner and quiz creator.
Your task is to generate exactly ${count} high-quality Multiple Choice Questions (MCQs) strictly based on the provided PDF content from ${pagesInfo}.

Requirements:
1. Generate exactly ${count} questions.
2. If language requested is 'bn' or if the source text is in Bengali, write questions, options, and explanations in fluent, grammatically correct Bengali (বাংলা). If the text is English, you can write questions in English and provide rich, clear explanations in Bengali or English as appropriate for students.
3. Each question must have exactly 4 plausible options (a, b, c, d).
4. Provide the zero-based index of the correct answer (0 for a, 1 for b, 2 for c, 3 for d).
5. For EVERY question, write a comprehensive, crystal-clear explanation (ব্যাখ্যা) explaining why the correct option is right, quoting or referencing key facts from the text, and explaining why other options are incorrect.
6. The questions should cover key concepts, definitions, analytical points, and critical facts from the chosen pages.
7. Return clean JSON matching the required schema.
`;

    if (pdfBase64) {
      // Multimodal PDF content if provided
      contentsPayload = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        },
        { text: `${promptText}\n\nTitle: ${quizTitle}\nSpecific Selected Pages: ${pagesInfo}` },
      ];
    } else if (pdfText && pdfText.trim().length > 0) {
      contentsPayload = [
        {
          text: `${promptText}\n\nTitle: ${quizTitle}\nSelected Pages Content:\n"""\n${pdfText.slice(0, 100000)}\n"""`,
        },
      ];
    } else {
      return res.status(400).json({ error: 'No PDF text or PDF file data provided.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contentsPayload,
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
                    description: 'Array of 4 options without "a.", "b.", etc. prefixes',
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

    // Sanitize and ensure format
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

    return res.json({
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
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
