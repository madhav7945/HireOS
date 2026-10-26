import { create } from 'zustand'

// Zoe chat state — open/closed, message thread, and busy flag.
const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi, I'm Zoe — your HireOS operator. Ask me to post a job, move a candidate, schedule an interview, set a reminder, or just \"take me to the pipeline\". What can I do for you?",
}

export const useAssistantStore = create((set, get) => ({
  open: false,
  busy: false,
  messages: [WELCOME],

  toggle: () => set((s) => ({ open: !s.open })),
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),

  setBusy: (busy) => set({ busy }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...msg }] })),

  // Attach tool-run badges to the most recent assistant message.
  setLastToolRuns: (toolRuns) =>
    set((s) => {
      const msgs = [...s.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], toolRuns }
          break
        }
      }
      return { messages: msgs }
    }),

  // History for the agent: just role/content pairs, minus the welcome bubble.
  getHistory: () =>
    get()
      .messages.filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content })),

  reset: () => set({ messages: [WELCOME], busy: false }),
}))
