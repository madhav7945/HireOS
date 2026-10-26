export type CandidateStage = 
  | 'APPLIED' 
  | 'KNOCKED_OUT' 
  | 'SHORTLISTED' 
  | 'AI_INTERVIEW_SENT' 
  | 'AI_INTERVIEW_COMPLETED' 
  | 'HR_REVIEW' 
  | 'HR_INTERVIEW_SCHEDULED' 
  | 'OFFER_SENT' 
  | 'OFFER_ACCEPTED' 
  | 'HIRED' 
  | 'REJECTED';

export interface FiveDimensionScores {
  technical: number;
  experience: number;
  screening: number;
  education: number;
  communication: number;
}

export interface ScoringWeights {
  weightTechnical: number;
  weightExperience: number;
  weightScreening: number;
  weightEducation: number;
  weightCommunication: number;
}

export interface KnockoutRules {
  minExperienceYears: number;
  requireWorkAuth: boolean;
  disqualifyingQuestions?: Array<{
    question: string;
    requiredAnswer: string;
  }>;
}
