
import React, { useState, useRef, useEffect } from 'react';
import { createDetailedTutorChat } from '../services/geminiService';
import { Message, Attachment } from '../types';
import { Send, User, Bot, X, Paperclip, Camera, Mic } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";

interface TutorChatProps {
  onClose: () => void;
  topic: string;
}

const TutorChat: React.FC<TutorChatProps> = ({ onClose, topic }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hello! I'm your Socratic tutor for ${topic}. What specific concept are you finding challenging right now? You can share images or files if that helps.`, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createDetailedTutorChat();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const type = file.type.startsWith('image/') ? 'image' : 'pdf';
        
        setAttachments(prev => [...prev, {
          type: type as any,
          mimeType: file.type,
          data: base64,
          uri: URL.createObjectURL(file),
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || !chatSessionRef.current) return;

    const userMsg: Message = { 
      role: 'user', 
      text: input, 
      attachments: [...attachments],
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsTyping(true);

    try {
      let contentParts: any[] = [];
      if (input) contentParts.push({ text: input });
      attachments.forEach(att => {
         contentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });

      // Use 'message' parameter instead of 'contents' for chat.sendMessage
      // @ts-ignore
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({
         message: { role: 'user', parts: contentParts }
      });
      
      const text = result.text || "I'm having trouble thinking right now. Can you rephrase?";
      const modelMsg: Message = { role: 'model', text, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full"><Bot size={24} /></div>
            <div>
              <h3 className="font-bold">Socratic Tutor</h3>
              <p className="text-purple-200 text-xs">Helping you think deeper</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'}`}>
                {msg.attachments && msg.attachments.length > 0 && (
                   <div className="flex flex-wrap gap-1 mb-2">
                     {msg.attachments.map((att, i) => (
                        <div key={i} className="bg-black/20 rounded p-1">
                           {att.type === 'image' ? <img src={att.uri} className="w-16 h-16 object-cover rounded" /> : <span className="text-xs">File</span>}
                        </div>
                     ))}
                   </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && <div className="text-xs text-slate-400 ml-12">Tutor is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
               {attachments.map((att, i) => (
                  <div key={i} className="bg-slate-100 p-1 rounded text-xs flex items-center gap-1">
                     {att.name} <button onClick={() => setAttachments(prev => prev.filter((_, x) => x !== i))}><X size={10}/></button>
                  </div>
               ))}
            </div>
          )}
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Paperclip size={20}/></button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Camera size={20}/></button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 pl-4 pr-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-none transition-all"
            />
            <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isTyping} className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
