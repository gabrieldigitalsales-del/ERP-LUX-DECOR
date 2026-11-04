import React from 'react';
import{createRoot}from'react-dom/client';
import CloudGate from'./CloudGate';
import ErrorBoundary from'./components/ErrorBoundary';
import'./styles.css';
import{initPwaInstall,registerPwaServiceWorker}from'./utils/pwaInstall';
initPwaInstall();
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><CloudGate/></ErrorBoundary></React.StrictMode>);

if('serviceWorker'in navigator){window.addEventListener('load',()=>registerPwaServiceWorker().catch(()=>{}))}
