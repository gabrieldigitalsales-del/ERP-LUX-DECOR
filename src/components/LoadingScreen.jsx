import React from 'react';
import logo from '../assets/lux-logo.png';

export default function LoadingScreen({persist=false}){
  return <div className={`app-loading${persist?' app-loading-persist':''}`} aria-label="Carregando Lux Decor">
    <div className="app-loading-inner">
      <img src={logo} alt="Lux Decor" className="app-loading-logo"/>
      <div className="app-loading-bar" aria-hidden="true"><span/></div>
      <small>GESTÃO EMPRESARIAL</small>
    </div>
  </div>
}
