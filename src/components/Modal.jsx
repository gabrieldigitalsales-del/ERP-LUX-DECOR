import React,{useEffect,useRef}from'react';
import{createPortal}from'react-dom';
import{X}from'lucide-react';

export default function Modal({title,subtitle,children,onClose,wide=false,size,preventBackdropClose=false,footer}){
  const dialogRef=useRef(null);
  const onCloseRef=useRef(onClose);
  const preventBackdropCloseRef=useRef(preventBackdropClose);

  // Keep the latest callbacks/options without re-running the modal lifecycle
  // on every parent render. This is critical for controlled inputs inside modals.
  useEffect(()=>{onCloseRef.current=onClose;},[onClose]);
  useEffect(()=>{preventBackdropCloseRef.current=preventBackdropClose;},[preventBackdropClose]);

  useEffect(()=>{
    const prevOverflow=document.body.style.overflow;
    const prevPadding=document.body.style.paddingRight;
    const scrollbar=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
    document.body.style.overflow='hidden';
    if(scrollbar) document.body.style.paddingRight=`${scrollbar}px`;

    const dialog=dialogRef.current;
    const previouslyFocused=document.activeElement;
    const focusable=()=>Array.from(dialog?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')||[]);

    // Focus only once when the modal opens. Never steal focus again while typing.
    const focusTimer=setTimeout(()=>{
      if(!dialog)return;
      if(dialog.contains(document.activeElement))return;
      const explicit=dialog.querySelector('[autofocus]');
      const target=explicit||focusable()[0];
      target?.focus?.({preventScroll:true});
    },0);

    const onKeyDown=e=>{
      if(e.key==='Escape'&&!preventBackdropCloseRef.current){
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if(e.key!=='Tab'||!dialog)return;
      const items=focusable();
      if(!items.length){e.preventDefault();return;}
      const firstItem=items[0],lastItem=items[items.length-1];
      if(e.shiftKey&&document.activeElement===firstItem){e.preventDefault();lastItem.focus();}
      else if(!e.shiftKey&&document.activeElement===lastItem){e.preventDefault();firstItem.focus();}
    };

    document.addEventListener('keydown',onKeyDown);
    return()=>{
      clearTimeout(focusTimer);
      document.removeEventListener('keydown',onKeyDown);
      document.body.style.overflow=prevOverflow;
      document.body.style.paddingRight=prevPadding;
      if(previouslyFocused?.isConnected) previouslyFocused?.focus?.({preventScroll:true});
    };
  },[]);

  const closeBackdrop=e=>{
    if(e.target===e.currentTarget&&!preventBackdropCloseRef.current)onCloseRef.current?.();
  };

  const node=<div className="modal-backdrop modal-centered-backdrop" onMouseDown={closeBackdrop}>
    <div ref={dialogRef} className={`modal modal-centered ${wide?'wide':''} ${size?`modal-${size}`:''}`} onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="erp-modal-title">
      <div className="modal-head">
        <div><h3 id="erp-modal-title">{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>
        {onClose&&<button className="modal-close" type="button" onClick={()=>onCloseRef.current?.()} aria-label="Fechar"><X size={19}/></button>}
      </div>
      <div className="modal-body">{children}</div>
      {footer&&<div className="modal-footer">{footer}</div>}
    </div>
  </div>;
  return createPortal(node,document.body);
}
