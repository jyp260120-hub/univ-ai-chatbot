import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, MessageSquare, Shield, BookOpen, UserCheck, Send, AlertCircle, 
  Trash2, Plus, Edit3, ShieldAlert, Key, HardDrive, RefreshCw, Layers,
  Download, Clock, History
} from "lucide-react";
import { ChatSession, Message, StudentInfo, EncryptionLog, AcademicRule } from "../types.js";
import SecurityAudit from "./SecurityAudit.jsx";
import KnowledgeBaseManager from "./KnowledgeBaseManager.jsx";

export default function CounselorDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "rag">("profile");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch active chats from backend
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/counselor/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 2000);
    return () => clearInterval(interval);
  }, []);

  // Find currently selected session
  const activeSession = sessions.find((s) => s.studentId === selectedStudentId) || null;

  // Auto-scroll when active chat session changes or gets new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Send message as Counselor
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedStudentId || sending) return;

    const currentText = messageInput;
    setMessageInput("");
    setSending(false);

    try {
      const res = await fetch("/api/counselor/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId, text: currentText }),
      });
      if (res.ok) {
        fetchSessions(); // Refresh
      }
    } catch (err) {
      console.error("Error sending counselor message:", err);
    }
  };

  // Terminate human session & switch back to AI bot
  const handleHandoverToAi = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await fetch("/api/chat/request-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Error ending session:", err);
    }
  };

  // Load student chat history
  const handleLoadHistory = async (studentId: string) => {
    try {
      const res = await fetch(`/api/counselor/student/${studentId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
        setShowHistory(true);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  // Download student chat history
  const handleDownloadHistory = async (studentId: string) => {
    try {
      const res = await fetch(`/api/counselor/student/${studentId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_history_${studentId}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error downloading history:", err);
    }
  };

  // Close history modal
  const handleCloseHistory = () => {
    setShowHistory(false);
    setHistoryData(null);
  };

  // Counselor Metrics
  const totalStudents = sessions.length;
  const waitingForCounselor = sessions.filter((s) => s.status === "COUNSELOR").length;

  return (
    <div id="counselor-dashboard" className="h-full flex flex-col bg-slate-900 text-slate-100 font-sans select-none">
      {/* Mini Workspace Stats Bar */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">상담사 포털 워크스페이스</h1>
            <p className="text-xs text-slate-400">학사 전용 실시간 1:1 채팅 & 데이터 암호화 감사 시스템</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">시스템 정상 작동 중 (GCM 256)</span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">전체 접속 세션</p>
            <p className="text-lg font-bold text-indigo-400">{totalStudents}명</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">대기중인 상담원 연결</p>
            <p className="text-lg font-bold text-amber-400">{waitingForCounselor}건</p>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL 1: Active Chat Sessions List */}
        <div className="w-72 bg-slate-950/40 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              대화형 세션 목록
            </span>
            <button 
              onClick={fetchSessions}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">활성화된 대화 세션이 없습니다.</p>
                <p className="text-[10px] text-slate-600 mt-1">학생 위젯을 열고 로그인해 대화를 시작해 보세요!</p>
              </div>
            ) : (
              sessions.map((session) => {
                const isSelected = session.studentId === selectedStudentId;
                const lastMessage = session.messages[session.messages.length - 1];
                const isCounselorMode = session.status === "COUNSELOR";

                return (
                  <button
                    key={session.studentId}
                    onClick={() => setSelectedStudentId(session.studentId)}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-150 cursor-pointer flex flex-col border ${
                      isSelected 
                        ? "bg-indigo-600/15 border-indigo-500/50 text-white" 
                        : "bg-slate-900/50 border-transparent hover:border-slate-800 text-slate-300 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {session.studentName} ({session.studentId})
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] rounded-full font-semibold ${
                        isCounselorMode 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" 
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      }`}>
                        {isCounselorMode ? "상담사 연결" : "AI 봇"}
                      </span>
                    </div>

                    {lastMessage && (
                      <p className="text-[11px] text-slate-400 truncate mt-1.5 line-clamp-1 w-full font-light">
                        {lastMessage.sender === "student" ? "학생: " : lastMessage.sender === "bot" ? "AI: " : "상담사: "}
                        {lastMessage.text}
                      </p>
                    )}

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] text-slate-500 font-mono">
                        최근 활동: {new Date(session.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLoadHistory(session.studentId); }}
                          className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-200 transition-colors"
                          title="대화내역 조회"
                        >
                          <History className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadHistory(session.studentId); }}
                          className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-200 transition-colors"
                          title="대화내역 다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: Active Chat Workspace */}
        <div className="flex-1 flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden">
          {activeSession ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active Chat Header */}
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-semibold text-sm">
                    {activeSession.studentName} 학생과의 대화 ({activeSession.studentId})
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadHistory(activeSession.studentId)}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                    title="대화내역 조회"
                  >
                    <History className="w-3.5 h-3.5" />
                    내역
                  </button>
                  <button
                    onClick={() => handleDownloadHistory(activeSession.studentId)}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                    title="대화내역 다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    다운로드
                  </button>
                  {activeSession.status === "COUNSELOR" && (
                    <button
                      onClick={handleHandoverToAi}
                      className="px-2.5 py-1 text-xs bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      AI 이관
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10 select-text">
                {activeSession.messages.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="text-center my-1">
                        <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 text-[10px] rounded-full border border-slate-700">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.sender === "counselor";
                  const isStudent = msg.sender === "student";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow ${
                        isMe 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : isStudent 
                            ? "bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none" 
                            : "bg-slate-850 text-slate-300 border border-slate-800 rounded-tl-none opacity-80"
                      }`}>
                        <div className="flex justify-between items-center gap-3 mb-1 opacity-80 text-[10px] font-semibold">
                          <span>
                            {isMe ? "나 (상담사)" : isStudent ? "학생" : "AI 봇"}
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
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Viewport */}
              <div className="p-4 bg-slate-950/20 border-t border-slate-800 shrink-0">
                {activeSession.status !== "COUNSELOR" ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-300">
                    현재 학생이 **AI 챗봇 모드**로 상담 중입니다. 상담사가 메시지를 발송하거나 '상담사 연결' 시에 수동으로 개입되어 실시간 상담이 활성화됩니다.
                  </div>
                ) : null}

                <form onSubmit={handleSendMessage} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    required
                    placeholder={
                      activeSession.status === "COUNSELOR" 
                        ? "실시간 대화 답변 입력..." 
                        : "답변을 입력하면 실시간 상담 세션으로 개입됩니다..."
                    }
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
              <MessageSquare className="w-16 h-16 mb-3 opacity-20 text-slate-400" />
              <h3 className="font-semibold text-sm text-slate-400">대화 세션 선택</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs">
                왼쪽 목록에서 실시간 학사 및 장학금 지원 대화 중인 학생 세션을 선택하세요.
              </p>
            </div>
          )}
        </div>

        {/* PANEL 3: Counselor Right Work-area (Profile / Cryptographic logs / RAG knowledge-base manager) */}
        <div className="w-[450px] bg-slate-950/40 flex flex-col overflow-hidden shrink-0 select-text">
          {/* Work Tabs */}
          <div className="flex bg-slate-950 border-b border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-3 text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "profile" 
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-slate-900/40" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              인증 프로필
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-3 text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "security" 
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-slate-900/40" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              GCM 보안로그
            </button>
            <button
              onClick={() => setActiveTab("rag")}
              className={`flex-1 py-3 text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "rag" 
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-slate-900/40" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              RAG 지식관리
            </button>
          </div>

          {/* Work Area Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/10">
            {activeTab === "profile" && (
              <div id="counselor-student-profile-tab" className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300">복호화된 학생 세부 정보 (AES-256-GCM)</span>
                </div>

                {activeSession && activeSession.studentInfo ? (
                  <div className="space-y-3">
                    {/* Security Badge */}
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2.5">
                      <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold text-indigo-300">개인정보 암호화 규격 통과</h4>
                        <p className="text-[10px] text-indigo-200/80 leading-relaxed mt-0.5">
                          본 데이터는 데이터베이스 내 암호화 상태(GCM)에서, 학번과 성명이 상호 대조 확인된 시점에 실시간으로 Node.js built-in `crypto` 모듈을 통해 메모리상에서만 복호화되어 로드되었습니다.
                        </p>
                      </div>
                    </div>

                    {/* Student Stats Info Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">학생 성명</span>
                        <span className="col-span-2 font-semibold text-slate-200">{activeSession.studentInfo.name}</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">학번 (ID)</span>
                        <span className="col-span-2 font-mono text-slate-200">{activeSession.studentInfo.studentId}</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">소속 학과</span>
                        <span className="col-span-2 text-slate-200">{activeSession.studentInfo.department}</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">평점평균 (GPA)</span>
                        <span className="col-span-2 flex items-center gap-2">
                          <span className={`font-mono font-bold ${
                            activeSession.studentInfo.gpa >= 3.5 
                              ? "text-emerald-400" 
                              : activeSession.studentInfo.gpa < 1.5 
                                ? "text-rose-400 font-extrabold animate-pulse" 
                                : "text-amber-400"
                          }`}>
                            {activeSession.studentInfo.gpa} / 4.5
                          </span>
                          {activeSession.studentInfo.gpa < 1.5 && (
                            <span className="px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[8px] rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              경고위험
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">이수 학점</span>
                        <span className="col-span-2 font-mono text-slate-200">{activeSession.studentInfo.completedCredits}학점 / 130학점 졸업</span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5 border-b border-slate-800/60">
                        <span className="text-slate-500">누적 경고</span>
                        <span className={`col-span-2 font-semibold ${
                          activeSession.studentInfo.warnings > 0 ? "text-rose-400" : "text-slate-400"
                        }`}>
                          {activeSession.studentInfo.warnings}회
                        </span>
                      </div>
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="text-slate-500">현재 장학자격</span>
                        <span className="col-span-2 text-indigo-300 font-semibold">{activeSession.studentInfo.scholarshipStatus}</span>
                      </div>
                    </div>

                    {/* Progress Bar for credit hours */}
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-400">졸업 학점 달성도</span>
                        <span className="font-mono text-indigo-400 font-semibold">
                          {Math.round((activeSession.studentInfo.completedCredits / 130) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${Math.min(100, (activeSession.studentInfo.completedCredits / 130) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl text-center p-4">
                    <UserCheck className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs">선택된 학생 세션이 없거나 인증 이전 상태입니다.</p>
                    <p className="text-[10px] mt-1">대화 리스트에서 인증을 완료한 학생을 선택하십시오.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "security" && (
              <SecurityAudit />
            )}

            {activeTab === "rag" && (
              <KnowledgeBaseManager />
            )}
          </div>
        </div>

      </div>

      {/* History Viewer Modal */}
      {showHistory && historyData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={handleCloseHistory}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  대화 내역: {historyData.studentName} ({historyData.studentId})
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  총 {historyData.messageCount}개 메시지 · 최근 활동: {new Date(historyData.lastActive).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadHistory(historyData.studentId)}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON 다운로드
                </button>
                <button onClick={handleCloseHistory} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyData.chatLog?.map((msg: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl text-xs ${
                  msg.sender === "학생" ? "bg-slate-800 border border-slate-700 ml-8" :
                  msg.sender === "AI 챗봇" ? "bg-slate-850 border border-slate-700/50 opacity-80" :
                  msg.sender === "상담사" ? "bg-indigo-600/20 border border-indigo-500/30 mr-8" :
                  "bg-slate-800/50 border border-slate-700/30 text-center"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold text-[10px] ${
                      msg.sender === "학생" ? "text-blue-400" :
                      msg.sender === "AI 챗봇" ? "text-slate-400" :
                      msg.sender === "상담사" ? "text-indigo-400" : "text-slate-500"
                    }`}>
                      [{msg.sender}]
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-800 text-center text-[10px] text-slate-500 shrink-0">
              {historyData.messageCount}개의 대화 메시지 · AES-256-GCM 암호화 채널
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
