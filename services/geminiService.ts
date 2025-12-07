
import { GoogleGenAI, Type } from "@google/genai";
import type { Schema, FunctionDeclaration } from "@google/genai";
import { CourseOutline, Quiz, Subject, Book } from "../types";

// ------------------------------------------------------------------
// CONFIGURATION & INITIALIZATION
// ------------------------------------------------------------------

const apiKey = process.env.API_KEY;
// Determine if we should use the real API or Mock Data
const isMockMode = !apiKey || apiKey === "undefined" || apiKey.length < 5;

if (isMockMode) {
  console.log("%c LectureRoom Running in DEMO MODE (No API Key detected) ", "background: #6366f1; color: white; padding: 4px; border-radius: 4px;");
}

// Initialize client only if we have a key
const ai = !isMockMode ? new GoogleGenAI({ apiKey: apiKey! }) : null;

const modelName = "gemini-2.5-flash";
const imageModelName = "gemini-2.5-flash-image";

// ------------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------------

/**
 * Helper to retry API calls with exponential backoff.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
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
 * Simulates network delay for mock responses
 */
const mockDelay = <T>(data: T, ms = 1500): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
};

// ------------------------------------------------------------------
// MOCK DATA GENERATORS
// ------------------------------------------------------------------

const mockPrograms = [
  "Computer Science", "Software Engineering", "Business Administration", 
  "Economics", "Accounting", "Mass Communication", "Law", 
  "Medicine and Surgery", "International Relations", "Microbiology"
];

const getMockSubjects = () => [
  { code: "GST 101", title: "Use of English", description: "Communication skills, essay writing, and comprehension." },
  { code: "MTH 101", title: "General Mathematics I", description: "Algebra, Trigonometry, and Coordinate Geometry." },
  { code: "CSC 101", title: "Intro to Computer Science", description: "History of computing, binary systems, and algorithms." },
  { code: "PHY 101", title: "General Physics I", description: "Mechanics, properties of matter, and thermal physics." },
  { code: "CHM 101", title: "General Chemistry I", description: "Atomic structure, chemical bonding, and stoichiometry." },
  { code: "GST 103", title: "Nigerian Peoples & Culture", description: "Study of Nigerian history, ethnic groups, and cultures." },
];

const getMockCourseOutline = (topic: string): CourseOutline => ({
  topic,
  title: topic,
  description: `A comprehensive simulation course on ${topic} designed for demonstration purposes.`,
  difficulty: "Intermediate",
  chapters: [
    { title: "Introduction and Fundamentals", description: "Core concepts and definitions.", durationMinutes: 45 },
    { title: "Historical Context", description: "Evolution and history of the field.", durationMinutes: 40 },
    { title: "Key Methodologies", description: "Standard practices and techniques.", durationMinutes: 60 },
    { title: "Advanced Applications", description: "Real-world case studies and analysis.", durationMinutes: 55 },
    { title: "Future Trends", description: "Emerging technologies and future outlook.", durationMinutes: 30 },
  ]
});

const getMockChapterContent = (title: string) => `
# ${title}

## Overview
(Demo Mode) This is a simulated chapter content for **${title}**. In a live environment with a valid API key, this section would contain a detailed, AI-generated lecture tailored to your specific university curriculum.

## Core Concepts
1. **Fundamental Principle**: Understanding the basics is crucial.
2. **Analysis**: Breaking down complex problems into smaller parts.
3. **Synthesis**: Combining parts to form a coherent whole.

### Detailed Explanation
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

**Mathematical Example:**
Consider the quadratic equation:
$$ax^2 + bx + c = 0$$

The solution is given by:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Summary
To wrap up, mastering **${title}** requires consistent practice and review of these simulated notes.
`;

const getMockQuiz = (topic: string, count: number): Quiz => ({
  title: `Practice Quiz: ${topic}`,
  questions: Array.from({ length: count }).map((_, i) => ({
    question: `(Demo) Question ${i + 1}: What is a primary concept of ${topic}?`,
    options: [
      "This is a distractor option",
      "This is the correct answer",
      "Another wrong option",
      "Completely unrelated option"
    ],
    correctAnswerIndex: 1,
    explanation: "This is the correct answer because in this demo mode, option B is always correct for testing purposes."
  }))
});

const mockChatResponse = {
  text: "I am operating in Demo Mode. Since no API key was detected, I cannot generate real-time AI responses. Please configure your API key in the settings or environment variables to unlock the full power of Gemini 2.5.",
  functionCalls: undefined
};

// ------------------------------------------------------------------
// EXPORTED SERVICES
// ------------------------------------------------------------------

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (isMockMode || !ai) {
    await mockDelay(null);
    // Return a placeholder image
    return `https://placehold.co/600x400/6366f1/ffffff?text=${encodeURIComponent(prompt.slice(0, 20))}`;
  }

  return retryWithBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: imageModelName,
        contents: prompt,
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

export const generateDegreePrograms = async (universityName: string): Promise<string[]> => {
  if (isMockMode || !ai) return mockDelay(mockPrograms);

  return retryWithBackoff(async () => {
    const prompt = `Find the current, comprehensive list of undergraduate degree programs offered at "${universityName}" in Nigeria.
    Return the list of courses separated by '|||'. 
    Do not number them.
    Example output: Computer Science|||Law|||Medicine and Surgery|||Accounting
    
    Ensure you cover all major faculties.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const text = response.text || "";
      if (!text) return [];

      const programs = text.split('|||').map(p => p.trim()).filter(p => p.length > 3);
      return programs.length > 0 ? programs : mockPrograms;
    } catch (error) {
      console.error("Error generating programs:", error);
      return mockPrograms;
    }
  });
};

export const generateUniversityNews = async (universityName: string): Promise<{headline: string, snippet: string, date: string, link: string}[]> => {
  if (isMockMode || !ai) {
    return mockDelay([
      { headline: `${universityName} Announces Resumption`, snippet: "The university senate has approved the resumption date for the new academic session.", date: "2 days ago", link: "#" },
      { headline: "Admission List Released", snippet: "The merit admission list for the 2024/2025 academic session is now available on the portal.", date: "1 week ago", link: "#" },
      { headline: "Convocation Ceremony", snippet: "Upcoming convocation ceremony scheduled for next month at the main auditorium.", date: "3 days ago", link: "#" },
      { headline: "Research Grant Won", snippet: "The Faculty of Science has secured a major international research grant.", date: "Yesterday", link: "#" }
    ]);
  }

  return retryWithBackoff(async () => {
    const prompt = `Find the latest 4 news updates, events, or announcements specifically for "${universityName}" in Nigeria.
    Format: Headline$$Date$$Snippet$$Link
    Use '|||' to separate items.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
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
             link = groundingChunks[index]?.web?.uri || "#";
          }
          newsItems.push({
            headline: parts[0].trim(),
            date: parts[1].trim(),
            snippet: parts[2].trim(),
            link: link
          });
        }
      });
      return newsItems.slice(0, 4);
    } catch (error) {
      return [];
    }
  });
};

export const generateSemesterSubjects = async (program: string, level: string, universityName: string): Promise<Subject[]> => {
  if (isMockMode || !ai) return mockDelay(getMockSubjects());

  return retryWithBackoff(async () => {
    const prompt = `Find the current, standard course curriculum for a student studying "${program}" at "${level}" level at "${universityName}".
    List 8 core courses. Format: CODE|TITLE|DESCRIPTION`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
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
      return subjects.length > 0 ? subjects.slice(0, 8) : getMockSubjects();
    } catch (error) {
      return getMockSubjects();
    }
  });
};

export const generateCourseOutline = async (subject: string, userContext: string): Promise<CourseOutline> => {
  if (isMockMode || !ai) return mockDelay(getMockCourseOutline(subject));

  return retryWithBackoff(async () => {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty: { type: Type.STRING },
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

    const prompt = `Create a university course outline for: "${subject}". Context: ${userContext}.`;
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert academic curriculum designer.",
      },
    });

    if (!response.text) throw new Error("No response");
    return JSON.parse(response.text) as CourseOutline;
  });
};

export const generateChapterContent = async (courseTitle: string, chapterTitle: string, prevContext?: string): Promise<string> => {
  if (isMockMode || !ai) return mockDelay(getMockChapterContent(chapterTitle));

  return retryWithBackoff(async () => {
    const prompt = `Write the full educational content for the chapter "${chapterTitle}" of the course "${courseTitle}".
    Use Markdown. Include formulas (Unicode) and examples.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || "Failed to generate content.";
  });
};

export const generateQuiz = async (topic: string): Promise<Quiz> => {
  return generateBatchQuiz(topic, "University", 5);
};

export const generateBatchQuiz = async (topic: string, level: string, count: number): Promise<Quiz> => {
  if (isMockMode || !ai) return mockDelay(getMockQuiz(topic, count));

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

    const prompt = `Create a ${count}-question multiple choice quiz for a ${level} student about "${topic}".`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    if (!response.text) throw new Error("Failed to generate quiz");
    return JSON.parse(response.text) as Quiz;
  });
};

export const recommendBooks = async (program: string, level: string): Promise<Book[]> => {
  if (isMockMode || !ai) {
    return mockDelay([
      { title: "Fundamentals of Modern Study", author: "Dr. A. B. Johnson", description: "A comprehensive guide to academic excellence.", link: "#" },
      { title: "Principles of Economics", author: "N. Gregory Mankiw", description: "Standard text on micro and macroeconomics.", link: "#" },
      { title: "Introduction to Algorithms", author: "T. Cormen", description: "Algorithms and data structures.", link: "#" },
      { title: "Nigerian Legal System", author: "Ese Malemi", description: "Foundational text for law students.", link: "#" },
    ]);
  }

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

    const prompt = `List 10 academic textbooks for "${program}" at "${level}". Mix local Nigerian authors and international standards.`;
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      
      if (!response.text) return [];
      const data = JSON.parse(response.text);
      return data.books || [];
    } catch (error) {
      return [];
    }
  });
};

export const generateBookSummary = async (title: string, author: string): Promise<string> => {
  if (isMockMode || !ai) return mockDelay(`# Summary: ${title}\n\n(Demo Mode) This is a placeholder summary for the book **${title}** by ${author}.`);
  
  return retryWithBackoff(async () => {
    const prompt = `Create a study guide summary for "${title}" by ${author}.`;
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  });
};

export const processDocument = async (files: { data: string; mimeType: string }[], task: 'OCR' | 'MERGE' | 'CONVERT'): Promise<string> => {
  if (isMockMode || !ai) return mockDelay("(Demo Mode) Document processed successfully. Content extracted/converted.");

  return retryWithBackoff(async () => {
    let prompt = "";
    if (task === 'OCR') prompt = "Transcribe text.";
    else if (task === 'MERGE') prompt = "Merge text.";
    else if (task === 'CONVERT') prompt = "Convert to markdown.";

    const parts = [
      { text: prompt },
      ...files.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } }))
    ];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
      });
      return response.text || "Failed to process.";
    } catch (error) {
      return "Error processing document.";
    }
  });
};

export const findBooks = async (query: string): Promise<Book[]> => {
  if (isMockMode || !ai) return recommendBooks("General", "General");
  
  return retryWithBackoff(async () => {
    const prompt = `Find 5 academic books for: "${query}". Format: Title$$Author$$Description|||...`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text || "";
      const rawBooks = text.split('|||');
      const books: Book[] = [];
      rawBooks.forEach(rb => {
        const parts = rb.split('$$');
        if (parts.length >= 3) {
          books.push({
            title: parts[0].trim(),
            author: parts[1].trim(),
            description: parts[2].trim(),
            link: "#"
          });
        }
      });
      return books;
    } catch (error) {
      return [];
    }
  });
};

// Mock Chat Factory
const createMockChat = () => ({
  sendMessage: async (msg: any) => {
    await mockDelay(null, 1000);
    return mockChatResponse;
  }
});

export const createTutorChat = () => {
  if (isMockMode || !ai) return createMockChat();
  return ai.chats.create({
    model: modelName,
    config: { systemInstruction: "You are a Socratic tutor." },
  });
};

export const createDetailedTutorChat = () => {
  if (isMockMode || !ai) return createMockChat();
  return ai.chats.create({
    model: modelName,
    config: { systemInstruction: "You are a detailed University Professor." },
  });
};

export const createGeneralChat = () => {
  if (isMockMode || !ai) return createMockChat();
  const imageTool: FunctionDeclaration = {
    name: "generate_educational_image",
    description: "Generates an educational image.",
    parameters: {
      type: Type.OBJECT,
      properties: { prompt: { type: Type.STRING } },
      required: ["prompt"],
    },
  };
  return ai.chats.create({
    model: modelName,
    config: {
      tools: [{ functionDeclarations: [imageTool] }],
      systemInstruction: "You are a helpful assistant.",
    },
  });
};
