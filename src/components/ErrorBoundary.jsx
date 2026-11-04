import React from 'react';
import nexorLogo from '../assets/nexor-logo.png';

export default class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return{error}}
  componentDidCatch(error,info){console.error('LUX DECOR ERP error',error,info)}
  reset=()=>{try{sessionStorage.removeItem('luxdecor-last-error')}catch{};location.reload()}
  render(){if(!this.state.error)return this.props.children;return <div className="error-screen"><img src={nexorLogo} alt="NEXOR"/><h1>O sistema encontrou um erro.</h1><p>Seus dados locais não foram apagados. Recarregue a aplicação e continue o teste.</p><pre>{String(this.state.error?.message||this.state.error)}</pre><button onClick={this.reset}>Recarregar sistema</button></div>}
}
