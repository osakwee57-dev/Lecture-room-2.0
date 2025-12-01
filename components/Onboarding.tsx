
import React, { useState, useEffect } from 'react';
import { generateDegreePrograms } from '../services/geminiService';
import { Book, GraduationCap, User, ChevronRight, Loader2, Mail, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingProps {
  universityName: string;
  onComplete: (profile: Omit<UserProfile, 'university'>) => void;
  onBack: () => void;
}

type Step = 'PROGRAM' | 'LEVEL' | 'PROFILE';

export const Onboarding: React.FC<OnboardingProps> = ({ universityName, onComplete, onBack }) => {
  const [step, setStep] = useState<Step>('PROGRAM');
  const [programs, setPrograms] = useState<string[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  
  // Search state for programs
  const [programSearch, setProgramSearch] = useState("");
  
  // Form Data
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [levelOptions, setLevelOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      setIsLoadingPrograms(true);
      try {
        const list = await generateDegreePrograms(universityName);
        setPrograms(list);
      } catch (e) {
        setPrograms(["Computer Science", "Economics", "Mass Communication", "Law", "Biochemistry"]);
      } finally {
        setIsLoadingPrograms(false);
      }
    };
    loadPrograms();
  }, [universityName]);

  const filteredPrograms = programs.filter(p => p.toLowerCase().includes(programSearch.toLowerCase()));

  // Helper to determine course duration based on Nigerian standards
  const getCourseLevels = (course: string): string[] => {
    const c = course.toLowerCase();
    let years = 4; // Default to 4 years

    // 6 Year Courses
    if (c.includes("medicine") || c.includes("surgery") || c.includes("veterinary") || c.includes("optometry") || c.includes("architecture")) {
      years = 6;
    } 
    // 5 Year Courses
    else if (c.includes("engineering") || c.includes("law") || c.includes("pharmacy") || c.includes("nursing") || c.includes("agriculture") || c.includes("tech")) {
      years = 5;
    }

    const levels = [];
    for (let i = 1; i <= years; i++) {
      levels.push(`${i}00 Level`);
    }
    return levels;
  };

  const handleProgramSelect = (prog: string) => {
    setSelectedProgram(prog);
    const levels = getCourseLevels(prog);
    setLevelOptions(levels);
    setStep('LEVEL');
  };

  const handleLevelSelect = (lvl: string) => {
    setSelectedLevel(lvl);
    setStep('PROFILE');
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      onComplete({
        program: selectedProgram,
        level: selectedLevel,
        name,
        email
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">{universityName}</h2>
            <p className="text-indigo-200 text-sm">Student Registration</p>
          </div>
          <div className="text-sm font-medium bg-indigo-500 px-3 py-1 rounded-full">
            Step {step === 'PROGRAM' ? 1 : step === 'LEVEL' ? 2 : 3} of 3
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {step === 'PROGRAM' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Book className="text-indigo-600" size={20} /> Select Your Course
                </h3>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search course (e.g. Microbiology)..." 
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              {isLoadingPrograms ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>Fetching available programs...</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {/* Custom option if search exists and no direct match */}
                  {programSearch && !filteredPrograms.some(p => p.toLowerCase() === programSearch.toLowerCase()) && (
                     <button
                      onClick={() => handleProgramSelect(programSearch)}
                      className="w-full text-left p-4 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all flex justify-between items-center group shadow-sm mb-2"
                    >
                      <div>
                        <span className="font-bold text-indigo-700 block">Use "{programSearch}"</span>
                        <span className="text-xs text-indigo-500">Tap to select this custom course</span>
                      </div>
                      <ArrowRight size={16} className="text-indigo-500" />
                    </button>
                  )}

                  {filteredPrograms.map((prog, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleProgramSelect(prog)}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex justify-between items-center group"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-indigo-700">{prog}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                  
                  {filteredPrograms.length === 0 && !programSearch && (
                    <div className="text-center py-8 text-slate-400">No courses found.</div>
                  )}
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100 mt-4">
                 <button 
                   onClick={onBack}
                   className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium"
                 >
                   <ArrowLeft size={16} /> Change University
                 </button>
              </div>
            </div>
          )}

          {step === 'LEVEL' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-indigo-600" size={20} /> What level are you in?
              </h3>
              <p className="text-sm text-slate-500 -mt-4">
                Based on <strong>{selectedProgram}</strong> duration.
              </p>
              <div className="grid gap-3">
                {levelOptions.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleLevelSelect(lvl)}
                    className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-slate-700 hover:text-indigo-700"
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('PROGRAM')} className="text-sm text-slate-400 hover:text-slate-600">
                &larr; Back to Programs
              </button>
            </div>
          )}

          {step === 'PROFILE' && (
            <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User className="text-indigo-600" size={20} /> Complete Your Profile
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    placeholder="e.g. Adebayo Ogunlesi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                      placeholder="e.g. adebayo@example.com"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">This will be used to login on other devices.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setStep('LEVEL')}
                  className="px-6 py-3 rounded-xl text-slate-500 hover:bg-slate-100 font-medium"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Create Student Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
