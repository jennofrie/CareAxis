"use client";

import { useEffect, useState, useRef } from "react";
import { Brain } from "lucide-react";

// ─── Status messages ────────────────────────────────────────────────────────
const REPORT_STATUS = [
  "Processing allied health reports...",
  "Extracting clinical findings and functional impacts...",
  "Mapping supports to NDIS funding categories...",
  "Synthesising evidence-based recommendations...",
  "Structuring professional report format...",
  "Applying Section 34 compliance framework...",
  "Finalising report output...",
];

const ASSESS_STATUS = [
  "Reviewing document structure and completeness...",
  "Evaluating evidence quality and clinical specificity...",
  "Checking Section 34 compliance criteria...",
  "Assessing nexus between impairment and supports...",
  "Scoring value for money and goal alignment...",
  "Mapping against NDIS Practice Standards...",
  "Compiling audit findings and recommendations...",
];

const COC_STATUS = [
  "Analysing change of circumstances triggers...",
  "Reviewing eligibility criteria...",
  "Mapping functional impact changes...",
  "Structuring clinical evidence...",
  "Drafting support coordination justification...",
  "Applying Plan Review guidelines...",
  "Finalising CoC documentation...",
];

const CASE_NOTE_STATUS = [
  "Extracting key interaction details...",
  "Identifying goal alignment indicators...",
  "Structuring NDIS-compliant note format...",
  "Applying progress and outcomes framework...",
  "Drafting action plan recommendations...",
  "Reviewing professional language standards...",
  "Finalising case note output...",
];

const GENERAL_STATUS = [
  "Processing your request...",
  "Analysing relevant NDIS guidelines...",
  "Applying evidence-based frameworks...",
  "Structuring professional output...",
  "Finalising results...",
];

// ─── 50 NDIS Tips ────────────────────────────────────────────────────────────
export const NDIS_TIPS = [
  // Batch 1: Section 34 & Reasonable and Necessary
  "Did you know? Under Section 34 of the NDIS Act 2013, a support must meet ALL six criteria to be funded: related to disability, not duplicating other services, value for money, effective and beneficial, takes account of informal supports, and is most appropriately funded by the NDIS.",
  "Tip: The NDIA applies a 'but for' test when assessing supports — would the participant need this support 'but for' their disability? Reports should clearly articulate this connection.",
  "Did you know? Section 34(1)(f) requires that NDIS funding is a last resort. Reports must explain why mainstream services (Health, Education, Justice) cannot meet the identified need.",
  "Tip: Each recommendation in your report should establish a clear nexus: identified impairment leads to functional limitation leads to support need leads to expected outcome.",
  "Did you know? The NDIS Operational Guidelines state that 'reasonable' considers what is usual or standard practice, while 'necessary' means the support is essential, not merely desirable.",
  "Tip: Avoid recommending supports that are 'nice to have.' The NDIA funds supports that are necessary to achieve goals, not aspirational enhancements.",
  "Did you know? Under NDIS rules, supports must represent 'value for money' compared to alternative options. Reports should justify why a specific support type or intensity was chosen over cheaper alternatives.",
  "Tip: When recommending increased support hours, always provide evidence of why the current level is insufficient — citing specific incidents, risk events, or functional decline data.",
  "Did you know? The NDIA can decline funding if a support is likely to be provided by family, friends, or the community as part of typical informal arrangements. Documenting informal support breakdown strengthens recommendations.",
  "Tip: Use person-centred language in reports. Write 'Sarah requires support to...' not 'Sarah is unable to...' — it reframes the narrative from deficit to need.",

  // Batch 2: Report Structure & Clinical Evidence
  "Did you know? The NDIS Quality and Safeguards Commission requires that allied health assessments clearly state the qualifications and experience of the assessing professional.",
  "Tip: Always include standardised assessment tool scores (e.g., FIM, WHODAS 2.0, Kessler K10) — the NDIA gives more weight to objective measures than subjective clinical opinion alone.",
  "Did you know? Reports that include both quantitative data (assessment scores, frequency counts) and qualitative data (participant quotes, case examples) are significantly more persuasive in plan reviews.",
  "Tip: When referencing clinical assessments, include the date of assessment. The NDIA may question the relevance of assessments older than 12 months.",
  "Did you know? The NDIS Practice Standards require that reports demonstrate evidence of genuine consultation with the participant about their goals and preferences.",
  "Tip: Include direct participant quotes in your report using quotation marks — e.g., 'I want to be able to cook meals independently.' This demonstrates person-centred planning and genuine consultation.",
  "Did you know? Functional capacity descriptions should cover all domains: self-care, mobility, communication, social interaction, learning, and self-management. Omitting domains may lead to underfunded plans.",
  "Tip: Describe functional capacity in terms of what the participant can do with and without support. This comparison clearly demonstrates the level of support required.",
  "Did you know? The NDIA's Typical Support Package framework estimates expected costs based on participant characteristics. Reports that align recommendations with this framework have higher approval rates.",
  "Tip: Avoid clinical jargon without explanation. Write 'Sarah has difficulty with executive function, which means she struggles to plan, organise, and complete multi-step tasks like meal preparation' rather than just 'impaired executive function.'",

  // Batch 3: Funding Categories & Support Types
  "Did you know? NDIS funding falls into three categories: Core (daily activities), Capacity Building (skills and independence), and Capital (assistive technology and home modifications). Each has distinct rules.",
  "Tip: Core Support funding is generally flexible — participants can move funds between Core sub-categories. However, Capacity Building line items are fixed and cannot be reallocated.",
  "Did you know? Support Coordination is funded under Capacity Building and comes in three levels: Support Connection (Level 1), Support Coordination (Level 2), and Specialist Support Coordination (Level 3).",
  "Tip: When recommending Specialist Support Coordination (Level 3), you must demonstrate that the participant's situation involves high complexity, risk, or multiple service system interactions beyond standard coordination.",
  "Did you know? Assistive Technology under $1,500 is classified as 'Low Cost AT' and can be included in plans without a formal assessment. Items over $1,500 require a detailed AT assessment and quote.",
  "Tip: For Supported Independent Living (SIL) recommendations, always include a detailed breakdown of support hours across morning, afternoon, evening, overnight, and weekend periods.",
  "Did you know? The NDIS funds Positive Behaviour Support plans for participants with complex behaviours. These must be developed by a registered PBS practitioner and follow the Behaviour Support Rules 2018.",
  "Tip: Capacity Building supports should include clear, measurable goals with timeframes. Instead of 'improve daily living skills,' write 'independently prepare 3 simple meals per week within 6 months.'",
  "Did you know? Plan Management is a choice — participants can be Agency Managed, Plan Managed, or Self Managed. Plan Management gives flexibility to use unregistered providers while having a plan manager handle claims.",
  "Tip: When recommending therapy supports, specify the recommended frequency (e.g., fortnightly OT sessions), duration (e.g., 12-month block), and expected outcomes for each therapy type.",

  // Batch 4: Plan Reviews & Evidence Documentation
  "Did you know? Participants can request a plan reassessment at any time if their circumstances change significantly. Reports supporting a change of circumstances should clearly document what has changed and why.",
  "Tip: For plan review reports, always compare current functioning to the previous assessment period. Documenting both progress and ongoing or emerging needs provides a complete picture.",
  "Did you know? The NDIA must provide written reasons if they reduce or remove a support from a participant's plan. This decision can be reviewed through the internal review process and then appealed to the AAT.",
  "Tip: Include a risk assessment section in your reports. Identifying risks such as hospitalisation, homelessness, or carer burnout provides strong evidence for support intensity.",
  "Did you know? The Administrative Appeals Tribunal (AAT) has consistently upheld that the NDIA must consider the specific individual circumstances of the participant, not just apply broad policy positions.",
  "Tip: When a participant's plan is being reviewed, gather evidence from all stakeholders: the participant, their family, support workers, therapists, and any relevant medical professionals.",
  "Did you know? Under the NDIS Act, Section 33 defines what constitutes a 'reasonable and necessary' support. Plans must be reviewed at least every 12 months, or earlier if circumstances change.",
  "Tip: Document unsuccessful attempts at lower-cost interventions. If a participant tried community-based programs without success, this evidence justifies more intensive or specialised supports.",
  "Did you know? The NDIA's 'Independent Assessment' pilot was discontinued in 2021 after widespread community opposition. Assessments remain the responsibility of the participant's treating professionals.",
  "Tip: Always send draft reports to the participant (or their nominee) for review before finalising. This ensures accuracy and demonstrates genuine participant involvement in the process.",

  // Batch 5: Provider & Compliance
  "Did you know? The NDIS Code of Conduct applies to all NDIS providers and workers, whether registered or unregistered. It includes obligations around respect, privacy, safety, and competence.",
  "Tip: Reports should use Australian English spelling (e.g., 'organise' not 'organize', 'behaviour' not 'behavior', 'programme' not 'program') to maintain professional standards.",
  "Did you know? The NDIS Worker Screening Check is mandatory for workers in risk-assessed roles. This replaced state-based checks and is valid for five years across all states and territories.",
  "Tip: When writing goals for NDIS plans, use the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound. Vague goals lead to poorly funded plans.",
  "Did you know? The NDIS Pricing Arrangements and Price Limits are updated annually, typically effective from 1 July. Always verify current rates when estimating support costs in reports.",
  "Tip: Include a clear summary section at the end of every report. Planners may only read the summary when making quick decisions — make it count by including all key recommendations.",
  "Did you know? Under NDIS Practice Standards, providers must maintain accurate records for at least seven years. This includes progress notes, incident reports, and participant assessments.",
  "Tip: When multiple allied health professionals are involved, a synthesis report that integrates all clinical findings into one cohesive document is far more effective than submitting multiple separate reports.",
  "Did you know? The NDIS Commission can take compliance action against providers who fail to meet Practice Standards, including conditions on registration, suspension, or revocation.",
  "Tip: End your report with a clear, numbered list of all recommendations with estimated annual costs. This makes it easy for the planner to translate your clinical advice into funded plan line items.",
];

// ─── Variant types ────────────────────────────────────────────────────────────
export type OverlayVariant = "report" | "audit" | "coc" | "case-note" | "general";

const STATUS_MAP: Record<OverlayVariant, string[]> = {
  report: REPORT_STATUS,
  audit: ASSESS_STATUS,
  coc: COC_STATUS,
  "case-note": CASE_NOTE_STATUS,
  general: GENERAL_STATUS,
};

const COLOR_MAP: Record<OverlayVariant, { ring: string; dot1: string; dot2: string; dot3: string; tip: string }> = {
  report: {
    ring: "from-indigo-500 via-purple-500 to-indigo-500",
    dot1: "bg-indigo-500",
    dot2: "bg-purple-500",
    dot3: "bg-indigo-400",
    tip: "bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800",
  },
  audit: {
    ring: "from-emerald-500 via-teal-500 to-emerald-500",
    dot1: "bg-emerald-500",
    dot2: "bg-teal-500",
    dot3: "bg-emerald-400",
    tip: "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  },
  coc: {
    ring: "from-amber-500 via-orange-500 to-amber-500",
    dot1: "bg-amber-500",
    dot2: "bg-orange-500",
    dot3: "bg-amber-400",
    tip: "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  },
  "case-note": {
    ring: "from-sky-500 via-blue-500 to-sky-500",
    dot1: "bg-sky-500",
    dot2: "bg-blue-500",
    dot3: "bg-sky-400",
    tip: "bg-sky-50/80 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
  },
  general: {
    ring: "from-violet-500 via-purple-500 to-violet-500",
    dot1: "bg-violet-500",
    dot2: "bg-purple-500",
    dot3: "bg-violet-400",
    tip: "bg-violet-50/80 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  },
};

interface GeneratingOverlayProps {
  variant?: OverlayVariant;
  label?: string;
  /** Pass a stable generation count (incrementing int) so tip batches advance per run */
  generationCount?: number;
}

const TIPS_PER_BATCH = 10;

export function GeneratingOverlay({
  variant = "report",
  label = "Generating...",
  generationCount = 0,
}: GeneratingOverlayProps) {
  const statusMessages = STATUS_MAP[variant];
  const colors = COLOR_MAP[variant];

  const [statusIndex, setStatusIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => (generationCount % 5) * TIPS_PER_BATCH);
  const batchStartRef = useRef((generationCount % 5) * TIPS_PER_BATCH);

  useEffect(() => {
    const batchStart = (generationCount % 5) * TIPS_PER_BATCH;
    batchStartRef.current = batchStart;
    setStatusIndex(0);
    setTipIndex(batchStart);

    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 3500);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => {
        const batchEnd = batchStartRef.current + TIPS_PER_BATCH;
        const next = prev + 1;
        return next >= batchEnd ? batchStartRef.current : next;
      });
    }, 8000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(tipInterval);
    };
  }, [generationCount, statusMessages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div
          className={`absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r ${colors.ring} opacity-25 animate-ping`}
        />
        <div className="relative w-20 h-20 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center">
          <Brain className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </div>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>

      {/* Status message */}
      <p
        key={statusIndex}
        className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wide animate-pulse text-center"
      >
        {statusMessages[statusIndex]}
      </p>

      {/* Bouncing dots */}
      <div className="flex gap-1.5 mt-4">
        <span className={`w-2 h-2 rounded-full ${colors.dot1} animate-bounce`} style={{ animationDelay: "0ms" }} />
        <span className={`w-2 h-2 rounded-full ${colors.dot2} animate-bounce`} style={{ animationDelay: "150ms" }} />
        <span className={`w-2 h-2 rounded-full ${colors.dot3} animate-bounce`} style={{ animationDelay: "300ms" }} />
      </div>

      {/* Tip card */}
      <div
        key={`tip-${tipIndex}`}
        className={`mt-8 max-w-lg w-full px-5 py-4 rounded-xl border ${colors.tip} transition-all duration-500`}
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed text-center italic">
          {NDIS_TIPS[tipIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
