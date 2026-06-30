import React, { useState, useEffect } from "react";
import { 
  Laptop, Users, LayoutGrid, ShieldCheck, GraduationCap, 
  BookOpen, HelpCircle, ArrowRight, Sparkles, CheckCircle2,
  Calendar, Award, Library, Info, Bell
} from "lucide-react";
import StudentWidget from "./components/StudentWidget.jsx";
import CounselorDashboard from "./components/CounselorDashboard.jsx";
import { StudentInfo } from "./types.js";

export default function App() {
  // URL 파라미터로 standalone 모드 지원 (?standalone=student)
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const standaloneMode = urlParams.get("standalone");
  
  const [viewMode, setViewMode] = useState<"split" | "student" | "counselor">(
    standaloneMode === "student" ? "student" : "student"
  );
  const [verifiedStudent, setVerifiedStudent] = useState<StudentInfo | null>(null);
  const [role, setRole] = useState<"student" | "counselor" | "admin">(
    standaloneMode === "student" ? "student" : "student"
  );
  const [showRoleSelect, setShowRoleSelect] = useState(standaloneMode !== "student");
  
  // Quick FAQs Accordion state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [academicNotices, setAcademicNotices] = useState<{ title: string; date: string }[]>([]);
  const [generalNotices, setGeneralNotices] = useState<{ title: string; date: string }[]>([]);

  useEffect(() => {
    fetch("/api/faq").then(r => r.json()).then(d => { if (d.faqs) setFaqs(d.faqs); }).catch(() => {});
    fetch("/api/notices").then(r => r.json()).then(d => {
      if (d.notices?.학사공지) setAcademicNotices(d.notices.학사공지);
      if (d.notices?.일반공지) setGeneralNotices(d.notices.일반공지);
    }).catch(() => {});
  }, []);

  const handleVerifySuccess = (student: StudentInfo) => {
    setVerifiedStudent(student);
  };

  const handleRoleSelect = (selectedRole: "student" | "counselor" | "admin") => {
    setRole(selectedRole);
    setShowRoleSelect(false);
    if (selectedRole === "student") setViewMode("student");
    else if (selectedRole === "counselor") setViewMode("counselor");
    else setViewMode("split");
  };

  // Role-based access: students see only student, counselors see only counselor, admins see split+all
  if (showRoleSelect) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-[#861F41] rounded-2xl flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">행정전문대학원 학사지원센터</h1>
            <p className="text-sm text-slate-500 mt-1">역할을 선택하여 시스템에 접속하세요</p>
          </div>
          <div className="space-y-3 pt-2">
            <button onClick={() => handleRoleSelect("student")}
              className="w-full p-4 bg-[#861F41]/10 border-[#861F41]/20 rounded-xl text-left flex items-center gap-4 transition-colors cursor-pointer">
              <Laptop className="w-8 h-8 text-[#861F41]" />
              <div>
                <p className="font-bold text-slate-900">학생 포털</p>
                <p className="text-xs text-slate-500">AI 챗봇 상담, 학사 규정 조회, FAQ</p>
              </div>
            </button>
            <button onClick={() => handleRoleSelect("counselor")}
              className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left flex items-center gap-4 transition-colors cursor-pointer">
              <Users className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="font-bold text-white">상담사 워크스페이스</p>
                <p className="text-xs text-slate-400">실시간 채팅, 학생 프로필, 보안 감사 로그</p>
              </div>
            </button>
            <button onClick={() => handleRoleSelect("admin")}
              className="w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left flex items-center gap-4 transition-colors cursor-pointer">
              <LayoutGrid className="w-8 h-8 text-amber-600" />
              <div>
                <p className="font-bold text-slate-900">관리자 (분할 모니터링)</p>
                <p className="text-xs text-slate-500">학생+상담사 통합 모니터링 및 RAG 관리</p>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">AES-256-GCM 암호화 · 고려대학교 행정전문대학원</p>
        </div>
      </div>
    );
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden text-slate-800">
      
      {/* Dynamic Master Header & View Selection Deck */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#861F41] rounded-lg flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
              고려대학교 학사 비서
              <span className="text-[10px] font-bold bg-[#861F41]/10 border-[#861F41]/20 text-[#861F41] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Full-Stack Hybrid MVP
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">AI Agent RAG & AES-256-GCM Crypto Demonstration</p>
          </div>
        </div>

        {/* View Mode Select Buttons - Role-based access */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          {role === "admin" && (
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "split" 
                  ? "bg-[#861F41] text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              분할 모니터링
            </button>
          )}
          <button
            onClick={() => setViewMode("student")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "student" 
                ? "bg-[#861F41] text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            {role === "admin" ? "학생 포털" : role === "counselor" ? "상담사 포털" : "학생 포털"}
          </button>
          {role !== "student" && (
            <button
              onClick={() => setViewMode("counselor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "counselor" 
                  ? "bg-[#861F41] text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              상담사 워크스페이스
            </button>
          )}
          <button onClick={() => { setRole("student"); setShowRoleSelect(true); }}
            className="px-2 py-1.5 text-[10px] text-slate-500 hover:text-slate-700 font-medium transition-colors cursor-pointer">
            로그아웃
          </button>
        </div>
      </header>

      {/* Main View Area Routing */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* VIEW 1: SPLIT SCREEN (Both Student and Counselor on screen at once) */}
        {viewMode === "split" && (
          <div className="flex-1 flex overflow-hidden h-[calc(100vh-65px)]">
            {/* Left Side: Student Portal */}
            <div className="w-1/2 flex flex-col bg-slate-50 border-r border-slate-200 overflow-y-auto relative">
              <StudentPortalView 
                verifiedStudent={verifiedStudent} 
                faqs={faqs} 
                activeFaq={activeFaq} 
                setActiveFaq={setActiveFaq} 
              />
              <StudentWidget 
                onVerifySuccess={handleVerifySuccess} 
                verifiedStudent={verifiedStudent}
                setVerifiedStudent={setVerifiedStudent}
              />
            </div>
            
            {/* Right Side: Counselor Portal */}
            <div className="w-1/2 flex flex-col bg-slate-900 overflow-hidden">
              <CounselorDashboard />
            </div>
          </div>
        )}

        {/* VIEW 2: STUDENT PORTAL ONLY */}
        {viewMode === "student" && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto relative h-[calc(100vh-65px)]">
            <StudentPortalView 
              verifiedStudent={verifiedStudent} 
              faqs={faqs} 
              activeFaq={activeFaq} 
              setActiveFaq={setActiveFaq} 
            />
            <StudentWidget 
              onVerifySuccess={handleVerifySuccess} 
              verifiedStudent={verifiedStudent}
              setVerifiedStudent={setVerifiedStudent}
            />
          </div>
        )}

        {/* VIEW 3: COUNSELOR WORKSPACE ONLY */}
        {viewMode === "counselor" && (
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden h-[calc(100vh-65px)]">
            <CounselorDashboard />
          </div>
        )}

      </div>
    </div>
  );
}

// Sub-component: Student Portal View Layout
interface StudentPortalViewProps {
  verifiedStudent: StudentInfo | null;
  faqs: { q: string; a: string }[];
  activeFaq: number | null;
  setActiveFaq: (idx: number | null) => void;
}

function StudentPortalView({ verifiedStudent, faqs, activeFaq, setActiveFaq }: StudentPortalViewProps) {
  return (
    <div id="student-portal-viewport" className="flex-1 p-8 max-w-4xl mx-auto space-y-6 select-text">
      
      {/* Korea University Header Visual (Authentic Signature Design) */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
        {/* Full Signature block (Shield + Wordmark underneath) */}
        <div className="flex flex-col items-center justify-center bg-[#FDFBF7] border border-slate-200/60 p-2.5 rounded-xl select-none shrink-0 shadow-sm">
          <div id="ku-shield-logo" className="w-16 h-18 flex items-center justify-center">
            <img src="/assets/logo.png" alt="행정전문대학원 학사지원센터 로고" className="w-full h-full object-contain" />
          </div>
        </div>
        
        {/* Supporting text and details */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
행정전문대학원 학사지원센터
            <span className="text-[9px] font-extrabold bg-[#861F41]/10 text-[#861F41] border border-[#861F41]/20 px-1.5 py-0.5 rounded">
              OFFICIAL PARTNER
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">통합 학사비서 지원 서비스 및 암호화 인증 채널</p>
        </div>
      </div>

      {/* Hero Banner Grid Card */}
      <div className="bg-gradient-to-r from-rose-800 to-rose-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden select-none">
        {/* Subtle decorative shapes */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-rose-700/20 rounded-full blur-2xl" />
        <div className="absolute right-1/4 top-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl" />

        <div className="max-w-md space-y-2.5">
          <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-white rounded-full text-[10px] font-bold tracking-wider uppercase">
            대학 보안 가이드 통과
          </span>
          <h3 className="text-lg font-bold">더 안전하게, 더욱 스마트하게</h3>
          <p className="text-xs text-rose-100/90 leading-relaxed font-light">
            학생 여러분의 성적, 누적 학점 및 장학 상태 등 민감한 개인정보를 완전하게 보장하기 위해 <strong>AES-256-GCM 단방향-양방향 하이브리드 암호화 솔루션</strong>을 전격 탑재했습니다.
          </p>
          <div className="flex items-center gap-1 text-[11px] text-rose-300 font-semibold pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>우측 하단 floating AI 챗봇을 통해 안전 인증을 시작해 보세요.</span>
          </div>
        </div>
      </div>

      {/* Authenticated Student Banner Status */}
      {verifiedStudent && (
        <div id="student-welcome-banner" className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-slate-700">
            <span className="font-bold text-slate-900 text-sm">{verifiedStudent.name} ({verifiedStudent.studentId})</span> 학생님, 학사 데이터 인증에 성공했습니다.
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-medium text-slate-600 text-[11px]">
              <span>🎓 학과: {verifiedStudent.department}</span>
              <span className="text-[#861F41]">📊 직전학기 GPA: {verifiedStudent.gpa}</span>
              <span>📚 이수학점: {verifiedStudent.completedCredits}학점</span>
              <span className="text-[#861F41]">✨ 추천장학: {verifiedStudent.scholarshipStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* University Announcement notices - 학사공지 & 일반공지 */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
          <Bell className="w-4 h-4 text-slate-400" />
          공지사항
        </h3>

        {/* 학사공지 */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            학사공지
          </h4>
          <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">학사</span>
                <span className="font-semibold text-slate-800">2026학년도 2학기 행정전문대학원 수강신청 및 학사일정 안내</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.30</span>
            </div>
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">학사</span>
                <span className="font-semibold text-slate-800">2026학년도 전기 석사/박사 학위청구논문 심사 일정 공고</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.25</span>
            </div>
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">학사</span>
                <span className="font-semibold text-slate-800">행정전문대학원 종합시험 시행 계획 및 응시 자격 안내 (3월/9월)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.20</span>
            </div>
          </div>
        </div>

        {/* 일반공지 */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            일반공지
          </h4>
          <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">일반</span>
                <span className="font-semibold text-slate-800">2026학년도 2학기 행정전문대학원 신입생 모집요강 공고</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.28</span>
            </div>
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">장학</span>
                <span className="font-semibold text-slate-800">2026학년도 2학기 행정전문대학원 장학금 신청 안내 (직전학기 B+ 이상)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.22</span>
            </div>
            <div className="p-3.5 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 cursor-pointer">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[9px] font-bold uppercase tracking-wide mr-1.5">보안</span>
                <span className="font-semibold text-slate-800">개인정보 유출 방지를 위한 Node.js crypto GCM 암호화 연계 실시간 감사 시행</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight shrink-0">2026.06.15</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Helper / Quick Guide */}
      <div className="space-y-3">
        <div className="flex justify-between items-end select-none">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            자주 묻는 질문 (FAQ) 아카이브
          </h3>
          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-0.5 animate-pulse">
            우측 하단 챗봇에서 연계 답변 지원 <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {faqs.map((faq, idx) => {
            const isOpened = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-white border border-slate-200/80 rounded-xl overflow-hidden transition-all duration-150"
              >
                <button
                  onClick={() => setActiveFaq(isOpened ? null : idx)}
                  className="w-full p-3.5 text-left font-semibold text-slate-800 hover:bg-slate-50/50 transition-colors flex justify-between items-center cursor-pointer focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 text-base">{isOpened ? "−" : "+"}</span>
                </button>
                
                {isOpened && (
                  <div className="p-3.5 bg-slate-50/40 border-t border-slate-100 text-slate-600 leading-relaxed font-light">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Decorative footer */}
      <footer className="text-center pt-8 pb-4 text-[10px] text-slate-400 font-mono select-none border-t border-slate-200/60">
        © 2026 KOREA UNIVERSITY ACADEMIC AFFAIRS SUPPORT SYSTEM. PROTECTED BY AES-256-GCM.
      </footer>
    </div>
  );
}
