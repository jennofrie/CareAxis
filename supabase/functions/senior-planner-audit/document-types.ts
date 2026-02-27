// Document type configurations with enhanced legislative references
// Extracted for maintainability and reusability

import { DocumentTypeConfig } from "./types.ts";

export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  change_of_circumstances: {
    name: "Change of Circumstances (CoC) / Unscheduled Review Request",
    focus: "Section 48 NDIS Act — Significant, Permanent, Disability-Related Change Analysis",
    section34Focus: ["S34(1)(a) Goal relevance", "S34(1)(b) Participation impact", "S34(1)(f) NDIS appropriateness"],
    keyQuestions: [
      "Is the change SIGNIFICANT (not minor fluctuation)?",
      "Is the change PERMANENT (>6 months expected)?",
      "Is the change DISABILITY-RELATED (not pure life event)?",
      "Has informal support breakdown been documented?",
      "What functional capacity has declined and by how much?"
    ],
    redFlags: [
      "Temporary crisis framed as permanent change — S48 requires ongoing impact",
      "Hospital admission without post-acute functional assessment — acute care is Health system",
      "Carer burnout without informal support capacity documentation — S34(1)(e) issue",
      "New diagnosis without functional impact translation — diagnosis ≠ funding eligibility",
      "Service provider issues (closure, waitlists) presented as participant change",
      "Life events (divorce, relocation) without disability nexus evidence",
      "Missing baseline comparison — what was functional capacity BEFORE the change?"
    ],
    approvalTips: [
      "Include pre/post functional comparison using validated tools",
      "Document the causal chain: Event → Disability Impact → Functional Decline",
      "Provide evidence the change is expected to persist beyond 6 months",
      "Quantify informal support reduction in hours per week"
    ]
  },

  ot_report: {
    name: "Occupational Therapy Report / Functional Capacity Assessment",
    focus: "Functional Independence & Assistive Technology Justification",
    section34Focus: ["S34(1)(c) Value for Money", "S34(1)(d) Effective & Beneficial", "S34(1)(b) Participation"],
    keyQuestions: [
      "Are validated assessment tools used (WHODAS, I-CAN, COPM, GAS)?",
      "Is AT linked to independence goals, not comfort?",
      "Has least-cost effective option been justified?",
      "Is there a clear functional outcome target?",
      "Are trial periods documented for high-cost items?"
    ],
    redFlags: [
      "Missing validated outcome measures — WHODAS 2.0, I-CAN, COPM are expected",
      "AT request for 'comfort' or 'convenience' without functional justification",
      "No least-cost effective option analysis — S34(1)(c) requires comparison",
      "'Patient' or 'client' language instead of 'participant' — NDIS terminology",
      "Home modifications without functional necessity evidence",
      "High-cost AT without trial or loan scheme consideration",
      "Diagnosis-focused language without functional translation",
      "Missing quote comparisons for items over $1,500"
    ],
    approvalTips: [
      "Include I-CAN or WHODAS baseline and target scores",
      "Document why cheaper alternatives are unsuitable",
      "Link every recommendation to a specific participant goal",
      "Include supplier quotes for items over $1,500"
    ]
  },

  physio_report: {
    name: "Physiotherapy Report / Physical Capacity Assessment",
    focus: "Functional Maintenance vs Rehabilitation — NDIS vs Health System Boundary",
    section34Focus: ["S34(1)(f) System appropriateness", "S34(1)(d) Evidence-based", "S34(1)(b) Participation"],
    keyQuestions: [
      "Is this MAINTENANCE (NDIS) or REHABILITATION (Health)?",
      "Is the focus on participation outcomes, not treatment?",
      "Is there a long-term maintenance plan, not episode-based care?",
      "Are therapy hours justified with intensity rationale?"
    ],
    redFlags: [
      "'Rehabilitation' or 'recovery' language — suggests Health system responsibility",
      "'Treatment' focus instead of 'functional maintenance' — S34(1)(f) crossover",
      "Episode-based care plan instead of ongoing maintenance — NDIS funds maintenance",
      "Missing participation outcomes — gym attendance ≠ community participation",
      "No long-term plan — NDIS funds ongoing supports, not acute intervention",
      "Hydrotherapy without functional goal linkage — must be more than 'feels good'",
      "Post-surgical rehab without handover plan — acute care is Health until stable"
    ],
    approvalTips: [
      "Use 'maintain', 'prevent decline', 'sustain function' language",
      "Document participation outcomes (community access, ADLs), not clinical outcomes",
      "Include a 12-month maintenance outlook, not episode-based goals",
      "Clarify handover point from Health-funded rehab to NDIS maintenance"
    ]
  },

  psychologist_report: {
    name: "Psychology Report / Psychosocial Assessment",
    focus: "Psychosocial Capacity Building vs Clinical Treatment — Medicare/NDIS Boundary",
    section34Focus: ["S34(1)(f) Other systems (mainstream boundary)", "S34(1)(b) Participation", "S34(1)(d) Effective & beneficial"],
    keyQuestions: [
      "Is this psychosocial support (NDIS) or clinical treatment (Medicare)?",
      "Is the focus on social/economic participation, not symptom reduction?",
      "Does the participant already access Better Access/CDM through Medicare?",
      "Are functional capacity goals clearly defined?"
    ],
    redFlags: [
      "Clinical treatment focus — therapy for anxiety/depression is Medicare Better Access",
      "DSM-5 diagnostic language without functional translation",
      "Missing social/economic participation evidence — S34(1)(b) requires this",
      "Overlap with Medicare Better Access sessions — S34(1)(e) duplication",
      "No functional capacity baseline or improvement targets",
      "Counselling hours without capacity building rationale — must build skills",
      "'Patient' terminology instead of 'participant'",
      "Focus on 'treating' conditions rather than building coping strategies"
    ],
    approvalTips: [
      "Frame as 'capacity building' and 'skill development', not 'treatment'",
      "Document social participation goals (employment, community, relationships)",
      "Use K10, DASS-21 as baseline but focus on functional impact",
      "Clarify what Medicare-funded support is already in place"
    ]
  },

  speech_pathology: {
    name: "Speech Pathology Report",
    focus: "Communication & Swallowing Function — Education/Health Boundaries",
    section34Focus: ["S34(1)(f) Other systems (Education/Health boundary)", "S34(1)(b) Participation", "S34(1)(d) Evidence-based"],
    keyQuestions: [
      "Is this communication/participation (NDIS) or curriculum delivery (Education)?",
      "Are mealtime supports about safety/function or dietary preference?",
      "Is AAC linked to participation goals, not just communication ability?",
      "Has Education system funding been considered for school-aged participants?"
    ],
    redFlags: [
      "School-based literacy intervention — Education system responsibility",
      "Curriculum support framed as communication support — S34(1)(e) issue",
      "AAC without community participation goals — device ≠ participation",
      "Mealtime management without safety/aspiration risk evidence",
      "Missing standardised assessment (CELF, PLS, etc.)",
      "Therapy hours without intensity justification"
    ],
    approvalTips: [
      "Document communication barriers to community participation",
      "Include AAC implementation plan beyond device provision",
      "Clarify Education vs NDIS responsibility for school-aged participants",
      "Link swallowing management to safety, not dietary preference"
    ]
  },

  sc_level_2: {
    name: "Support Coordination Level 2",
    focus: "Coordination Complexity & Capacity Building — LAC vs SC Boundary",
    section34Focus: ["S34(1)(c) Value for Money", "S34(1)(a) Goal pursuit", "S34(1)(d) Effectiveness"],
    keyQuestions: [
      "Why can't this be done by LAC (Local Area Coordinator)?",
      "Is there demonstrated coordination complexity?",
      "Is there a capacity building and exit strategy?",
      "Are multiple services requiring active coordination?"
    ],
    redFlags: [
      "Tasks a LAC could perform — simple referrals, information provision",
      "Missing coordination complexity evidence — S34(1)(c) VfM issue",
      "No capacity building documentation — SC should build self-management skills",
      "Provider-finding without barrier resolution context",
      "Missing exit strategy — perpetual SC without skill transfer is VfM issue",
      "Administrative tasks presented as coordination — plan management confusion"
    ],
    approvalTips: [
      "Document specific coordination barriers (thin markets, complex needs)",
      "Include capacity building milestones toward reduced SC hours",
      "Quantify number of services/providers being coordinated",
      "Show why LAC support is insufficient for this participant"
    ]
  },

  sc_level_3: {
    name: "Specialist Support Coordination Level 3",
    focus: "Crisis & Cross-System Complexity — L2 vs L3 Justification",
    section34Focus: ["S34(1)(c) Value for Money", "S34(1)(d) Specialist effectiveness", "S34(1)(a) Goal pursuit"],
    keyQuestions: [
      "Is there documented HIGH RISK (justice, homelessness, AOD, forensic)?",
      "Is there CROSS-SYSTEM advocacy required (Health-NDIS-Housing-Justice)?",
      "Why has L2 failed or why would it be insufficient?",
      "Is there a Crisis Management Plan in place?",
      "Does this require specialist qualifications beyond L2 scope?"
    ],
    redFlags: [
      "General coordination tasks — 'finding providers' is L2 work → automatic downgrade risk",
      "Missing Crisis Management Plan — L3 requires documented crisis response",
      "No cross-system complexity evidence — L3 requires Justice/Health/Housing interface",
      "L2 not trialled first — must demonstrate L2 insufficiency",
      "Missing specialist oversight justification — why does this need degree-qualified coordinator?",
      "Service coordination without crisis element — complexity alone doesn't justify L3",
      "No risk assessment documentation — L3 requires demonstrated high-risk environment"
    ],
    approvalTips: [
      "Document specific cross-system interfaces (Justice liaison, hospital discharge, housing advocacy)",
      "Include a formal Crisis Management Plan",
      "Explain why L2 coordination has failed or would fail",
      "Quantify risk factors (homelessness risk, incarceration risk, hospitalisation frequency)",
      "Document specialist qualification requirements"
    ]
  },

  behaviour_support: {
    name: "Behaviour Support Plan / Positive Behaviour Support Report",
    focus: "Restrictive Practice Oversight & Functional Behaviour Assessment",
    section34Focus: ["S34(1)(d) Evidence-based", "S34(1)(f) Safeguards compliance", "S34(1)(a) Quality of life"],
    keyQuestions: [
      "Is a Functional Behaviour Assessment included?",
      "Are restrictive practices documented and justified?",
      "Is there NDIS Commission registration for the practitioner?",
      "Are environmental and skill-building strategies prioritised over restriction?"
    ],
    redFlags: [
      "Restrictive practices without Functional Behaviour Assessment — NDIS Commission requirement",
      "Missing behaviour support practitioner registration details",
      "Punishment-focused rather than positive behaviour support approach",
      "No environmental modification strategies before restriction",
      "Missing consent documentation for restrictive practices",
      "Behaviour support without implementation training for carers/support workers"
    ],
    approvalTips: [
      "Include comprehensive Functional Behaviour Assessment",
      "Document NDIS Commission registration and practitioner qualifications",
      "Prioritise positive strategies with restriction as last resort",
      "Include implementation and training hours for support network"
    ]
  },

  other: {
    name: "Other NDIS Document / General Report",
    focus: "Section 34 Reasonable & Necessary Compliance — Full Legislative Review",
    section34Focus: ["S34(1)(a-f) Full compliance check"],
    keyQuestions: [
      "Does every support recommendation trace to a participant goal?",
      "Is functional impact documented with validated tools?",
      "Is value for money demonstrated?",
      "Is NDIS the appropriate funder (not Health/Education/mainstream)?"
    ],
    redFlags: [
      "Missing functional impact evidence — all NDIS supports require functional justification",
      "Lack of goal alignment — S34(1)(a) requires explicit goal connection",
      "No reasonable and necessary justification — supports assumed rather than evidenced",
      "Medical/diagnostic focus without functional translation",
      "Mainstream service duplication — S34(1)(e) and S34(1)(f) issues",
      "Unsubstantiated cost estimates"
    ],
    approvalTips: [
      "Ensure every recommendation references a specific participant goal",
      "Include validated assessment data as evidence",
      "Document why this support is NDIS-appropriate, not another system",
      "Provide cost justification for funding requests"
    ]
  }
};

// Helper to get document config with fallback
export function getDocumentConfig(documentType: string): DocumentTypeConfig {
  return DOCUMENT_TYPES[documentType] || DOCUMENT_TYPES.other;
}
