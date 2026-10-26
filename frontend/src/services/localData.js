import { fetchApi } from '../api/client'

// ============================================================
// Phase 6: 100% Cloud Migration
// localDataService has been rewritten to act as a pure proxy to the 
// real backend API (fetchApi). This completely severs ties with localStorage.
// ============================================================

export const localDataService = {
  async list(collection) {
    if (collection.startsWith('interviewMessages:')) {
      const id = collection.split(':')[1];
      return fetchApi(`/interview-messages/${id}`);
    }
    
    // Fallbacks for standard collections
    const endpoint = collection === 'candidates' ? '/candidates' 
                   : collection === 'applications' ? '/candidates' 
                   : collection === 'jobs' ? '/jobs' 
                   : collection === 'interviews' ? '/interviews' 
                   : collection === 'offers' ? '/offers' 
                   : collection === 'departments' ? '/departments' 
                   : collection === 'activity' ? '/activity' 
                   : collection === 'tasks' ? '/tasks' 
                   : collection === 'calendarEvents' ? '/calendar' 
                   : `/${collection}`;
                   
    const res = await fetchApi(endpoint);
    return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.data || res || []));
  },

  async get(collection, id, key = 'id') {
    const endpoint = collection === 'candidates' ? '/candidates' 
                   : collection === 'jobs' ? '/jobs' 
                   : collection === 'interviews' ? '/interviews' 
                   : `/${collection}`;
                   
    // If it's asking by session_id, we just get by id, since backend supports it
    const res = await fetchApi(`${endpoint}/${id}`);
    return res?.data !== undefined ? res.data : res;
  },

  async create(collection, data) {
    if (collection.startsWith('interviewMessages:')) {
      const id = collection.split(':')[1];
      return fetchApi(`/interview-messages/${id}`, { method: 'POST', body: JSON.stringify(data) });
    }
    
    let endpoint = `/${collection}`;
    if (collection === 'applications' || collection === 'candidates') endpoint = '/candidates';
    if (collection === 'calendarEvents') endpoint = '/calendar';
    
    return fetchApi(endpoint, { method: 'POST', body: JSON.stringify(data) });
  },

  async update(collection, id, updates) {
    let endpoint = `/${collection}`;
    if (collection === 'applications' || collection === 'candidates') endpoint = '/candidates';
    
    return fetchApi(`${endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async remove(collection, id) {
    let endpoint = `/${collection}`;
    if (collection === 'applications' || collection === 'candidates') endpoint = '/candidates';
    
    return fetchApi(`${endpoint}/${id}`, { method: 'DELETE' });
  },

  reset() {
    // No-op for cloud
  },
}
