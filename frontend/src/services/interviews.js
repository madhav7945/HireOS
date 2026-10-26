import { supabase } from '../lib/supabase'

export const interviewsService = {
  async getInterviews() {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        candidates ( id, full_name, email, avatar_url, current_title ),
        jobs ( id, title, department_id )
      `)
      .order('scheduled_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getInterviewById(id) {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        candidates ( * ),
        jobs ( * )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async getInterviewBySessionId(sessionId) {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        candidates ( * ),
        jobs ( * )
      `)
      .eq('session_id', sessionId)
      .single()
    
    if (error) throw error
    return data
  },

  async scheduleInterview(interviewData) {
    // Generate a unique session ID for the interview link
    const sessionId = `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const interviewLink = `${window.location.origin}/interview/${sessionId}`
    
    const { data, error } = await supabase
      .from('interviews')
      .insert([{
        ...interviewData,
        session_id: sessionId,
        interview_link: interviewLink,
        status: 'scheduled',
      }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateInterviewStatus(id, status, extraFields = {}) {
    const updates = { status, updated_at: new Date().toISOString(), ...extraFields }
    
    // Auto-set timestamps
    if (status === 'live') updates.started_at = new Date().toISOString()
    if (status === 'complete') updates.ended_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateInterviewScores(id, scores) {
    const { data, error } = await supabase
      .from('interviews')
      .update({
        overall_score: scores.overall,
        code_quality_score: scores.codeQuality,
        communication_score: scores.communication,
        problem_solving_score: scores.problemSolving,
        confidence_score: scores.confidence,
        ai_summary: scores.summary || null,
        ai_recommendation: scores.recommendation || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async saveProctoring(id, proctoringData) {
    const { data, error } = await supabase
      .from('interviews')
      .update({
        proctoring_data: proctoringData,
        tab_switch_count: proctoringData.tabSwitchCount || 0,
        face_detected: proctoringData.faceDetected ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteInterview(id) {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ---- Interview Messages ----
  async getMessages(interviewId) {
    const { data, error } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('interview_id', interviewId)
      .order('timestamp', { ascending: true })
    
    if (error) throw error
    return data
  },

  async sendMessage(interviewId, sender, content) {
    const { data, error } = await supabase
      .from('interview_messages')
      .insert([{ interview_id: interviewId, sender, content }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // ---- Realtime subscription ----
  subscribeToInterview(sessionId, callback) {
    return supabase
      .channel(`interview-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interviews',
        filter: `session_id=eq.${sessionId}`,
      }, callback)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'interview_messages',
      }, callback)
      .subscribe()
  },

  unsubscribeFromInterview(sessionId) {
    supabase.removeChannel(supabase.channel(`interview-${sessionId}`))
  },
}
