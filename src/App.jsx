import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Crosshair,
  TrendingUp,
  ShieldCheck,
  Clock,
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Share2,
  ChevronRight,
  Mic,
  MicOff
} from 'lucide-react';

// ==========================================================
// FORGE
// Monolithic architecture — client-side deterministic heuristics.
// No network calls, no LLM. Every score is reproducible from the
// same input text, on purpose.
//
// Palette: near-black slate base with a royal-blue accent system —
// blue (primary / Clarity), sky (Metrics), indigo (Defensibility) —
// matched to the Velvex brand mark.
// ==========================================================

const GLOBAL_STYLES = `
@keyframes forge-fade-slide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes forge-pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(59, 130, 246, 0.35)); }
  50% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); }
}
@keyframes forge-scanline {
  0% { transform: translateY(-120%); }
  100% { transform: translateY(120%); }
}
.forge-fade-in { animation: forge-fade-slide 0.5s ease-out both; }
.forge-pulse { animation: forge-pulse-ring 2.6s ease-in-out infinite; }
.forge-panel {
  box-shadow: 0 0 26px rgba(59, 130, 246, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}
.forge-scanline-track { animation: forge-scanline 7s linear infinite; }
`;

const JARGON_BLACKLIST = {
  fluff: [
    'revolutionary', 'disruptive', 'next-gen', 'cutting-edge',
    'synergy', 'innovative', 'world-class', 'groundbreaking',
    'paradigm shift', 'leverage', 'ecosystem', 'empower', 'intelligent',
    'game-changing', 'best-in-class', 'seamless', 'turnkey'
  ],
  vagueStructures: [
    'platform', 'solution', 'mechanism', 'framework', 'hub', 'vertical',
    'utilize', 'holistic', 'end-to-end', 'robust'
  ],
  hypeCycles: [
    'web3', 'metaverse', 'hyper-automated', 'autonomous agentic grid',
    'crypto', 'agentic', 'ai-native', 'foundation model',
    'spatial computing', 'quantum-ready'
  ]
};

const QUESTION_BANK = {
  clarity: [
    "In one line, what does your company actually make?",
    "Describe what you do in a single sentence a stranger outside your field would understand immediately.",
    "Who needs this the most, right now?",
    "If your name tag only had room for one line, what would it say?",
    "Explain what you're building without using a single word your own industry would use for it.",
    "State the problem you solve in one sentence, with zero adjectives.",
    "Walk through, mechanically, what happens in the first ten seconds someone opens your product."
  ],
  metrics: [
    "What do you understand about this space that most people miss?",
    "Walk me through exactly how you land your next 100 customers.",
    "Give me the real traction numbers since you started charging for this.",
    "Where does the average new customer actually find you?",
    "Describe your growth trend over the last few months, with numbers.",
    "Name one number that proves this is actually working.",
    "Tell me something about your users that would genuinely surprise us."
  ],
  moat: [
    "Why couldn't a well-funded team clone this in a single weekend?",
    "What stops a rival with ten times your budget from wiping you out in six months?",
    "Describe your actual unfair advantage mechanically — no adjectives allowed.",
    "What do you know about this problem that a well-capitalized outsider wouldn't?",
    "If a larger competitor copied this exactly tomorrow, what would still belong to you?",
    "Which single part of your business would take a copycat the longest to rebuild?",
    "What's the slowest, most painful part of this business that nobody else wants to do?"
  ]
};

const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    questionsPerPillar: 1,
    connectingDelayRange: [1300, 1900],
    typewriterSpeed: 28,
    perQuestionCapSeconds: null,
    description: '3 questions. Full 10:00. Time to think.'
  },
  medium: {
    label: 'Medium',
    questionsPerPillar: 3,
    connectingDelayRange: [900, 1400],
    typewriterSpeed: 22,
    perQuestionCapSeconds: null,
    description: '9 questions. Full 10:00. Pace starts to bite.'
  },
  hard: {
    label: 'Hard',
    questionsPerPillar: 6,
    connectingDelayRange: [400, 700],
    typewriterSpeed: 14,
    perQuestionCapSeconds: 45,
    description: '18 questions. 45 seconds each. No small talk.'
  }
};

const CATEGORY_LABELS = {
  clarity: 'Clarity',
  metrics: 'Metrics',
  moat: 'Defensibility'
};

const CATEGORY_TEXT_COLORS = {
  clarity: 'text-blue-400',
  metrics: 'text-sky-400',
  moat: 'text-indigo-400'
};

const SESSION_SECONDS = 600;
const WORD_CEILING = 40;

// ---------------- Pure helpers (no React, no side effects) ----------------

function countWords(text) {
  const trimmed = (text || '').trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function shuffleArray(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSessionQuestions(questionsPerPillar) {
  const categories = ['clarity', 'metrics', 'moat'];
  const picked = [];
  categories.forEach((category) => {
    const pool = shuffleArray(QUESTION_BANK[category]);
    const count = Math.min(questionsPerPillar, pool.length);
    for (let i = 0; i < count; i += 1) {
      picked.push({ category, text: pool[i] });
    }
  });
  return shuffleArray(picked);
}

function getStatusTier(score) {
  if (score >= 90) {
    return { code: 'INTERVIEW_READY', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/20' };
  }
  if (score >= 70) {
    return { code: 'MARGINAL_RISK', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' };
  }
  return { code: 'INTERROGATION_FAILURE', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-950/20' };
}

const REFERENCE_COMPANY_ANALOGY = /(like|similar to|just like|the same way)\s+(the\s+|as\s+)?(uber|airbnb|amazon|netflix|google|facebook|meta|stripe|shopify|doordash|instacart|spotify|tesla)\b/i;
const GENERIC_EVIDENCE_ANALOGY = /(similar companies have|other startups have shown|comparable companies have)/i;
const TOP_DOWN_SIZING = /(\d+\s*(billion|trillion)|tam of \$|total addressable market|capture (just )?\d+% of)/i;

function hasEvidenceAnalogy(answer) {
  return REFERENCE_COMPANY_ANALOGY.test(answer) || GENERIC_EVIDENCE_ANALOGY.test(answer);
}

const REWRITE_TEMPLATES = {
  clarity: 'Structure: "We build [ONE CONCRETE PRODUCT NOUN] for [SPECIFIC CUSTOMER], so they can [JOB] without [OLD PAINFUL METHOD]." Replace every bracket with a specific — no adjectives.',
  metrics: 'Structure: "In the last [TIMEFRAME], we went from [$/# START] to [$/# END] — a [N]% [increase/decrease] — driven by [ONE SPECIFIC CHANNEL]." Insert real figures only.',
  moat: 'Structure: "Because we [OWN OR CONTROL A SPECIFIC ASSET], a competitor would need to [SLOW OR EXPENSIVE ACTION] before they could match us." Name the asset, not the adjective.'
};

function evaluateSession(questions, finalAnswers, timeExpired) {
  const categoryScores = { clarity: [], metrics: [], moat: [] };
  const tripped = [];
  const critiques = [];
  const breakdown = [];

  const allText = questions
    .map((q) => (finalAnswers[q.category] || '').toLowerCase())
    .join(' ');

  Object.keys(JARGON_BLACKLIST).forEach((bucket) => {
    JARGON_BLACKLIST[bucket].forEach((word) => {
      if (allText.includes(word)) tripped.push(word);
    });
  });

  const jargonPenalty = tripped.length > 0 ? Math.min(30, tripped.length * 5) : 0;
  if (tripped.length > 0) {
    critiques.push(
      `Banned marketing language detected: ${tripped.slice(0, 5).join(', ')}. A partner tunes out at the first buzzword.`
    );
  }

  questions.forEach((q) => {
    const rawAnswer = finalAnswers[q.category] || '';
    const answer = rawAnswer.trim();
    const wordCount = countWords(answer);
    const localCritiques = [];
    let passWordEconomy = true;
    let questionScore = 100;

    if (wordCount === 0) {
      passWordEconomy = false;
      questionScore = 5;
      localCritiques.push(
        timeExpired
          ? 'TIME EXPIRED before this question was answered. Silence reads as unpreparedness, not humility.'
          : 'No response was recorded for this question.'
      );
    } else {
      if (wordCount > WORD_CEILING) {
        passWordEconomy = false;
        const overage = wordCount - WORD_CEILING;
        questionScore -= Math.min(35, overage * 2);
        localCritiques.push(
          `Ran ${wordCount} words — ${overage} over the ${WORD_CEILING}-word ceiling. A partner interrupts well before word ${WORD_CEILING}; lead with the mechanism.`
        );
      } else if (wordCount < 6) {
        passWordEconomy = false;
        questionScore -= 20;
        localCritiques.push(`At ${wordCount} word${wordCount === 1 ? '' : 's'}, this reads as evasive rather than concise.`);
      }

      if (q.category === 'clarity') {
        const hasAnalog = /\bfor\b/i.test(answer);
        if (hasAnalog) {
          questionScore += 6;
        } else if (wordCount <= WORD_CEILING) {
          questionScore -= 10;
          localCritiques.push('No structural analogy detected ("X for Y"). Without one, the listener builds the mental model unassisted.');
        }
      }

      if (q.category === 'metrics') {
        const hasNumber = /\d+/.test(answer);
        const hasCurrencyOrPercent = /[$%]/.test(answer);
        const hasTractionWord = /(mrr|arr|mom|yoy|churn|cac|ltv|paying customers|revenue|conversion)/i.test(answer);
        const hasHype = /(growing fast|huge interest|massive potential|viral traction|a lot of demand|tons of interest)/i.test(answer);

        if (!(hasNumber && hasCurrencyOrPercent)) {
          questionScore -= 28;
          localCritiques.push('No hard economic vector ($ or %) present. An unquantified claim reads as unproven demand.');
        } else {
          questionScore += 10;
        }
        if (hasTractionWord) questionScore += 8;
        if (hasHype) {
          questionScore -= 18;
          localCritiques.push('Hyperbole substituted for data ("growing fast", "huge interest"). Name the number or cut the sentence.');
        }
        if (hasEvidenceAnalogy(answer)) {
          questionScore -= 15;
          localCritiques.push("Borrowed credibility from another company's trajectory instead of your own data. Accelerator partners treat analogy-based evidence as weak — primary data from your own users is the only thing that counts.");
        }
        if (TOP_DOWN_SIZING.test(answer)) {
          questionScore -= 15;
          localCritiques.push('Top-down market sizing ("$X billion market," "capture just N%") is a known weak argument. Use bottom-up math from your own price and reachable customers, or point to a close comparable\'s real revenue.');
        }
      }

      if (q.category === 'moat') {
        const weak = /(our ui is better|we are faster|we care more|first mover|better design|nicer interface|move faster than|work harder)/i.test(answer);
        const strong = /(proprietary dataset|network effect|integrations|switching cost|regulatory|exclusive|api integration|patent|data moat|community)/i.test(answer);

        if (weak) {
          questionScore -= 32;
          localCritiques.push('The defense rests on an adjective ("better", "faster", "first"). Any funded competitor neutralizes this within a quarter.');
        }
        if (strong) {
          questionScore += 12;
        } else if (!weak) {
          questionScore -= 15;
          localCritiques.push('No structural barrier was named. State the specific asset a competitor would need to replicate this.');
        }
        if (hasEvidenceAnalogy(answer)) {
          questionScore -= 12;
          localCritiques.push("Leaning on another company's outcome as proof of your own defensibility is borrowed credibility, not evidence.");
        }
      }
    }

    if (localCritiques.length === 0) {
      localCritiques.push('Structurally sound. No violations detected on this response.');
    }

    questionScore = Math.max(0, Math.min(100, Math.round(questionScore)));
    categoryScores[q.category].push(questionScore);

    breakdown.push({
      category: q.category,
      question: q.text,
      answer: rawAnswer,
      wordCount,
      passWordEconomy,
      critiques: localCritiques,
      rewrite: REWRITE_TEMPLATES[q.category],
      questionScore
    });

    localCritiques.forEach((c) => critiques.push(`[${CATEGORY_LABELS[q.category].toUpperCase()}] ${c}`));
  });

  function average(arr) {
    if (arr.length === 0) return 100;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  let clarity = average(categoryScores.clarity) - jargonPenalty;
  let metrics = average(categoryScores.metrics);
  let moat = average(categoryScores.moat);

  clarity = Math.max(0, Math.min(100, Math.round(clarity)));
  metrics = Math.max(0, Math.min(100, Math.round(metrics)));
  moat = Math.max(0, Math.min(100, Math.round(moat)));
  const overall = Math.max(5, Math.min(100, Math.round((clarity + metrics + moat) / 3)));

  return {
    score: overall,
    clarityScore: clarity,
    metricScore: metrics,
    moatScore: moat,
    trippedJargon: tripped,
    critiques: critiques.length > 0 ? critiques : ['No critical failure paths triggered. Structure reads clean and quantitative.'],
    breakdown,
    timeExpired
  };
}

const PROCESSING_LOG_LINES = [
  'CRITICAL AUDIT: Initiating response parsing...',
  'LEXICAL SCAN: Extracting word counts and structural maps...',
  'CORPUS VERIFICATION: Cross-referencing Jargon & Fluff Blacklist Matrix...',
  'ECONOMY AUDIT: Applying 40-word punchiness ceiling to all responses...',
  'QUANTITATIVE AUDIT: Scanning for hard economic vectors ($ / % / traction)...',
  'RISK HEURISTICS: Cross-referencing moat claims against historical failure vectors...',
  'COMPILING SCHEMAS: Formulating per-response rewrite scaffolds...',
  'EVALUATION COMPLETE: Exporting diagnostic arrays to dashboard UI...'
];

const BOOT_TEXT = "INITIALIZING FORGE...\nSYSTEM STATUS: ONLINE\nTARGET EVENT: ACCELERATOR PARTNER INTERVIEWS\nCLOCK: 10:00 PER SESSION — NO PAUSES, NO PARTIALITY\n\nPRESS INITIATE TO BEGIN.";

const DEFAULT_RESULTS = {
  score: 100,
  clarityScore: 100,
  metricScore: 100,
  moatScore: 100,
  trippedJargon: [],
  critiques: [],
  breakdown: [],
  timeExpired: false
};

// ---------------- Presentational subcomponents ----------------

function SparkField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let animationId;
    const sparks = [];
    const SPARK_COUNT = 50;
    const HUES = ['59, 130, 246', '147, 197, 253'];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function spawnSpark(randomizeHeight) {
      return {
        x: Math.random() * canvas.width,
        y: randomizeHeight ? Math.random() * canvas.height : canvas.height + 10,
        vy: -(0.25 + Math.random() * 0.55),
        driftPhase: Math.random() * Math.PI * 2,
        driftAmount: 0.3 + Math.random() * 0.4,
        r: Math.random() * 1.5 + 0.6,
        life: 0,
        maxLife: 260 + Math.random() * 220,
        hue: HUES[Math.floor(Math.random() * HUES.length)]
      };
    }

    for (let i = 0; i < SPARK_COUNT; i += 1) {
      sparks.push(spawnSpark(true));
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparks.forEach((s, i) => {
        s.life += 1;
        s.y += s.vy;
        s.x += Math.sin(s.driftPhase + s.life * 0.03) * s.driftAmount * 0.4;

        const lifeRatio = s.life / s.maxLife;
        const alpha = lifeRatio < 0.15
          ? lifeRatio / 0.15
          : Math.max(0, 1 - (lifeRatio - 0.15) / 0.85);

        if (s.life >= s.maxLife || s.y < -10) {
          sparks[i] = spawnSpark(false);
          return;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.hue}, ${(alpha * 0.8).toFixed(3)})`;
        ctx.shadowColor = `rgba(${s.hue}, ${alpha.toFixed(3)})`;
        ctx.shadowBlur = 6;
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function WaveformCanvas({ intensity }) {
  const canvasRef = useRef(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let animationId;
    let t = 0;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 40;
      const barWidth = w / bars;
      for (let i = 0; i < bars; i += 1) {
        const amp = intensityRef.current;
        const noise = Math.sin(t * 0.12 + i * 0.5) * 0.5 + Math.sin(t * 0.05 + i) * 0.5;
        const barHeight = Math.max(2, Math.abs(noise) * amp * (h * 0.9));
        const x = i * barWidth;
        const y = (h - barHeight) / 2;
        ctx.fillStyle = `rgba(59, 130, 246, ${(0.35 + amp * 0.4).toFixed(3)})`;
        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
      }
      t += 1;
      animationId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-10" />;
}

function MethodologyCard({ icon: Icon, title, description, ring, iconBg, iconBorder, iconText }) {
  return (
    <div className="bg-slate-950/40 border border-slate-900 forge-panel rounded-lg p-5 backdrop-blur-md flex flex-col items-start gap-3">
      <div
        className={`relative w-10 h-10 flex items-center justify-center rounded-full forge-pulse ${iconBg} ${iconBorder}`}
        style={{ '--pulse-color': ring }}
      >
        <Icon className={`w-5 h-5 ${iconText}`} />
      </div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
      <p className="text-xs text-slate-400 font-sans leading-relaxed">{description}</p>
    </div>
  );
}

function GaugeRow({ label, value, colorClass }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
        <div className={`${colorClass} h-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ---------------- Main component ----------------

export default function Forge() {
  const [phase, setPhase] = useState('landing');
  const [bootText, setBootText] = useState('');

  const [entity, setEntity] = useState({ companyName: '', sector: 'B2B SaaS' });
  const [difficulty, setDifficulty] = useState('medium');

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [questionSubPhase, setQuestionSubPhase] = useState('connecting');
  const [typedQuestion, setTypedQuestion] = useState('');
  const [answers, setAnswers] = useState({});
  const [currentAnswerDraft, setCurrentAnswerDraft] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_SECONDS);
  const [questionSecondsRemaining, setQuestionSecondsRemaining] = useState(0);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimSpeechText, setInterimSpeechText] = useState('');
  const [speechError, setSpeechError] = useState('');

  const [logLines, setLogLines] = useState([]);
  const [results, setResults] = useState(DEFAULT_RESULTS);

  const processingTimeoutsRef = useRef([]);
  const recognitionRef = useRef(null);

  // ---- Handlers (defined before the effects that reference them) ----

  const handleBeginInterview = () => {
    setSessionQuestions(buildSessionQuestions(DIFFICULTY_CONFIG[difficulty].questionsPerPillar));
    setAnswers({});
    setCurrentQIndex(0);
    setSecondsRemaining(SESSION_SECONDS);
    setPhase('interview');
  };

  const beginEvaluation = (finalAnswers, questions, timeExpired) => {
    setPhase('processing');
    setLogLines([]);
    processingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    processingTimeoutsRef.current = [];

    PROCESSING_LOG_LINES.forEach((line, idx) => {
      const id = setTimeout(() => {
        setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
        if (idx === PROCESSING_LOG_LINES.length - 1) {
          const finalId = setTimeout(() => {
            setResults(evaluateSession(questions, finalAnswers, timeExpired));
            setPhase('results');
          }, 650);
          processingTimeoutsRef.current.push(finalId);
        }
      }, idx * 460);
      processingTimeoutsRef.current.push(id);
    });
  };

  const stopActiveRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimSpeechText('');
  };

  const startRecording = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    stopActiveRecognition();
    setSpeechError('');
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += piece;
        } else {
          interimChunk += piece;
        }
      }
      if (finalChunk) {
        setCurrentAnswerDraft((prev) => {
          const trimmedPrev = prev.replace(/\s+$/, '');
          const needsSpace = trimmedPrev.length > 0;
          return `${trimmedPrev}${needsSpace ? ' ' : ''}${finalChunk.trim()}`;
        });
        setInterimSpeechText('');
      } else {
        setInterimSpeechText(interimChunk);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError('Microphone access denied — check browser permissions, or type instead.');
      } else if (event.error === 'no-speech') {
        setSpeechError('No speech detected.');
      } else {
        setSpeechError('Voice recognition error — type the answer instead.');
      }
      setIsRecording(false);
      setInterimSpeechText('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimSpeechText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const submitAnswer = () => {
    stopActiveRecognition();
    const q = sessionQuestions[currentQIndex];
    if (!q) return;
    const merged = { ...answers, [q.category]: currentAnswerDraft };
    setAnswers(merged);
    if (currentQIndex + 1 < sessionQuestions.length) {
      setCurrentQIndex((i) => i + 1);
    } else {
      beginEvaluation(merged, sessionQuestions, false);
    }
  };

  const handleTimeExpired = () => {
    stopActiveRecognition();
    const q = sessionQuestions[currentQIndex];
    const merged = { ...answers };
    if (q && merged[q.category] === undefined) {
      merged[q.category] = currentAnswerDraft || '';
    }
    ['clarity', 'metrics', 'moat'].forEach((c) => {
      if (merged[c] === undefined) merged[c] = '';
    });
    beginEvaluation(merged, sessionQuestions, true);
  };

  const resetSession = () => {
    setPhase('setup');
    setSessionQuestions([]);
    setAnswers({});
    setCurrentQIndex(0);
    setCurrentAnswerDraft('');
    setSecondsRemaining(SESSION_SECONDS);
    setLogLines([]);
  };

  // ---- Effects ----

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setBootText(BOOT_TEXT.slice(0, idx));
      if (idx >= BOOT_TEXT.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const SpeechRecognitionAPI = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    setSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  useEffect(() => {
    return () => {
      processingTimeoutsRef.current.forEach((id) => clearTimeout(id));
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Session countdown clock — active only during the interview phase.
  // handleTimeExpired is intentionally left out of the dependency array:
  // it closes over currentAnswerDraft, so including it would tear down
  // and restart this timeout on every keystroke instead of once a second.
  useEffect(() => {
    if (phase !== 'interview') return undefined;
    if (secondsRemaining <= 0) {
      handleTimeExpired();
      return undefined;
    }
    const t = setTimeout(() => setSecondsRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsRemaining]);

  useEffect(() => {
    if (phase !== 'interview') return undefined;
    if (!sessionQuestions[currentQIndex]) return undefined;
    stopActiveRecognition();
    setQuestionSubPhase('connecting');
    setTypedQuestion('');
    setCurrentAnswerDraft('');
    const tierConfig = DIFFICULTY_CONFIG[difficulty];
    setQuestionSecondsRemaining(tierConfig.perQuestionCapSeconds || 0);
    const [minDelay, maxDelay] = tierConfig.connectingDelayRange;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const timer = setTimeout(() => setQuestionSubPhase('typing'), delay);
    return () => clearTimeout(timer);
  }, [currentQIndex, phase, sessionQuestions, difficulty]);

  useEffect(() => {
    if (questionSubPhase !== 'typing') return undefined;
    const fullText = sessionQuestions[currentQIndex] ? sessionQuestions[currentQIndex].text : '';
    const speed = DIFFICULTY_CONFIG[difficulty].typewriterSpeed;
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setTypedQuestion(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(interval);
        setQuestionSubPhase('awaiting_answer');
      }
    }, speed);
    return () => clearInterval(interval);
  }, [questionSubPhase, currentQIndex, sessionQuestions, difficulty]);

  // Hard-mode per-question cap — forces submission of whatever is drafted.
  // submitAnswer is intentionally left out of the dependency array for the
  // same reason as handleTimeExpired above: it closes over currentAnswerDraft.
  useEffect(() => {
    if (phase !== 'interview') return undefined;
    if (questionSubPhase !== 'awaiting_answer') return undefined;
    const cap = DIFFICULTY_CONFIG[difficulty].perQuestionCapSeconds;
    if (!cap) return undefined;
    if (questionSecondsRemaining <= 0) {
      submitAnswer();
      return undefined;
    }
    const t = setTimeout(() => setQuestionSecondsRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionSubPhase, questionSecondsRemaining, difficulty]);

  const status = getStatusTier(results.score);
  const shareText = encodeURIComponent(
    `Just ran my pitch through Forge. Scored ${results.score}/100 for interview readiness. Test yours before you walk into the room.`
  );
  const shareUrl = `https://twitter.com/intent/tweet?text=${shareText}`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-300 font-mono overflow-hidden">
      <style>{GLOBAL_STYLES}</style>

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <SparkField />
      </div>

      <div className="fixed inset-0 z-30 overflow-hidden pointer-events-none opacity-5">
        <div className="w-full h-32 bg-gradient-to-b from-transparent via-white to-transparent forge-scanline-track" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8 antialiased selection:bg-blue-600 selection:text-white">
        <header className="w-full flex items-center justify-between border-b border-slate-900 pb-4 mb-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            <span>FORGE</span>
          </div>
          <div className="hidden sm:block">STATUS: SECURE INTERROGATION PROTOCOL</div>
          <div>ENGINE: DETERMINISTIC</div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto my-auto">

          {phase === 'landing' && (
            <div className="w-full max-w-3xl forge-fade-in">
              <div className="bg-slate-950/50 border border-slate-900 forge-panel p-6 md:p-8 rounded-lg backdrop-blur-md mb-6">
                <pre className="text-blue-400 text-xs md:text-sm whitespace-pre-wrap leading-relaxed min-h-[120px]">{bootText}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <MethodologyCard
                  icon={Crosshair}
                  title="Clarity"
                  description="Tests whether a stranger could repeat your description back correctly. Buzzwords and run-on structure fail here."
                  ring="rgba(59, 130, 246, 0.35)"
                  iconBg="bg-blue-500/10"
                  iconBorder="border border-blue-500/30"
                  iconText="text-blue-400"
                />
                <MethodologyCard
                  icon={TrendingUp}
                  title="Metrics"
                  description="Tests whether your traction claim carries a hard number, a dollar sign, or a percent. Adjectives are not evidence."
                  ring="rgba(56, 189, 248, 0.35)"
                  iconBg="bg-sky-500/10"
                  iconBorder="border border-sky-500/30"
                  iconText="text-sky-400"
                />
                <MethodologyCard
                  icon={ShieldCheck}
                  title="Defensibility"
                  description="Tests whether your moat is a structural barrier or a personality trait. 'We work harder' is not a moat."
                  ring="rgba(99, 102, 241, 0.35)"
                  iconBg="bg-indigo-500/10"
                  iconBorder="border border-indigo-500/30"
                  iconText="text-indigo-400"
                />
              </div>

              <button
                onClick={() => setPhase('setup')}
                className="w-full py-3 bg-slate-900 hover:bg-blue-600 hover:text-white text-blue-400 font-bold border border-blue-500/30 transition-all duration-300 rounded uppercase text-sm tracking-wider"
              >
                Initiate Diagnostic
              </button>
            </div>
          )}

          {phase === 'setup' && (
            <div className="w-full max-w-xl bg-slate-950/40 border border-slate-900 forge-panel p-6 rounded-lg backdrop-blur-md forge-fade-in">
              <div className="text-xs text-slate-500 mb-2">PRE-INTERROGATION // ENTITY INTAKE</div>
              <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-900 pb-2">Core Entity Identification</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Company / Project Name</label>
                  <input
                    type="text"
                    value={entity.companyName}
                    onChange={(e) => setEntity({ ...entity, companyName: e.target.value })}
                    placeholder="e.g., Velvex"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Operational Sector</label>
                  <select
                    value={entity.sector}
                    onChange={(e) => setEntity({ ...entity, sector: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="B2B SaaS">B2B SaaS / Enterprise Software</option>
                    <option value="Developer Tools">Developer Tools / Infra</option>
                    <option value="AI / ML Systems">Artificial Intelligence / Machine Learning</option>
                    <option value="Consumer / Social">Consumer / Social Apps</option>
                    <option value="Marketplaces">Marketplaces / Platforms</option>
                    <option value="E-Commerce / D2C">E-Commerce / D2C Brands</option>
                    <option value="FinTech">Financial Technology</option>
                    <option value="BioTech / Health">BioTech / Healthcare Systems</option>
                    <option value="Climate / Hardware">Climate / Energy / Hardware</option>
                    <option value="Education">Education / EdTech</option>
                    <option value="Real Estate">Real Estate / Proptech</option>
                    <option value="Logistics">Logistics / Supply Chain</option>
                    <option value="Gaming / Media">Gaming / Media / Creator Economy</option>
                    <option value="GovTech / Legal">Government / Legal / Compliance Tech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Interrogation Intensity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(DIFFICULTY_CONFIG).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDifficulty(key)}
                        className={`text-left px-3 py-2 rounded border text-xs transition-colors ${
                          difficulty === key
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold uppercase tracking-wide">{DIFFICULTY_CONFIG[key].label}</div>
                        <div className="text-[10px] mt-1 text-slate-500 font-sans leading-snug">{DIFFICULTY_CONFIG[key].description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-sans mt-6 leading-relaxed">
                Once you begin, a 10:00 clock starts. {DIFFICULTY_CONFIG[difficulty].questionsPerPillar * 3} questions, no pauses, no return to a previous question.
              </p>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleBeginInterview}
                  disabled={!entity.companyName}
                  className="flex-1 py-2 bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm rounded uppercase transition-all hover:bg-blue-500"
                >
                  Enter The Chamber
                </button>
              </div>
            </div>
          )}

          {phase === 'interview' && sessionQuestions[currentQIndex] && (
            <div className="w-full max-w-xl forge-fade-in">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-slate-500 uppercase tracking-wider">
                  Prompt {currentQIndex + 1} of {sessionQuestions.length}
                </span>
                <span className={`font-bold flex items-center gap-1 ${secondsRemaining <= 60 ? 'text-red-400' : secondsRemaining <= 180 ? 'text-amber-400' : 'text-blue-300'}`}>
                  <Clock className="w-3.5 h-3.5" /> {formatTime(secondsRemaining)}
                </span>
              </div>

              <div className="bg-slate-950/40 border border-slate-900 forge-panel rounded-lg p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest text-slate-500">
                  <Radio className="w-3.5 h-3.5 text-blue-500" /> Live Partner Link
                </div>

                <WaveformCanvas
                  intensity={questionSubPhase === 'connecting' ? 0.85 : questionSubPhase === 'typing' ? 0.55 : 0.2}
                />

                <div className="mt-5 min-h-[64px]">
                  {questionSubPhase === 'connecting' && (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <p className="text-blue-400 text-sm">SIMULATED PARTNER TYPING...</p>
                    </div>
                  )}
                  {(questionSubPhase === 'typing' || questionSubPhase === 'awaiting_answer') && (
                    <p className="text-white text-base leading-relaxed font-sans">
                      {typedQuestion}
                      <span className={questionSubPhase === 'typing' ? 'animate-pulse' : 'hidden'}>▌</span>
                    </p>
                  )}
                </div>

                {questionSubPhase === 'awaiting_answer' && (
                  <div className="mt-5 forge-fade-in">
                    <textarea
                      value={currentAnswerDraft}
                      onChange={(e) => setCurrentAnswerDraft(e.target.value)}
                      rows={4}
                      placeholder="Answer directly. No warm-up sentence."
                      className="w-full bg-slate-900/60 border border-slate-800 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                    />

                    {speechSupported ? (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={isRecording ? stopActiveRecognition : startRecording}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wide transition-colors ${
                            isRecording
                              ? 'border-red-500/50 bg-red-500/10 text-red-400'
                              : 'border-blue-500/30 bg-slate-900/60 text-blue-400 hover:border-blue-500/50'
                          }`}
                        >
                          {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {isRecording ? 'Stop Recording' : 'Speak Answer'}
                        </button>
                        {isRecording && <span className="text-[10px] text-red-400 animate-pulse">● LISTENING</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 mt-2">Voice input isn't supported in this browser — type your answer.</div>
                    )}
                    {speechError && <div className="text-[10px] text-red-400 mt-1">{speechError}</div>}
                    {isRecording && interimSpeechText && (
                      <div className="text-xs text-slate-500 italic mt-1">Hearing: "{interimSpeechText}"</div>
                    )}

                    <div className={`text-right text-[10px] mt-1 ${countWords(currentAnswerDraft) > WORD_CEILING ? 'text-red-400' : 'text-slate-600'}`}>
                      {countWords(currentAnswerDraft)} words (ceiling: {WORD_CEILING})
                    </div>
                    {DIFFICULTY_CONFIG[difficulty].perQuestionCapSeconds && (
                      <div className={`text-right text-[10px] mt-1 font-bold ${questionSecondsRemaining <= 10 ? 'text-red-400' : 'text-amber-400'}`}>
                        AUTO-SUBMIT IN {questionSecondsRemaining}s
                      </div>
                    )}
                    {!DIFFICULTY_CONFIG[difficulty].perQuestionCapSeconds && difficulty === 'medium' && (
                      <div className="text-right text-[10px] mt-1 text-slate-500">
                        Recommended pace: ~{Math.max(1, Math.round(secondsRemaining / (sessionQuestions.length - currentQIndex)))}s for this and each remaining question
                      </div>
                    )}
                    <button
                      onClick={submitAnswer}
                      disabled={currentAnswerDraft.trim().length === 0}
                      className="w-full mt-4 py-2 bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm rounded uppercase transition-all hover:bg-blue-500 flex items-center justify-center gap-2"
                    >
                      {currentQIndex + 1 < sessionQuestions.length ? 'Lock In & Continue' : 'Lock In & Finalize'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {phase === 'processing' && (
            <div className="w-full max-w-xl bg-slate-950/40 border border-slate-900 forge-panel p-6 rounded-lg backdrop-blur-md forge-fade-in">
              <h2 className="text-xs uppercase tracking-widest text-blue-400 animate-pulse mb-4">
                FORGE INTERROGATION ENGINE RUNNING...
              </h2>
              <div className="bg-slate-950/80 border border-slate-900 rounded p-4 h-48 overflow-y-auto space-y-2 text-[11px] font-mono">
                {logLines.map((line, idx) => (
                  <div key={idx} className="text-slate-500">
                    <span className="text-blue-600">&gt;</span> {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'results' && (
            <div className="w-full max-w-4xl forge-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-950/40 border border-slate-900 forge-panel p-6 rounded-lg backdrop-blur-md flex flex-col">
                  <div className="mb-4 border-b border-slate-900 pb-2">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-bold text-white">Diagnostic Metrics Dashboard</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.border} ${status.bg} ${status.color}`}>
                        {status.code}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-wider">
                      {entity.companyName} — {entity.sector} — {DIFFICULTY_CONFIG[difficulty].label} ({results.breakdown.length} Q)
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <GaugeRow label="Clarity Index" value={results.clarityScore} colorClass="bg-blue-500" />
                    <GaugeRow label="Metric Density" value={results.metricScore} colorClass="bg-sky-500" />
                    <GaugeRow label="Defensibility Rating" value={results.moatScore} colorClass="bg-indigo-500" />
                  </div>

                  <div>
                    <h3 className="text-xs uppercase text-slate-400 tracking-wider mb-2">Structural Weaknesses Detected</h3>
                    <ul className="space-y-2 text-xs text-slate-400 list-inside list-disc font-sans leading-relaxed">
                      {results.critiques.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-900 forge-panel p-6 rounded-lg backdrop-blur-md flex flex-col items-center justify-center text-center">
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-6">Aggregate Readiness Ratio</div>
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="6" fill="transparent" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={results.score >= 90 ? '#10B981' : results.score >= 70 ? '#F59E0B' : '#EF4444'}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * results.score) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-white tracking-tighter">{results.score}</span>
                      <span className="text-[10px] text-slate-500 font-sans">OVERALL SCORE</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed mt-6">
                    This session falls within the <span className={`font-bold ${status.color}`}>{status.code}</span> range. Partners read roughly 100 applications a day; this response is competing for the first ten seconds.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-900 forge-panel p-6 rounded-lg backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-900 pb-2">Response-Level Audit</h3>
                <div className="space-y-5">
                  {results.breakdown.map((item, idx) => (
                    <div key={idx} className="border border-slate-900 rounded-lg p-4 bg-slate-950/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase tracking-widest ${CATEGORY_TEXT_COLORS[item.category]}`}>{CATEGORY_LABELS[item.category]}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400">{item.questionScore}/100</span>
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${item.passWordEconomy ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.passWordEconomy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {item.wordCount} WORDS
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans mb-2 italic">"{item.question}"</p>
                      <p className="text-sm text-slate-200 font-sans mb-3 leading-relaxed">
                        {item.answer ? item.answer : <span className="text-red-400">No response recorded.</span>}
                      </p>
                      <ul className="space-y-1 mb-3 text-xs text-amber-400/90 font-sans">
                        {item.critiques.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                      {item.rewrite && (
                        <div className="bg-slate-900/40 border border-slate-800/60 rounded p-3 text-xs">
                          <span className="text-blue-400 font-bold uppercase tracking-wider text-[10px]">Rewrite Scaffold</span>
                          <p className="text-slate-300 font-sans leading-relaxed mt-1">{item.rewrite}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetSession}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-xs uppercase rounded transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-Evaluate
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-center font-bold text-xs uppercase rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Core Metrics Array on X
                </a>
              </div>
            </div>
          )}
        </main>

        <footer className="w-full flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-4 mt-6 text-[10px] text-slate-600">
          <div>ORCHESTRATION: MONOLITHIC_CLIENT_SIDE</div>
          <div className="mt-2 sm:mt-0">DATA REFRESH COMPLETE // STRICT DETERMINISTIC VALIDATION RUNNING</div>
        </footer>
      </div>
    </div>
  );
}
