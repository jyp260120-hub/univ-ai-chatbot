import React, { useState, useEffect } from "react";
import { Shield, Trash2, Key, HelpCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { EncryptionLog } from "../types.js";

export default function SecurityAudit() {
  const [logs, setLogs] = useState<EncryptionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealSecrets, setRevealSecrets] = useState<{ [key: string]: boolean }>({});

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/audit/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const clearLogs = async () => {
    if (!confirm("정말 암호화 처리 로그를 모두 초기화하시겠습니까? (서버 메모리 로그가 비워집니다)")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/audit/clear", { method: "POST" });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleReveal = (logId: string) => {
    setRevealSecrets((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  return (
    <div id="security-audit-container" className="space-y-4">
      {/* Tab Header */}
      <div className="flex justify-between items-center bg-slate-950/20 pb-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">AES-256-GCM 실시간 암호화 감사 로그</span>
        </div>
        
        <button
          onClick={clearLogs}
          disabled={logs.length === 0 || loading}
          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 disabled:bg-slate-800 border border-rose-500/20 disabled:border-transparent text-rose-400 disabled:text-slate-600 rounded-lg text-[10px] font-bold tracking-tight cursor-pointer transition-colors flex items-center gap-1 focus:outline-none"
        >
          <Trash2 className="w-3 h-3" />
          로그 삭제
        </button>
      </div>

      {/* Info Warning Banner */}
      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-[10px] text-emerald-300 leading-relaxed">
        <Key className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-emerald-200">데이터 보안 등급 1급 (Authenticated Encryption)</span>
          <p className="mt-0.5">
            본 시스템은 학생의 이름, 평점, 수강정보 등을 DB 저장 시 양방향 암호화 처리합니다. GCM 모드는 대칭키 암호화와 동시에 메시지 인증(Auth Tag)을 지원하여 악의적인 복호화 변조 유도를 원천 차단합니다.
          </p>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl text-center p-4">
            <Shield className="w-10 h-10 mb-2 opacity-15" />
            <p className="text-xs">기록된 암/복호화 트랜잭션이 없습니다.</p>
            <p className="text-[10px] mt-1">학생 화면에서 학번 인증 및 로그인을 수행하여 로그를 남겨보세요!</p>
          </div>
        ) : (
          logs.map((log) => {
            const isDecrypt = log.action === "DECRYPT";
            const showPlain = revealSecrets[log.id] || false;

            return (
              <div 
                key={log.id} 
                className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                  isDecrypt 
                    ? "bg-emerald-500/[0.02] border-emerald-500/20" 
                    : "bg-indigo-500/[0.02] border-indigo-500/20"
                }`}
              >
                {/* Log Header Row */}
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase ${
                      isDecrypt 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                        : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                    }`}>
                      {isDecrypt ? "DECRYPT (복호화)" : "ENCRYPT (암호화)"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">{log.dataType}</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionDigits: 3 } as any)}
                  </span>
                </div>

                {/* Log Details Container */}
                <div className="space-y-1.5 font-mono text-[10px] text-slate-400">
                  {/* Plaintext / Raw Value */}
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 flex justify-between items-start gap-4">
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase tracking-wider font-semibold mb-0.5">평문 (Plaintext)</span>
                      <span className={showPlain ? "text-slate-100 break-all font-sans" : "text-slate-600 tracking-widest break-all font-sans"}>
                        {showPlain ? log.rawText : "••••••••••••••••••••••••••••••••••••••••••••"}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleReveal(log.id)}
                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
                    >
                      {showPlain ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Cryptographic HEX outputs (collapsible / readable stack) */}
                  <div className="grid grid-cols-1 gap-1 bg-slate-950/40 p-2 rounded-lg text-[9px] border border-slate-900">
                    <div className="flex justify-between">
                      <span className="text-slate-500">암호문 (Ciphertext Hex):</span>
                      <span className="text-slate-300 break-all text-right max-w-[220px] font-mono">{log.encryptedHex}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">초기화 벡터 (IV Hex):</span>
                      <span className="text-amber-400 font-mono">{log.ivHex}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">인증 태그 (Auth Tag Hex):</span>
                      <span className="text-rose-400 font-mono">{log.tagHex}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">대칭 해시 (SHA1 Key Digest):</span>
                      <span className="text-slate-400 font-mono">{log.keyUsed}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
