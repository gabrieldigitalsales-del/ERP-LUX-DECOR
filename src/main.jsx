import React from 'react';
import{createRoot}from'react-dom/client';
import App from'./App';
import ErrorBoundary from'./components/ErrorBoundary';
import'./styles.css';
import{initPwaInstall,registerPwaServiceWorker}from'./utils/pwaInstall';
initPwaInstall();
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);

if('serviceWorker'in navigator){window.addEventListener('load',()=>registerPwaServiceWorker().catch(()=>{}))}
