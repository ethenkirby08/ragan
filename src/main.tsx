import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted brand fonts: no third-party request, no layout shift
// waiting on a CDN, and the site still renders if the network is poor.
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/inter';

import './styles/global.css';
import App from './App';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
