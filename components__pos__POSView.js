import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from './context__AppContext.js?v=7.9.4.44-purchase-shipping';
import { ProductGrid } from './components__pos__ProductGrid.js?v=7.9.4.44-purchase-shipping';
import { CartPanel } from './components__pos__CartPanel.js?v=7.9.4.44-purchase-shipping';
import { FullCartView } from './components__pos__FullCartView.js?v=7.9.4.44-purchase-shipping';
import { PaymentModal } from './components__pos__PaymentModal.js?v=7.9.4.44-purchase-shipping';
import { CameraScannerModal } from './components__pos__CameraScannerModal.js?v=7.9.4.44-purchase-shipping';
import { HoldInvoicesModal } from './components__pos__HoldInvoicesModal.js?v=7.9.4.44-purchase-shipping';
import { Barcode, Camera, Maximize2 } from 'lucide-react';
const h = React.createElement;

export const POSView = () => {
  const { cart, handleScannedBarcode, setShowCameraModal, holdCurrentInvoice, posCartLayout, setPosCartLayout } = useApp();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);
  const openPaymentModal = useCallback(() => { if (typeof document !== 'undefined') document.activeElement?.blur?.(); requestAnimationFrame(() => setIsPaymentOpen(true)); }, []);
  useEffect(() => {
    let buffer = ''; let lastKeyTime = Date.now();
    const handleKeyDown = e => {
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) openPaymentModal(); return; }
      if (e.key === 'F2') { e.preventDefault(); barcodeInputRef.current?.focus(); return; }
      if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) holdCurrentInvoice(); return; }
      const currentTime = Date.now(); if (currentTime - lastKeyTime > 100) buffer = ''; lastKeyTime = currentTime;
      if (e.key === 'Enter') { if (buffer.length > 2) { const handled = handleScannedBarcode(buffer); if (handled) { e.preventDefault(); buffer=''; return; } } buffer=''; }
      else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, handleScannedBarcode, holdCurrentInvoice, openPaymentModal]);
  const handleManualBarcodeSubmit = e => { e.preventDefault(); if (barcodeInput.trim()) { handleScannedBarcode(barcodeInput.trim()); setBarcodeInput(''); } };

  return h('div', { id:'pos-screen', className:'flex flex-col h-full min-h-0 bg-slate-100 dark:bg-slate-950 overflow-hidden' },
    h('div', { className:'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shadow-xs shrink-0 select-none' },
      h('form', { onSubmit:handleManualBarcodeSubmit, className:'flex-1 max-w-lg flex items-center gap-1.5' },
        h('div', { className:'relative flex-1 min-w-0' }, h(Barcode, { className:'absolute right-2.5 top-2.5 w-4 h-4 text-blue-600 pointer-events-none' }), h('input', { ref:barcodeInputRef, type:'text', inputMode:'numeric', id:'pos-barcode-input', value:barcodeInput, onChange:e=>setBarcodeInput(e.target.value), placeholder:'امسح الباركود أو اكتب الكود ثم Enter [F2]...', className:'w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:bg-white' })),
        h('button', { type:'button', id:'btn-pos-camera', onClick:()=>setShowCameraModal(true), className:'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition', title:'فتح كاميرا الهاتف/الجهاز لمسح الباركود' }, h(Camera, { className:'w-3.5 h-3.5 text-blue-600' }), h('span', { className:'hidden sm:inline' }, 'كاميرا'))
      ),
      h('div', { className:'flex items-center gap-1.5 shrink-0' }, h('button', { onClick:()=>setPosCartLayout('full'), className:'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs bg-blue-600 text-white shadow-blue-600/20', title:'فتح السلة في نافذة عريضة' }, h(Maximize2, { className:'w-3.5 h-3.5' }), h('span', { className:'hidden sm:inline' }, 'السلة العريضة'), h('span', { className:'sm:hidden' }, 'السلة'), h('span', { className:'rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]' }, cart.length))),
      h('div', { className:'hidden xl:flex items-center gap-3 text-[11px] text-slate-400 font-mono' }, h('span', null, '[F9] الدفع السريع'), h('span', null, '[F2] مسح الباركود'), h('span', null, '[F4] تعليق الفاتورة'))
    ),
    h('div', { className:'flex-1 min-h-0 flex overflow-hidden' }, h('div', { className:'flex-1 h-full min-w-0 overflow-hidden flex' }, h(ProductGrid)), h('div', { className:'hidden lg:flex w-[430px] xl:w-[500px] 2xl:w-[540px] shrink-0 h-full overflow-hidden' }, h(CartPanel, { onOpenPayment:openPaymentModal }))),
    posCartLayout === 'full' ? h('div', { id:'full-cart-modal-backdrop', className:'fixed top-0 inset-x-0 z-[45] bg-black/65 p-1.5 sm:p-4 flex items-center justify-center overflow-hidden', style:{height:'var(--oscar-app-height, 100dvh)'}, onClick:()=>setPosCartLayout('split') }, h('div', { id:'full-cart-modal-box', className:'w-[calc(100vw-0.75rem)] sm:w-[calc(100vw-2rem)] max-w-[1600px] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-slate-200/70 dark:border-slate-700 bg-slate-100 dark:bg-slate-950', style:{height:'calc(var(--oscar-app-height, 100dvh) - 0.75rem)',maxHeight:'calc(var(--oscar-app-height, 100dvh) - 0.75rem)'}, onClick:e=>e.stopPropagation() }, h(FullCartView, { onOpenPayment:openPaymentModal, onToggleLayout:()=>setPosCartLayout('split') }))) : null,
    h(PaymentModal, { isOpen:isPaymentOpen, onClose:()=>setIsPaymentOpen(false), onSuccess:()=>{setIsPaymentOpen(false);setPosCartLayout('split');} }), h(CameraScannerModal), h(HoldInvoicesModal)
  );
};
