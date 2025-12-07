
import React from 'react';
import { GraduationCap, BookOpen, BrainCircuit, Users, ArrowRight, Library, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 scroll-smooth">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl text-indigo-600">
            <GraduationCap size={32} />
            <span>LectureRoom</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-slate-600 hover:text-indigo-600 font-medium px-4 py-2">
              Log In
            </button>
            <button onClick={onGetStarted} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-12 md:pt-20 pb-20 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 z-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100">
              <Sparkles size={16} />
              <span>Powered by Gemini 2.5 Flash</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Your Personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                AI University.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Master your courses with an adaptive AI tutor, personalized curriculums, and standard lecture notes tailored for Nigerian universities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <button onClick={onGetStarted} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                Start Learning Now <ArrowRight size={20} />
              </button>
              <button onClick={onLogin} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center">
                Student Login
              </button>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 pt-4">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-indigo-${i*100 + 100}`}></div>
                ))}
              </div>
              <p>Trusted by 5,000+ students across Nigeria</p>
            </div>
          </div>
          
          <div className="relative z-10 mt-10 lg:mt-0">
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 rotate-2 hover:rotate-0 transition-transform duration-500">
               {/* Abstract UI representation */}
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                   <BrainCircuit size={24} />
                 </div>
                 <div>
                   <h3 className="font-bold text-lg text-slate-900">AI Tutor Session</h3>
                   <p className="text-sm text-slate-500">Topic: Advanced Calculus</p>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-xl rounded-tl-none border border-slate-100 text-sm leading-relaxed text-slate-700">
                   To solve this differential equation, we first need to identify the integrating factor. The formula is e^(∫P(x)dx). Shall we calculate that first?
                 </div>
                 <div className="p-4 bg-indigo-600 text-white rounded-xl rounded-tr-none text-sm ml-auto max-w-[80%]">
                   Yes, please explain step-by-step.
                 </div>
                 <div className="p-4 bg-slate-50 rounded-xl rounded-tl-none border border-slate-100 text-sm leading-relaxed text-slate-700">
                   <strong>Step 1:</strong> Identify P(x) from the standard form dy/dx + P(x)y = Q(x). <br/><br/>
                   In your equation, P(x) = 2/x. <br/>
                   Therefore, ∫P(x)dx = 2ln(x) = ln(x²).
                 </div>
               </div>
            </div>
            {/* Background blobs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Everything you need to ace your exams</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">LectureRoom provides a complete ecosystem for university success, powered by advanced Artificial Intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen size={32} className="text-indigo-600" />,
                title: "Curriculum Aligned",
                desc: "Content tailored to your specific university, faculty, and level. From UNILAG to ABU, we've got you covered."
              },
              {
                icon: <Users size={32} className="text-purple-600" />,
                title: "Socratic AI Tutor",
                desc: "A tutor that guides you to the answer rather than just giving it. Perfect for deep understanding and retention."
              },
              {
                icon: <Library size={32} className="text-emerald-600" />,
                title: "Digital Library",
                desc: "Access recommended textbooks, summaries, and academic resources instantly within the app."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl border border-slate-100 transition-all">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">How LectureRoom Works</h2>
              <div className="space-y-8">
                {[
                  { title: "Select Your Institution", desc: "Choose from our database of Nigerian public and private universities." },
                  { title: "Define Your Program", desc: "Input your course of study and current level (e.g., Computer Science, 200L)." },
                  { title: "Start Learning", desc: "Get instant access to generated lecture notes, quizzes, and your personal AI tutor." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-indigo-200">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
               {/* Visual representation of dashboard */}
               <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                 <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500"></div>
                 </div>
                 <div className="text-xs text-slate-400">LectureRoom Dashboard</div>
               </div>
               <div className="space-y-4">
                 <div className="h-24 bg-indigo-600/20 rounded-xl w-full border border-indigo-500/30 flex items-center p-4 gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center"><GraduationCap/></div>
                    <div>
                      <div className="h-4 w-32 bg-indigo-400/30 rounded mb-2"></div>
                      <div className="h-3 w-20 bg-indigo-400/20 rounded"></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="h-32 bg-slate-700 rounded-xl"></div>
                   <div className="h-32 bg-slate-700 rounded-xl"></div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6 text-slate-900">Ready to transform your grades?</h2>
          <p className="text-xl text-slate-600 mb-10">Join thousands of students using AI to smarter, not harder.</p>
          <button onClick={onGetStarted} className="px-10 py-5 bg-indigo-600 text-white rounded-full font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <GraduationCap size={24} className="text-indigo-600" />
            <span>LectureRoom</span>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} LectureRoom AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
