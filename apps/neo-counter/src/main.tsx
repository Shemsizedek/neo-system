import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import NeoMaskPanel from './neomask/NeoMaskPanel';
import GitHubRuntimeBanner from './platform/GitHubRuntimeBanner';
import './styles.css';
import './merchant/merchant.css';
import './auth/auth.css';
import './platform/platform.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // PWA support is additive; the POS must still boot if registration is unavailable.
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GitHubRuntimeBanner />
    <App />
    <NeoMaskPanel />
  </React.StrictMode>,
);
