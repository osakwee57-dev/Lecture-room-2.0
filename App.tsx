

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CourseView from './components/CourseView';
import QuizView from './components/QuizView';
import TutorChat from './components/TutorChat';
import { UniversitySelection } from './components/UniversitySelection';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { generateCourseOutline } from './services/geminiService';
import { CourseOutline, LearningStats, ViewState, UserProfile } from './types';
import { GraduationCap, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [courseData, setCourseData] = useState<CourseOutline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Quiz Config State
  const [quizConfig, setQuizConfig] = useState<{ topic: string; count: number; durationMinutes?: number } | null>(null);
  
  // Fake persistent stats
  const [stats, setStats] = useState<LearningStats>({
    coursesCompleted: 0,
    quizzesTaken: 0,
    averageScore: 0,
    hoursLearned: 0
  });

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Check for existing session on mount
  useEffect(() => {
    const lastEmail = localStorage.getItem('gemini_academy_last_user');
    if (lastEmail) {
      handleLogin(lastEmail);
    }
  }, []);

  const handleUniSelect = (uni: string) => {
    // Partially initialize profile with just uni, then move to next flow
    setUserProfile({
      university: uni,
      program: '',
      level: '',
      name: '',
      email: ''
    });
    setView('ONBOARDING_FLOW');
  };

  const handleOnboardingComplete = (details: Omit<UserProfile, 'university'>) => {
    if (userProfile) {
      const fullProfile = { ...userProfile, ...details };
      setUserProfile(fullProfile);
      
      // Save to localStorage
      try {
        localStorage.setItem(`gemini_academy_user_${details.email}`, JSON.stringify(fullProfile));
        localStorage.setItem('gemini_academy_last_user', details.email); // Save active session
      } catch (e) {
        console.error("Failed to save to local storage", e);
      }
      
      setView('DASHBOARD');
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    try {
      localStorage.setItem(`gemini_academy_user_${updatedProfile.email}`, JSON.stringify(updatedProfile));
    } catch (e) {
      console.error("Failed to update local storage", e);
    }
  };

  const handleLogin = (email: string) => {
    try {
      const stored = localStorage.getItem(`gemini_academy_user_${email}`);
      if (stored) {
        const profile = JSON.parse(stored);
        setUserProfile(profile);
        localStorage.setItem('gemini_academy_last_user', email); // Remember session
        setView('DASHBOARD');
      } else {
        // If called automatically, don't alert, just stay on landing
        if (view !== 'LANDING' && view !== 'ONBOARDING_UNI') {
           alert("No account found with this email. Please register first.");
        }
      }
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = () => {
    setUserProfile(null); 
    localStorage.removeItem('gemini_academy_last_user');
    setView('LANDING');
  };

  const handleStartCourse = async (topic: string) => {
    if (!userProfile) return;
    setIsLoading(true);
    try {
      const context = `Student: ${userProfile.name}. ${userProfile.level} ${userProfile.program} at ${userProfile.university}`;
      const outline = await generateCourseOutline(topic, context);
      setCourseData(outline);
      setView('COURSE');
    } catch (error) {
      alert("Could not generate course. Please verify API Key or try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (topic: string, count: number, durationMinutes?: number) => {
    setQuizConfig({ topic, count, durationMinutes });
    setView('QUIZ');
  };

  const handleQuizComplete = (finalScore: number) => {
    setStats(prev => ({
      ...prev,
      quizzesTaken: prev.quizzesTaken + 1,
      averageScore: prev.quizzesTaken === 0 ? finalScore * 20 : Math.round((prev.averageScore * prev.quizzesTaken + (finalScore * 20)) / (prev.quizzesTaken + 1))
    }));
  };

  // 1. Landing Page
  if (view === 'LANDING') {
    return <LandingPage onGetStarted={() => setView('ONBOARDING_UNI')} onLogin={() => setView('LOGIN')} />;
  }

  // 2. Login View
  if (view === 'LOGIN') {
    return <Login onLogin={handleLogin} onBack={() => setView('LANDING')} />;
  }

  // 3. University Selection
  if (view === 'ONBOARDING_UNI') {
    return <UniversitySelection onSelect={handleUniSelect} onLoginClick={() => setView('LOGIN')} />;
  }

  // 4. Onboarding Wizard (Program -> Level -> Profile)
  if (view === 'ONBOARDING_FLOW' && userProfile) {
    return (
      <Onboarding 
        universityName={userProfile.university}
        onComplete={handleOnboardingComplete}
        onBack={() => setView('ONBOARDING_UNI')}
      />
    );
  }

  // 5. Main App Layout
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 page-enter ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Navbar */}
      <header className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div 
          className="flex items-center gap-2 font-bold text-xl text-indigo-600 cursor-pointer pl-10 md:pl-0"
          onClick={() => setView('DASHBOARD')}
        >
          <GraduationCap />
          <span>Lecture<span className={darkMode ? 'text-white' : 'text-slate-900'}>Room</span></span>
        </div>
        {userProfile && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-xs text-slate-500 dark:text-slate-400">
               <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{userProfile.name}</span>
               <span>{userProfile.program}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {view === 'DASHBOARD' && userProfile && (
          <Dashboard 
            userProfile={userProfile}
            stats={stats} 
            onStartCourse={handleStartCourse} 
            onStartQuiz={handleStartQuiz}
            isLoadingCourse={isLoading} 
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
          />
        )}

        {view === 'COURSE' && courseData && (
          <CourseView 
            course={courseData} 
            onTakeQuiz={() => {
              // Standard quiz from course
              setQuizConfig(null);
              setView('QUIZ');
            }}
            onOpenTutor={() => setShowTutor(true)}
            onBack={() => setView('DASHBOARD')}
          />
        )}

        {view === 'QUIZ' && (
          <QuizView 
            courseTitle={courseData?.title || quizConfig?.topic || "General"} 
            customConfig={quizConfig ? { 
               ...quizConfig, 
               level: userProfile?.level || "University" 
            } : undefined}
            onComplete={handleQuizComplete}
            onBack={() => setView('DASHBOARD')} // Simplified back nav
          />
        )}
      </div>

      {/* Tutor Overlay */}
      {showTutor && courseData && (
        <TutorChat 
          topic={courseData.topic} 
          onClose={() => setShowTutor(false)} 
        />
      )}
    </div>
  );
};

export default App;