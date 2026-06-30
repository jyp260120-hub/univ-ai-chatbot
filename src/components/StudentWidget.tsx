import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageCircle, X, Send, User, ShieldCheck, GraduationCap, 
  AlertTriangle, BookOpen, Clock, RefreshCw, Sparkles, HelpCircle 
} from "lucide-react";
import { Message, StudentInfo, ChatSession } from "../types.js";

interface StudentWidgetProps {
  onVerifySuccess: (student: StudentInfo) => void;
  verifiedStudent: StudentInfo | null;
  setVerifiedStudent: React.Dispatch<React.SetStateAction<StudentInfo | null>>;
}

export default function StudentWidget({ onVerifySuccess, verifiedStudent, setVerifiedStudent }: StudentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [authMode, setAuthMode] = useState<"studentId" | "email">("studentId");
  
  // Email registration fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Language selection (ko/en/zh)
  const [lang, setLang] = useState<"ko" | "en" | "zh">("ko");
  const langLabels = { ko: "KO", en: "EN", zh: "CN" };
  
  // Chat state
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for message updates every 2 seconds if active or in counselor mode
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (verifiedStudent && isOpen) {
      const pollSession = async () => {
        try {
          const res = await fetch(`/api/chat/poll/${verifiedStudent.studentId}`);
          if (res.ok) {
            const data = await res.json();
            setChatSession(data.session);
          }
        } catch (err) {
          console.error("Failed to poll chat session:", err);
        }
      };

      pollSession(); // Immediate call
      intervalId = setInterval(pollSession, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [verifiedStudent, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatSession?.messages]);

  // Handle student verification (GCM encrypted request)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !studentName) {
      setErrorMsg("학번과 이름을 모두 입력하세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/student/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name: studentName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "인증에 실패했습니다.");
      } else {
        setVerifiedStudent(data.profile);
        onVerifySuccess(data.profile);
      }
    } catch (err) {
      setErrorMsg("서버 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Handle email-based registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !studentName || !phone) {
      setErrorMsg("이메일, 성명, 연락처를 모두 입력하세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: studentName, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "등록에 실패했습니다.");
      } else if (data.suggestStudentIdLogin) {
        setErrorMsg(data.message || "등록된 재학생 정보와 일치합니다. 학번 인증을 이용해 주세요.");
        setAuthMode("studentId");
      } else if (data.success) {
        setVerifiedStudent(data.profile);
        onVerifySuccess(data.profile);
      }
    } catch (err) {
      setErrorMsg("서버 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Send student message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !verifiedStudent || sending) return;

    const currentText = messageInput;
    setMessageInput("");
    setSending(true);

    // Append local speculative user message immediately for snappy UI feel
    if (chatSession) {
      const specMsg: Message = {
        id: "spec_" + Math.random().toString(),
        sender: "student",
        text: currentText,
        timestamp: new Date().toISOString(),
      };
      setChatSession({
        ...chatSession,
        messages: [...chatSession.messages, specMsg],
      });
    }

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: verifiedStudent.studentId, text: currentText, lang }),
      });
      if (res.ok) {
        const data = await res.json();
        // Trigger a re-poll or set manually
        const pollRes = await fetch(`/api/chat/poll/${verifiedStudent.studentId}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          setChatSession(pollData.session);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  // Request counselor manually
  const handleEscalateToCounselor = async () => {
    if (!verifiedStudent) return;
    try {
      const res = await fetch("/api/chat/request-counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: verifiedStudent.studentId }),
      });
      if (res.ok) {
        const pollRes = await fetch(`/api/chat/poll/${verifiedStudent.studentId}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          setChatSession(pollData.session);
        }
      }
    } catch (err) {
      console.error("Failed to request counselor:", err);
    }
  };

  // Quick prompt triggers
  const handleQuickPrompt = (promptText: string) => {
    setMessageInput(promptText);
  };

  // Demo shortcut login click
  const handleShortcutLogin = (id: string, name: string) => {
    setStudentId(id);
    setStudentName(name);
  };

  return (
    <div id="student-chatbot-container" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      <motion.button
        id="chatbot-fab"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-14 h-14 bg-[#861F41] text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors focus:outline-none"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6 animate-pulse" />}
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-window"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-18 right-0 w-96 h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#861F41] to-[#a82850] p-3 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <div>
                  <h3 className="font-semibold text-sm">고려대학교 AI 학사지원</h3>
                  <p className="text-[10px] text-white/80">
                    {chatSession?.status === "COUNSELOR" ? "실시간 전문 상담사 상담 중" : "AI 챗봇 자동 응답 중"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Language Selector */}
                <div className="flex bg-white/10 rounded-md p-0.5">
                  {(Object.keys(langLabels) as Array<keyof typeof langLabels>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setLang(key)}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                        lang === key ? "bg-white text-[#861F41]" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {langLabels[key]}
                    </button>
                  ))}
                </div>
                
                {verifiedStudent && chatSession?.status !== "COUNSELOR" && (
                  <button
                    id="btn-escalate-counselor"
                    onClick={handleEscalateToCounselor}
                    className="px-2 py-0.5 text-[9px] bg-white/20 hover:bg-white/30 text-white rounded transition-colors font-medium cursor-pointer"
                  >
                    상담사 연결
                  </button>
                )}
              </div>
            </div>

            {/* Chat Body (Interactive Logic) */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col">
              {!verifiedStudent ? (
                /* 1. STUDENT AUTHENTICATION PANEL (AES-256-GCM Verification) */
                <div id="auth-panel" className="flex-1 flex flex-col justify-between py-2">
                  <div>
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-[#861F41]/10 text-[#861F41] rounded-full flex items-center justify-center mx-auto mb-2">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h4 className="text-slate-800 font-semibold text-sm">행정전문대학원 학사 지원</h4>
                      <p className="text-xs text-slate-500 mt-1">학번 인증 또는 이메일 등록 후 문의하세요.</p>
                    </div>

                    {/* Auth Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 mb-4">
                      <button
                        onClick={() => setAuthMode("studentId")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          authMode === "studentId" ? "bg-white text-[#861F41] shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        학번 인증
                      </button>
                      <button
                        onClick={() => setAuthMode("email")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          authMode === "email" ? "bg-white text-[#861F41] shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        이메일 등록
                      </button>
                    </div>

                    {authMode === "studentId" ? (
                      <form onSubmit={handleVerify} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">학번 (Student ID)</label>
                          <input type="text" required placeholder="예: 202201432" value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#861F41]" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">성명 (Name)</label>
                          <input type="text" required placeholder="예: 김철수" value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#861F41]" />
                        </div>
                        {errorMsg && (
                          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs flex items-center gap-1.5 border border-rose-100">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errorMsg}</span>
                          </div>
                        )}
                        <button type="submit" disabled={loading}
                          className="w-full py-2 bg-[#861F41] hover:bg-[#861F41] disabled:bg-slate-300 text-white font-medium rounded-lg text-sm cursor-pointer transition-colors flex justify-center items-center gap-1.5">
                          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>안전 인증 및 시작</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleEmailRegister} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">이메일 (Email)</label>
                          <input type="email" required placeholder="예: student@korea.ac.kr" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#861F41]" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">성명 (Name)</label>
                          <input type="text" required placeholder="예: 홍길동" value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#861F41]" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">연락처 (Phone)</label>
                          <input type="tel" required placeholder="예: 010-1234-5678" value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#861F41]" />
                        </div>
                        {errorMsg && (
                          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg text-xs flex items-center gap-1.5 border border-rose-100">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errorMsg}</span>
                          </div>
                        )}
                        <button type="submit" disabled={loading}
                          className="w-full py-2 bg-[#861F41] hover:bg-[#861F41] disabled:bg-slate-300 text-white font-medium rounded-lg text-sm cursor-pointer transition-colors flex justify-center items-center gap-1.5">
                          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>등록 및 시작</span>
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Test Data Shortcuts */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      테스트용 데모 데이터 (클릭 시 자동 기입)
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleShortcutLogin("202201432", "김철수")}
                        className="p-1.5 text-[11px] text-left bg-slate-100 hover:bg-[#861F41]/10 text-slate-700 hover:text-[#861F41] rounded transition-colors border border-slate-200/50"
                      >
                        김철수 (정상, 우수)
                      </button>
                      <button
                        onClick={() => handleShortcutLogin("202112093", "이영희")}
                        className="p-1.5 text-[11px] text-left bg-slate-100 hover:bg-[#861F41]/10 text-slate-700 hover:text-[#861F41] rounded transition-colors border border-slate-200/50"
                      >
                        이영희 (학사경고 1회)
                      </button>
                      <button
                        onClick={() => handleShortcutLogin("202304911", "박민준")}
                        className="p-1.5 text-[11px] text-left bg-slate-100 hover:bg-[#861F41]/10 text-slate-700 hover:text-[#861F41] rounded transition-colors border border-slate-200/50"
                      >
                        박민준 (평점 4.21 장학)
                      </button>
                      <button
                        onClick={() => handleShortcutLogin("202011033", "최다은")}
                        className="p-1.5 text-[11px] text-left bg-slate-100 hover:bg-[#861F41]/10 text-slate-700 hover:text-[#861F41] rounded transition-colors border border-slate-200/50"
                      >
                        최다은 (학사경고 2회)
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-[#861F41]" />
                      <span>전송 데이터는 AES-256-GCM으로 암호화 보관됩니다.</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2. CHAT SESSION PANEL */
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div className="flex-1 overflow-y-auto space-y-3 pb-2 select-text">
                    {chatSession?.messages.map((msg) => {
                      if (msg.sender === "system") {
                        return (
                          <div key={msg.id} className="text-center my-2">
                            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 text-[10px] rounded-full border border-amber-100 font-medium">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }
                      const isStudent = msg.sender === "student";
                      const isBot = msg.sender === "bot";
                      const isCounselor = msg.sender === "counselor";

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                            isStudent 
                              ? "bg-[#861F41] text-white rounded-tr-none" 
                              : isCounselor 
                                ? "bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-none font-medium" 
                                : "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1 opacity-80 text-[10px]">
                              {isStudent && <User className="w-3 h-3" />}
                              {isBot && <Sparkles className="w-3 h-3 text-[#861F41] animate-pulse" />}
                              {isCounselor && <User className="w-3 h-3 text-amber-600" />}
                              <span className="font-semibold">
                                {isStudent ? "나" : isCounselor ? "상담사 선생님" : "AI 학사 비서"}
                              </span>
                              <span className="text-[8px] font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Triggers for AI Questions */}
                  {chatSession?.status === "AI_BOT" && (
                    <div className="mb-2 py-1 flex gap-1 overflow-x-auto shrink-0 scrollbar-none">
                      <button
                        onClick={() => handleQuickPrompt("내 장학금 자격을 알려줘")}
                        className="px-2 py-1 bg-white hover:bg-[#861F41]/10 text-[#861F41] rounded-full border border-slate-200 text-[10px] whitespace-nowrap cursor-pointer hover:border-[#861F41]/30 transition-colors shrink-0"
                      >
                        🎓 내 장학 자격
                      </button>
                      <button
                        onClick={() => handleQuickPrompt("학사경고 및 제적 규정이 어떻게 돼?")}
                        className="px-2 py-1 bg-white hover:bg-[#861F41]/10 text-[#861F41] rounded-full border border-slate-200 text-[10px] whitespace-nowrap cursor-pointer hover:border-[#861F41]/30 transition-colors shrink-0"
                      >
                        ⚠️ 학사경고 규정
                      </button>
                      <button
                        onClick={() => handleQuickPrompt("졸업 요건(취득 학점) 알려줘")}
                        className="px-2 py-1 bg-white hover:bg-[#861F41]/10 text-[#861F41] rounded-full border border-slate-200 text-[10px] whitespace-nowrap cursor-pointer hover:border-[#861F41]/30 transition-colors shrink-0"
                      >
                        📚 졸업 학점 요건
                      </button>
                      <button
                        onClick={() => handleQuickPrompt("2학기 수강신청 및 등록 기간")}
                        className="px-2 py-1 bg-white hover:bg-[#861F41]/10 text-[#861F41] rounded-full border border-slate-200 text-[10px] whitespace-nowrap cursor-pointer hover:border-[#861F41]/30 transition-colors shrink-0"
                      >
                        📅 수강신청 일정
                      </button>
                    </div>
                  )}

                  {/* Send Chat Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder={
                        chatSession?.status === "COUNSELOR" 
                          ? "상담사에게 메시지 보내기..." 
                          : "AI 학사 챗봇에게 무엇이든 물어보세요..."
                      }
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#861F41] bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="px-3 bg-[#861F41] hover:bg-[#861F41] disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
