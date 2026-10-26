// Phase 2 — Job Board & AI Shortlisting Mock Data
//
// NOTE: the board list itself now lives in ONE place — src/utils/jobShare.js
// (BOARD_REGISTRY). Every board there is real (free, no API) and feeds both the
// Distribute panel and these board screens. We re-export it here so existing
// importers (StepPublishing, StepReview, JobBoardsPage) keep working unchanged,
// and there are no longer two divergent / fake board lists.
export { JOB_BOARDS, BOARD_POST_STATUSES } from '../utils/jobShare'

// Mock board postings per job (demo analytics for the seeded demo jobs only).
export const MOCK_JOB_BOARD_POSTINGS = {
  'job-001': [
    { boardId: 'linkedin', status: 'live', postedAt: '2025-05-22', views: 12480, clicks: 892, applications: 68, expiresAt: '2025-06-22' },
    { boardId: 'indeed', status: 'live', postedAt: '2025-05-22', views: 8340, clicks: 534, applications: 42, expiresAt: '2025-06-22' },
    { boardId: 'naukri', status: 'live', postedAt: '2025-05-23', views: 6120, clicks: 445, applications: 32, expiresAt: '2025-06-23' },
    { boardId: 'google_jobs', status: 'live', postedAt: '2025-05-22', views: 3200, clicks: 210, applications: 0, expiresAt: null },
  ],
  'job-002': [
    { boardId: 'linkedin', status: 'live', postedAt: '2025-05-15', views: 9200, clicks: 640, applications: 45, expiresAt: '2025-06-15' },
    { boardId: 'naukri', status: 'live', postedAt: '2025-05-16', views: 4500, clicks: 312, applications: 28, expiresAt: '2025-06-16' },
    { boardId: 'glassdoor', status: 'scheduled', postedAt: null, views: 0, clicks: 0, applications: 0, expiresAt: null },
  ],
}

// AI Shortlisting Data
export const AI_SCORING_DIMENSIONS = [
  { key: 'skills_match', label: 'Skills Match', weight: 30, description: 'Technical skills alignment with job requirements' },
  { key: 'experience', label: 'Experience Fit', weight: 25, description: 'Years and relevance of experience' },
  { key: 'education', label: 'Education', weight: 15, description: 'Degree, certifications, and academic alignment' },
  { key: 'culture', label: 'Culture Fit', weight: 15, description: 'Values alignment and work style compatibility' },
  { key: 'growth', label: 'Growth Potential', weight: 15, description: 'Career trajectory and learning indicators' },
]

export const AI_SHORTLIST_THRESHOLDS = {
  autoShortlist: 80,
  manualReview: 50,
  autoReject: 30,
}

export const AI_SCORED_CANDIDATES = [
  {
    id: 'cand-001', name: 'Arjun Patel', appliedFor: 'Senior React Developer',
    overallScore: 92, decision: 'shortlisted', overridden: false,
    dimensions: { skills_match: 95, experience: 90, education: 85, culture: 92, growth: 94 },
    reasoning: 'Excellent match across all dimensions. 6 years of React experience at Flipkart with strong TypeScript and GraphQL skills. Demonstrated team leadership.',
    resumeHighlights: ['Built micro-frontend architecture at Flipkart', 'Led team of 8 developers', 'Speaker at ReactConf India 2024'],
    redFlags: [],
  },
  {
    id: 'cand-002', name: 'Priya Sharma', appliedFor: 'Product Designer',
    overallScore: 88, decision: 'shortlisted', overridden: false,
    dimensions: { skills_match: 90, experience: 92, education: 78, culture: 88, growth: 85 },
    reasoning: 'Strong design background with 8 years at Swiggy. Expert in design systems and user research methodology.',
    resumeHighlights: ['Redesigned Swiggy checkout flow — 23% conversion increase', 'Built design system from scratch', 'Published UX case studies'],
    redFlags: [],
  },
  {
    id: 'cand-003', name: 'Rahul Verma', appliedFor: 'Senior React Developer',
    overallScore: 85, decision: 'shortlisted', overridden: false,
    dimensions: { skills_match: 82, experience: 78, education: 88, culture: 90, growth: 92 },
    reasoning: 'Backend-focused but shows strong full-stack potential. Quick learner with good architectural thinking.',
    resumeHighlights: ['Scaled Paytm payment APIs to 100K TPS', 'Microservices architecture design', 'Open source contributor'],
    redFlags: ['Primary experience is backend, not frontend React'],
  },
  {
    id: 'cand-004', name: 'Neha Gupta', appliedFor: 'Data Scientist',
    overallScore: 79, decision: 'review', overridden: false,
    dimensions: { skills_match: 75, experience: 68, education: 90, culture: 82, growth: 88 },
    reasoning: 'Good educational background and analytical skills. Limited hands-on ML model deployment experience.',
    resumeHighlights: ['Amazon BI dashboards for supply chain', 'Masters in Statistics from ISI', 'Published 2 ML papers'],
    redFlags: ['Only 3 years experience vs 5 required', 'No production ML deployment'],
  },
  {
    id: 'cand-005', name: 'Karthik Rao', appliedFor: 'QA Automation Lead',
    overallScore: 71, decision: 'review', overridden: false,
    dimensions: { skills_match: 68, experience: 85, education: 60, culture: 70, growth: 58 },
    reasoning: 'Very experienced (10 years) but skill set is more traditional. Uses Selenium/Java vs required Cypress/Jest stack.',
    resumeHighlights: ['Built QA framework at TCS for 50+ projects', 'Managed 15-person QA team', 'ISO 9001 certified'],
    redFlags: ['No Cypress/Jest experience', 'Technology stack mismatch', 'Career growth appears plateaued'],
  },
  {
    id: 'cand-006', name: 'Ananya Iyer', appliedFor: 'DevOps Engineer',
    overallScore: 82, decision: 'shortlisted', overridden: false,
    dimensions: { skills_match: 88, experience: 78, education: 72, culture: 84, growth: 90 },
    reasoning: 'Strong DevOps skills with modern toolchain. Good hands-on experience with Docker, Kubernetes, and Terraform at Infosys.',
    resumeHighlights: ['Automated CI/CD for 20+ microservices', 'Reduced deployment time by 60%', 'AWS Certified Solutions Architect'],
    redFlags: [],
  },
  {
    id: 'cand-007', name: 'Siddharth Joshi', appliedFor: 'Mobile Developer (React Native)',
    overallScore: 90, decision: 'shortlisted', overridden: false,
    dimensions: { skills_match: 94, experience: 82, education: 85, culture: 92, growth: 95 },
    reasoning: 'Excellent React Native skills with 4 years at Freshworks. Strong TypeScript and Firebase expertise. High growth trajectory.',
    resumeHighlights: ['Built Freshworks mobile SDK', 'App rated 4.8★ on Play Store', 'React Native open source contributor'],
    redFlags: [],
  },
  {
    id: 'cand-008', name: 'Meera Krishnan', appliedFor: 'Senior React Developer',
    overallScore: 45, decision: 'rejected', overridden: false,
    dimensions: { skills_match: 42, experience: 55, education: 50, culture: 38, growth: 35 },
    reasoning: 'Skills are more suited for traditional web development. Limited modern React ecosystem experience. Heavy Angular background.',
    resumeHighlights: ['7 years frontend development', 'Angular enterprise applications'],
    redFlags: ['No TypeScript experience', 'No GraphQL or modern state management', 'Primarily Angular developer', 'Screening answers below threshold'],
  },
  {
    id: 'cand-009', name: 'Vikram Singh', appliedFor: 'Senior React Developer',
    overallScore: 63, decision: 'review', overridden: false,
    dimensions: { skills_match: 70, experience: 58, education: 65, culture: 60, growth: 68 },
    reasoning: 'Decent React fundamentals but limited to small-scale projects. Potential for growth with mentoring.',
    resumeHighlights: ['3 React projects at startup', 'Self-taught developer', 'Active GitHub contributor'],
    redFlags: ['Only 2 years professional experience', 'No enterprise-scale experience'],
  },
  {
    id: 'cand-010', name: 'Deepa Nair', appliedFor: 'Product Designer',
    overallScore: 25, decision: 'rejected', overridden: false,
    dimensions: { skills_match: 20, experience: 30, education: 35, culture: 22, growth: 18 },
    reasoning: 'Resume shows graphic design background, not product design. No UX research or prototyping experience.',
    resumeHighlights: ['Graphic designer for print media', 'Adobe Creative Suite expert'],
    redFlags: ['No Figma or UI/UX experience', 'No digital product design', 'Completely different domain'],
  },
]

export const SCORE_DISTRIBUTION = [
  { range: '0-20', count: 2, label: 'Very Low' },
  { range: '21-40', count: 5, label: 'Low' },
  { range: '41-60', count: 12, label: 'Moderate' },
  { range: '61-80', count: 28, label: 'Good' },
  { range: '81-100', count: 18, label: 'Excellent' },
]

// Enhanced Dashboard Data for Phase 2
export const DASHBOARD_WIDGETS_DATA = {
  // Hiring velocity trend (last 12 weeks)
  hiringVelocity: [
    { week: 'W1', hires: 2, openings: 28, target: 3 },
    { week: 'W2', hires: 1, openings: 29, target: 3 },
    { week: 'W3', hires: 3, openings: 27, target: 3 },
    { week: 'W4', hires: 4, openings: 25, target: 3 },
    { week: 'W5', hires: 2, openings: 26, target: 3 },
    { week: 'W6', hires: 5, openings: 24, target: 3 },
    { week: 'W7', hires: 3, openings: 28, target: 3 },
    { week: 'W8', hires: 2, openings: 30, target: 3 },
    { week: 'W9', hires: 4, openings: 29, target: 3 },
    { week: 'W10', hires: 3, openings: 31, target: 3 },
    { week: 'W11', hires: 6, openings: 28, target: 3 },
    { week: 'W12', hires: 4, openings: 32, target: 3 },
  ],

  // Department wise hiring
  departmentHiring: [
    { dept: 'Engineering', open: 12, filled: 8, target: 15, budget: 4200000 },
    { dept: 'Design', open: 4, filled: 3, target: 5, budget: 1200000 },
    { dept: 'Marketing', open: 3, filled: 1, target: 3, budget: 800000 },
    { dept: 'Data & AI', open: 5, filled: 2, target: 5, budget: 2000000 },
    { dept: 'Sales', open: 6, filled: 4, target: 8, budget: 1500000 },
    { dept: 'HR', open: 2, filled: 1, target: 2, budget: 600000 },
  ],

  // Offer pipeline
  offerPipeline: [
    { id: 1, candidate: 'Rahul Verma', role: 'Backend Engineer', salary: '₹28L', status: 'sent', sentDate: '2025-06-01', deadline: '2025-06-08' },
    { id: 2, candidate: 'Arjun Patel', role: 'Sr. React Dev', salary: '₹32L', status: 'negotiating', sentDate: '2025-05-28', deadline: '2025-06-05' },
    { id: 3, candidate: 'Priya Sharma', role: 'Product Designer', salary: '₹22L', status: 'accepted', sentDate: '2025-05-25', deadline: '2025-06-02' },
  ],

  // Recruiter performance
  recruiterPerf: [
    { name: 'Sarah Chen', hires: 12, openJobs: 5, avgTimeToFill: 11, offerAcceptRate: 82, pipeline: 28 },
    { name: 'Amit Kumar', hires: 8, openJobs: 4, avgTimeToFill: 16, offerAcceptRate: 71, pipeline: 19 },
    { name: 'Riya Desai', hires: 6, openJobs: 3, avgTimeToFill: 14, offerAcceptRate: 78, pipeline: 15 },
  ],

  // Diversity metrics (anonymized aggregate)
  diversityMetrics: {
    genderSplit: [
      { label: 'Male', value: 58, color: '#6C5CE7' },
      { label: 'Female', value: 36, color: '#A29BFE' },
      { label: 'Non-Binary', value: 4, color: '#00D2FF' },
      { label: 'Undisclosed', value: 2, color: '#636E72' },
    ],
    experienceRange: [
      { label: '0-2 yrs', value: 22 },
      { label: '3-5 yrs', value: 35 },
      { label: '6-10 yrs', value: 28 },
      { label: '10+ yrs', value: 15 },
    ],
  },

  // Time to fill by department
  timeToFill: [
    { dept: 'Engineering', days: 18 },
    { dept: 'Design', days: 14 },
    { dept: 'Marketing', days: 10 },
    { dept: 'Data & AI', days: 22 },
    { dept: 'Sales', days: 12 },
    { dept: 'HR', days: 8 },
  ],

  // AI interview completion rates
  aiInterviewStats: {
    total: 156,
    completed: 98,
    inProgress: 22,
    notStarted: 18,
    expired: 12,
    avgDuration: '42 min',
    avgScore: 73,
    topScorer: { name: 'Arjun Patel', score: 96 },
  },

  // Upcoming events / deadlines
  upcomingEvents: [
    { id: 1, type: 'interview', title: 'AI Interview — Neha Gupta', time: 'Today, 3:00 PM', priority: 'high' },
    { id: 2, type: 'offer', title: 'Offer deadline — Rahul Verma', time: 'Tomorrow', priority: 'urgent' },
    { id: 3, type: 'review', title: 'Pipeline review meeting', time: 'Wed, 11:00 AM', priority: 'normal' },
    { id: 4, type: 'posting', title: 'Job posting expires — QA Lead', time: 'Thu', priority: 'warning' },
    { id: 5, type: 'onboarding', title: 'New hire onboarding — Priya S.', time: 'Next Mon', priority: 'normal' },
  ],

  // Application trend (last 30 days)
  applicationTrend: [
    { day: '1', count: 12 }, { day: '2', count: 15 }, { day: '3', count: 8 },
    { day: '4', count: 22 }, { day: '5', count: 28 }, { day: '6', count: 5 },
    { day: '7', count: 3 }, { day: '8', count: 18 }, { day: '9', count: 24 },
    { day: '10', count: 20 }, { day: '11', count: 32 }, { day: '12', count: 28 },
    { day: '13', count: 6 }, { day: '14', count: 4 }, { day: '15', count: 25 },
    { day: '16', count: 30 }, { day: '17', count: 22 }, { day: '18', count: 35 },
    { day: '19', count: 40 }, { day: '20', count: 8 }, { day: '21', count: 5 },
    { day: '22', count: 28 }, { day: '23', count: 32 }, { day: '24', count: 26 },
    { day: '25', count: 38 }, { day: '26', count: 42 }, { day: '27', count: 12 },
    { day: '28', count: 6 }, { day: '29', count: 34 }, { day: '30', count: 29 },
  ],

  // SLA breaches
  slaBreaches: {
    total: 7,
    stages: [
      { stage: 'Screening', count: 2, avgOverdue: '1.5 days' },
      { stage: 'HR Review', count: 3, avgOverdue: '2.8 days' },
      { stage: 'Final Interview', count: 1, avgOverdue: '4 days' },
      { stage: 'Offer', count: 1, avgOverdue: '1 day' },
    ],
  },

  // Source effectiveness
  sourceEffectiveness: [
    { source: 'LinkedIn', applications: 245, shortlisted: 68, hired: 12, costPerHire: 3200, quality: 88 },
    { source: 'Naukri', applications: 180, shortlisted: 42, hired: 8, costPerHire: 2800, quality: 75 },
    { source: 'Indeed', applications: 120, shortlisted: 28, hired: 5, costPerHire: 4100, quality: 70 },
    { source: 'Career Page', applications: 95, shortlisted: 35, hired: 9, costPerHire: 1200, quality: 92 },
    { source: 'Referral', applications: 68, shortlisted: 42, hired: 14, costPerHire: 800, quality: 96 },
    { source: 'Direct', applications: 42, shortlisted: 8, hired: 2, costPerHire: 5500, quality: 62 },
  ],
}
