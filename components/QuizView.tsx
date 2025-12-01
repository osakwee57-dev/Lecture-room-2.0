
import React, { useState, useEffect, useRef } from 'react';
import { Quiz } from '../types';
import { generateQuiz, generateBatchQuiz } from '../services/geminiService';
import { Check, X, Award, ArrowRight, Timer } from 'lucide-react';

interface QuizViewProps {
  courseTitle: string;
  customConfig?: {
    topic: string;
    level: string;
    count: number;
    durationSeconds?: number;
  };
  onComplete: (score: number) => void;
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
    .replace(/\^([0-9nxy+\-=()]+)/g, (_, match) => {
      return match.split('').map((char: string) => supers[char] || char).join('');
    })
    .replace(/\^([a-z])/g, (_, c) => { const map: Record<string, string> = {x:'ˣ', y:'ʸ', n:'ⁿ'}; return map[c] || `^${c}`; })
    .replace(/([A-Z][a-z]?)(\d+)/g, (_, el, num) => {
        const subs = num.split('').map((c: string) => '₀₁₂₃₄₅₆₇₈₉'[parseInt(c)]).join('');
        return `${el}${subs}`;
    })
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

const QuizView: React.FC<QuizViewProps> = ({ courseTitle, customConfig, onComplete, onBack }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  
  const [isAnsweredImmediate, setIsAnsweredImmediate] = useState(false);
  const [immediateScore, setImmediateScore] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTestMode = !!customConfig?.durationSeconds;

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        let data: Quiz;
        if (customConfig) {
          data = await generateBatchQuiz(customConfig.topic, customConfig.level, customConfig.count);
        } else {
          data = await generateQuiz(courseTitle);
        }
        
        // Ensure we respect the count if API returned more/less
        if (customConfig && data.questions.length > customConfig.count) {
            data.questions = data.questions.slice(0, customConfig.count);
        }
        
        setQuiz(data);
        setUserAnswers(new Array(data.questions.length).fill(null));
        
        // Initialize Timer if Test Mode
        if (customConfig?.durationSeconds) {
          // Set absolute end time
          endTimeRef.current = Date.now() + (customConfig.durationSeconds * 1000);
          setTimeLeft(customConfig.durationSeconds);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [courseTitle, customConfig]);

  // Timer Logic using Date delta
  useEffect(() => {
    if (isTestMode && !isSubmitted && endTimeRef.current) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((endTimeRef.current! - now) / 1000);
        
        if (diff <= 0) {
          setTimeLeft(0);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleFinishTest();
        } else {
          setTimeLeft(diff);
        }
      }, 500);
    }
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isSubmitted, isTestMode]);

  const handleOptionClick = (optionIndex: number) => {
    if (isSubmitted || (!isTestMode && isAnsweredImmediate)) return;

    if (isTestMode) {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = optionIndex;
      setUserAnswers(newAnswers);
    } else {
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = optionIndex;
      setUserAnswers(newAnswers);
      setIsAnsweredImmediate(true);
      if (quiz && optionIndex === quiz.questions[currentQuestionIndex].correctAnswerIndex) {
        setImmediateScore(s => s + 1);
      }
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      if (!isTestMode) setIsAnsweredImmediate(false);
    } else {
      if (!isTestMode) handleFinishTest();
    }
  };

  const handleFinishTest = () => {
    if (!quiz || isSubmitted) return;
    setIsSubmitted(true);
    setIsReviewMode(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    let finalScore = 0;
    quiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswerIndex) finalScore++;
    });

    onComplete(finalScore);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getOptionStyle = (qIndex: number, optIndex: number) => {
    if (!quiz) return "";
    const q = quiz.questions[qIndex];
    const userSelected = userAnswers[qIndex] === optIndex;
    
    // QUIZ MODE (Immediate) or REVIEW MODE
    if ((!isTestMode && isAnsweredImmediate) || (isTestMode && isSubmitted)) {
      if (optIndex === q.correctAnswerIndex) {
         return "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300";
      }
      if (userSelected && optIndex !== q.correctAnswerIndex) {
         return "border-2 border-red-500 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-300";
      }
      return "border-slate-100 opacity-50 dark:border-slate-800 dark:opacity-50";
    }

    // TEST MODE (Blind) or Unanswered
    if (userSelected) {
      return "border-2 border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500";
    }

    return "border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-slate-800 dark:text-slate-300";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium">Generating your {customConfig?.count || 5} questions...</p>
      </div>
    );
  }

  if (!quiz) return <div className="text-center p-12 text-red-500">Failed to load quiz.<button onClick={onBack}>Back</button></div>;

  // RESULT VIEW
  if (isSubmitted && !isReviewMode) {
    const finalScore = userAnswers.reduce((acc, ans, idx) => (ans === quiz.questions[idx].correctAnswerIndex ? (acc || 0) + 1 : acc), 0) || 0;
    const percentage = Math.round((finalScore / quiz.questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 text-center mt-12 animate-fade-in-up">
        <div className="inline-flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-full text-yellow-500 mb-6">
          <Award size={64} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{isTestMode ? "Test Submitted!" : "Quiz Complete!"}</h2>
        <div className="text-6xl font-extrabold text-indigo-600 dark:text-indigo-400 my-6">{percentage}%</div>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
          You got <strong className="text-slate-900 dark:text-white">{finalScore}</strong> out of <strong className="text-slate-900 dark:text-white">{quiz.questions.length}</strong> correct.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl">Back to Dashboard</button>
          <button onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }} className="px-8 py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl">Review Answers</button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-950 py-2 z-10">
        <div>
           {!isSubmitted && <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 mb-1">&larr; Quit</button>}
           {isSubmitted && <button onClick={() => setIsReviewMode(false)} className="text-xs text-indigo-500 font-bold mb-1">&larr; Back to Score</button>}
           <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">{quiz.title}</h2>
        </div>
        <div className="flex items-center gap-4">
           {isTestMode && timeLeft !== null && (
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
               <Timer size={16} />{formatTime(timeLeft)}
             </div>
           )}
           <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
             Q {currentQuestionIndex + 1} / {quiz.questions.length}
           </span>
        </div>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6 leading-relaxed">
          {formatMathText(currentQuestion.question)}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const style = getOptionStyle(currentQuestionIndex, idx);
            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={isSubmitted || (!isTestMode && isAnsweredImmediate)}
                className={`w-full text-left p-4 rounded-xl transition-all font-medium text-lg flex items-center justify-between ${style}`}
              >
                <span>{formatMathText(option)}</span>
                {isSubmitted && idx === currentQuestion.correctAnswerIndex && <Check className="text-emerald-500" size={20} />}
                {isSubmitted && userAnswers[currentQuestionIndex] === idx && idx !== currentQuestion.correctAnswerIndex && <X className="text-red-500" size={20} />}
              </button>
            );
          })}
        </div>

        {(isSubmitted || (!isTestMode && isAnsweredImmediate)) && (
          <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm leading-relaxed dark:bg-blue-900/30 dark:text-blue-200 animate-fade-in">
            <strong>Explanation:</strong> {formatMathText(currentQuestion.explanation)}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Previous
        </button>

        {!isSubmitted ? (
            currentQuestionIndex < quiz.questions.length - 1 ? (
              <button onClick={handleNext} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2">Next <ArrowRight size={20} /></button>
            ) : (
              <button onClick={handleFinishTest} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2">Submit <Check size={20} /></button>
            )
        ) : (
             <button 
               onClick={() => {
                  if (currentQuestionIndex < quiz.questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
                  else setIsReviewMode(false);
               }}
               className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
             >
               {currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "View Score"} <ArrowRight size={20} />
             </button>
        )}
      </div>
    </div>
  );
};

export default QuizView;
