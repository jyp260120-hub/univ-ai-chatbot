import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, Edit3, Save, X, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { AcademicRule } from "../types.js";

export default function KnowledgeBaseManager() {
  const [rules, setRules] = useState<AcademicRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState("장학금");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/kb/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title || !content) return;

    setLoading(true);
    try {
      const payload: Partial<AcademicRule> = { category, title, content };
      if (editId) payload.id = editId;

      const res = await fetch("/api/kb/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        
        // Reset form
        setEditId(null);
        setTitle("");
        setContent("");
        setSuccessMsg(editId ? "학사 규칙이 성공적으로 수정되었습니다." : "새로운 학사 규칙이 RAG DB에 등록되었습니다.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Failed to save rule:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: AcademicRule) => {
    setEditId(rule.id);
    setCategory(rule.category);
    setTitle(rule.title);
    setContent(rule.content);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 학사 정보를 삭제하시겠습니까? 삭제 시 AI 챗봇이 해당 지식을 참조하지 못합니다.")) return;
    try {
      const res = await fetch(`/api/kb/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setSuccessMsg("학사 규칙이 삭제되었습니다.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setTitle("");
    setContent("");
  };

  return (
    <div id="kb-manager-container" className="space-y-4">
      {/* Tab Header */}
      <div className="flex justify-between items-center bg-slate-950/20 pb-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">RAG 학사 지식베이스 관리기</span>
        </div>
        <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          AI 프롬프트 연동중
        </span>
      </div>

      {/* Info Warning Banner */}
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 leading-relaxed">
        <span className="font-semibold text-indigo-200">RAG 지식 검색 최적화 모듈</span>
        <p className="mt-0.5">
          아래 학사 규정을 수정/추가하면 AI 모델이 프롬프트 조합 시 해당 최신 문맥 데이터를 우선적으로 인지하게 됩니다. 실시간으로 똑똑해지는 하이브리드 RAG 솔루션을 즉시 체감하세요.
        </p>
      </div>

      {/* Save Success Notice */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-3">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
          {editId ? "규칙 수동 편집기" : "새로운 규칙 등록"}
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="장학금">장학금</option>
              <option value="학사경고">학사경고</option>
              <option value="졸업요건">졸업요건</option>
              <option value="수강신청">수강신청</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-1">지식 주제명 (Title)</label>
            <input
              type="text"
              required
              placeholder="예: 최우수 전공학점 보조 장학"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-1">지식 상세 설명 (RAG Context Body)</label>
          <textarea
            required
            rows={3}
            placeholder="상세 내용을 상세히 기록하세요. AI 비서가 이를 그대로 파싱하여 규정 기반 상담 답변을 진행합니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 font-sans"
          />
        </div>

        <div className="flex justify-end gap-1.5">
          {editId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
            >
              <X className="w-3 h-3 inline mr-1" />
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>{editId ? "저장하기" : "규칙 추가"}</span>
          </button>
        </div>
      </form>

      {/* Rules List Table */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">학사 RAG 데이터베이스 현황 ({rules.length})</span>

        <div className="space-y-2">
          {rules.map((rule) => {
            let catColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
            if (rule.category === "학사경고") catColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            if (rule.category === "졸업요건") catColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            if (rule.category === "수강신청") catColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";

            return (
              <div key={rule.id} className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${catColor}`}>
                      {rule.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{rule.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-light">
                  {rule.content}
                </p>

                <div className="text-[8px] text-slate-500 font-mono text-right">
                  최근 갱신: {new Date(rule.updatedAt).toLocaleDateString()} {new Date(rule.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
