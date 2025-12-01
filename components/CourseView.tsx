
import React, { useEffect, useState } from 'react';
import { CourseOutline, Chapter } from '../types';
import { generateChapterContent } from '../services/geminiService';
import { ChevronRight, CheckCircle, Clock, BookOpen, AlertCircle, Search } from 'lucide-react';

interface CourseViewProps {
  course: CourseOutline;
  onTakeQuiz: () => void;
  onOpenTutor: () => void;
  onBack: () => void;
}

// Utility to improve readability of formulas (e.g. 2^2 -> 2²)
const formatMathText = (text: string) => {
  if (!text) return "";
  
  const supers: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
  };
  
  return text
    // Replace ^(digit) with superscript
    .replace(/\^([0-9nxy+\-=()]+)/g, (_, match) => {
      return match.split('').map((char: string) => supers[char] || char).join('');
    })
    // Replace typical ugly math notation
    .replace(/sqrt\(/g, '√(')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\* /g, '× '); // Only replace asterisk if surrounded by space to avoid markdown issues
};

const CourseView: React.FC<CourseViewProps> = ({ course, onTakeQuiz, onOpenTutor, onBack }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [contentCache, setContentCache] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeChapter = course.chapters[activeChapterIndex];

  // Filter chapters based on search
  const filteredChapters = course.chapters.map((ch, idx) => ({ ...ch, originalIndex: idx }))
    .filter(ch => 
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ch.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  useEffect(() => {
    const fetchContent = async () => {
      if (contentCache[activeChapterIndex]) return;

      setIsLoading(true);
      setError(null);
      try {
        const content = await generateChapterContent(course.title, activeChapter.title);
        setContentCache(prev => ({ ...prev, [activeChapterIndex]: content }));
      } catch (err) {
        setError("Failed to load chapter content. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [activeChapterIndex, course.title, activeChapter.title, contentCache]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
      
      {/* Sidebar: Chapter List */}
      <aside className="w-full md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto shrink-0 z-10 flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2">
            &larr; BACK TO DASHBOARD
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{course.title}</h2>
          <p className="text-sm text-slate-500 mt-2">{course.difficulty} • {course.chapters.length} Chapters</p>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {filteredChapters.map((chapter) => (
            <button
              key={chapter.originalIndex}
              onClick={() => setActiveChapterIndex(chapter.originalIndex)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${
                activeChapterIndex === chapter.originalIndex 
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm dark:bg-indigo-900/30 dark:border-indigo-800' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                 activeChapterIndex === chapter.originalIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
              }`}>
                {chapter.originalIndex + 1}
              </div>
              <div>
                <div className={`text-sm font-semibold ${activeChapterIndex === chapter.originalIndex ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {chapter.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1 mt-1">
                  <Clock size={10} /> {chapter.durationMinutes} min
                </div>
              </div>
            </button>
          ))}
          {filteredChapters.length === 0 && (
             <p className="text-sm text-slate-500 text-center py-4">No topics found matching "{searchQuery}"</p>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto space-y-3">
          <button 
            onClick={onOpenTutor}
            className="w-full py-3 px-4 bg-purple-50 text-purple-700 font-semibold rounded-xl hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={18} /> Ask Socratic Tutor
          </button>
          <button 
            onClick={onTakeQuiz}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <CheckCircle size={18} /> Take Quiz
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 relative p-6 md:p-12">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 min-h-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          
          <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              <span className="text-indigo-500 font-mono text-lg mr-2">Ch.{activeChapterIndex + 1}</span> 
              {activeChapter.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">{activeChapter.description}</p>
          </div>

          {isLoading ? (
             <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5"></div>
             </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertCircle size={48} className="mb-4" />
              <p className="font-semibold">{error}</p>
              <button 
                onClick={() => setContentCache(prev => { const n = {...prev}; delete n[activeChapterIndex]; return n; })}
                className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
              {/* Simple Markdown Rendering with Math Formatting */}
              {contentCache[activeChapterIndex]?.split('\n').map((rawLine, i) => {
                const line = formatMathText(rawLine);
                
                if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-8 mb-4">{line.replace('# ', '')}</h1>
                if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-semibold mt-6 mb-3 text-slate-800 dark:text-slate-200">{line.replace('## ', '')}</h2>
                if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-slate-700 dark:text-slate-300">{line.replace('### ', '')}</h3>
                if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-700 dark:text-slate-300 mb-1">{line.replace('- ', '')}</li>
                if (line.trim() === '') return <div key={i} className="h-4"></div>
                
                // Bold text parser
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={i} className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {parts.map((part, j) => {
                       if (part.startsWith('**') && part.endsWith('**')) {
                         return <strong key={j} className="text-slate-900 dark:text-white font-semibold">{part.slice(2, -2)}</strong>;
                       }
                       return part;
                    })}
                  </p>
                )
              })}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <button 
              onClick={() => setActiveChapterIndex(prev => Math.max(0, prev - 1))}
              disabled={activeChapterIndex === 0}
              className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 font-medium"
            >
              Previous
            </button>
            <button 
              onClick={() => setActiveChapterIndex(prev => Math.min(course.chapters.length - 1, prev + 1))}
              disabled={activeChapterIndex === course.chapters.length - 1}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              Next Chapter <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseView;
