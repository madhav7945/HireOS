import { supabase } from '../lib/supabase'

export const calendarService = {
  async getEvents() {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        interviews ( id, session_id, status, candidates ( full_name ) )
      `)
      .order('start_time', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getEventsByRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createEvent(eventData) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteEvent(id) {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
