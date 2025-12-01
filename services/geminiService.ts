
import { GoogleGenAI, Type } from "@google/genai";
import type { Schema, FunctionDeclaration } from "@google/genai";
import { CourseOutline, Quiz, Subject, Book } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";
const imageModelName = "gemini-2.5-flash-image";

/**
 * Helper function to retry API calls with exponential backoff when rate limited (429).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 or "RESOURCE_EXHAUSTED"
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      (error?.message && error.message.includes('429')) ||
      (error?.message && error.message.includes('RESOURCE_EXHAUSTED'));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Generates an educational image based on the prompt.
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
  return retryWithBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: imageModelName,
        contents: prompt, // Use simple string prompt for content
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  });
};

/**
 * Generates a list of likely degree programs for a specific university using Google Search for accuracy.
 */
export const generateDegreePrograms = async (universityName: string): Promise<string[]> => {
  return retryWithBackoff(async () => {
    const prompt = `Find the current, comprehensive list of undergraduate degree programs offered at "${universityName}" in Nigeria.
    Return the list of courses separated by '|||'. 
    Do not number them.
    Example output: Computer Science|||Law|||Medicine and Surgery|||Accounting
    
    Ensure you cover all major faculties (Science, Arts, Engineering, Social Sciences, etc.).`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }], 
        },
      });

      const text = response.text || "";
      if (!text) return [];

      const programs = text.split('|||')
        .map(p => p.trim())
        .filter(p => p.length > 3 && !p.includes("List of"));

      if (programs.length < 5) {
        return text.split('\n')
          .map(p => p.replace(/^\W+/, '').trim())
          .filter(p => p.length > 5);
      }

      return programs;
    } catch (error) {
      console.error("Error generating programs:", error);
      return ["Computer Science", "Economics", "Law", "Accounting", "Medicine", "Mass Communication", "Political Science", "Mechanical Engineering"];
    }
  });
};

/**
 * Generates realistic news headlines for a specific university using Search Grounding.
 */
export const generateUniversityNews = async (universityName: string): Promise<{headline: string, snippet: string, date: string, link: string}[]> => {
  return retryWithBackoff(async () => {
    const prompt = `Find the latest 4 news updates, events, or announcements specifically for "${universityName}" in Nigeria.
    Focus on current events (admission, exams, strikes, resumption, matriculation, convocation).
    
    Format the output as a list where each item is separated by '|||' and fields by '$$'.
    Format: Headline$$Date$$Snippet$$Link
    
    Example:
    UNILAG Announces Resumption Date$$2 days ago$$The management has approved...$$https://unilag.edu.ng/news
    
    If you find a direct source, use it for the Link.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const rawNews = text.split('|||');
      const newsItems: {headline: string, snippet: string, date: string, link: string}[] = [];

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      rawNews.forEach((item, index) => {
        const parts = item.split('$$');
        if (parts.length >= 3) {
          let link = parts[3]?.trim();
          if (!link || link.length < 5) {
            link = groundingChunks[index]?.web?.uri || `https://www.google.com/search?q=${encodeURIComponent(universityName + " news")}`;
          }

          newsItems.push({
            headline: parts[0].trim().replace(/^\W+/, ''),
            date: parts[1].trim(),
            snippet: parts[2].trim(),
            link: link
          });
        }
      });

      return newsItems.slice(0, 4);
    } catch (error) {
      console.error("Error generating news:", error);
      return [];
    }
  });
};

export const generateSemesterSubjects = async (program: string, level: string, universityName: string): Promise<Subject[]> => {
  return retryWithBackoff(async () => {
    const prompt = `Find the current, standard course curriculum for a student studying "${program}" at "${level}" level at "${universityName}" (or similar Nigerian universities).
    
    List 8 core courses.
    Format each course strictly as: CODE|TITLE|DESCRIPTION
    Example: 
    CSC 201|Computer Programming I|Introduction to C++ and algorithms.
    
    Do not output Markdown tables. Just lines of text separated by '|'.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const subjects: Subject[] = [];
      
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.includes('|')) {
          const parts = line.split('|');
          if (parts.length >= 2) {
            subjects.push({
              code: parts[0].trim(),
              title: parts[1].trim(),
              description: parts[2]?.trim() || "Core course module."
            });
          }
        }
      });

      return subjects.slice(0, 8);
    } catch (error) {
      console.error("Error generating subjects:", error);
      // Fallback subjects if API fails after retries
      return [
        { code: "GST 101", title: "Use of English", description: "Communication skills in English." },
        { code: "MTH 101", title: "General Mathematics", description: "Algebra and Trigonometry." },
        { code: "GST 103", title: "Nigerian Peoples & Culture", description: "Study of Nigerian history." },
        { code: "CSC 101", title: "Intro to Computer Science", description: "Basics of computing." }
      ];
    }
  });
};

export const generateCourseOutline = async (subject: string, userContext: string): Promise<CourseOutline> => {
  return retryWithBackoff(async () => {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] },
        chapters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
            },
            required: ["title", "description", "durationMinutes"],
          },
        },
      },
      required: ["topic", "title", "description", "difficulty", "chapters"],
    };

    const prompt = `Create a comprehensive university-level course outline for the subject: "${subject}". 
    Context: ${userContext}.
    Include 5-7 distinct chapters covering the full syllabus.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert academic curriculum designer for a top Nigerian university.",
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text) as CourseOutline;
  });
};

export const generateChapterContent = async (courseTitle: string, chapterTitle: string, prevContext?: string): Promise<string> => {
  return retryWithBackoff(async () => {
    const prompt = `Write the full educational content for the chapter "${chapterTitle}" of the course "${courseTitle}".
    
    STYLE GUIDE:
    - Use clear, engaging, and academic language.
    - Use Markdown formatting (headers, bolding, lists).
    
    SCIENTIFIC & MATHEMATICAL STANDARD FORMATS:
    - For ALL formulas, use Unicode symbols (², ³, ½, π, √, θ, etc.).
    - For Chemistry: Use proper subscripts for formulas (e.g., H₂O, H₂SO₄).
    - For Math/Physics calculations:
      **Problem:** [Statement]
      **Given:** [List variables]
      **Formula:** [Standard formula]
      **Substitution:** [Plug in values]
      **Calculation:** [Step-by-step]
      **Final Answer:** [Result with Units]
    
    Context from previous chapters: ${prevContext ? prevContext : "Start of course."}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert professor. You prioritize rigorous, standard academic formatting.",
      },
    });

    if (!response.text) return "Failed to generate content.";
    return response.text;
  });
};

export const generateQuiz = async (topic: string): Promise<Quiz> => {
  return generateBatchQuiz(topic, "University", 5);
};

export const generateBatchQuiz = async (topic: string, level: string, count: number): Promise<Quiz> => {
  return retryWithBackoff(async () => {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"],
          },
        },
      },
      required: ["title", "questions"],
    };

    const prompt = `Create a ${count}-question multiple choice quiz for a ${level} student about "${topic}".
    
    CRITICAL INSTRUCTION: You MUST generate EXACTLY ${count} questions. No more, no less.
    
    FORMATTING:
    - Use Unicode for math (x², H₂O, 90°, π).
    - Ensure chemical formulas use subscripts (CO₂, H₂SO₄).
    
    Questions should test deep understanding.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: `You are a university examiner. You strictly follow the requested question count of ${count}.`,
      },
    });

    if (!response.text) throw new Error("Failed to generate quiz");
    return JSON.parse(response.text) as Quiz;
  });
};

export const recommendBooks = async (program: string, level: string): Promise<Book[]> => {
  return retryWithBackoff(async () => {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        books: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              link: { type: Type.STRING },
            },
            required: ["title", "author", "description"],
          }
        }
      },
      required: ["books"]
    };

    const prompt = `List 10 highly recommended academic textbooks for a student studying "${program}" at "${level}".
    
    REQUIREMENT:
    - Exactly 8 books MUST be by Nigerian authors or Nigerian publications (local relevance).
    - Exactly 2 books should be standard international textbooks.
    
    For the 'link', provide a Google Search URL.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "You are a university librarian specializing in Nigerian academic resources.",
        },
      });
      
      if (!response.text) return [];
      const data = JSON.parse(response.text);
      return data.books || [];
    } catch (error) {
      console.error("Error recommending books:", error);
      return [];
    }
  });
};

export const generateBookSummary = async (title: string, author: string): Promise<string> => {
  return retryWithBackoff(async () => {
    const prompt = `Create a comprehensive study guide for the book "${title}" by ${author}.
    Structure: 1. Title & Author 2. Main Themes 3. Detailed Chapter Summaries 4. Key Takeaways.
    Format cleanly with Markdown.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic summarizer.",
      },
    });

    return response.text || "Could not generate content.";
  });
};

export const processDocument = async (
  files: { data: string; mimeType: string }[], 
  task: 'OCR' | 'MERGE' | 'CONVERT'
): Promise<string> => {
  return retryWithBackoff(async () => {
    let prompt = "";
    if (task === 'OCR') prompt = "Transcribe all text contained within this document exactly.";
    else if (task === 'MERGE') prompt = "Merge these documents into a single cohesive text.";
    else if (task === 'CONVERT') prompt = "Convert this document content into clean Markdown format.";

    const parts = [
      { text: prompt },
      ...files.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } }))
    ];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: { systemInstruction: "You are an intelligent document processing assistant." }
      });
      return response.text || "Failed to process document.";
    } catch (error) {
      console.error("Error processing document:", error);
      return "Error processing document.";
    }
  });
};

export const createTutorChat = () => {
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: `You are a Socratic tutor. Use Unicode for math symbols (x², π, √) and subscripts (H₂O).`,
    },
  });
};

export const createDetailedTutorChat = () => {
  return ai.chats.create({
    model: modelName, // Using standard model which is now multimodal
    config: {
      systemInstruction: `You are 'The Tutor', a highly detailed University Professor.
      
      YOUR ROLE:
      - Provide comprehensive lecture notes.
      - Solve problems with STANDARD ACADEMIC FORMATTING.
      - If an image is provided, analyze it deeply and explain the concepts within it.
      
      STANDARD FORMATTING RULES:
      1. **Chemical Formulas**: Always use subscripts (e.g., H₂O, CO₂, C₆H₁₂O₆).
      2. **Math/Physics Problems**:
         - **Given:** [Data]
         - **Formula:** [Equation]
         - **Substitution:** [Values]
         - **Workings:** [Step-by-step]
         - **Answer:** [Result]
      3. **Structure**: Definitions -> Core Principles -> Detailed Explanation -> Examples.
      
      Use Markdown and Unicode symbols heavily for readability.`,
    },
  });
};

export const createGeneralChat = () => {
  const imageTool: FunctionDeclaration = {
    name: "generate_educational_image",
    description: "Generates an educational image, diagram, chart, or visualization.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING },
      },
      required: ["prompt"],
    },
  };

  return ai.chats.create({
    model: modelName,
    config: {
      tools: [{ functionDeclarations: [imageTool] }],
      systemInstruction: `You are 'Professor Sadiq', a friendly Nigerian university teaching assistant.
      FORMATTING: Use "2²" for exponents. Use "H₂O" for chemistry (subscripts). Use "½" for fractions.`,
    },
  });
};

export const findBooks = async (query: string): Promise<Book[]> => {
  return retryWithBackoff(async () => {
    const prompt = `Find 5 excellent academic books regarding: "${query}".
    Format: Title$$Author$$Description|||Title$$Author$$Description`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const rawBooks = text.split('|||');
      const books: Book[] = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      rawBooks.forEach((rb, index) => {
        const parts = rb.split('$$');
        if (parts.length >= 3) {
          books.push({
            title: parts[0].trim().replace(/^\W+/, ''),
            author: parts[1].trim(),
            description: parts[2].trim(),
            link: groundingChunks[index]?.web?.uri || `https://www.google.com/search?q=${encodeURIComponent(parts[0].trim() + " book")}`
          });
        }
      });

      return books;
    } catch (error) {
      console.error("Error finding books:", error);
      return [];
    }
  });
};
