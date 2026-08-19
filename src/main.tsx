import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global handler to catch benign Firebase Auth internal assertion errors
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    (event.reason.message?.includes('INTERNAL ASSERTION FAILED') ||
     event.reason.message?.includes('Pending promise was never set'))
  ) {
    event.preventDefault();
    console.warn('Suppressed Firebase Auth internal assertion error:', event.reason);
  }
});

window.addEventListener('error', (event) => {
  if (
    event.message?.includes('INTERNAL ASSERTION FAILED') ||
    event.message?.includes('Pending promise was never set')
  ) {
    event.preventDefault();
    console.warn('Suppressed Firebase Auth global error:', event.message);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

