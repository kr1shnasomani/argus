import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

// Flash-free theme init — runs before React renders
const stored = localStorage.getItem('argus-theme');
if (stored === 'dark') {
  document.documentElement.classList.add('dark');
} else if (!stored) {
  // Default: light mode
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: '13px',
        },
      }}
      richColors
    />
  </StrictMode>,
)

