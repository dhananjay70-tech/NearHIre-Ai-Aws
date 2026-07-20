import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { FullLogo } from '../components/Logo.jsx';
import {
  Brain,
  Compass,
  FileText,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Map,
  UserCheck,
  CheckCircle,
  ShieldCheck,
  Zap,
  Globe,
  Bell,
  Users,
  Building2,
  Star,
  Target,
  BarChart3,
  Clock,
  Briefcase
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'Resume AI Parser',
    desc: 'Extracts skills, work history, and contact info instantly. Scores resume completeness with precise recommendations.',
    color: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-violet-500/25',
  },
  {
    icon: Compass,
    title: 'Hyperlocal Search',
    desc: 'Query jobs within a 5km to 100km radius using precise coordinates. Map-guided discovery with estimated commutes.',
    color: 'from-blue-500 to-indigo-600',
    glow: 'group-hover:shadow-blue-500/25',
  },
  {
    icon: Sparkles,
    title: 'AI Career Coach',
    desc: 'Interactive chat agent to practice interview questions, get learning roadmaps, and structure covers without API keys.',
    color: 'from-pink-500 to-rose-600',
    glow: 'group-hover:shadow-pink-500/25',
  },
  {
    icon: TrendingUp,
    title: 'Skill Gap Analysis',
    desc: 'Analyzes target jobs and highlights missing technologies. Tells you exactly what to learn to raise your match fit.',
    color: 'from-amber-500 to-orange-650',
    glow: 'group-hover:shadow-amber-500/25',
  },
  {
    icon: UserCheck,
    title: 'Deterministic Match Score',
    desc: 'Matches profiles against actual job specifications using solid mathematical scoring. No randomized ranking.',
    color: 'from-emerald-500 to-teal-650',
    glow: 'group-hover:shadow-emerald-500/25',
  },
  {
    icon: FileText,
    title: 'ATS Scanner & Tracker',
    desc: 'Scan resumes against job descriptions to check ATS compatibility. Track pipeline progress from Applied to Offer.',
    color: 'from-cyan-500 to-blue-600',
    glow: 'group-hover:shadow-cyan-500/25',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Set Location',
    desc: 'Detect coordinates via GPS or set location manually to begin hyperlocal discovery.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Upload PDF Resume',
    desc: 'Our local parsing engine extracts skills and builds your profile details instantly.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'Check Fit Score',
    desc: 'Get a clear match percentage breakdown detailing exactly why you align with nearby jobs.',
    icon: Brain,
  },
  {
    step: '04',
    title: 'Practice with AI Coach',
    desc: 'Practice customized mock interviews and structure cover letters matching requirements.',
    icon: Sparkles,
  },
];

// Helper component for animated text switching
function AnimatedText({ words }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <motion.span
      key={words[index]}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
    >
      {words[index]}
    </motion.span>
  );
}

// Helper component for magnetic button effect
function MagneticButton({ children, className, onClick, disabled }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  // Chatbot Auto-type Mockup States
  const [chatMessages, setChatMessages] = useState([
    { sender: 'coach', text: "Hi Dhananjay! Based on your resume, I recommend learning TypeScript to raise your match score for the React Developer role in Noida." }
  ]);
  const [chatStep, setChatStep] = useState(0);

  useEffect(() => {
    if (chatStep === 0) {
      const timer = setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { sender: 'user', text: "Will it increase my fit score significantly?" }
        ]);
        setChatStep(1);
      }, 3500);
      return () => clearTimeout(timer);
    } else if (chatStep === 1) {
      const timer = setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { sender: 'coach', text: "Yes! Adding TypeScript will increase your fit by +14% since Noida offices list it as a core requirement." }
        ]);
        setChatStep(2);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [chatStep]);

  function handleSearchClick() {
    if (isAuthenticated) {
      navigate('/search');
    } else {
      navigate('/login', { state: { redirect: '/search' } });
    }
  }

  function handleGetStartedClick() {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  }

  return (
    <div className="min-h-screen bg-background-50 dark:bg-background text-slate-800 dark:text-zinc-100 overflow-x-hidden selection:bg-primary selection:text-white">
      
      {/* ── HERO SECTION ──────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-20 overflow-hidden bg-background-50 dark:bg-background">
        
        {/* Animated Aurora Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <motion.div 
            style={{ y: y1 }}
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-primary/20 dark:bg-primary/10 rounded-full blur-[140px] animate-aurora" 
          />
          <motion.div 
            style={{ y: y2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[60%] bg-secondary/15 dark:bg-secondary/10 rounded-full blur-[130px] animate-aurora" 
          />
          <motion.div 
            style={{ y: y1 }}
            className="absolute top-[20%] right-[10%] w-[45%] h-[50%] bg-accent/10 dark:bg-accent/5 rounded-full blur-[120px] animate-blob" 
          />
          
          {/* Subtle Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-grid-pattern bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-grid-pattern dark:bg-grid" />
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0
              }}
              animate={{
                y: [null, -100],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Headline and Call-to-actions */}
            <div className="lg:col-span-6 text-left space-y-8">
              
              {/* Promo Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 bg-primary/10 dark:bg-primary/20 backdrop-blur-md border border-primary/20 dark:border-primary/30 text-primary dark:text-primary-400 px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-primary/10"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span>AI Hyperlocal Career Platform</span>
              </motion.div>

              {/* Main Headline with Animated Word Switching */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white"
              >
                Discover{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Hyperlocal
                </span>
                <br />
                <AnimatedText words={['Jobs', 'Careers', 'Opportunities', 'Growth']} />
              </motion.h1>

              {/* Supporting Text */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed"
              >
                NearHire.AI evaluates local job requirements, commuting radii, and candidate profiles using deterministic mathematical parsing. No black-box algorithms, just precision matching.
              </motion.p>

              {/* Premium CTA Buttons with Magnetic Hover */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <MagneticButton
                  onClick={handleSearchClick}
                  disabled={loading}
                  className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-primary via-secondary to-accent text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-95 disabled:opacity-60 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Search Local Jobs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </MagneticButton>
                
                <MagneticButton
                  onClick={handleGetStartedClick}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary-400 hover:bg-white dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  {isAuthenticated ? 'Go to Dashboard' : '🚀 Build Free Profile'}
                </MagneticButton>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.45 }}
                className="flex flex-wrap gap-x-6 gap-y-2.5 pt-4 text-xs font-semibold text-slate-500 dark:text-zinc-500"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>No random ranking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>No PDF data storage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Offline API Key free</span>
                </div>
              </motion.div>

              {/* Student & Recruiter Count */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center gap-8 pt-4"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">10K+</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">Students</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">500+</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">Recruiters</p>
                  </div>
                </div>
              </motion.div>

              {/* Company Logos */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="pt-6"
              >
                <p className="text-xs font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-wider mb-4">Trusted by leading companies</p>
                <div className="flex flex-wrap gap-6 opacity-50">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-20 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              </motion.div>

            </div>

            {/* Right Column: Interactive AI Dashboard Preview */}
            <div className="lg:col-span-6 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative mx-auto max-w-[500px] lg:max-w-none group"
              >
                {/* 3D hover background glow */}
                <div className="absolute inset-[-8px] bg-gradient-to-tr from-primary via-secondary to-accent rounded-3xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />

                {/* Dashboard Frame */}
                <div className="relative rounded-3xl border border-zinc-700/80 bg-[#171B24] shadow-2xl overflow-hidden p-6 space-y-6">
                  
                  {/* Dashboard Header Mockup */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-400/90" />
                        <span className="w-3 h-3 rounded-full bg-yellow-400/90" />
                        <span className="w-3 h-3 rounded-full bg-green-400/90" />
                      </div>
                      <span className="text-xs font-bold text-zinc-400">nearhire-candidate-console</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">LIVE FEED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Module 1: AI Match Score */}
                    <div className="bg-[#1E2330] border border-zinc-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group/card hover:scale-[1.02] transition-transform duration-300">
                      <div className="absolute top-2 right-2">
                        <Zap className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                      </div>
                      <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Overall Match Quality</p>
                      
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-zinc-700"
                            strokeWidth="2.5"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-primary"
                            strokeDasharray="94, 100"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white">94%</span>
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">FIT SCORE</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2">Validated against 16 local parameters</p>
                    </div>

                    {/* Module 2: Nearby Jobs Map Preview */}
                    <div className="bg-[#1E2330] border border-zinc-700 rounded-2xl p-4 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Hyperlocal Commute</span>
                        <Map className="w-4 h-4 text-primary" />
                      </div>
                      
                      {/* Stylized visual map layout */}
                      <div className="relative h-24 bg-[#12151E] border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-zinc-950/20" />
                        
                        {/* Location pin with rings */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="relative flex h-5 w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <div className="relative rounded-full h-2.5 w-2.5 bg-primary-600 border border-white"></div>
                          </div>
                          <span className="text-[9px] font-black text-white bg-primary px-1.5 py-0.5 rounded border border-primary/60 mt-1">Delhi NCR</span>
                        </div>

                        {/* Neighbor Office Pin */}
                        <div className="absolute top-4 right-8 z-10 flex items-center gap-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-500"></span>
                          </span>
                          <span className="text-[8px] bg-slate-900 dark:bg-zinc-950 text-white px-1 py-0.5 rounded">Noida Office</span>
                        </div>

                        {/* Commute path */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M120 70 Q 140 40 180 30" fill="none" stroke="#7C3AED" strokeWidth="2" strokeDasharray="4 4" />
                        </svg>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2">
                        <span>Radius: <strong>15 km</strong></span>
                        <span>Est: <strong>22 mins</strong></span>
                      </div>
                    </div>

                  </div>

                  {/* Module 3: Resume Analysis & Skill Gap */}
                  <div className="bg-[#1E2330] border border-zinc-700 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-secondary" />
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Candidate Profile Extraction</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-900/60 border border-emerald-700 px-2 py-0.5 rounded-full">Completed</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {['React.js', 'Node.js', 'Express', 'PostgreSQL', 'REST APIs', 'Git'].map((s) => (
                        <span key={s} className="bg-[#232938] border border-zinc-600 text-[10px] font-bold px-2 py-1 rounded-lg text-zinc-200">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Skill Gap Alert bar */}
                    <div className="flex items-start gap-2 bg-primary/20 border border-primary/40 rounded-xl p-3 text-xs">
                      <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">Targeting Frontend Developer Roles?</p>
                        <p className="text-[11px] text-zinc-300">Add <strong>TypeScript</strong> and <strong>TailwindCSS</strong> to match 3 more jobs nearby (+14% fit index).</p>
                      </div>
                    </div>
                  </div>

                  {/* Module 4: Live AI Chatbot Widget Preview */}
                  <div className="border border-zinc-700 rounded-2xl bg-[#1E2330] p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-700">
                      <MessageSquare className="w-4.5 h-4.5 text-accent" />
                      <span className="text-xs font-bold text-zinc-200">AI Career Coach Chat</span>
                    </div>

                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <AnimatePresence>
                        {chatMessages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] rounded-xl p-2.5 text-[11px] leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-primary text-white font-semibold rounded-br-none'
                                : 'bg-[#232938] border border-zinc-600 text-zinc-200 rounded-bl-none shadow-sm'
                            }`}>
                              {msg.text}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Floating Notification Popup */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 2, duration: 0.5 }}
                    className="absolute bottom-16 right-[-24px] z-20 hidden sm:flex items-center gap-3 bg-[#1E2330] border border-zinc-600 rounded-2xl p-3 shadow-xl max-w-[280px]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
                      <Bell className="w-4 h-4 animate-swing" />
                    </div>
                    <div className="text-[10px] leading-tight">
                      <p className="font-black text-white">New Fit Match Found!</p>
                      <p className="text-zinc-300 mt-0.5">Software Engineer at Figma (+94% fit, 12km away)</p>
                    </div>
                  </motion.div>

                </div>
              </motion.div>
            </div>

          </div>
        </div>

        {/* Curved Wave Bottom Divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg className="w-full h-12 text-background-50 dark:text-background fill-current" viewBox="0 0 1440 74" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,74L1320,74C1200,74,960,74,720,74C480,74,240,74,120,74L0,74Z" />
          </svg>
        </div>

      </section>

      {/* ── TRUST BANNER ───────────────────────────────────── */}
      <section className="bg-background-50 dark:bg-background py-10 border-b border-slate-100 dark:border-zinc-900/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
            Trusted by Top Students & Recruiters Across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-45 dark:opacity-30">
            {/* Vercel */}
            <span className="text-lg font-black tracking-tighter text-slate-800 dark:text-white flex items-center gap-1.5">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 22.525H0L12 1.475L24 22.525Z"/></svg>
              VERCEL
            </span>
            {/* Stripe */}
            <span className="text-xl font-extrabold text-slate-800 dark:text-white">Stripe</span>
            {/* Linear */}
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-current" /> Linear
            </span>
            {/* Notion */}
            <span className="text-lg font-extrabold text-slate-800 dark:text-white">Notion AI</span>
            {/* Lovable */}
            <span className="text-lg font-black text-slate-800 dark:text-white">&hearts; Lovable</span>
            {/* Cursor */}
            <span className="text-lg font-semibold text-slate-800 dark:text-white tracking-wide font-mono">&gt;_ Cursor</span>
          </div>
        </div>
      </section>

      {/* ── METRICS SECTION (PLAIN STATS UPGRADE) ──────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs font-black text-primary dark:text-primary-400 uppercase tracking-widest bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-primary/30">NearHire Platform Metrics</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Proven Performance & Precision
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: 'NH-9051', label: 'Candidate IDs', sub: 'Human-friendly unique identifiers', icon: UserCheck, color: 'text-primary' },
            { value: '100%', label: 'Deterministic Score', sub: 'Calculated from actual skills', icon: ShieldCheck, color: 'text-emerald-500' },
            { value: '5-100 km', label: 'Hyperlocal Radius', sub: 'Precision location boundary matching', icon: MapPin, color: 'text-secondary' },
            { value: '< 2.0s', label: 'Analysis Speed', sub: 'Fast AI resume completeness check', icon: Zap, color: 'text-accent' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300"
              >
                <div className={`w-11 h-11 rounded-2xl bg-slate-50 dark:bg-zinc-850 flex items-center justify-center mb-4 border border-slate-100 dark:border-zinc-800 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
                <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-1">{stat.label}</div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">{stat.sub}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ──────────────────────────── */}
      <section className="relative py-24 bg-background-50 dark:bg-background/40 border-y border-slate-200/50 dark:border-zinc-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-black text-secondary dark:text-secondary-400 uppercase tracking-widest bg-secondary/10 dark:bg-secondary/20 px-3.5 py-1.5 rounded-full border border-secondary/20 dark:border-secondary/30">Step-by-step roadmap</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              How NearHire Guides Your Search
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((hw, i) => {
              const Icon = hw.icon;
              return (
                <motion.div
                  key={hw.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/40 dark:border-zinc-800/80 rounded-3xl p-7 relative shadow-md hover:shadow-lg transition-shadow"
                >
                  {/* Step Connector line */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-[52px] -right-3 w-6 h-[1px] bg-slate-200 dark:bg-zinc-800 z-10" />
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-zinc-800 text-primary dark:text-primary-400 flex items-center justify-center border border-primary/20 dark:border-zinc-800">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs font-black text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded border border-primary/20 dark:border-primary/30">{hw.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{hw.title}</h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">{hw.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PREMIUM FEATURE GRID ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs font-black text-accent dark:text-accent-400 uppercase tracking-widest bg-accent/10 dark:bg-accent/20 px-3.5 py-1.5 rounded-full border border-accent/20 dark:border-accent/30">Everything built-in</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Engineered for precision job matching
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-xl mx-auto">
            Get the full suite of career tools designed to locate, verify, and track your next job.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/80 rounded-3xl p-7 hover:scale-[1.02] hover:-translate-y-1 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 relative overflow-hidden"
              >
                {/* Glow spot */}
                <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full bg-gradient-to-br ${feat.color} opacity-[0.03] group-hover:opacity-10 blur-xl transition-opacity duration-300`} />
                
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} text-white flex items-center justify-center shadow-lg ${feat.glow} transition-all duration-300 mb-6 group-hover:scale-105`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs font-black text-primary dark:text-primary-400 uppercase tracking-widest bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-primary/30">Success Stories</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Loved by Students & Recruiters
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: "Priya Sharma",
              role: "Software Engineer",
              company: "Google",
              avatar: "PS",
              content: "NearHire.AI helped me find a job within 5km of my home. The deterministic matching actually works - no random recommendations!",
              rating: 5
            },
            {
              name: "Rahul Kumar",
              role: "Frontend Developer",
              company: "Microsoft",
              avatar: "RK",
              content: "The skill gap analysis told me exactly what to learn. Within 2 months, I increased my match score from 72% to 94%.",
              rating: 5
            },
            {
              name: "Anita Desai",
              role: "HR Manager",
              company: "Amazon",
              avatar: "AD",
              content: "As a recruiter, I love the hyperlocal search. Finding candidates within commuting distance has never been easier.",
              rating: 5
            }
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl hover:scale-[1.02] transition-transform duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">{testimonial.content}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-secondary to-accent flex items-center justify-center text-white text-xs font-black">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SECURITY / PRINCIPLES NOTE ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-8 sm:p-12 text-center space-y-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-zinc-800 text-primary dark:text-primary-400 flex items-center justify-center mx-auto border border-primary/20 dark:border-zinc-800">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Honest Local Discovery Platform</h2>
          <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
            NearHire.AI evaluates local job requirements, commuting radii, and candidate profiles using solid mathematical parsing. Say goodbye to random matches and black-box algorithms.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {['No arbitrary weights', 'Zero database-stored resume files', 'Secure HTTP-only token cookies', 'No external AI key required'].map((text) => (
              <span key={text} className="bg-slate-50 dark:bg-zinc-850/50 border border-slate-200/60 dark:border-zinc-800 text-slate-650 dark:text-zinc-400 font-bold px-3 py-2 rounded-full">
                &bull; {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 relative z-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-2xl shadow-primary/20">
          <div className="absolute top-[-50%] right-[-20%] w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-50%] left-[-20%] w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Ready to find your perfect job match?
            </h2>
            <p className="text-primary-100 text-sm sm:text-base leading-relaxed">
              Create your profile, parse your resume skills, and explore matches in your local community today.
            </p>
            <button
              onClick={handleGetStartedClick}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4.5 rounded-2xl text-base hover:bg-slate-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              <span>{isAuthenticated ? 'Go to Dashboard Console' : 'Get Started for Free'}</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-200/50 dark:border-zinc-900/60 bg-background-50 dark:bg-background">
        {/* Gradient Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="mb-4">
                <FullLogo showText={true} />
              </div>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6 max-w-xs">
                AI-powered hyperlocal job discovery platform. Find your perfect career match within your community.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:bg-primary hover:text-white transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:bg-primary hover:text-white transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:bg-primary hover:text-white transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link to="/search" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Job Search</Link></li>
                <li><Link to="/resume" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Resume Parser</Link></li>
                <li><Link to="/chat" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">AI Coach</Link></li>
                <li><Link to="/recommendations" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Recommendations</Link></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">API Reference</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Career Tips</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">About Us</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-8 mb-8">
            <div className="max-w-md mx-auto text-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Subscribe to our newsletter</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4">Get the latest job tips and career advice delivered to your inbox.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-primary dark:focus:border-primary-400 transition-colors"
                />
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary via-secondary to-accent text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              © 2024 NearHire.AI. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-slate-500 dark:text-zinc-500 hover:text-primary dark:hover:text-primary-400 transition-colors">Privacy</a>
              <a href="#" className="text-xs text-slate-500 dark:text-zinc-500 hover:text-primary dark:hover:text-primary-400 transition-colors">Terms</a>
              <a href="#" className="text-xs text-slate-500 dark:text-zinc-500 hover:text-primary dark:hover:text-primary-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
