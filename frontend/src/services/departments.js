import { supabase } from '../lib/supabase'

export const departmentsService = {
  async getDepartments() {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createDepartment(deptData) {
    const { data, error } = await supabase
      .from('departments')
      .insert([deptData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateDepartment(id, updates) {
    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteDepartment(id) {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
