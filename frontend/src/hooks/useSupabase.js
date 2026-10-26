import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { fetchApi } from '../api/client'

// The whole app reads/writes through ONE unified data layer.
// Hooks that have real backend API endpoints use fetchApi.
// Hooks that don't (like Calendar, Tasks) fall back to localDataService for the hackathon demo.

const invalidate = (queryClient, key) => () => queryClient.invalidateQueries({ queryKey: [key] })

// ============================================================
// COMPANY
// ============================================================
export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const res = await fetchApi('/company');
      return res.data;
    }
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetchApi('/company', { method: 'POST', body: JSON.stringify(data) });
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'company')
  });
}

// ============================================================
// JOBS
// ============================================================
export function useJobs() {
  return useQuery({ 
    queryKey: ['jobs'], 
    queryFn: async () => {
      const res = await fetchApi('/jobs');
      return res.data;
    }
  })
}

export function useJob(id) {
  return useQuery({ 
    queryKey: ['jobs', id], 
    queryFn: async () => {
      const res = await fetchApi(`/jobs/${id}`);
      return res.data;
    },
    enabled: !!id 
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jobData) => {
      const res = await fetchApi('/jobs', { method: 'POST', body: JSON.stringify(jobData) });
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'jobs'),
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetchApi(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'jobs'),
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetchApi(`/jobs/${id}`, { method: 'DELETE' });
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'jobs'),
  })
}

// ============================================================
// CANDIDATES
// ============================================================
export function useCandidates() {
  return useQuery({ 
    queryKey: ['candidates'], 
    queryFn: async () => {
      const res = await fetchApi('/candidates');
      return res.data;
    }
  })
}

export function useCandidate(id) {
  return useQuery({ 
    queryKey: ['candidates', id], 
    queryFn: async () => {
      const res = await fetchApi(`/candidates/${id}`);
      return res.data;
    },
    enabled: !!id 
  })
}

export function useCreateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetchApi('/candidates', { method: 'POST', body: JSON.stringify(data) });
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'candidates'),
  })
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      // In a real app we'd have a PUT /candidates/:id endpoint.
      // If we don't have it, we fallback to local mock just to prevent crashes in UI.
      // For now, let's pretend we have it, or implement it if missing.
      const res = await fetchApi(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).catch(() => null);
      if(!res) {
          return localDataService.update('candidates', id, updates);
      }
      return res.data;
    },
    onSuccess: invalidate(queryClient, 'candidates'),
  })
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => localDataService.remove('candidates', id),
    onSuccess: invalidate(queryClient, 'candidates'),
  })
}

// ============================================================
// INTERVIEWS
// ============================================================
export function useInterviews() {
  return useQuery({ 
    queryKey: ['interviews'], 
    queryFn: () => localDataService.list('interviews') 
  })
}

export function useInterview(id) {
  return useQuery({ queryKey: ['interviews', id], queryFn: () => localDataService.get('interviews', id), enabled: !!id })
}

export function useInterviewBySession(sessionId) {
  return useQuery({
    queryKey: ['interviews', 'session', sessionId],
    queryFn: async () => {
      const res = await fetchApi(`/interviews/session/${sessionId}`);
      return res.data;
    },
    enabled: !!sessionId,
  })
}

export function useScheduleInterview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
        const res = await fetchApi('/interviews/schedule', { method: 'POST', body: JSON.stringify(data) });
        return res.data;
    },
    onSuccess: invalidate(queryClient, 'interviews'),
  })
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, extraFields }) => localDataService.update('interviews', id, { status, ...extraFields }),
    onSuccess: invalidate(queryClient, 'interviews'),
  })
}

export function useUpdateInterviewScores() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scores }) => localDataService.update('interviews', id, {
      score: scores.overall,
      scores,
      overall_score: scores.overall,
      code_quality_score: scores.codeQuality,
      communication_score: scores.communication,
      problem_solving_score: scores.problemSolving,
      confidence_score: scores.confidence,
    }),
    onSuccess: invalidate(queryClient, 'interviews'),
  })
}

export function useInterviewMessages(interviewId) {
  return useQuery({
    queryKey: ['interview-messages', interviewId],
    queryFn: () => fetchApi(`/interview-messages/${interviewId}`),
    enabled: !!interviewId,
  })
}

export function useSendInterviewMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ interviewId, sender, content }) =>
      fetchApi(`/interview-messages/${interviewId}`, { method: 'POST', body: JSON.stringify({ sender, content }) }),
    onSuccess: (_, { interviewId }) => queryClient.invalidateQueries({ queryKey: ['interview-messages', interviewId] }),
  })
}

// ============================================================
// APPLICATIONS
// ============================================================
export function useApplications() {
  return useQuery({ 
    queryKey: ['applications'], 
    queryFn: async () => {
      const res = await fetchApi('/candidates');
      return Array.isArray(res) ? res : (res?.data || []);
    }
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetchApi('/candidates', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: invalidate(queryClient, 'applications'),
  })
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, stage }) => fetchApi(`/candidates/${id}`, { method: 'PATCH', body: JSON.stringify({ status, stage }) }),
    onSuccess: invalidate(queryClient, 'applications'),
  })
}

// ============================================================
// OFFERS
// ============================================================
export function useOffers() {
  return useQuery({ queryKey: ['offers'], queryFn: () => localDataService.list('offers') })
}

export function useCreateOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
        const res = await fetchApi('/offers/generate', { method: 'POST', body: JSON.stringify(data) });
        return res.offer;
    },
    onSuccess: invalidate(queryClient, 'offers'),
  })
}

export function useUpdateOffer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => localDataService.update('offers', id, updates),
    onSuccess: invalidate(queryClient, 'offers'),
  })
}

// ============================================================
// DEPARTMENTS & CALENDAR & TASKS & ACTIVITY
// ============================================================
export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: () => fetchApi('/departments') })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetchApi('/departments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: invalidate(queryClient, 'departments'),
  })
}

export function useCalendarEvents() {
  return useQuery({ queryKey: ['calendar-events'], queryFn: () => fetchApi('/calendar') })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetchApi('/calendar', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: invalidate(queryClient, 'calendar-events'),
  })
}

export function useActivity(limit = 50) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: async () => {
      const res = await fetchApi(`/activity?limit=${limit}`);
      return Array.isArray(res) ? res : (res?.data || []);
    },
  })
}

export function useLogActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetchApi('/activity', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: invalidate(queryClient, 'activity'),
  })
}

export function useTasks(includeDone = true) {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetchApi('/tasks');
      const all = Array.isArray(res) ? res : (res?.data || []);
      return includeDone ? all : all.filter((t) => !t.done);
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => fetchApi('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: invalidate(queryClient, 'tasks'),
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }) => fetchApi(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
    onSuccess: invalidate(queryClient, 'tasks'),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => fetchApi(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: invalidate(queryClient, 'tasks'),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => fetchApi(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate(queryClient, 'tasks'),
  })
}
