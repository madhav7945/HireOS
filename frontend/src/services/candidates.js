import { supabase } from '../lib/supabase'

export const candidatesService = {
  async getCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getCandidateById(id) {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async createCandidate(candidateData) {
    const { data, error } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateCandidate(id, updates) {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  }
}
