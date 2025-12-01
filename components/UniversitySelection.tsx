
import React, { useState } from 'react';
import { School, Search, Building2, GraduationCap, LogIn, ArrowRight } from 'lucide-react';

interface UniversitySelectionProps {
  onSelect: (name: string) => void;
  onLoginClick: () => void;
}

const PUBLIC_UNIVERSITIES = [
  "University of Lagos (UNILAG)",
  "Lagos State University (LASU)",
  "Lagos State University of Science and Technology (LASUSTECH)",
  "University of Ibadan (UI)",
  "Obafemi Awolowo University (OAU)",
  "Ahmadu Bello University (ABU)",
  "University of Nigeria, Nsukka (UNN)",
  "University of Ilorin (UNILORIN)",
  "Federal University of Technology, Akure (FUTA)",
  "Federal University of Technology, Minna (FUTMINNA)",
  "University of Benin (UNIBEN)",
  "Rivers State University (RSU)",
  "University of Port Harcourt (UNIPORT)",
  "University of Jos (UNIJOS)",
  "Federal University of Technology, Owerri (FUTO)",
  "Bayero University Kano (BUK)",
  "Yaba College of Technology (YABATECH)"
];

const PRIVATE_UNIVERSITIES = [
  "Covenant University",
  "Babcock University",
  "Pan-Atlantic University (PAU)",
  "Afe Babalola University (ABUAD)",
  "Caleb University",
  "Anchor University, Lagos",
  "Augustine University, Ilara",
  "Eko University of Medicine and Health Sciences",
  "Landmark University",
  "Igbinedion University",
  "Nile University of Nigeria",
  "Bowen University",
  "Redeemer's University",
  "American University of Nigeria (AUN)",
  "Baze University",
  "Veritas University",
  "Bells University of Technology"
];

const getInitials = (name: string) => {
  const parts = name.split(/[\s,()]+/); // Split by space, comma, parenthesis
  let initials = parts[0][0];
  if (parts.length > 1 && parts[1]) {
    // If second word is 'of' or 'University', skip it or take next
    if (['of', 'University', 'State'].includes(parts[1]) && parts[2]) {
        initials += parts[2][0];
    } else {
        initials += parts[1][0];
    }
  }
  return initials.toUpperCase();
};

const getColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const UniversitySelection: React.FC<UniversitySelectionProps> = ({ onSelect, onLoginClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

  const universities = activeTab === 'public' ? PUBLIC_UNIVERSITIES : PRIVATE_UNIVERSITIES;
  const filtered = universities.filter(u => u.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans relative">
      {/* Login Toggle */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <button 
          onClick={onLoginClick}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm"
        >
          <LogIn size={18} /> Login
        </button>
      </div>

      <div className="max-w-4xl w-full space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full text-indigo-700 mb-2 shadow-sm">
            <School size={48} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Select Your Institution
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Find your university to access your personalized lecture room.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
             <input 
                type="text" 
                placeholder="Search university..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl border-none focus:ring-0 text-slate-900 placeholder-slate-400 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
             <button 
                onClick={() => setActiveTab('public')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'public' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Public
             </button>
             <button 
                onClick={() => setActiveTab('private')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'private' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Private
             </button>
           </div>
        </div>

        {/* Custom Selection Option if searching */}
        {searchTerm.length > 0 && !filtered.some(u => u.toLowerCase() === searchTerm.toLowerCase()) && (
          <button 
            onClick={() => onSelect(searchTerm)}
            className="w-full bg-indigo-600 text-white p-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <School size={20} />
              </div>
              <div className="text-left">
                <div className="font-semibold">Select "{searchTerm}"</div>
                <div className="text-xs text-indigo-200">Click to use this university</div>
              </div>
            </div>
            <ArrowRight className="text-indigo-200 group-hover:text-white" />
          </button>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {filtered.map((uni, idx) => (
             <button 
                key={idx}
                onClick={() => onSelect(uni)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 transition-all text-left group flex items-center gap-4"
             >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 ${getColor(uni)}`}>
                  {getInitials(uni)}
                </div>
                <div>
                   <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 text-lg leading-tight">{uni}</h3>
                   <p className="text-sm text-slate-500 mt-1">Nigeria</p>
                </div>
             </button>
           ))}
           {filtered.length === 0 && searchTerm.length === 0 && (
             <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
               <GraduationCap className="mx-auto mb-2 opacity-20" size={48} />
               <p>Start typing to find your university</p>
             </div>
           )}
        </div>
        
        <div className="text-center text-sm text-slate-400 pt-8">
          Powered by Gemini • Built for Nigerian Students
        </div>
      </div>
    </div>
  );
};
