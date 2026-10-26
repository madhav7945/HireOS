import { supabase } from '../lib/supabase'

export const applicationsService = {
  async getApplications() {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        candidates ( id, full_name, email, avatar_url, current_title, skills ),
        jobs ( id, title, location, type )
      `)
      .order('applied_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getApplicationsByJob(jobId) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        candidates ( * )
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createApplication(applicationData) {
    const { data, error } = await supabase
      .from('applications')
      .insert([applicationData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateApplicationStatus(id, status, stage) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (stage) updates.stage = stage
    
    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteApplication(id) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
