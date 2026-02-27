// Type definitions for Senior Planner Audit

export interface DocumentTypeConfig {
  name: string;
  focus: string;
  section34Focus: string[];
  keyQuestions: string[];
  redFlags: string[];
  approvalTips: string[];
}

export interface AuditScores {
  compliance: number;
  nexus: number;
  valueForMoney: number;
  evidenceQuality: number;
  significantChange: number | null;
}

export interface AuditStrength {
  category: string;
  finding: string;
  section34Reference?: string;
  score: number;
}

export interface AuditImprovement {
  category: string;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  quote: string;
  quoteLocation?: string;
  section34Reference?: string;
  remediation: string;
}

export interface AuditRedFlag {
  flag: string;
  reason: string;
  section34Reference?: string;
  riskLevel?: "fatal" | "high" | "moderate";
}

export interface LanguageFix {
  original: string;
  suggested: string;
  reason: string;
  section34Impact?: string;
  quoteLocation?: string;
}

export interface MainstreamInterfaceCheck {
  healthSystemRisk: "none" | "low" | "medium" | "high";
  educationSystemRisk: "none" | "low" | "medium" | "high";
  justiceSystemInvolvement: boolean;
  aptosCompliance: "compliant" | "review_needed" | "non_compliant";
}

export interface AuditResult {
  overallScore: number;
  status: "approved" | "revision_required" | "critical";
  scores: AuditScores;
  plannerSummary: string;
  strengths: AuditStrength[];
  improvements: AuditImprovement[];
  redFlags: AuditRedFlag[];
  languageFixes: LanguageFix[];
  plannerQuestions: string[];
  mainstreamInterfaceCheck?: MainstreamInterfaceCheck;
  error?: string;
  message?: string;
  rawResponse?: string;
}

export interface AuditRequest {
  documentContent?: string;
  documentType: string;
  documentName?: string;
  fileData?: string;
  fileMimeType?: string;
}

export interface AuditResponse {
  success: boolean;
  audit?: AuditResult;
  documentType?: string;
  modelUsed?: string;
  error?: string;
  contentRestriction?: boolean;
  timestamp: string;
}
