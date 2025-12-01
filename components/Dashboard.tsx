
import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LearningStats, UserProfile, Subject, Message, Book, Attachment } from '../types';
import { generateSemesterSubjects, createGeneralChat, createDetailedTutorChat, findBooks, recommendBooks, generateUniversityNews, generateBookSummary, processDocument, generateDegreePrograms, generateImage } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { 
  BookOpen, TrendingUp, Sparkles, Plus, Trash2, Send, Bot, User, Calculator, 
  Book as BookIcon, BarChart3, Search, Library, Download, ExternalLink, 
  GraduationCap, ArrowLeft, ArrowRight, ChevronRight, Image as ImageIcon, BrainCircuit, 
  Timer, X, Maximize2, Heart, Menu, Settings, Info, Edit, Newspaper, Calendar, 
  Paperclip, FileText, Music, Video as VideoIcon, Undo2, Volume2, Mic, Bell, 
  Shield, Database, Github, Code, ScanText, Layers, FileType2, Copy, History, 
  Camera, MessageSquare, ToggleLeft, ToggleRight, Wifi, Smartphone, 
  GraduationCap as TeacherIcon, Check, Loader2, RotateCw, Square
} from 'lucide-react';

interface DashboardProps {
  userProfile: UserProfile;
  stats: LearningStats;
  onStartCourse: (topic: string) => void;
  onStartQuiz: (topic: string, count: number, durationSeconds?: number) => void;
  isLoadingCourse: boolean;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

type DashboardSection = 'HOME' | 'COURSES' | 'CHAT' | 'LIBRARY' | 'STATS' | 'QUIZ_HUB' | 'PDF_TOOLS' | 'MY_TUTOR';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// Helper colors
const getBookColor = (title: string) => {
  const colors = ['bg-amber-700', 'bg-blue-800', 'bg-red-800', 'bg-emerald-800', 'bg-slate-800', 'bg-purple-800'];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

interface BookCardProps {
  book: Book;
  isFavorite: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  darkMode: boolean;
  isDownloading: boolean;
}

// Utility to improve readability of formulas (e.g. 2^2 -> 2², H2O -> H₂O)
export const formatMathText = (text: string) => {
  if (!text) return "";
  
  return text
    // Superscripts (x^2)
    .replace(/\^(\d+)/g, (_, d) => d.split('').map((c: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(c)]).join(''))
    .replace(/\^([a-z])/g, (_, c) => { const map: Record<string, string> = {x:'ˣ', y:'ʸ', n:'ⁿ'}; return map[c] || `^${c}`; })
    // Subscripts (Chemical formulas approx, look for Capital followed by digit)
    .replace(/([A-Z][a-z]?)(\d+)/g, (_, el, num) => {
        const subs = num.split('').map((c: string) => '₀₁₂₃₄₅₆₇₈₉'[parseInt(c)]).join('');
        return `${el}${subs}`;
    })
    // Standard Math
    .replace(/sqrt\s*\(([^)]+)\)/g, '√($1)')
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    .replace(/\b1\/3\b/g, '⅓')
    .replace(/\b2\/3\b/g, '⅔')
    .replace(/\s*<=\s*/g, ' ≤ ')
    .replace(/\s*>=\s*/g, ' ≥ ')
    .replace(/\s*!=\s*/g, ' ≠ ')
    .replace(/\s*\*\s*/g, ' × ') 
    .replace(/\s*\/\s*/g, ' ÷ ');
};

// Helper Component for Book Card
const BookCard: React.FC<BookCardProps> = ({ book, isFavorite, onToggleFav, onDownload, darkMode, isDownloading }) => (
  <div 
    className={`block p-6 rounded-2xl border transition-all hover:shadow-lg group relative flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
  >
    <button 
      onClick={onToggleFav}
      className={`absolute top-4 right-4 p-2 rounded-full transition-all z-10 ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-transparent text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
    >
      <Heart size={18} className={isFavorite ? 'fill-current' : ''} />
    </button>

    <div className={`w-12 h-16 rounded mb-4 shadow-sm flex items-center justify-center text-white font-bold text-xl ${getBookColor(book.title)}`}>
      {book.title[0]}
    </div>
    <h3 className={`font-bold mb-1 leading-snug pr-8 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{book.title}</h3>
    <p className="text-sm text-amber-600 mb-2">{book.author}</p>
    <p className={`text-sm line-clamp-3 mb-4 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{book.description}</p>
    
    <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
      <button 
        onClick={onDownload}
        disabled={isDownloading}
        className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${darkMode ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'} ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
      >
        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
        {isDownloading ? 'Downloading...' : 'Download Guide'}
      </button>
      {book.link && (
        <a 
          href={book.link} 
          target="_blank" 
          rel="noreferrer"
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ userProfile, stats, onStartCourse, onStartQuiz, isLoadingCourse, onUpdateProfile, onLogout, darkMode, toggleDarkMode }) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('HOME');
  
  // -- MENU & SETTINGS --
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    dataSaver: false,
    soundEffects: true
  });

  // -- EDIT PROFILE STATE --
  const [editName, setEditName] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [programSearch, setProgramSearch] = useState("");

  // -- NEWS STATE --
  const [news, setNews] = useState<{headline: string, snippet: string, date: string, link: string}[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  // -- COURSES STATE --
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectTitle, setNewSubjectTitle] = useState("");

  // -- LIBRARY STATE --
  const [bookQuery, setBookQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'DISCOVER' | 'FAVORITES'>('DISCOVER');
  const [undoToast, setUndoToast] = useState<{ visible: boolean; book: Book | null }>({ visible: false, book: null });
  const [downloadingBook, setDownloadingBook] = useState<string | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [downloadToast, setDownloadToast] = useState(false);
  
  // -- PDF TOOLS STATE --
  const [pdfToolTab, setPdfToolTab] = useState<'OCR' | 'MERGE' | 'CONVERT'>('OCR');
  const [pdfFiles, setPdfFiles] = useState<{name: string, data: string, mimeType: string}[]>([]);
  const [processedText, setProcessedText] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Initialize favorites from localStorage
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_academy_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gemini_academy_favorites', JSON.stringify(favoriteBooks));
  }, [favoriteBooks]);

  // -- QUIZ HUB STATE --
  const [selectedQuizSubject, setSelectedQuizSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);

  // -- CHAT STATE --
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // -- MY TUTOR STATE --
  const [tutorSessions, setTutorSessions] = useState<ChatSession[]>(() => {
     try {
       const saved = localStorage.getItem('gemini_tutor_sessions');
       return saved ? JSON.parse(saved) : [];
     } catch { return []; }
  });
  const [currentTutorSessionId, setCurrentTutorSessionId] = useState<string | null>(null);
  const [tutorMessages, setTutorMessages] = useState<Message[]>([
    { role: 'model', text: "Welcome. I am your Tutor. I provide detailed, standard academic lecture notes and explanations. You can send me images of problems, audio notes, or text questions.", timestamp: Date.now() }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [isTutorTyping, setIsTutorTyping] = useState(false);
  const [tutorAttachments, setTutorAttachments] = useState<Attachment[]>([]);
  const tutorSessionRef = useRef<Chat | null>(null);
  const tutorMessagesEndRef = useRef<HTMLDivElement>(null);
  const tutorFileInputRef = useRef<HTMLInputElement>(null);
  const tutorCameraInputRef = useRef<HTMLInputElement>(null);

  // -- AUDIO STATE --
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const [speakingTextId, setSpeakingTextId] = useState<string | null>(null);

  // Save Sessions Effect
  useEffect(() => {
    localStorage.setItem('gemini_chat_sessions', JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem('gemini_tutor_sessions', JSON.stringify(tutorSessions));
  }, [tutorSessions]);

  // Persist Current Session logic
  useEffect(() => {
     if (chatMessages.length > 0) {
        if (!currentSessionId) {
           // Create new session ID
           const newId = Date.now().toString();
           setCurrentSessionId(newId);
           setChatSessions(prev => [{
              id: newId,
              title: chatMessages[0].text.slice(0, 30) || "New Conversation",
              messages: chatMessages,
              timestamp: Date.now()
           }, ...prev]);
        } else {
           // Update existing
           setChatSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: chatMessages } : s));
        }
     }
  }, [chatMessages]); // Dependency on messages

  useEffect(() => {
      if (tutorMessages.length > 1) { // >1 because of welcome msg
         if (!currentTutorSessionId) {
            const newId = Date.now().toString();
            setCurrentTutorSessionId(newId);
            setTutorSessions(prev => [{
               id: newId,
               title: tutorMessages.find(m => m.role === 'user')?.text.slice(0, 30) || "Tutor Session",
               messages: tutorMessages,
               timestamp: Date.now()
            }, ...prev]);
         } else {
            setTutorSessions(prev => prev.map(s => s.id === currentTutorSessionId ? { ...s, messages: tutorMessages } : s));
         }
      }
  }, [tutorMessages]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('gemini_academy_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_academy_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (subjects.length > 0) return; 
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const fetched = await generateSemesterSubjects(userProfile.program, userProfile.level, userProfile.university);
        setSubjects(fetched);
        if (fetched.length > 0) setSelectedQuizSubject(`${fetched[0].code}: ${fetched[0].title}`);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [userProfile]);

  useEffect(() => {
    if (showEditProfile) {
      setEditName(userProfile.name);
      setEditProgram(userProfile.program);
      setEditLevel(userProfile.level);
      setEditEmail(userProfile.email);
      setProgramSearch("");
      if (availablePrograms.length === 0) {
        const fetchPrograms = async () => {
          setIsLoadingPrograms(true);
          try {
            const progs = await generateDegreePrograms(userProfile.university);
            setAvailablePrograms(progs);
          } catch (e) { console.error(e); } finally { setIsLoadingPrograms(false); }
        };
        fetchPrograms();
      }
    }
  }, [showEditProfile, userProfile]);

  useEffect(() => {
    if (recommendedBooks.length > 0) return;
    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      try {
         const recs = await recommendBooks(userProfile.program, userProfile.level);
         setRecommendedBooks(recs);
      } catch (e) { console.error(e); } finally { setIsLoadingRecommendations(false); }
    };
    if (activeSection === 'LIBRARY') fetchRecommendations();
  }, [activeSection, userProfile]);

  useEffect(() => {
    if (news.length > 0) return;
    const fetchNews = async () => {
      setIsLoadingNews(true);
      try {
        const data = await generateUniversityNews(userProfile.university);
        setNews(data);
      } catch (e) { console.error(e); } finally { setIsLoadingNews(false); }
    };
    if (activeSection === 'HOME') fetchNews();
  }, [activeSection, userProfile.university]);

  useEffect(() => {
    if (!chatSessionRef.current) chatSessionRef.current = createGeneralChat();
    if (!tutorSessionRef.current) tutorSessionRef.current = createDetailedTutorChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    tutorMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages, isTutorTyping]);

  // -- HANDLERS --

  const handleSaveProfile = () => {
    const updated = { ...userProfile, name: editName, program: editProgram, level: editLevel, email: editEmail };
    onUpdateProfile(updated);
    setShowEditProfile(false);
    setTimeout(() => {
        alert("Changes saved. You will be logged out to apply updates.");
        onLogout();
    }, 500);
  };

  const handleSendMessage = async (isTutor = false) => {
    const input = isTutor ? tutorInput : chatInput;
    const attachments = isTutor ? tutorAttachments : chatAttachments;
    const setMsg = isTutor ? setTutorMessages : setChatMessages;
    const setInp = isTutor ? setTutorInput : setChatInput;
    const setAtt = isTutor ? setTutorAttachments : setChatAttachments;
    const setTyping = isTutor ? setIsTutorTyping : setIsChatTyping;
    const sessionRef = isTutor ? tutorSessionRef : chatSessionRef;

    if ((!input.trim() && attachments.length === 0) || !sessionRef.current) return;

    const userMsg: Message = { role: 'user', text: input, attachments: [...attachments], timestamp: Date.now() };
    setMsg(prev => [...prev, userMsg]);
    setInp('');
    setAtt([]);
    setTyping(true);

    try {
      let contentParts: any[] = [];
      if (input) contentParts.push({ text: input });
      attachments.forEach(att => {
         contentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });

      // @ts-ignore
      const result: GenerateContentResponse = await sessionRef.current.sendMessage({
         message: { role: 'user', parts: contentParts }
      });

      const functionCalls = result.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'generate_educational_image') {
           const args = call.args as any;
           const imageBase64 = await generateImage(args.prompt);
           // @ts-ignore
           await sessionRef.current.sendMessage({ message: [{ functionResponse: { name: call.name, response: { result: imageBase64 ? "Image generated successfully." : "Failed to generate image." } } }] });
           if (imageBase64) {
             setMsg(prev => [...prev, { role: 'model', text: `Here is the image for: ${args.prompt}`, image: imageBase64, timestamp: Date.now() }]);
           } else {
             setMsg(prev => [...prev, { role: 'model', text: "Sorry, I couldn't generate that image right now.", timestamp: Date.now() }]);
           }
        }
      } else {
        const text = result.text || "I'm having trouble thinking right now.";
        // Auto-speak disabled by default now, user must click icon
        setMsg(prev => [...prev, { role: 'model', text, timestamp: Date.now() }]);
      }
    } catch (err) {
      console.error(err);
      setMsg(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
    } finally {
      setTyping(false);
    }
  };

  const speakText = (text: string, id: string) => {
    if (!synthRef.current) return;
    
    if (speakingTextId === id) {
      synthRef.current.cancel();
      setSpeakingTextId(null);
    } else {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingTextId(null);
      synthRef.current.speak(utterance);
      setSpeakingTextId(id);
    }
  };

  const startNewChat = () => {
     setCurrentSessionId(null);
     setChatMessages([]);
     // Ideally reset GenAI chat context too, but SDK doesn't support clearHistory easily without new instance
     chatSessionRef.current = createGeneralChat();
  };

  const startNewTutorSession = () => {
     setCurrentTutorSessionId(null);
     setTutorMessages([{ role: 'model', text: "Welcome. I am your Tutor. I provide detailed, standard academic lecture notes and explanations. You can send me images of problems, audio notes, or text questions.", timestamp: Date.now() }]);
     tutorSessionRef.current = createDetailedTutorChat();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isTutor = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const type = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'image';
        
        const att: Attachment = {
          type: type as any,
          mimeType: file.type,
          data: base64,
          uri: URL.createObjectURL(file),
          name: file.name
        };

        if (isTutor) setTutorAttachments(prev => [...prev, att]);
        else setChatAttachments(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
           const base64 = (reader.result as string).split(',')[1];
           const att: Attachment = { type: 'audio', mimeType: 'audio/webm', data: base64, uri: URL.createObjectURL(blob), name: 'Voice Note' };
           if (activeSection === 'MY_TUTOR') setTutorAttachments(prev => [...prev, att]);
           else setChatAttachments(prev => [...prev, att]);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) { alert("Microphone permission denied."); }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleSearchBooks = async () => {
    if (!bookQuery.trim()) return;
    setIsSearchingBooks(true);
    setLibraryTab('DISCOVER');
    try {
      const results = await findBooks(bookQuery);
      setBooks(results);
    } catch (e) { console.error(e); } finally { setIsSearchingBooks(false); }
  };

  const toggleFavorite = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = favoriteBooks.some(b => b.title === book.title);
    let newFavs;
    if (exists) {
      newFavs = favoriteBooks.filter(b => b.title !== book.title);
    } else {
      newFavs = [...favoriteBooks, book];
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoToast({ visible: true, book });
      undoTimerRef.current = window.setTimeout(() => setUndoToast({ visible: false, book: null }), 5000);
    }
    setFavoriteBooks(newFavs);
  };

  const handleUndoFavorite = () => {
    if (undoToast.book) {
      setFavoriteBooks(prev => prev.filter(b => b.title !== undoToast.book!.title));
      setUndoToast({ visible: false, book: null });
    }
  };

  const handleDownloadBook = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingBook(book.title);
    try {
      const summary = await generateBookSummary(book.title, book.author);
      const fileData = btoa(unescape(encodeURIComponent(summary))); 
      const newFile = { name: `${book.title}_Guide.pdf`, data: fileData, mimeType: 'application/pdf' };
      setPdfFiles(prev => [...prev, newFile]);
      setDownloadToast(true);
      setTimeout(() => setDownloadToast(false), 3000);
    } catch (e) { console.error(e); } finally { setDownloadingBook(null); }
  };

  const handlePdfToolAction = async () => {
    if (pdfFiles.length === 0) return;
    setIsProcessingPdf(true);
    try {
      const result = await processDocument(
        pdfFiles.map(f => ({ data: f.data, mimeType: f.mimeType })),
        pdfToolTab
      );
      setProcessedText(result);
    } catch (e) { console.error(e); } finally { setIsProcessingPdf(false); }
  };
  
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        Array.from(e.target.files).forEach((file: File) => {
           const reader = new FileReader();
           reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              setPdfFiles(prev => [...prev, { name: file.name, data: base64, mimeType: file.type }]);
           };
           reader.readAsDataURL(file);
        });
     }
  };

  // -- RENDERERS --

  const renderHome = () => (
    <div className="space-y-8 pb-20 animate-fade-in-up">
      <div className={`p-8 rounded-3xl relative overflow-hidden ${darkMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white shadow-xl`}>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {userProfile.name.split(' ')[0]}!</h1>
          <p className="text-indigo-100 mb-6 max-w-lg">
            Ready to continue your studies in <span className="font-semibold">{userProfile.program}</span>? 
            Your AI tutor is ready to help you ace your {userProfile.level} exams.
          </p>
          <div className="flex gap-3">
             <button onClick={() => setActiveSection('COURSES')} className="px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
               Continue Learning
             </button>
             <button onClick={() => setActiveSection('QUIZ_HUB')} className="px-5 py-2.5 bg-indigo-500/30 text-white font-semibold rounded-xl hover:bg-indigo-500/50 transition-colors backdrop-blur-sm">
               Take a Quiz
             </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-12 translate-y-12">
          <Sparkles size={240} />
        </div>
      </div>

      <div>
        <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          <Newspaper size={20} className="text-indigo-500" /> Campus News
        </h2>
        {isLoadingNews ? (
           <div className="flex gap-4 overflow-x-auto pb-2">
             {[1,2,3].map(i => (
               <div key={i} className={`min-w-[280px] h-40 rounded-2xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
             ))}
           </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
             {news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`min-w-[280px] p-5 rounded-2xl border snap-start hover:scale-[1.02] transition-transform cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                >
                   <span className="text-xs font-bold text-indigo-500 mb-2 block">{item.date}</span>
                   <h3 className={`font-bold mb-2 line-clamp-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.headline}</h3>
                   <p className={`text-sm line-clamp-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.snippet}</p>
                </a>
             ))}
             {news.length === 0 && <div className="text-slate-500 italic">No news updates available.</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <TrendingUp size={20} className="text-emerald-500" /> Progress
          </h2>
          <div className="grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="text-2xl font-bold text-indigo-600">{stats.coursesCompleted}</div>
                <div className="text-xs text-slate-500">Topics Mastered</div>
             </div>
             <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="text-2xl font-bold text-purple-600">{stats.quizzesTaken}</div>
                <div className="text-xs text-slate-500">Quizzes Taken</div>
             </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveSection('MY_TUTOR')}
          className={`p-6 rounded-3xl border cursor-pointer hover:shadow-md transition-shadow ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="flex justify-between items-start mb-4">
             <h2 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
               <GraduationCap size={20} className="text-purple-500" /> My Tutor
             </h2>
             <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full font-bold">AI</span>
          </div>
          <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
             Need detailed lecture notes or stuck on a complex problem? Ask your personal professor.
          </p>
          <div className="w-full py-2 bg-purple-50 text-purple-700 rounded-xl text-center font-semibold text-sm">
             Open Tutor
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuizHub = () => (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Quiz Hub</h1>
        <p className="text-slate-500">Test your knowledge with AI-generated quizzes.</p>
      </div>

      <div className={`p-8 rounded-3xl shadow-sm border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
         <div className="mb-6">
           <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Select Subject</label>
           <select 
             value={selectedQuizSubject}
             onChange={(e) => setSelectedQuizSubject(e.target.value)}
             className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
           >
              {subjects.map((s, i) => (
                <option key={i} value={`${s.code}: ${s.title}`}>{s.code} - {s.title}</option>
              ))}
              <option value="General Knowledge">General Knowledge</option>
           </select>
         </div>

         <div className="mb-6">
           <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Number of Questions</label>
           <div className="flex flex-wrap gap-2">
             {[5, 10, 15, 20, 30, 50].map(num => (
               <button
                 key={num}
                 onClick={() => setQuestionCount(num)}
                 className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
                   questionCount === num 
                     ? 'bg-indigo-600 text-white border-indigo-600' 
                     : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                 }`}
               >
                 {num}
               </button>
             ))}
           </div>
         </div>

         <button 
           onClick={() => {
              onStartQuiz(selectedQuizSubject, questionCount);
           }}
           className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
         >
           <Sparkles size={20} /> Start Quiz
         </button>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="pb-20 animate-fade-in-up">
      <div className="mb-6 flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Digital Library</h1>
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setLibraryTab('DISCOVER')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${libraryTab === 'DISCOVER' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
            >Discover</button>
            <button 
              onClick={() => setLibraryTab('FAVORITES')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${libraryTab === 'FAVORITES' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
            >My Favorites</button>
         </div>
      </div>

      {libraryTab === 'DISCOVER' && (
        <>
          <div className="relative mb-8">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search for textbooks, papers, journals..."
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {books.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book, idx) => (
                   <BookCard 
                     key={`search-${idx}`} 
                     book={book} 
                     isFavorite={favoriteBooks.some(b => b.title === book.title)}
                     onToggleFav={(e) => toggleFavorite(book, e)}
                     onDownload={(e) => handleDownloadBook(book, e)}
                     darkMode={darkMode}
                     isDownloading={downloadingBook === book.title}
                   />
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold mb-4">Recommended for {userProfile.program}</h2>
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {recommendedBooks.map((book, idx) => (
                   <BookCard 
                     key={`rec-${idx}`} 
                     book={book}
                     isFavorite={favoriteBooks.some(b => b.title === book.title)}
                     onToggleFav={(e) => toggleFavorite(book, e)}
                     onDownload={(e) => handleDownloadBook(book, e)}
                     darkMode={darkMode}
                     isDownloading={downloadingBook === book.title}
                   />
                 ))}
              </div>
            )}
          </div>
        </>
      )}

      {libraryTab === 'FAVORITES' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteBooks.length === 0 ? (
               <div className="col-span-3 text-center py-20 text-slate-400">
                  <Heart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No favorites yet. Heart some books to see them here!</p>
               </div>
            ) : (
               favoriteBooks.map((book, idx) => (
                  <BookCard 
                     key={`fav-${idx}`} 
                     book={book}
                     isFavorite={true}
                     onToggleFav={(e) => toggleFavorite(book, e)}
                     onDownload={(e) => handleDownloadBook(book, e)}
                     darkMode={darkMode}
                     isDownloading={downloadingBook === book.title}
                   />
               ))
            )}
         </div>
      )}
    </div>
  );

  const renderPdfTools = () => (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in-up">
       <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">PDF & Document Tools</h1>
          <p className="text-slate-500">Scan, Merge, and Convert your study materials with AI.</p>
       </div>

       <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex border-b border-slate-200 dark:border-slate-800">
             {['OCR', 'MERGE', 'CONVERT'].map((tab) => (
                <button
                   key={tab}
                   onClick={() => { setPdfToolTab(tab as any); setPdfFiles([]); setProcessedText(""); }}
                   className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${pdfToolTab === tab ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   {tab === 'OCR' && <ScanText size={18} />}
                   {tab === 'MERGE' && <Layers size={18} />}
                   {tab === 'CONVERT' && <FileType2 size={18} />}
                   {tab === 'OCR' ? 'Scan to Text' : tab === 'MERGE' ? 'Merge Docs' : 'Convert PDF'}
                </button>
             ))}
          </div>

          <div className="p-8">
             {pdfFiles.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                   {pdfFiles.map((f, i) => (
                      <div key={i} className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                         <FileText size={14} /> {f.name}
                         <button onClick={() => setPdfFiles(prev => prev.filter((_, x) => x !== i))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                      </div>
                   ))}
                </div>
             )}

             <div 
               onClick={() => pdfInputRef.current?.click()}
               className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors mb-6"
             >
                <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" multiple accept="application/pdf,image/*" />
                <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-500 mb-4">
                   <Plus size={32} />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                   Click to upload PDF or Images
                </p>
                <p className="text-sm text-slate-500 mt-1">From device or saved library files</p>
             </div>

             <button 
               onClick={handlePdfToolAction}
               disabled={pdfFiles.length === 0 || isProcessingPdf}
               className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isProcessingPdf ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
               {isProcessingPdf ? 'Processing...' : `Process Documents (${pdfToolTab})`}
             </button>

             {processedText && (
                <div className="mt-8">
                   <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold">Result:</h3>
                      <button onClick={() => navigator.clipboard.writeText(processedText)} className="text-indigo-600 text-sm flex items-center gap-1"><Copy size={14}/> Copy</button>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm font-mono text-slate-700 dark:text-slate-300">
                      {processedText}
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex h-[calc(100vh-140px)] gap-4 animate-fade-in">
       {/* History Sidebar */}
       <div className={`w-64 rounded-2xl border hidden md:flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold flex justify-between items-center">
             <span>History</span>
             <button onClick={startNewChat} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Plus size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {chatSessions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { setChatMessages(s.messages); setCurrentSessionId(s.id); }}
                  className={`w-full text-left p-3 rounded-lg text-sm truncate ${currentSessionId === s.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   {s.title}
                </button>
             ))}
             {chatSessions.length === 0 && <p className="text-xs text-slate-400 p-4 text-center">No history yet</p>}
          </div>
       </div>

       {/* Chat Area */}
       <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden relative ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                   <Bot size={64} className="mb-4" />
                   <p>Ask anything about your studies...</p>
                </div>
             )}
             {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                      {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                   </div>
                   <div className={`max-w-[80%] space-y-2`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                        {msg.image && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                            <img src={msg.image} alt="AI Generated" className="w-full h-auto object-cover max-h-64 cursor-pointer" onClick={() => setPreviewImage(msg.image!)} />
                          </div>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                             {msg.attachments.map((att, i) => (
                               <div key={i} className="bg-black/20 rounded p-1">
                                  {att.type === 'image' && <img src={att.uri} className="w-20 h-20 object-cover rounded cursor-pointer" onClick={() => setPreviewImage(att.uri)} />}
                                  {att.type === 'pdf' && <div className="flex items-center gap-1 text-xs"><FileText size={12}/> {att.name}</div>}
                                  {att.type === 'audio' && <div className="flex items-center gap-1 text-xs"><Mic size={12}/> Voice Note</div>}
                               </div>
                             ))}
                          </div>
                        )}
                        {formatMathText(msg.text)}
                      </div>
                      
                      {msg.role === 'model' && (
                        <div className="flex gap-2">
                            {msg.image && (
                              <button 
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = msg.image!;
                                  link.download = 'generated-image.png';
                                  link.click();
                                }}
                                className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-500"
                              >
                                  <Download size={12} /> Download Image
                              </button>
                            )}
                            <button 
                                onClick={() => speakText(msg.text, `msg-${idx}`)}
                                className={`text-xs flex items-center gap-1 ${speakingTextId === `msg-${idx}` ? 'text-indigo-600 animate-pulse' : 'text-slate-500 hover:text-indigo-500'}`}
                            >
                                {speakingTextId === `msg-${idx}` ? <Square size={12} className="fill-current"/> : <Volume2 size={12} />}
                                {speakingTextId === `msg-${idx}` ? "Stop" : "Read"}
                            </button>
                        </div>
                      )}
                   </div>
                </div>
             ))}
             {isChatTyping && (
                <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Bot size={20} className="text-purple-600"/></div>
                   <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                   </div>
                </div>
             )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative z-10">
             {chatAttachments.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto p-1">
                   {chatAttachments.map((att, i) => (
                      <div key={i} className="relative group shrink-0">
                         <button onClick={() => setChatAttachments(prev => prev.filter((_, x) => x !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10"><X size={10}/></button>
                         {att.type === 'image' ? <img src={att.uri} className="w-16 h-16 object-cover rounded-lg border border-slate-200" /> 
                         : <div className="w-16 h-16 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-[10px] text-center p-1"><FileText size={20} className="mb-1"/>{att.name.slice(0, 10)}...</div>}
                      </div>
                   ))}
                </div>
             )}

             <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFileSelect(e)} />
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e)} />
                
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Paperclip size={20}/></button>
                <button onClick={() => cameraInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Camera size={20}/></button>
                
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your question..." 
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button 
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-indigo-600'}`}
                  >
                    <Mic size={20} />
                  </button>
                </div>

                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() && chatAttachments.length === 0}
                  className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all"
                >
                   <Send size={20} />
                </button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderTutor = () => (
    <div className="flex h-[calc(100vh-140px)] gap-4 animate-fade-in">
       {/* Tutor History Sidebar */}
       <div className={`w-64 rounded-2xl border hidden md:flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold flex justify-between items-center">
             <span>History</span>
             <button onClick={startNewTutorSession} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Plus size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {tutorSessions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { setTutorMessages(s.messages); setCurrentTutorSessionId(s.id); }}
                  className={`w-full text-left p-3 rounded-lg text-sm truncate ${currentTutorSessionId === s.id ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                   {s.title}
                </button>
             ))}
             {tutorSessions.length === 0 && <p className="text-xs text-slate-400 p-4 text-center">No tutor history yet</p>}
          </div>
       </div>

       {/* Tutor Chat Area */}
       <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden relative ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
         <div className="p-4 border-b flex justify-between items-center bg-purple-50/50 dark:bg-purple-900/10">
             <div className="flex items-center gap-2">
                 <GraduationCap className="text-purple-600" size={20}/>
                 <h2 className="font-bold dark:text-white">My Personal Tutor</h2>
             </div>
             <p className="text-xs text-slate-500">Detailed Explanations</p>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {tutorMessages.map((msg, idx) => (
               <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                     {msg.role === 'user' ? <User size={20} /> : <GraduationCap size={20} />}
                  </div>
                  <div className={`max-w-[85%] space-y-2`}>
                     <div className={`p-5 rounded-2xl text-sm leading-loose whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none dark:text-slate-200'}`}>
                        {msg.attachments && msg.attachments.length > 0 && (
                           <div className="flex flex-wrap gap-2 mb-3">
                              {msg.attachments.map((att, i) => (
                                 <div key={i} className="bg-black/10 rounded p-1">
                                    {att.type === 'image' && <img src={att.uri} className="w-32 h-32 object-cover rounded" onClick={() => setPreviewImage(att.uri)} />}
                                    {att.type === 'audio' && <div className="flex items-center gap-2 p-2 bg-white/20 rounded"><Volume2 size={14}/> Audio Note</div>}
                                 </div>
                              ))}
                           </div>
                        )}
                        {formatMathText(msg.text)}
                     </div>

                     {msg.role === 'model' && (
                        <button 
                            onClick={() => speakText(msg.text, `tut-${idx}`)}
                            className={`text-xs flex items-center gap-1 ${speakingTextId === `tut-${idx}` ? 'text-purple-600 animate-pulse' : 'text-slate-500 hover:text-purple-500'}`}
                        >
                            {speakingTextId === `tut-${idx}` ? <Square size={12} className="fill-current"/> : <Volume2 size={12} />}
                            {speakingTextId === `tut-${idx}` ? "Stop Reading" : "Read Aloud"}
                        </button>
                      )}
                  </div>
               </div>
            ))}
            {isTutorTyping && <div className="text-xs text-slate-400 ml-16">Tutor is writing detailed notes...</div>}
            <div ref={tutorMessagesEndRef} />
         </div>
         
         {/* Tutor Input */}
         <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            {tutorAttachments.length > 0 && (
               <div className="flex gap-2 mb-3 overflow-x-auto p-1">
                  {tutorAttachments.map((att, i) => (
                     <div key={i} className="relative group shrink-0">
                        <button onClick={() => setTutorAttachments(prev => prev.filter((_, x) => x !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 z-10"><X size={10}/></button>
                        {att.type === 'image' ? <img src={att.uri} className="w-16 h-16 object-cover rounded-lg border border-slate-200" /> : <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-lg"><FileText size={20}/></div>}
                     </div>
                  ))}
               </div>
            )}
            <div className="flex items-center gap-2">
               <input type="file" ref={tutorFileInputRef} className="hidden" multiple onChange={(e) => handleFileSelect(e, true)} />
               <input type="file" ref={tutorCameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, true)} />
               
               <button onClick={() => tutorFileInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><Paperclip size={20}/></button>
               <button onClick={() => tutorCameraInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><Camera size={20}/></button>
               
               <div className="flex-1 relative">
                  <input 
                     value={tutorInput}
                     onChange={(e) => setTutorInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(true)}
                     placeholder="Ask detailed question..." 
                     className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button 
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-purple-600'}`}
                  >
                    <Mic size={20} />
                  </button>
               </div>
               <button onClick={() => handleSendMessage(true)} disabled={(!tutorInput.trim() && tutorAttachments.length === 0)} className="p-3.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200"><Send size={20} /></button>
            </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar Nav */}
      <aside className={`w-20 lg:w-64 border-r flex flex-col shrink-0 transition-all ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <nav className="flex-1 py-6 space-y-2 px-3">
          {[
            { id: 'HOME', icon: BookOpen, label: 'Home' },
            { id: 'COURSES', icon: Layers, label: 'My Courses' },
            { id: 'MY_TUTOR', icon: GraduationCap, label: 'My Tutor' },
            { id: 'QUIZ_HUB', icon: BrainCircuit, label: 'Quiz Hub' },
            { id: 'LIBRARY', icon: Library, label: 'Library' },
            { id: 'PDF_TOOLS', icon: FileText, label: 'PDF Tools' },
            { id: 'CHAT', icon: MessageSquare, label: 'Assistant' },
            { id: 'STATS', icon: BarChart3, label: 'Progress' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as DashboardSection)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                activeSection === item.id 
                  ? 'bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-900/20 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={22} className={activeSection === item.id ? 'stroke-[2.5px]' : ''} />
              <span className="hidden lg:block">{item.label}</span>
              {activeSection === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 hidden lg:block"></div>}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
             onClick={() => setShowSettings(true)}
             className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
             <Settings size={22} /> <span className="hidden lg:block">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-8 relative ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
         {activeSection === 'HOME' && renderHome()}
         
         {activeSection === 'COURSES' && (
            <div className="animate-fade-in-up">
               <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold dark:text-white">Your Curriculum</h1>
                  <button onClick={() => setIsAddingSubject(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700">
                     <Plus size={18} /> Add Subject
                  </button>
               </div>
               
               {isAddingSubject && (
                  <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in">
                     <div className="flex gap-4">
                        <input 
                           placeholder="Code (e.g. MTH 101)" 
                           value={newSubjectCode}
                           onChange={e => setNewSubjectCode(e.target.value)}
                           className="w-1/3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                        />
                        <input 
                           placeholder="Title (e.g. General Mathematics)" 
                           value={newSubjectTitle}
                           onChange={e => setNewSubjectTitle(e.target.value)}
                           className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                        />
                        <button 
                           onClick={() => {
                              if(newSubjectCode && newSubjectTitle) {
                                 setSubjects(prev => [...prev, { code: newSubjectCode, title: newSubjectTitle }]);
                                 setNewSubjectCode(""); setNewSubjectTitle(""); setIsAddingSubject(false);
                              }
                           }}
                           className="px-6 bg-emerald-500 text-white rounded-xl font-bold"
                        >Add</button>
                     </div>
                  </div>
               )}

               {isLoadingSubjects ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                     <Loader2 className="animate-spin mb-2" size={32} />
                     <p>Loading your curriculum...</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                     {subjects.map((sub, i) => (
                        <div key={i} className={`p-6 rounded-2xl border hover:shadow-lg transition-all cursor-pointer group ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} onClick={() => onStartCourse(sub.title)}>
                           <div className="flex justify-between items-start mb-4">
                              <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold">{sub.code}</span>
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                 <ArrowRight size={16} />
                              </div>
                           </div>
                           <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight dark:text-white">{sub.title}</h3>
                           <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{sub.description}</p>
                           
                           <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setActiveSection('MY_TUTOR'); }} className="flex-1 text-xs font-semibold py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100">Ask Tutor</button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {activeSection === 'QUIZ_HUB' && renderQuizHub()}
         {activeSection === 'LIBRARY' && renderLibrary()}
         {activeSection === 'PDF_TOOLS' && renderPdfTools()}
         {activeSection === 'CHAT' && renderChat()}
         {activeSection === 'MY_TUTOR' && renderTutor()}
      </main>

      {/* Undo Toast */}
      {undoToast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-fade-in-up">
           <span>Added to Favorites</span>
           <button onClick={handleUndoFavorite} className="text-yellow-400 font-bold text-sm flex items-center gap-1 hover:text-yellow-300">
              <Undo2 size={16} /> Undo
           </button>
        </div>
      )}

      {/* Download Toast */}
      {downloadToast && (
        <div className="fixed top-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-fade-in-up flex items-center gap-3">
           <Check size={20} /> Guide saved to PDF Tools
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
         <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-lg" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full"><X size={24}/></button>
         </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold dark:text-white">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full dark:text-slate-400"><X size={20}/></button>
               </div>
               
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                     <span className="font-medium dark:text-slate-300">Dark Mode</span>
                     <button onClick={toggleDarkMode} className="text-indigo-600"><ToggleRight size={28} className={`transition-transform ${darkMode ? 'rotate-180' : ''}`}/></button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                     <span className="font-medium dark:text-slate-300">Notifications</span>
                     <button onClick={() => setSettings(s => ({...s, notifications: !s.notifications}))} className={settings.notifications ? "text-indigo-600" : "text-slate-300"}>
                        {settings.notifications ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                     </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                     <span className="font-medium dark:text-slate-300">Sound Effects</span>
                     <button onClick={() => setSettings(s => ({...s, soundEffects: !s.soundEffects}))} className={settings.soundEffects ? "text-indigo-600" : "text-slate-300"}>
                        {settings.soundEffects ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                     </button>
                  </div>
                  
                  <hr className="border-slate-100 dark:border-slate-800 my-4" />
                  
                  <button onClick={() => { setShowSettings(false); setShowEditProfile(true); }} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center justify-center gap-2">
                     <Edit size={18} /> Edit Profile
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-fade-in-up">
               <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
               <div className="space-y-4">
                  <div>
                     <label className="text-sm font-bold text-slate-700">Full Name</label>
                     <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 mt-1" />
                  </div>
                  <div>
                     <label className="text-sm font-bold text-slate-700">Course / Program</label>
                     <div className="relative mt-1">
                        <input 
                           value={programSearch || editProgram} 
                           onChange={e => { setProgramSearch(e.target.value); setEditProgram(e.target.value); }} 
                           placeholder="Search course..."
                           className="w-full p-3 rounded-xl border border-slate-200"
                        />
                        {availablePrograms.length > 0 && programSearch && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-xl z-10">
                              {availablePrograms.filter(p => p.toLowerCase().includes(programSearch.toLowerCase())).map((p, i) => (
                                 <button key={i} onClick={() => { setEditProgram(p); setProgramSearch(""); }} className="w-full text-left p-3 hover:bg-slate-50 text-sm">{p}</button>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
                  <div>
                     <label className="text-sm font-bold text-slate-700">Level</label>
                     <select value={editLevel} onChange={e => setEditLevel(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 mt-1 bg-white">
                        <option>100 Level</option><option>200 Level</option><option>300 Level</option><option>400 Level</option><option>500 Level</option>
                     </select>
                  </div>
               </div>
               <div className="mt-8 flex gap-3">
                  <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button onClick={handleSaveProfile} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Save Changes</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
