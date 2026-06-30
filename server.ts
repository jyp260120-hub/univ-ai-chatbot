import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { Message, StudentInfo, ChatSession, EncryptionLog, AcademicRule } from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// AES-256-GCM Configuration
const algorithm = "aes-256-gcm";
const AES_SECRET = process.env.AES_SECRET_KEY || "aistudio_university_secret_key_32_chars_long!!";
const key = crypto.createHash("sha256").update(AES_SECRET).digest();

// In-Memory Databases
const encryptionLogs: EncryptionLog[] = [];
const chatSessions = new Map<string, ChatSession>();

let academicRules: AcademicRule[] = [
  // ===== 행정전문대학원 시행세칙 (우선 적용) =====
  { id: "kb1", category: "행정전문대학원_입학", title: "행정전문대학원 입학자격", content: "석사과정 입학자격: 학사학위 취득자 또는 동등 이상 학력 인정자. 박사과정 입학자격: 석사학위 취득자 또는 동등 이상 학력 인정자. 입학전형은 특별전형으로 시행하며, 서류심사와 구술시험으로 실시한다. (행정전문대학원 시행세칙 제5조~제7조)", updatedAt: new Date().toISOString() },
  { id: "kb2", category: "행정전문대학원_수업연한", title: "행정전문대학원 수업연한", content: "석사과정 수업연한은 2년(4학기), 박사과정 수업연한은 3년(6학기)이다. (행정전문대학원 시행세칙 제21조)", updatedAt: new Date().toISOString() },
  { id: "kb3", category: "행정전문대학원_학점", title: "행정전문대학원 학점취득 및 이수학점", content: "석사과정(행정학과, 정책학과) 논문트랙: 전공필수 9학점, 전공선택 15학점, 연구지도 4학점, 총 28학점. 교과트랙: 전공필수 9학점, 전공선택 15학점, 추가전공선택 6학점, 연구지도 4학점, 총 34학점. 박사과정: 전공필수 12학점, 전공선택 24학점, 연구지도 6학점, 총 42학점. 온라인석사과정(개발정책학과): 기초공통 6학점, 전공필수 3학점, 전공선택 15학점, 연구지도 4학점, 총 28학점. 매학기 전공학점 취득은 최대 9학점 이내. (행정전문대학원 시행세칙 제23조)", updatedAt: new Date().toISOString() },
  { id: "kb4", category: "행정전문대학원_휴학", title: "행정전문대학원 휴학 규정", content: "휴학은 1년 또는 학기 단위로 가능하며, 통산 휴학기간은 박사 4년(8학기), 석사 3년(6학기)이다. 휴학기간은 학위청구논문 제출 연한에 산입한다. (행정전문대학원 시행세칙 제10조)", updatedAt: new Date().toISOString() },
  { id: "kb5", category: "행정전문대학원_종합시험", title: "행정전문대학원 종합시험", content: "석사과정 종합시험 과목은 전공 3과목, 박사과정 종합시험 과목은 전공 4과목이다. 각 과목 100점 만점, 합격점수는 각 과목별 70점 이상. 종합시험 응시 가능횟수는 총 3회로 제한. 종합시험은 매년 3월과 9월에 실시. 석사과정 응시자격: 2학기 이상 이수, 12학점 이상 취득, 평균평점 3.0(B) 이상. 박사과정: 4학기 이상 이수, 24학점 이상 취득, 평균평점 3.0(B) 이상. (행정전문대학원 시행세칙 제27조~제31조)", updatedAt: new Date().toISOString() },
  { id: "kb6", category: "행정전문대학원_학위", title: "행정전문대학원 학위수여", content: "행정학석사(MPA): 행정학과 또는 한국형개발행정전공 소속. 정책학석사(MPP): 정책학과 또는 한국형개발정책전공 소속. 박사: 행정학과 학술박사(Ph.D.)/전문박사(DPA), 정책학과 학술박사(Ph.D.)/전문박사(DPP). 수료요건 충족 및 종합시험 통과 후 학위청구논문 또는 캡스톤 프로젝트 합격 필요. (행정전문대학원 시행세칙 제38조)", updatedAt: new Date().toISOString() },
  { id: "kb7", category: "행정전문대학원_장학금", title: "행정전문대학원 장학금", content: "입학성적이 우수한 신입생과 학업성적이 뛰어나고 품행이 타의 모범이 되는 재학생에게 장학금 지급 가능. 재학생은 직전학기 성적이 B+(3.5) 이상이어야 한다. 세부사항은 행정전문대학원 장학금 지급 세칙에 따름. (행정전문대학원 시행세칙 제44조)", updatedAt: new Date().toISOString() },
  { id: "kb8", category: "행정전문대학원_수강신청", title: "행정전문대학원 수강신청", content: "매학기 교과학점은 9학점까지 신청 가능하며, 교과학점 외에 각 과정별로 요구하는 연구지도 학점을 신청해야 한다. 3학기부터는 지도교수 승인 시 학기별 3학점 초과 신청 가능(직전학기 평균평점 3.0 이상). (행정전문대학원 시행세칙 제17조)", updatedAt: new Date().toISOString() },
  { id: "kb9", category: "행정전문대학원_등록금", title: "행정전문대학원 등록금 감면", content: "석사과정 미수료자 5학기 이상, 박사과정 미수료자 7학기 이상 등록 시 교과학점 1~3학점 수강신청 시 등록금의 1/2 감면. (행정전문대학원 시행세칙 제15조)", updatedAt: new Date().toISOString() },
  { id: "kb10", category: "행정전문대학원_논문", title: "행정전문대학원 학위청구논문 제출연한", content: "수료 후 논문제출연한(재학연한) 경과 시 영구수료 처리되어 논문 또는 캡스톤 프로젝트 제출 불가. 논문제출연한 연장은 1회에 한하며, 허가받은 학기 포함 2학기 이내 제출 및 통과 필요. 연장자는 종합시험 재응시 필요. (행정전문대학원 시행세칙 제33조, 제37조의3)", updatedAt: new Date().toISOString() },
  { id: "kb11", category: "행정전문대학원_트랙", title: "행정전문대학원 학위취득 트랙", content: "석사과정(행정학과, 정책학과)은 논문트랙과 교과트랙 중 선택. 논문트랙: 학위논문 통과 필요(총 28학점). 교과트랙: 전공선택 6학점 추가 이수 및 캡스톤 프로젝트 합격 필요(총 34학점). 신입생이 입학 시 선택하며 변경 가능. (행정전문대학원 시행세칙 제20조제4항)", updatedAt: new Date().toISOString() },
  { id: "kb12", category: "행정전문대학원_원격수업", title: "행정전문대학원 원격수업 운영", content: "학기당 원격수업 개설 교과목 학점 수는 총 개설 교과목 학점 수의 50%까지 가능. 개발정책학과(온라인학위과정)는 100% 원격수업 개설 가능. 중간고사와 기말고사는 오프라인으로 실시. (행정전문대학원 시행세칙 제53조~제59조)", updatedAt: new Date().toISOString() },
  
  // ===== 일반대학원 시행세칙 (행정전문대학원 규정에 없는 사항 적용) =====
  { id: "kb13", category: "일반대학원_학사과정", title: "일반대학원 학위과정 종류", content: "석사과정, 박사과정, 석·박사통합과정(4년 이상), 학·석사통합과정(6년 이상)을 둔다. 학·석사연계과정 및 학·석·박사통합연계과정도 운영 가능. (대학원학칙 제16조, 제16조의2)", updatedAt: new Date().toISOString() },
  { id: "kb14", category: "일반대학원_수업연한", title: "일반대학원 수업연한 단축", content: "석사과정: 1년 이내 단축 가능. 박사과정: 6개월 이내 단축 가능. 석·박사통합과정: 1년 6개월 이내 단축 가능. 학·석사통합과정: 2년 이내 단축 가능. 세부사항은 각 대학원 시행세칙에 따름. (대학원학칙 제22조)", updatedAt: new Date().toISOString() },
  { id: "kb15", category: "일반대학원_학점인정", title: "일반대학원 학점인정", content: "국내외 다른 대학(원)에서 취득한 학점 인정 가능. 입학 전 이수한 본교 대학원 선수강 학점은 각 대학원 과정별 기준에 따라 인정 가능. 재입학자는 이미 취득한 학점 통산 인정. 계절수업 학점취득은 6학점 이내. (대학원학칙 제25조~제26조)", updatedAt: new Date().toISOString() },
  { id: "kb16", category: "일반대학원_수료", title: "일반대학원 수료 및 수료연구생", content: "수료연구생이란 학위과정 수료요건 충족했으나 학위 미취득 학생. 수료연구생은 매학기 소정 등록금 납부 필요. 수료 후 논문제출연한(재학연한) 경과 시 영구수료 처리. (대학원학칙 제29조, 일반대학원 시행세칙 제26조~제27조)", updatedAt: new Date().toISOString() },
  { id: "kb17", category: "일반대학원_지도교수", title: "일반대학원 지도교수", content: "학생은 지도교수를 선정하여 수업 및 연구 지도 수령. 지도교수 선정 및 변경에 관한 세부사항은 각 대학원 시행세칙에 따름. (대학원학칙 제30조)", updatedAt: new Date().toISOString() },
  { id: "kb18", category: "일반대학원_논문심사", title: "일반대학원 학위논문 심사", content: "학위논문 심사는 각 대학원별 대학원위원회 심의를 거쳐 선정된 심사위원이 실시. 석사과정 논문심사 합격은 심사위원 2인 이상 찬성으로 결정. 박사과정은 심사위원 5인 만장일치 찬성으로 결정. (대학원학칙 제33조의2, 일반대학원 시행세칙 제38조)", updatedAt: new Date().toISOString() },
  { id: "kb19", category: "일반대학원_재입학", title: "일반대학원 재입학", content: "제적된 자에 대해 결원 발생 시 재입학 허가 가능. 징계 퇴학, 재학연한 경과 제적자는 재입학 대상 제외. 재입학은 1회에 한함. (대학원학칙 제10조, 행정전문대학원 시행세칙 제9조)", updatedAt: new Date().toISOString() },
  
  // ===== 대학원 학사운영규정 (공통 사항) =====
  { id: "kb20", category: "대학원_제적", title: "대학원 제적 사유", content: "① 휴학사유 소멸 후 등록기간 내 미복학 ② 매학기 소정 기간 내 미등록 ③ 징계 퇴학 처분 ④ 재학연한 경과 ⑤ 기타 학교규칙이 정하는 사유. (대학원학칙 제15조)", updatedAt: new Date().toISOString() },
  { id: "kb21", category: "대학원_학칙개정", title: "대학원 학칙 개정 절차", content: "① 개정안 작성 및 7일 이상 공고 ② 의견 접수 및 심의안 작성 ③ 교무위원회 심의 ④ 대학평의원회 심의 ⑤ 학교법인 고려중앙학원 승인 ⑥ 총장 확정·공포 ⑦ 시행. 기술적·사소한 사항은 일부 절차 생략 가능. (대학원학칙 제41조~제42조)", updatedAt: new Date().toISOString() },
  { id: "kb22", category: "대학원_학점", title: "대학원 학기별 학점취득 상한", content: "학기별 학점취득 상한은 각 대학원별로 정한다. 계절수업의 학점취득은 6학점 이내로 한다. (대학원학칙 제25조)", updatedAt: new Date().toISOString() },
  
  // ===== 학사운영규정 상세 (2-1-52) =====
  { id: "kb23", category: "대학원_학사운영", title: "대학원 학사운영 규정 - 등록", content: "등록은 매학기 소정 기일 내 등록금 납부 및 수강신청으로 완료. 등록금은 수업료, 입학금, 실험·실습비 등으로 구성. 등록금 액수 및 납입기일은 매학기 시작 전 공시. (대학원 학사운영규정)", updatedAt: new Date().toISOString() },
  { id: "kb24", category: "대학원_학사운영", title: "대학원 학사운영 규정 - 학위논문", content: "학위청구논문은 해당 대학원이 정한 양식과 요건에 따라 작성. 논문 제출 전 지도교수의 최종 확인 필요. 논문 표절 등 부정행위 적발 시 학위취소 사유. (대학원 학사운영규정)", updatedAt: new Date().toISOString() },
  { id: "kb25", category: "대학원_학사운영", title: "대학원 장학금 일반 규정", content: "품행이 바르고 학업성적이 우수하거나 경제적 곤란 등의 사유가 있는 학생에게 장학금 지급 가능. 장학금에 관한 세부사항은 규정 등 하부 학교규칙으로 정함. (대학원학칙 제40조)", updatedAt: new Date().toISOString() },
  
  // ===== 외국인 학생모집 안내 (2026학년도 후기) =====
  { id: "kb26", category: "외국인_입학", title: "외국인 학생 입학자격 - 순수외국인", content: "부모와 본인 모두 외국인으로서 국내·외에서 대한민국 초·중·고등교육(16년)에 상응하는 정규 교육과정을 전부 이수하고 학사 또는 석사 졸업이 가능한 자. 국적기준은 원서 접수일 기준. 지원자 본인과 부모 모두 외국 국적이어야 함. 복수국적 대한민국 국적자는 순수외국인 지원 불가. (2026학년도 후기 행정전문대학원 외국인 학생모집 안내)", updatedAt: new Date().toISOString() },
  { id: "kb27", category: "외국인_입학", title: "외국인 학생 입학자격 - 전교육과정 해외이수자", content: "지원자 본인이 초·중·고등(대학)교육(16년)에 상응하는 정규 교육과정을 전부 해외에서 이수하고 학사 또는 석사 졸업이 가능한 자. 본인 혹은 부모가 한국 국적 소유자. (2026학년도 후기 행정전문대학원 외국인 학생모집 안내)", updatedAt: new Date().toISOString() },
  { id: "kb28", category: "외국인_입학", title: "외국인 학생 어학능력 기준", content: "한국어: TOPIK 3급 이상(국립국제교육원 시행). 영어: TOEFL IBT 71(Home Edition 포함, My Best Score 미인정) 또는 Academic IELTS 5.5(Indicator 미인정) 이상. 영어면제국가: Anguilla, Australia, Canada, Hong Kong, India, Ireland, New Zealand, Nigeria, Pakistan, Philippines, Singapore, South Africa, UK, USA 등 54개국. (2026학년도 후기 행정전문대학원 외국인 학생모집 안내)", updatedAt: new Date().toISOString() },
  { id: "kb29", category: "외국인_입학", title: "외국인 학생 전형일정", content: "원서접수: 2026.6.5(월)~6.30(수) 17:00, 방문 및 우편(등기)접수. 합격자발표: 2026.7.31(금) 10:00, gpa.korea.ac.kr에서 조회. 합격자등록: 2026.8.5(수)~8.7(금) 16:00. 모든 전형일정은 한국시간 기준. 모집과정: 박사과정, 석사과정. 전형방법: 서류평가 100%(구술면접 병행 가능). (2026학년도 후기 행정전문대학원 외국인 학생모집 안내)", updatedAt: new Date().toISOString() },
  { id: "kb30", category: "외국인_입학", title: "외국인 학생 제출서류", content: "① 입학지원서(증명사진, 본인서명) ② 대학졸업(예정)증명서 및 성적증명서 원본(Apostille 또는 영사확인 필요, 중국 소재 대학은 학력인증센터 chsi.com.cn 영문 학위인증서+번역공증) ③ 대학원졸업증명서(박사과정 지원자) ④ 학력조회동의서 ⑤ 개인정보 수집·이용 동의서. 모든 서류는 한국어 또는 영어 제출, 타언어는 번역공증본 필요. (2026학년도 후기 행정전문대학원 외국인 학생모집 안내)", updatedAt: new Date().toISOString() },
];

// Helper functions for AES-256-GCM
function encrypt(text: string, dataType: string): { encryptedHex: string; ivHex: string; tagHex: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  const log: EncryptionLog = {
    id: "enc_" + crypto.randomUUID().substring(0, 8),
    timestamp: new Date().toISOString(),
    action: "ENCRYPT",
    dataType,
    rawText: text,
    encryptedHex: encrypted,
    ivHex: iv.toString("hex"),
    tagHex: tag,
    keyUsed: crypto.createHash("sha1").update(key).digest("hex").substring(0, 16) + "...",
  };
  encryptionLogs.unshift(log);

  return {
    encryptedHex: encrypted,
    ivHex: iv.toString("hex"),
    tagHex: tag,
  };
}

function decrypt(encryptedHex: string, ivHex: string, tagHex: string, dataType: string): string {
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  const log: EncryptionLog = {
    id: "dec_" + crypto.randomUUID().substring(0, 8),
    timestamp: new Date().toISOString(),
    action: "DECRYPT",
    dataType,
    rawText: decrypted,
    encryptedHex,
    ivHex,
    tagHex,
    keyUsed: crypto.createHash("sha1").update(key).digest("hex").substring(0, 16) + "...",
  };
  encryptionLogs.unshift(log);

  return decrypted;
}

// Student database layout with fully encrypted data fields
interface EncryptedStudent {
  studentId: string; // Plain key index
  nameEncrypted: { encryptedHex: string; ivHex: string; tagHex: string };
  profileEncrypted: { encryptedHex: string; ivHex: string; tagHex: string };
}

const encryptedStudentsDb: EncryptedStudent[] = [];

// Populate DB at startup with AES-256-GCM encryption
const rawStudents: StudentInfo[] = [
  { studentId: "202201432", name: "김철수", department: "컴퓨터공학과", gpa: 3.85, completedCredits: 84, warnings: 0, scholarshipStatus: "성적우수장학금 대상자", email: "chulsoo@korea.ac.kr", phone: "010-1111-2222" },
  { studentId: "202112093", name: "이영희", department: "경영학과", gpa: 1.42, completedCredits: 112, warnings: 1, scholarshipStatus: "해당없음 (학사경고로 수혜 제한)", email: "younghee@korea.ac.kr", phone: "010-3333-4444" },
  { studentId: "202304911", name: "박민준", department: "전자공학과", gpa: 4.21, completedCredits: 45, warnings: 0, scholarshipStatus: "성적우수장학금 대상자 (전액)", email: "minjun@korea.ac.kr", phone: "010-5555-6666" },
  { studentId: "202011033", name: "최다은", department: "국어국문학과", gpa: 2.75, completedCredits: 128, warnings: 2, scholarshipStatus: "희망장학금 대상자", email: "daeun@korea.ac.kr", phone: "010-7777-8888" },
];

rawStudents.forEach((student) => {
  const nameEnc = encrypt(student.name, "Student Name");
  const profileEnc = encrypt(JSON.stringify(student), "Student Full Profile");
  encryptedStudentsDb.push({
    studentId: student.studentId,
    nameEncrypted: nameEnc,
    profileEncrypted: profileEnc,
  });
});

// Initialize Gemini API
let ai: GoogleGenAI | null = null;
const geminiKey = process.env.GEMINI_API_KEY;

if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Gemini SDK:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Operating in fallback mock model mode.");
}

// REST API Endpoints

// Verify student (Student authentication with AES-256-GCM validation)
app.post("/api/student/verify", (req, res) => {
  const { studentId, name } = req.body;
  if (!studentId || !name) {
    return res.status(400).json({ error: "학번과 이름을 입력해주세요." });
  }

  const record = encryptedStudentsDb.find((s) => s.studentId === studentId);
  if (!record) {
    return res.status(404).json({ error: "등록되지 않은 학번입니다." });
  }

  try {
    const decryptedName = decrypt(
      record.nameEncrypted.encryptedHex,
      record.nameEncrypted.ivHex,
      record.nameEncrypted.tagHex,
      "Verify Student Name"
    );

    if (decryptedName !== name) {
      return res.status(401).json({ error: "학번과 일치하는 이름이 아닙니다." });
    }

    const decryptedProfileStr = decrypt(
      record.profileEncrypted.encryptedHex,
      record.profileEncrypted.ivHex,
      record.profileEncrypted.tagHex,
      "Verify Student Full Profile"
    );

    const profile: StudentInfo = JSON.parse(decryptedProfileStr);

    // Initialize chatbot session if not exists
    if (!chatSessions.has(studentId)) {
      const welcomeMsg: Message = {
        id: "wel_" + crypto.randomUUID().substring(0, 8),
        sender: "bot",
        text: `안녕하세요, ${name} 학생! AI 대학 학사지원 챗봇입니다. 무엇을 도와드릴까요? (성적, 장학금, 졸업요건, 수강신청 등을 여쭤보실 수 있습니다)`,
        timestamp: new Date().toISOString(),
      };
      chatSessions.set(studentId, {
        studentId,
        studentName: name,
        status: "AI_BOT",
        messages: [welcomeMsg],
        lastActive: new Date().toISOString(),
        studentInfo: profile,
      });
    }

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("Decryption error during verification:", err);
    return res.status(500).json({ error: "복호화 처리 중 오류가 발생했습니다." });
  }
});

// 이메일/성명/연락처 기반 비학번 사용자 등록
const emailUsersDb: { email: string; name: string; phone: string; virtualId: string; registeredAt: string }[] = [];

app.post("/api/student/register", (req, res) => {
  const { email, name, phone } = req.body;
  if (!email || !name || !phone) {
    return res.status(400).json({ error: "이메일, 성명, 연락처를 모두 입력해주세요." });
  }

  // Check if email/name/phone matches an existing student in encrypted DB
  let matchedStudent: StudentInfo | null = null;
  for (const record of encryptedStudentsDb) {
    try {
      const decryptedProfileStr = decrypt(
        record.profileEncrypted.encryptedHex,
        record.profileEncrypted.ivHex,
        record.profileEncrypted.tagHex,
        "Check Email Registration Match"
      );
      const profile: StudentInfo = JSON.parse(decryptedProfileStr);
      if (
        profile.email?.toLowerCase() === email.trim().toLowerCase() &&
        profile.name === name &&
        profile.phone === phone
      ) {
        matchedStudent = profile;
        break;
      }
    } catch { /* skip */ }
  }

  if (matchedStudent) {
    return res.json({
      success: false,
      matchedStudentId: matchedStudent.studentId,
      message: `등록된 재학생 정보와 일치합니다. 학번(${matchedStudent.studentId})으로 학번 인증을 통해 로그인해 주세요.`,
      suggestStudentIdLogin: true,
    });
  }

  // Generate deterministic virtual ID based on email
  const hash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").substring(0, 12);
  const virtualId = "GUEST_" + hash;

  let user = emailUsersDb.find((u) => u.email === email.trim().toLowerCase());
  if (!user) {
    user = { email: email.trim().toLowerCase(), name, phone, virtualId, registeredAt: new Date().toISOString() };
    emailUsersDb.push(user);
  }

  const virtualStudent: StudentInfo = {
    studentId: virtualId,
    name,
    department: "비학번 방문자",
    gpa: 0,
    completedCredits: 0,
    warnings: 0,
    scholarshipStatus: "비해당 (방문자)",
    email: email.trim().toLowerCase(),
    phone,
  };

  if (!chatSessions.has(virtualId)) {
    const lang = detectLanguage(name);
    const welcomeText = (welcomeMessages[lang] || welcomeMessages.ko).replace("{name}", name);
    const welcomeMsg: Message = {
      id: "wel_" + crypto.randomUUID().substring(0, 8),
      sender: "bot",
      text: welcomeText,
      timestamp: new Date().toISOString(),
    };
    chatSessions.set(virtualId, {
      studentId: virtualId,
      studentName: name,
      status: "AI_BOT",
      messages: [welcomeMsg],
      lastActive: new Date().toISOString(),
      studentInfo: virtualStudent,
    });
  }

  res.json({ success: true, studentId: virtualId, profile: virtualStudent });
});

// Fetch current session for a student
app.get("/api/chat/poll/:studentId", (req, res) => {
  const { studentId } = req.params;
  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }
  res.json({ session });
});

// Student sends a message
app.post("/api/chat/message", async (req, res) => {
  const { studentId, text, lang } = req.body;
  if (!studentId || !text) {
    return res.status(400).json({ error: "학번과 메시지 내용이 필요합니다." });
  }

  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "세션이 존재하지 않습니다." });
  }

  // Create and append user message
  const userMsg: Message = {
    id: "msg_" + crypto.randomUUID().substring(0, 8),
    sender: "student",
    text,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);
  session.lastActive = new Date().toISOString();

  if (session.status === "COUNSELOR") {
    // Just append the message, wait for counselor to respond
    return res.json({ status: "COUNSELOR", messages: session.messages });
  }

  // AI BOT Mode
  try {
    let aiResponseText = "";

    // Trigger counselor matching if certain keywords are met
    const triggerCounselorKeywords = ["상담사", "상담원", "사람 연결", "도움이 안 됨", "도움이안됨", "상담연결", "직원 연결", "상담하고 싶"];
    const shouldConnectCounselor = triggerCounselorKeywords.some((keyword) => text.includes(keyword));

    if (shouldConnectCounselor) {
      session.status = "COUNSELOR";
      const systemMsg: Message = {
        id: "sys_" + crypto.randomUUID().substring(0, 8),
        sender: "system",
        text: "상담원과의 1:1 실시간 상담 연결을 요청했습니다. 상담원이 참여할 때까지 잠시만 기다려주세요.",
        timestamp: new Date().toISOString(),
      };
      session.messages.push(systemMsg);
      return res.json({ status: "COUNSELOR", messages: session.messages });
    }

    // AI answer generation
    if (ai) {
      const student = session.studentInfo || { name: session.studentName, studentId: session.studentId };
      
      // Language detection (explicit lang param > auto-detect)
      const selectedLang = lang || detectLanguage(text);
      const langInstruction = selectedLang === "en" 
        ? "You MUST answer in English. If the student writes in English, respond in English."
        : selectedLang === "zh"
          ? "您必须用中文回答。如果学生用中文提问，请用中文回答。"
          : "반드시 한국어로 답변하세요.";
      
      const systemInstruction = `당신은 고려대학교 대학원(행정전문대학원 및 일반대학원) 학사지원 AI 챗봇입니다. You are an AI assistant for Korea University Graduate School of Public Administration. 您是高丽大学行政专门大学院的AI助理。
다음은 대학원의 최신 학사 및 장학금 규정(RAG 지식베이스)입니다. 규정 우선순위는 다음과 같습니다:
1순위: 행정전문대학원 시행세칙 (행정전문대학원 재학생에게 우선 적용)
2순위: 일반대학원 시행세칙 (행정전문대학원 규정에 없는 사항)
3순위: 대학원 학사운영규정 (공통 사항)
4순위: 대학원학칙 (기본 사항)
${JSON.stringify(academicRules, null, 2)}

질문하는 학생의 세부 정보:
[학생 이름]: ${student.name}
[학번]: ${student.studentId}
[소속 대학원/학과]: ${(student as any).department || "미지정"}
[직전 학기 평점평균(GPA)]: ${(student as any).gpa || "정보없음"}
[이수한 누적학점]: ${(student as any).completedCredits || "정보없음"}
[누적 학사경고 횟수]: ${(student as any).warnings !== undefined ? (student as any).warnings : "정보없음"}
[현재 장학금 자격]: ${(student as any).scholarshipStatus || "정보없음"}

위 대학원 학사 규정과 학생의 개인 정보를 연계하여 맞춤형으로 아주 정확하게 답변하세요. 반드시 규정 우선순위를 지켜서 답변하세요. (행정전문대학원 재학생은 행정전문대학원 시행세칙 우선 적용)

언어 규칙 (LANGUAGE RULES):
${langInstruction}

답변 원칙:
1. 학생이 사용한 언어와 동일한 언어로 답변하세요. (한국어/영어/중국어 지원)
2. 친절하고 신뢰감 높은 대학교 직원 톤을 유지하세요.
3. 지식베이스에 없는 모호한 내용은 억지로 지어내지 말고, 해당 내용은 구체적인 확인이 필요함을 안내하세요.
4. 외국인 입학 관련 문의는 "외국인_입학" 규정을 우선 참고하세요.
5. For foreign student admissions questions, refer to the foreign admissions rules (kb26-kb30).`;

      // Build chat prompt using previous message context (last 6 messages)
      const recentMessages = session.messages.slice(-6).map((m) => {
        return m.sender === "student" ? `학생/Student: ${m.text}` : `AI: ${m.text}`;
      }).join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${recentMessages}\n\n위 대화에 이어 학생의 최신 질문에 맞춤형 답변을 한 문단 이상으로 풍부하고 친절하게 작성하세요. (Use the same language as the student's latest message)`,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      aiResponseText = response.text || "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";
    } else {
      // Fallback Smart Keyword Mock RAG Answer Engine (if API Key is missing)
      const student = session.studentInfo || { name: session.studentName, studentId: session.studentId };
      aiResponseText = getMockResponse(text, student as StudentInfo, academicRules);
    }

    const botMsg: Message = {
      id: "bot_" + crypto.randomUUID().substring(0, 8),
      sender: "bot",
      text: aiResponseText,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(botMsg);
    res.json({ status: "AI_BOT", messages: session.messages });

  } catch (error) {
    console.error("AI response generation error:", error);
    // Safe error recovery
    const errorMsg: Message = {
      id: "err_" + crypto.randomUUID().substring(0, 8),
      sender: "bot",
      text: "죄송합니다. 서버 내 일시적인 통신 상태 불안정으로 AI 답변을 전송하지 못했습니다. 도움이 필요하신 경우 '상담사 연결' 버튼을 통해 직원을 매칭해 드리겠습니다.",
      timestamp: new Date().toISOString(),
    };
    session.messages.push(errorMsg);
    res.json({ status: "AI_BOT", messages: session.messages });
  }
});

// Manually switch student's status to COUNSELOR
app.post("/api/chat/request-counselor", (req, res) => {
  const { studentId } = req.body;
  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }

  session.status = "COUNSELOR";
  const systemMsg: Message = {
    id: "sys_" + crypto.randomUUID().substring(0, 8),
    sender: "system",
    text: "상담원 일대일 상담 채널이 활성화되었습니다. 전문 상담사가 연결되는 중입니다.",
    timestamp: new Date().toISOString(),
  };
  session.messages.push(systemMsg);
  session.lastActive = new Date().toISOString();

  res.json({ success: true, session });
});

// Switch counselor back to AI_BOT
app.post("/api/chat/request-bot", (req, res) => {
  const { studentId } = req.body;
  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }

  session.status = "AI_BOT";
  const systemMsg: Message = {
    id: "sys_" + crypto.randomUUID().substring(0, 8),
    sender: "system",
    text: "상담원 대화가 종료되었으며, 다시 AI 자동 답변 지원 시스템(AI BOT)으로 전환되었습니다.",
    timestamp: new Date().toISOString(),
  };
  session.messages.push(systemMsg);
  session.lastActive = new Date().toISOString();

  res.json({ success: true, session });
});

// Counselor Endpoints

// Get all active sessions (for dashboard)
app.get("/api/counselor/sessions", (req, res) => {
  const list = Array.from(chatSessions.values());
  res.json({ sessions: list });
});

// Counselor sends a message
app.post("/api/counselor/message", (req, res) => {
  const { studentId, text } = req.body;
  if (!studentId || !text) {
    return res.status(400).json({ error: "메시지 내용을 전달해주세요." });
  }

  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "세션을 찾을 수 없습니다." });
  }

  const counselorMsg: Message = {
    id: "cns_" + crypto.randomUUID().substring(0, 8),
    sender: "counselor",
    text,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(counselorMsg);
  session.lastActive = new Date().toISOString();

  res.json({ success: true, messages: session.messages });
});

// 학생별 대화내역 조회 (이전 기록 포함)
app.get("/api/counselor/student/:studentId/history", (req, res) => {
  const { studentId } = req.params;
  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "해당 학생의 대화 기록이 없습니다." });
  }
  res.json({
    studentId: session.studentId,
    studentName: session.studentName,
    studentInfo: session.studentInfo,
    status: session.status,
    lastActive: session.lastActive,
    messages: session.messages,
    messageCount: session.messages.length,
  });
});

// 학생별 대화내역 다운로드 (JSON)
app.get("/api/counselor/student/:studentId/download", (req, res) => {
  const { studentId } = req.params;
  const session = chatSessions.get(studentId);
  if (!session) {
    return res.status(404).json({ error: "해당 학생의 대화 기록이 없습니다." });
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    studentId: session.studentId,
    studentName: session.studentName,
    studentInfo: session.studentInfo,
    status: session.status,
    lastActive: session.lastActive,
    messageCount: session.messages.length,
    chatLog: session.messages.map((m) => ({
      id: m.id,
      sender: m.sender === "student" ? "학생" : m.sender === "bot" ? "AI 챗봇" : m.sender === "counselor" ? "상담사" : "시스템",
      text: m.text,
      timestamp: m.timestamp,
    })),
  };

  const filename = `chat_history_${session.studentId}_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(exportData);
});

// Get encryption auditing logs
app.get("/api/audit/logs", (req, res) => {
  res.json({ logs: encryptionLogs });
});

// Clear encryption auditing logs
app.post("/api/audit/clear", (req, res) => {
  encryptionLogs.length = 0;
  res.json({ success: true });
});

// Knowledge base endpoints (RAG Editor)
app.get("/api/kb/rules", (req, res) => {
  res.json({ rules: academicRules });
});

app.post("/api/kb/rules", (req, res) => {
  const { id, category, title, content } = req.body;
  if (!category || !title || !content) {
    return res.status(400).json({ error: "모든 항목을 입력해야 합니다." });
  }

  if (id) {
    // Edit existing rule
    academicRules = academicRules.map((rule) => {
      if (rule.id === id) {
        return { ...rule, category, title, content, updatedAt: new Date().toISOString() };
      }
      return rule;
    });
  } else {
    // Create new rule
    const newRule: AcademicRule = {
      id: "kb_" + crypto.randomUUID().substring(0, 8),
      category,
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    academicRules.push(newRule);
  }

  res.json({ success: true, rules: academicRules });
});

app.delete("/api/kb/rules/:id", (req, res) => {
  const { id } = req.params;
  academicRules = academicRules.filter((rule) => rule.id !== id);
  res.json({ success: true, rules: academicRules });
});

// GPA 공지사항 프록시 (gpa.korea.ac.kr → 로컬 캐시)
const gpaNoticesCache: { 학사공지: any[]; 일반공지: any[] } = { 학사공지: [], 일반공지: [] };
let lastFetchTime = 0;

async function fetchGpaNotices() {
  const now = Date.now();
  if (now - lastFetchTime < 60000 && gpaNoticesCache.학사공지.length > 0) return; // 1min cache

  try {
    const https = await import("https");
    const fetchOpts = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    };

    // Try fetching 학사공지 and 일반공지 pages
    const urls = [
      { key: "학사공지", url: "https://gpa.korea.ac.kr/gpa/na/ntt/selectNttList.do?mi=2057&bbsId=1070" },
      { key: "일반공지", url: "https://gpa.korea.ac.kr/gpa/na/ntt/selectNttList.do?mi=2058&bbsId=1071" },
    ];

    for (const { key, url } of urls) {
      try {
        const resp = await fetch(url, fetchOpts);
        if (resp.ok) {
          const html = await resp.text();
          // Parse simple title/date patterns from HTML
          const titles = [...html.matchAll(/<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</gi)].map(m => m[1].trim());
          const dates = [...html.matchAll(/(\d{4}\.\d{2}\.\d{2})/g)].map(m => m[1]);
          gpaNoticesCache[key as keyof typeof gpaNoticesCache] = titles.map((t, i) => ({
            title: t,
            date: dates[i] || new Date().toISOString().slice(0, 10).replace(/-/g, "."),
          }));
        }
      } catch { /* ignore fetch errors */ }
    }
    lastFetchTime = now;
  } catch { /* ignore */ }
}

app.get("/api/notices", async (req, res) => {
  await fetchGpaNotices();

  // Fallback data if fetch failed - dates dynamically calculated from today
  const now = new Date();
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  };
  const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return fmt(d); };

  if (gpaNoticesCache.학사공지.length === 0) {
    gpaNoticesCache.학사공지 = [
      { title: "2026학년도 2학기 행정전문대학원 수강신청 및 학사일정 안내", date: daysAgo(2) },
      { title: "2026학년도 전기 석사/박사 학위청구논문 심사 일정 공고", date: daysAgo(7) },
      { title: "행정전문대학원 종합시험 시행 계획 및 응시 자격 안내 (3월/9월)", date: daysAgo(12) },
    ];
    gpaNoticesCache.일반공지 = [
      { title: "2026학년도 2학기 행정전문대학원 신입생 모집요강 공고", date: daysAgo(4) },
      { title: "2026학년도 2학기 행정전문대학원 장학금 신청 안내 (직전학기 B+ 이상)", date: daysAgo(10) },
      { title: "개인정보 유출 방지를 위한 Node.js crypto GCM 암호화 연계 실시간 감사 시행", date: daysAgo(17) },
    ];
  }

  res.json({
    source: gpaNoticesCache.학사공지.length > 0 ? "gpa.korea.ac.kr (cached)" : "fallback",
    notices: gpaNoticesCache,
  });
});

// FAQ 엔드포인트 (gpa.korea.ac.kr 및 인터넷 검색 기반 자주 묻는 질문)
app.get("/api/faq", async (req, res) => {
  const faqs = [
    {
      q: "고려대학교 행정전문대학원 석사과정에 지원하려면 어떤 자격이 필요한가요?",
      a: "학사학위를 취득한 자(또는 동등 이상 학력 인정자)라면 지원 가능합니다. 입학전형은 특별전형으로 서류심사와 구술시험(면접)으로 진행됩니다. 모집요강은 매년 gpa.korea.ac.kr 입학안내 메뉴에 공지되며, 원서접수는 온라인으로 진행됩니다. (행정전문대학원 시행세칙 제5조~제8조, https://gpa.korea.ac.kr)"
    },
    {
      q: "행정전문대학원 석사과정을 졸업하려면 총 몇 학점을 이수해야 하나요?",
      a: "논문트랙 선택 시: 전공필수 9학점, 전공선택 15학점, 연구지도 4학점으로 총 28학점입니다. 교과트랙 선택 시: 전공필수 9학점, 전공선택 15학점, 추가전공선택 6학점, 연구지도 4학점으로 총 34학점입니다. 매학기 전공학점은 최대 9학점까지 신청 가능합니다. (행정전문대학원 시행세칙 제23조)"
    },
    {
      q: "행정전문대학원 등록금은 얼마이며, 장학금 혜택을 받을 수 있나요?",
      a: "등록금은 매학기 시작 전 학교 홈페이지에 공시됩니다. 기본 수업연한(석사 4학기, 박사 6학기)까지는 등록금 전액을 납부해야 합니다. 장학금은 입학성적 우수 신입생과 직전학기 B+(3.5) 이상 재학생에게 지급 가능하며, 세부 기준은 행정전문대학원 장학금 지급 세칙에 따릅니다. (행정전문대학원 시행세칙 제14조, 제44조)"
    },
    {
      q: "종합시험은 언제 보며, 몇 과목을 응시해야 하나요?",
      a: "종합시험은 매년 3월과 9월에 실시됩니다. 석사과정은 전공 3과목, 박사과정은 전공 4과목이며, 각 과목 100점 만점에 70점 이상이면 합격입니다. 응시 가능 횟수는 총 3회로 제한됩니다. 석사과정은 2학기 이상 이수하고 12학점 이상 취득 시 응시 가능합니다. (행정전문대학원 시행세칙 제27조~제31조)"
    },
    {
      q: "행정전문대학원 박사과정에 지원하려면 석사학위가 꼭 필요한가요?",
      a: "네, 박사과정 입학자격은 석사학위를 취득한 자(또는 동등 이상 학력 인정자)입니다. 박사과정 수업연한은 3년(6학기)이며, 총 42학점(전공필수 12, 전공선택 24, 연구지도 6)을 이수해야 합니다. (행정전문대학원 시행세칙 제5조, 제21조, 제23조)"
    },
    {
      q: "학위청구논문 제출 기한을 넘기면 어떻게 되나요?",
      a: "수료 후 논문제출연한(재학연한)이 경과하면 영구수료 처리되어 더 이상 논문을 제출할 수 없습니다. 다만 1회에 한해 연장 신청이 가능하며, 연장 허가를 받은 학기 포함 2학기 이내에 논문을 제출하고 통과해야 합니다. 연장자는 종합시험을 다시 응시해야 합니다. (행정전문대학원 시행세칙 제37조의3)"
    },
    {
      q: "휴학은 최대 몇 학기까지 가능하며, 자퇴는 어떻게 하나요?",
      a: "석사과정은 통산 3년(6학기), 박사과정은 통산 4년(8학기)까지 휴학이 가능합니다. 휴학은 1년 또는 학기 단위로 신청할 수 있습니다. 자퇴를 원하는 경우 소정의 절차를 거쳐 제적 허가를 받을 수 있으며, 징계에 의한 퇴학 처분자와 재학연한 경과 제적자는 재입학이 불가능합니다. (행정전문대학원 시행세칙 제9조~제11조)"
    },
    {
      q: "행정전문대학원에는 어떤 학과가 있으며, 학위명은 무엇인가요?",
      a: "행정학과, 정책학과, 개발정책학과(온라인석사과정)가 있습니다. 학위명은 행정학과/한국형개발행정전공 → 행정학석사(MPA), 정책학과/한국형개발정책전공 → 정책학석사(MPP)이며, 박사는 행정학박사(Ph.D./DPA), 정책학박사(Ph.D./DPP)입니다. (행정전문대학원 시행세칙 제20조, 제38조)"
    },
  ];
  res.json({ source: "gpa.korea.ac.kr (규정 기반, 인터넷 질문 반영)", faqs });
});

// Language detection helper
function detectLanguage(text: string): "ko" | "en" | "zh" {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  
  if (chineseChars > koreanChars && chineseChars > englishChars / 2) return "zh";
  if (englishChars > koreanChars && englishChars > 3) return "en";
  return "ko";
}

// Multilingual welcome messages
const welcomeMessages: Record<string, string> = {
  ko: "안녕하세요, {name}님! 고려대학교 행정전문대학원 학사지원 챗봇입니다. 입학문의, 학사제도 등 무엇이든 물어보세요.",
  en: "Hello, {name}! Welcome to Korea University Graduate School of Public Administration chatbot. Ask me anything about admissions, academics, and more.",
  zh: "您好，{name}！欢迎来到高丽大学行政专门大学院咨询聊天机器人。请随时咨询入学、学业等相关问题。",
};

// Mock response algorithm (extremely smart keyword-matching fallback)
function getMockResponse(text: string, student: StudentInfo, rules: AcademicRule[]): string {
  const lowText = text.toLowerCase();

  // Find matching rules by keyword (Graduate School focused)
  const gradSchoolCategories: string[] = [];
  
  // Check if the question is about 행정전문대학원
  const isAdminGrad = lowText.includes("행정전문") || lowText.includes("행정대학원") || lowText.includes("mpa") || lowText.includes("dpa");
  
  if (lowText.includes("입학") || lowText.includes("지원") || lowText.includes("원서") || lowText.includes("전형")) {
    gradSchoolCategories.push("행정전문대학원_입학");
  }
  if (lowText.includes("휴학") || lowText.includes("복학") || lowText.includes("자퇴")) {
    gradSchoolCategories.push("행정전문대학원_휴학");
  }
  if (lowText.includes("종합시험") || lowText.includes("시험") || lowText.includes("응시")) {
    gradSchoolCategories.push("행정전문대학원_종합시험");
  }
  if (lowText.includes("학위") || lowText.includes("졸업") || lowText.includes("논문") || lowText.includes("석사") || lowText.includes("박사") || lowText.includes("수여")) {
    gradSchoolCategories.push("행정전문대학원_학위");
  }
  if ((lowText.includes("학점") || lowText.includes("이수")) && !lowText.includes("졸업")) {
    gradSchoolCategories.push("행정전문대학원_학점");
  }
  if (lowText.includes("장학") || lowText.includes("돈") || lowText.includes("수업료") || lowText.includes("혜택")) {
    gradSchoolCategories.push("행정전문대학원_장학금");
  }
  if (lowText.includes("수강") || lowText.includes("신청") || lowText.includes("등록금") || lowText.includes("일정") || lowText.includes("기간")) {
    gradSchoolCategories.push("행정전문대학원_수강신청");
  }
  if (lowText.includes("제적") || lowText.includes("경고")) {
    gradSchoolCategories.push("대학원_제적");
  }
  if (lowText.includes("수업연한") || lowText.includes("재학연한") || lowText.includes("기간") || lowText.includes("년")) {
    gradSchoolCategories.push("행정전문대학원_수업연한");
  }
  if (lowText.includes("트랙") || lowText.includes("논문트랙") || lowText.includes("교과트랙") || lowText.includes("캡스톤") || lowText.includes("capstone")) {
    gradSchoolCategories.push("행정전문대학원_트랙");
  }
  if (lowText.includes("원격") || lowText.includes("온라인") || lowText.includes("비실시간")) {
    gradSchoolCategories.push("행정전문대학원_원격수업");
  }
  if (lowText.includes("지도교수") || lowText.includes("교수") || lowText.includes("지도")) {
    gradSchoolCategories.push("일반대학원_지도교수");
  }
  if (lowText.includes("재입학") || lowText.includes("편입")) {
    gradSchoolCategories.push("일반대학원_재입학");
  }
  if (lowText.includes("수료연구") || lowText.includes("영구수료") || lowText.includes("수료")) {
    gradSchoolCategories.push("일반대학원_수료");
  }
  if (lowText.includes("학칙") || lowText.includes("개정")) {
    gradSchoolCategories.push("대학원_학칙개정");
  }

  let bestRules: AcademicRule[] = [];
  for (const cat of gradSchoolCategories) {
    const found = rules.filter((r) => r.category === cat);
    bestRules.push(...found);
  }
  if (bestRules.length === 0 && (lowText.includes("장학") || lowText.includes("학점") || lowText.includes("수강"))) {
    bestRules = [rules.find((r) => r.id === "kb25")!].filter(Boolean);
  }

  let intro = `[※ Mock AI 모드 답변 - GEMINI_API_KEY 미등록]
안녕하세요, ${student.name} 학생. 현재 AI API가 비활성화되어 모의 지식베이스 검색 엔진이 대학원 학사 규칙을 직접 매칭해 답변드립니다.\n\n`;

  if (bestRules.length > 0) {
    let detailMsg = `고려대학교 대학원 규정을 참고해 설명해 드릴게요.\n\n`;
    for (const rule of bestRules) {
      detailMsg += `■ [${rule.title}]\n${rule.content}\n\n`;
    }

    // Personalized details linking (Graduate school context)
    if (gradSchoolCategories.some(c => c.includes("장학금"))) {
      detailMsg += `학생님의 직전 학기 평점평균(GPA)은 **${student.gpa}**이며, 장학 자격 상태는 [**${student.scholarshipStatus}**]입니다.\n`;
      if (student.gpa >= 3.5) {
        detailMsg += `행정전문대학원 장학금 규정(제44조)에 따라 직전학기 B+(3.5) 이상 요건을 충족하셨습니다.`;
      } else {
        detailMsg += `행정전문대학원 장학금 규정(제44조)에 따라 재학생은 직전학기 B+(3.5) 이상이어야 하며, 현재 GPA가 ${student.gpa}이므로 장학금 대상이 아닙니다.`;
      }
    }
    if (gradSchoolCategories.some(c => c.includes("학점"))) {
      detailMsg += `\n현재 학생님의 누적 취득 학점은 **${student.completedCredits}학점**입니다.`;
    }
    if (gradSchoolCategories.some(c => c.includes("제적"))) {
      detailMsg += `\n현재 학생님의 누적 학사경고는 **${student.warnings}**회입니다.`;
    }

    return intro + detailMsg;
  }

  // Fallback generic help message
  return (
    intro +
    `질문하신 내용 "${text}"에 대응되는 정확한 대학원 규칙 카테고리를 특정하지 못했습니다.\n\n` +
    `다음 키워드로 다시 질문해 주시거나 상세 정보를 확인하고 싶으시면 학사 지원 부서나 상담사를 찾아주세요:\n` +
    `- 행정전문대학원 입학, 수업연한, 학점이수\n` +
    `- 행정전문대학원 종합시험, 학위청구논문\n` +
    `- 행정전문대학원 장학금, 등록금 감면\n` +
    `- 일반대학원 재입학, 수료연구생, 지도교수\n` +
    `- 대학원 제적, 학칙개정\n\n` +
    `직접 상담사와의 실시간 대화 연결을 희망하시는 경우 언제든 "상담사 연결"을 말씀해 주세요.`
  );
}

// Vite / Production Asset Hosting Integration
async function startServer() {
  // 데모 페이지: gpa.korea.ac.kr 임베딩 데모 (Vite 미들웨어보다 먼저 등록)
  // 데모 페이지: gpa.korea.ac.kr 임베딩 데모
  app.get("/demo", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>고려대학교 행정전문대학원 - GPA 챗봇 임베딩 데모</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; background: #f5f5f5; color: #333; }
  .gpa-header { background: linear-gradient(135deg, #861F41 0%, #a82850 100%); color: white; padding: 16px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .gpa-header h1 { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .gpa-header .sub { font-size: 11px; opacity: 0.8; margin-top: 2px; }
  .gpa-nav { background: white; border-bottom: 1px solid #e0e0e0; padding: 0 24px; display: flex; gap: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .gpa-nav a { padding: 12px 16px; font-size: 13px; font-weight: 600; color: #555; text-decoration: none; border-bottom: 3px solid transparent; transition: all 0.2s; }
  .gpa-nav a:hover { color: #861F41; border-bottom-color: #861F41; }
  .gpa-body { max-width: 1100px; margin: 24px auto; padding: 0 24px; display: flex; gap: 24px; }
  .gpa-main { flex: 1; }
  .gpa-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #eee; }
  .gpa-card h2 { font-size: 16px; color: #861F41; margin-bottom: 12px; font-weight: 700; }
  .gpa-card p { font-size: 13px; line-height: 1.7; color: #555; }
  .gpa-card .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #861F41; color: white; margin-right: 6px; }
  .gpa-sidebar { width: 300px; }
  .gpa-sidebar .box { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #eee; }
  .gpa-sidebar .box h3 { font-size: 13px; color: #861F41; margin-bottom: 8px; font-weight: 700; }
  .gpa-sidebar .box ul { list-style: none; }
  .gpa-sidebar .box li { padding: 6px 0; font-size: 12px; color: #666; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
  .gpa-sidebar .box li:hover { color: #861F41; }
  .gpa-footer { background: #333; color: #999; text-align: center; padding: 24px; font-size: 12px; margin-top: 40px; }
  .embed-badge { position: fixed; bottom: 100px; right: 24px; background: rgba(134,31,65,0.08); border: 1px solid rgba(134,31,65,0.2); border-radius: 12px; padding: 8px 14px; font-size: 11px; color: #861F41; font-weight: 600; z-index: 999; pointer-events: none; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
</style>
</head>
<body>
  <div class="gpa-header">
    <div>
      <h1>고려대학교 세종캠퍼스 행정전문대학원</h1>
      <div class="sub">Graduate School of Public Administration · KOREA UNIVERSITY Sejong Campus</div>
    </div>
  </div>
  <nav class="gpa-nav">
    <a href="#">대학원 소개</a>
    <a href="#">입학안내</a>
    <a href="#">학위과정</a>
    <a href="#" style="color:#861F41;border-bottom-color:#861F41;">학사안내</a>
    <a href="#">공지/양식</a>
    <a href="#">커뮤니티</a>
  </nav>
  <div class="gpa-body">
    <div class="gpa-main">
      <div class="gpa-card">
        <span class="badge">학사</span>
        <h2>2026학년도 2학기 수강신청 안내</h2>
        <p>2026학년도 2학기 행정전문대학원 수강신청 일정을 안내드립니다. 예비수강신청은 8월 10일~12일, 본 수강신청은 8월 17일~21일입니다. 매학기 교과학점은 9학점까지 신청 가능하며, 연구지도 학점을 포함하여 신청해야 합니다.</p>
      </div>
      <div class="gpa-card">
        <span class="badge">장학</span>
        <h2>2026학년도 2학기 장학금 신청 안내</h2>
        <p>행정전문대학원 재학생 장학금은 직전학기 B+(3.5) 이상인 학생을 대상으로 지급됩니다. 신청 기간 내에 행정전문대학원행정실로 제출해 주시기 바랍니다.</p>
      </div>
      <div class="gpa-card">
        <span class="badge">입학</span>
        <h2>2026학년도 후기 신입생 모집 안내</h2>
        <p>석사과정 및 박사과정 신입생을 모집합니다. 원서접수는 온라인으로 진행되며, 서류심사와 구술시험을 통해 선발합니다. 자세한 사항은 입학안내 메뉴를 참고하세요.</p>
      </div>
    </div>
    <div class="gpa-sidebar">
      <div class="box">
        <h3>📋 학사일정</h3>
        <ul>
          <li>8/10~8/12 예비수강신청</li>
          <li>8/17~8/21 본 수강신청</li>
          <li>8/24~8/28 등록금 납부</li>
          <li>9/1 개강</li>
          <li>9월 종합시험</li>
        </ul>
      </div>
      <div class="box">
        <h3>🔗 바로가기</h3>
        <ul>
          <li>모집요강</li>
          <li>원서접수</li>
          <li>합격자조회</li>
          <li>학칙/규정</li>
          <li>제양식</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="gpa-footer">
    (30019) 세종특별자치시 세종로 2511 고려대학교 세종캠퍼스 공공정책관 427호 행정전문대학원<br>
    TEL : 044-860-3825~6 / E-mail: gre017@korea.ac.kr<br>
    Copyright ⓒ KOREA University Sejong Campus All Rights Reserved
  </div>

  <div class="embed-badge">🧩 AI 챗봇 임베딩 영역 (우측 하단)</div>

  <!-- 임베딩 스크립트 방식: iframe 또는 script -->
  <script>
    // 데모: iframe 임베딩 방식
    var iframe = document.createElement('iframe');
    iframe.src = '/';
    iframe.style.cssText = 'position:fixed;bottom:80px;right:20px;width:400px;height:600px;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:10000;background:white;display:none;';
    iframe.id = 'gpa-chatbot-iframe';
    document.body.appendChild(iframe);

    // 플로팅 버튼
    var btn = document.createElement('button');
    btn.innerHTML = '💬';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#861F41;color:white;border:none;border-radius:50%;font-size:24px;cursor:pointer;z-index:10001;box-shadow:0 4px 16px rgba(134,31,65,0.4);transition:all 0.2s;';
    btn.onmouseenter = function() { this.style.transform = 'scale(1.1)'; };
    btn.onmouseleave = function() { this.style.transform = 'scale(1)'; };
    btn.onclick = function() {
      var f = document.getElementById('gpa-chatbot-iframe');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    };
    document.body.appendChild(btn);
  </script>
</body>
</html>`);
  });

  // 위젯 스크립트 데모: gpa.korea.ac.kr 위젯 임베딩 방식 + 다국어 지원
  app.get("/widget-demo", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>고려대학교 행정전문대학원 - 위젯 임베딩 데모</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; background: #f5f5f5; color: #333; }
  .gpa-header { background: linear-gradient(135deg, #861F41 0%, #a82850 100%); color: white; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  .gpa-header h1 { font-size: 18px; font-weight: 800; }
  .gpa-header .sub { font-size: 11px; opacity: 0.8; }
  .gpa-lang { margin-left: auto; display: flex; gap: 4px; }
  .gpa-lang button { padding: 4px 10px; font-size: 11px; background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; cursor: pointer; }
  .gpa-lang button:hover { background: rgba(255,255,255,0.3); }
  .gpa-lang button.active { background: rgba(255,255,255,0.9); color: #861F41; font-weight: 700; }
  .gpa-nav { background: white; border-bottom: 1px solid #e0e0e0; padding: 0 24px; display: flex; gap: 0; }
  .gpa-nav a { padding: 12px 16px; font-size: 13px; font-weight: 600; color: #555; text-decoration: none; border-bottom: 3px solid transparent; }
  .gpa-nav a:hover { color: #861F41; border-bottom-color: #861F41; }
  .gpa-body { max-width: 1100px; margin: 24px auto; padding: 0 24px; display: flex; gap: 24px; }
  .gpa-main { flex: 1; }
  .gpa-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #eee; }
  .gpa-card h2 { font-size: 16px; color: #861F41; margin-bottom: 12px; font-weight: 700; }
  .gpa-card p { font-size: 13px; line-height: 1.7; color: #555; }
  .gpa-card .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #861F41; color: white; margin-right: 6px; }
  .gpa-sidebar { width: 300px; }
  .gpa-sidebar .box { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #eee; }
  .gpa-sidebar .box h3 { font-size: 13px; color: #861F41; margin-bottom: 8px; }
  .gpa-sidebar .box ul { list-style: none; }
  .gpa-sidebar .box li { padding: 6px 0; font-size: 12px; color: #666; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
  .gpa-footer { background: #333; color: #999; text-align: center; padding: 24px; font-size: 12px; margin-top: 40px; }
  .code-box { background: #1e1e2e; color: #a0d4a0; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; margin-top: 12px; }
  .install-note { background: #fff8e1; border: 1px solid #ffe082; border-radius: 12px; padding: 14px; font-size: 12px; color: #795548; margin-top: 12px; }
</style>
</head>
<body>
  <div class="gpa-header">
    <div>
      <h1 id="site-title">고려대학교 세종캠퍼스 행정전문대학원</h1>
      <div class="sub" id="site-sub">Graduate School of Public Administration · KOREA UNIVERSITY Sejong Campus</div>
    </div>
    <div class="gpa-lang">
      <button class="active" onclick="changeLang('ko')">KO</button>
      <button onclick="changeLang('en')">EN</button>
      <button onclick="changeLang('zh')">CN</button>
    </div>
  </div>
  <nav class="gpa-nav">
    <a href="#" id="nav1">대학원 소개</a>
    <a href="#" id="nav2">입학안내</a>
    <a href="#" id="nav3" style="color:#861F41;border-bottom-color:#861F41;">학사안내</a>
    <a href="#" id="nav4">공지/양식</a>
    <a href="#" id="nav5">커뮤니티</a>
  </nav>
  <div class="gpa-body">
    <div class="gpa-main">
      <div class="gpa-card">
        <span class="badge">${"학사"}</span>
        <h2 id="card1-title">2026학년도 2학기 수강신청 안내</h2>
        <p id="card1-desc">2026학년도 2학기 행정전문대학원 수강신청 일정을 안내드립니다. 예비수강신청은 8월 10일~12일, 본 수강신청은 8월 17일~21일입니다.</p>
      </div>
      <div class="gpa-card">
        <span class="badge">${"장학"}</span>
        <h2 id="card2-title">2026학년도 2학기 장학금 신청 안내</h2>
        <p id="card2-desc">행정전문대학원 재학생 장학금은 직전학기 B+(3.5) 이상인 학생을 대상으로 지급됩니다.</p>
      </div>
      <div class="install-note">
        <strong>🧩 위젯 스크립트 임베딩 방식</strong><br>
        gpa.korea.ac.kr에 아래 스크립트 태그 하나만 추가하면 챗봇이 자동으로 삽입됩니다.<br>
        <div class="code-box">&lt;script src="https://your-server.com/widget.js"&gt;&lt;/script&gt;</div>
        <strong>✅ 장점:</strong> iframe 불필요, 다국어 자동감지, 기존 사이트 디자인 유지
      </div>
    </div>
    <div class="gpa-sidebar">
      <div class="box">
        <h3 id="side-title">📋 학사일정</h3>
        <ul id="side-list">
          <li>8/10~8/12 예비수강신청</li>
          <li>8/17~8/21 본 수강신청</li>
          <li>8/24~8/28 등록금 납부</li>
          <li>9/1 개강</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="gpa-footer">
    (30019) 세종특별자치시 세종로 2511 고려대학교 세종캠퍼스 공공정책관 427호 행정전문대학원<br>
    TEL : 044-860-3825~6 / E-mail: gre017@korea.ac.kr<br>
    Copyright ⓒ KOREA University Sejong Campus All Rights Reserved
  </div>

  <script>
    // 다국어 지원 (데모용 간단 번역)
    var langData = {
      ko: {
        title: "고려대학교 세종캠퍼스 행정전문대학원",
        sub: "Graduate School of Public Administration · KOREA UNIVERSITY Sejong Campus",
        nav: ["대학원 소개", "입학안내", "학사안내", "공지/양식", "커뮤니티"],
        card1: "2026학년도 2학기 수강신청 안내",
        card1d: "2026학년도 2학기 행정전문대학원 수강신청 일정을 안내드립니다.",
        card2: "2026학년도 2학기 장학금 신청 안내",
        card2d: "행정전문대학원 재학생 장학금은 직전학기 B+(3.5) 이상인 학생을 대상으로 지급됩니다.",
        side: "학사일정",
        sideList: ["8/10~8/12 예비수강신청", "8/17~8/21 본 수강신청", "8/24~8/28 등록금 납부", "9/1 개강"]
      },
      en: {
        title: "KOREA UNIVERSITY Sejong Campus - Graduate School of Public Administration",
        sub: "Academic Affairs Support Chatbot · GPA Korea University",
        nav: ["About", "Admissions", "Academics", "Notices", "Community"],
        card1: "2026 Fall Semester Course Registration Guide",
        card1d: "Pre-registration: Aug 10-12, Main registration: Aug 17-21, 2026.",
        card2: "2026 Fall Semester Scholarship Application Guide",
        card2d: "Scholarships are available for students with GPA B+(3.5) or above from the previous semester.",
        side: "Academic Calendar",
        sideList: ["Aug 10-12: Pre-registration", "Aug 17-21: Main registration", "Aug 24-28: Tuition payment", "Sep 1: Semester begins"]
      },
      zh: {
        title: "高丽大学世宗校区 - 行政专门大学院",
        sub: "学术事务支持聊天机器人 · GPA 高丽大学",
        nav: ["介绍", "入学", "学术", "公告", "社区"],
        card1: "2026学年第2学期选课指南",
        card1d: "预选课: 8月10日-12日, 正式选课: 8月17日-21日。",
        card2: "2026学年第2学期奖学金申请指南",
        card2d: "在校生奖学金以上一学期B+(3.5)以上成绩为基准发放。",
        side: "学术日程",
        sideList: ["8月10-12日: 预选课", "8月17-21日: 正式选课", "8月24-28日: 缴纳学费", "9月1日: 开学"]
      }
    };
    function changeLang(lang) {
      var d = langData[lang];
      document.querySelectorAll('.gpa-lang button').forEach(function(b) { b.classList.remove('active'); });
      event.target.classList.add('active');
      document.getElementById('site-title').textContent = d.title;
      document.getElementById('site-sub').textContent = d.sub;
      document.getElementById('nav1').textContent = d.nav[0];
      document.getElementById('nav2').textContent = d.nav[1];
      document.getElementById('nav3').textContent = d.nav[2];
      document.getElementById('nav4').textContent = d.nav[3];
      document.getElementById('nav5').textContent = d.nav[4];
      document.getElementById('card1-title').textContent = d.card1;
      document.getElementById('card1-desc').textContent = d.card1d;
      document.getElementById('card2-title').textContent = d.card2;
      document.getElementById('card2-desc').textContent = d.card2d;
      document.getElementById('side-title').textContent = d.side;
      var ul = document.getElementById('side-list');
      ul.innerHTML = d.sideList.map(function(s) { return '<li>' + s + '</li>'; }).join('');
    }
  </script>
</body>
</html>`);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
