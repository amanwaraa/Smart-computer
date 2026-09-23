import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js?v=7.9.4.44-purchase-shipping';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('ROOT_NOT_FOUND');

// Direct boot: the old reload/recovery screen was removed completely.
// Avoid StrictMode double-mount side effects in POS/database startup flows.
createRoot(rootElement).render(React.createElement(App));
