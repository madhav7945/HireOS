import { supabase } from '../lib/supabase'

export const activityService = {
  async getActivity(limit = 50) {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        profiles ( full_name, avatar_url )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  async logActivity(entityType, entityId, action, details = {}) {
    const { data, error } = await supabase
      .from('activity_log')
      .insert([{
        entity_type: entityType,
        entity_id: entityId,
        action,
        details,
        user_id: (await supabase.auth.getUser()).data?.user?.id,
        company_id: details.company_id || null,
      }])
      .select()
    
    if (error) {
      console.warn('Failed to log activity:', error)
      return null
    }
    return data?.[0]
  },
}
