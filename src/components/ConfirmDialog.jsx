import React from'react';import{AlertTriangle,CheckCircle2,XCircle}from'lucide-react';import Modal from'./Modal';
export default function ConfirmDialog({open,title='Confirmar ação',message,details=[],tone='default',confirmLabel='Confirmar',cancelLabel='Cancelar',onConfirm,onCancel}){
 if(!open)return null;const Icon=tone==='danger'?XCircle:tone==='warning'?AlertTriangle:CheckCircle2;
 return <Modal title={title} onClose={onCancel} preventBackdropClose><div className={`confirm-dialog ${tone}`}><div className="confirm-icon"><Icon size={22}/></div><p>{message}</p>{details?.length>0&&<div className="confirm-details">{details.map((x,i)=><span key={i}>{x}</span>)}</div>}<div className="modal-actions"><button className="secondary" onClick={onCancel}>{cancelLabel}</button><button className={tone==='danger'?'danger-btn':'primary'} onClick={onConfirm}>{confirmLabel}</button></div></div></Modal>
}
