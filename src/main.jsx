import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App.jsx'; // ✅ Ajout de .jsx
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster /> {/* ✅ Ajout du Toaster pour les notifications */}
    </BrowserRouter>
  </React.StrictMode>
);