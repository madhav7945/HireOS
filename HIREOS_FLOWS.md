# HireOS Master Architecture & Complete System Workflows

The complete, authoritative guide to all frontend & backend workflows, data models, AI screening logic, PDF parsing pipelines, and interview engines in **HireOS** is located at:

📄 **[docs/HIREOS_MASTER_ARCHITECTURE_AND_FLOWS.md](file:///e:/HireOS/docs/HIREOS_MASTER_ARCHITECTURE_AND_FLOWS.md)**

---

## ⚡ Quick Navigation to Subsystems

| Subsystem | Key Modules |
| :--- | :--- |
| **1. Job Requisition & Screening Configuration** | [`CreateJobPage.jsx`](file:///e:/HireOS/src/pages/CreateJobPage.jsx), [`StepScreening.jsx`](file:///e:/HireOS/src/components/job-wizard/StepScreening.jsx), [`ai.js`](file:///e:/HireOS/src/services/ai.js) |
| **2. Candidate Portal & In-Browser PDF Scraper** | [`PublicApplyPage.jsx`](file:///e:/HireOS/src/pages/PublicApplyPage.jsx), [`resumeParser.js`](file:///e:/HireOS/src/services/resumeParser.js) |
| **3. 4-Step Shortlisting & Top-N Ranking Engine** | [`shortlist.js`](file:///e:/HireOS/src/services/shortlist.js), [`ai.js`](file:///e:/HireOS/src/services/ai.js), [`AIShortlistPage.jsx`](file:///e:/HireOS/src/pages/AIShortlistPage.jsx) |
| **4. Hiring Autopilot & Pipeline Orchestration** | [`pipeline.js`](file:///e:/HireOS/src/services/pipeline.js), [`email.js`](file:///e:/HireOS/src/services/email.js) |
| **5. Live AI Voice & Code Interview Room** | [`CandidateInterview.jsx`](file:///e:/HireOS/src/pages/CandidateInterview.jsx), [`HRObserver.jsx`](file:///e:/HireOS/src/pages/HRObserver.jsx), [`interviewAI.js`](file:///e:/HireOS/src/services/interviewAI.js) |
| **6. Unified Data Storage Architecture** | [`localData.js`](file:///e:/HireOS/src/services/localData.js), [`useSupabase.js`](file:///e:/HireOS/src/hooks/useSupabase.js) |
