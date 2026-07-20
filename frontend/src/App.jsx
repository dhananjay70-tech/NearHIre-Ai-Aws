import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import FloatingChatbot from './components/FloatingChatbot.jsx';
import { ROLES } from './utils/roles.js';

// Pages — existing
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RegisterPage from './pages/RegisterPage';
import SearchJobsPage from './pages/SearchJobsPage';
import JobDetailsPage from './pages/JobDetailsPage';
import ResumePage from './pages/ResumePage';
import RecommendationsPage from './pages/RecommendationsPage';
import SavedJobsPage from './pages/SavedJobsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import CareerChatPage from './pages/CareerChatPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Pages — AI tools
import ResumeRewriterPage from './pages/ResumeRewriterPage';
import SkillGapPage from './pages/SkillGapPage';
import LearningRoadmapPage from './pages/LearningRoadmapPage';

// Pages — recruiter & admin
import RecruiterRegisterPage from './pages/RecruiterRegisterPage';
import RecruiterDashboardPage from './pages/RecruiterDashboardPage';
import RecruiterPostJobPage from './pages/RecruiterPostJobPage';
import RecruiterApplicantsPage from './pages/RecruiterApplicantsPage';
import RecruiterManageJobsPage from './pages/RecruiterManageJobsPage';
import RecruiterCompanyPage from './pages/RecruiterCompanyPage';
import RecruiterAnalyticsPage from './pages/RecruiterAnalyticsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import AccountCreatedPage from './pages/AccountCreatedPage';

// Seeker-only areas (dashboard, applications, saved jobs, resume + AI tools).
const seekerOnly = (element) => (
  <RoleRoute allow={[ROLES.SEEKER]}>{element}</RoleRoute>
);

const recruiterOnly = (element) => (
  <RoleRoute allow={[ROLES.RECRUITER]}>{element}</RoleRoute>
);

const adminOnly = (element) => (
  <RoleRoute allow={[ROLES.ADMIN]}>{element}</RoleRoute>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* ─── Public routes ─────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account-created" element={<AccountCreatedPage />} />
          <Route path="/register-success" element={<AccountCreatedPage />} />
          <Route path="/recruiter/register" element={<RecruiterRegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ─── Any signed-in user ────────────────────────── */}
          <Route path="/search" element={<ProtectedRoute><SearchJobsPage /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><CareerChatPage /></ProtectedRoute>} />

          {/* ─── Job seeker only ───────────────────────────── */}
          <Route path="/dashboard" element={seekerOnly(<DashboardPage />)} />
          <Route path="/applications" element={seekerOnly(<ApplicationsPage />)} />
          <Route path="/saved-jobs" element={seekerOnly(<SavedJobsPage />)} />
          <Route path="/saved" element={seekerOnly(<SavedJobsPage />)} />
          <Route path="/resume" element={seekerOnly(<ResumePage />)} />
          <Route path="/resume-rewriter" element={seekerOnly(<ResumeRewriterPage />)} />
          <Route path="/recommendations" element={seekerOnly(<RecommendationsPage />)} />
          <Route path="/skill-gap" element={seekerOnly(<SkillGapPage />)} />
          <Route path="/roadmap" element={seekerOnly(<LearningRoadmapPage />)} />

          {/* ─── Recruiter only ────────────────────────────── */}
          <Route path="/recruiter/dashboard" element={recruiterOnly(<RecruiterDashboardPage />)} />
          <Route path="/recruiter/jobs" element={recruiterOnly(<RecruiterManageJobsPage />)} />
          <Route path="/recruiter/post-job" element={recruiterOnly(<RecruiterPostJobPage />)} />
          <Route path="/recruiter/jobs/:id/edit" element={recruiterOnly(<RecruiterPostJobPage />)} />
          <Route path="/recruiter/applicants" element={recruiterOnly(<RecruiterApplicantsPage />)} />
          <Route path="/recruiter/company" element={recruiterOnly(<RecruiterCompanyPage />)} />
          <Route path="/recruiter/analytics" element={recruiterOnly(<RecruiterAnalyticsPage />)} />

          {/* ─── Admin only ────────────────────────────────── */}
          <Route path="/admin" element={adminOnly(<AdminDashboardPage />)} />
          <Route path="/admin/dashboard" element={adminOnly(<AdminDashboardPage />)} />
          <Route path="/admin/users" element={adminOnly(<AdminDashboardPage />)} />
          <Route path="/admin/jobs" element={adminOnly(<AdminDashboardPage />)} />
          <Route path="/admin/reports" element={adminOnly(<AdminDashboardPage />)} />
        </Routes>

        {/* ─── Floating AI Chatbot (visible on every page) ── */}
        <FloatingChatbot />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
