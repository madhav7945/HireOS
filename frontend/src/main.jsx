import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1E1E42',
              color: '#F0F0FF',
              border: '1px solid rgba(108, 92, 231, 0.2)',
              borderRadius: '10px',
              fontSize: '0.85rem',
            },
            success: {
              iconTheme: { primary: '#00B894', secondary: '#F0F0FF' },
            },
            error: {
              iconTheme: { primary: '#FF6B6B', secondary: '#F0F0FF' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
