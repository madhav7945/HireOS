import { supabase } from '../lib/supabase'

export const offersService = {
  async getOffers() {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        candidates ( id, full_name, email, avatar_url ),
        jobs ( id, title )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createOffer(offerData) {
    const { data, error } = await supabase
      .from('offers')
      .insert([offerData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateOffer(id, updates) {
    const { data, error } = await supabase
      .from('offers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async sendOffer(id) {
    return this.updateOffer(id, { status: 'sent', sent_at: new Date().toISOString() })
  },

  async deleteOffer(id) {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
