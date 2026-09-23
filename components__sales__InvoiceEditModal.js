import React, { useMemo, useState } from 'react';
import { useApp } from './context__AppContext.js?v=7.9.4.44-purchase-shipping';
import { SearchableDropdown } from './components__common__Dropdown.js?v=7.9.4.44-purchase-shipping';
import { X, Plus, Trash2, Save, Truck, ReceiptText } from 'lucide-react';

const h = React.createElement;
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => num(v).toFixed(2);

export const SalesInvoiceEditModal = ({ invoice, onClose }) => {
  const { products, customers, accounts, settings, updateSaleInvoice, showToast } = useApp();
  const originalProductIds = new Set((invoice?.items || []).map(it => it.productId).filter(Boolean));
  const activeProducts = (products || []).filter(p => p && Array.isArray(p.units) && p.units.length && ((!p.deletedAt && p.status !== 'archived') || originalProductIds.has(p.id)));
  const defaultAccountId = invoice?.payments?.[0]?.accountId || accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '';
  const [customerId, setCustomerId] = useState(invoice?.customerId || 'cust-walkin');
  const [rows, setRows] = useState(() => (invoice?.items || []).map(it => ({
    productId: it.productId,
    unitId: it.unitId,
    quantity: String(num(it.quantity)),
    unitPrice: String(num(it.unitPrice)),
    taxRate: num(it.taxRate),
  })));
  const [discountType, setDiscountType] = useState(invoice?.invoiceDiscountType || 'fixed');
  const [discountValue, setDiscountValue] = useState(String(num(invoice?.invoiceDiscountValue ?? invoice?.invoiceDiscountAmount)));
  const [shippingCost, setShippingCost] = useState(String(num(invoice?.shippingCost)));
  const [shippingChargeMode, setShippingChargeMode] = useState(invoice?.shippingChargeMode === 'profit' ? 'profit' : 'customer');
  const [paid, setPaid] = useState(String(num(invoice?.paidAmount)));
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => rows.reduce((s, r) => s + Math.max(0, num(r.quantity)) * Math.max(0, num(r.unitPrice)), 0), [rows]);
  const taxTotal = useMemo(() => rows.reduce((s, r) => s + Math.max(0, num(r.quantity)) * Math.max(0, num(r.unitPrice)) * Math.max(0, num(r.taxRate)) / 100, 0), [rows]);
  const beforeDiscount = subtotal + taxTotal;
  const discountAmount = discountType === 'percent'
    ? Math.min(beforeDiscount, beforeDiscount * Math.max(0, Math.min(100, num(discountValue))) / 100)
    : Math.min(beforeDiscount, Math.max(0, num(discountValue)));
  const ship = Math.max(0, num(shippingCost));
  const total = Math.max(0, beforeDiscount - discountAmount + (shippingChargeMode === 'customer' ? ship : 0));
  const paidSafe = Math.min(total, Math.max(0, num(paid)));
  const remaining = Math.max(0, total - paidSafe);

  const productOptions = activeProducts.map(p => ({ id: p.id, label: p.name || 'صنف', subLabel: p.sku || '' }));
  const customerOptions = [{ id: 'cust-walkin', label: 'عميل نقدي', subLabel: 'البيع النقدي المباشر' }, ...(customers || []).filter(c => c && c.id !== 'cust-walkin' && !c.deletedAt).map(c => ({ id: c.id, label: c.name || 'عميل', subLabel: c.phone || '' }))];
  const accountOptions = (accounts || []).map(a => ({ id: a.id, label: a.name || 'حساب', subLabel: `الرصيد: ${money(a.balance)} ${settings.currencySymbol || ''}` }));

  const updateRow = (index, patch) => setRows(prev => prev.map((row, i) => {
    if (i !== index) return row;
    const next = { ...row, ...patch };
    if (patch.productId && patch.productId !== row.productId) {
      const p = activeProducts.find(x => x.id === patch.productId);
      const u = p?.units?.find(x => x.isDefaultSale) || p?.units?.[0];
      next.unitId = u?.id || '';
      next.unitPrice = String(num(u?.salePrice ?? p?.sellingPrice));
      next.taxRate = num(p?.taxRate ?? settings.taxRate);
    }
    if (patch.unitId && patch.unitId !== row.unitId) {
      const p = activeProducts.find(x => x.id === next.productId);
      const u = p?.units?.find(x => x.id === patch.unitId);
      if (u) next.unitPrice = String(num(u.salePrice ?? p?.sellingPrice));
    }
    return next;
  }));

  const addRow = () => {
    const p = activeProducts[0];
    const u = p?.units?.find(x => x.isDefaultSale) || p?.units?.[0];
    setRows(prev => [...prev, { productId: p?.id || '', unitId: u?.id || '', quantity: '1', unitPrice: String(num(u?.salePrice ?? p?.sellingPrice)), taxRate: num(p?.taxRate ?? settings.taxRate) }]);
  };

  const submit = async () => {
    if (saving) return;
    if (!rows.length || rows.some(r => !r.productId || num(r.quantity) <= 0)) { showToast('راجع الأصناف والكميات قبل الحفظ', 'warning'); return; }
    if (remaining > 0 && customerId === 'cust-walkin') { showToast('اختر عميلاً مسجلاً عند وجود مبلغ متبقٍ', 'warning'); return; }
    if (paidSafe > 0 && !accountId) { showToast('اختر حساب استلام المبلغ المدفوع', 'warning'); return; }
    setSaving(true);
    try {
      const items = rows.map(r => {
        const p = activeProducts.find(x => x.id === r.productId);
        const u = p?.units?.find(x => x.id === r.unitId) || p?.units?.[0];
        const factor = Math.max(0.00000001, num(u?.conversionToBase) || 1);
        return {
          productId: p?.id || r.productId,
          productName: p?.name || 'صنف',
          unitId: u?.id || r.unitId,
          unitName: u?.name || 'وحدة',
          quantity: Math.max(0, num(r.quantity)),
          unitPrice: Math.max(0, num(r.unitPrice)),
          conversionFactor: factor,
          costPriceAtSale: (num(p?.costPrice) || 0) * factor,
          taxRate: Math.max(0, num(r.taxRate)),
        };
      });
      const selectedAccount = accounts.find(a => a.id === accountId);
      const originalPaid = num(invoice?.paidAmount);
      const originalPayments = Array.isArray(invoice?.payments) ? invoice.payments.filter(p => p && num(p.amount) > 0 && p.accountId) : [];
      const keepOriginalSplit = paidSafe > 0 && originalPayments.length > 0 && Math.abs(paidSafe - originalPaid) < 0.005;
      const originalMethod = originalPayments.find(p => p.accountId === accountId)?.method;
      const payments = paidSafe <= 0 ? [] : keepOriginalSplit ? originalPayments.map(p => ({ ...p })) : [{ method: originalMethod || selectedAccount?.type || 'cash', amount: paidSafe, accountId, accountName: selectedAccount?.name || 'الصندوق' }];
      const paymentType = paidSafe <= 0 ? 'debt' : paidSafe >= total ? 'cash' : 'partial';
      const customerObject = customerId === 'cust-walkin' ? null : customers.find(c => c.id === customerId);
      const result = await updateSaleInvoice(invoice.id, {
        items,
        customerId,
        customerObject,
        forceCashCustomer: customerId === 'cust-walkin',
        paymentType,
        paidAmount: paidSafe,
        payments,
        invoiceDiscountType: discountType,
        invoiceDiscountValue: num(discountValue),
        shippingCost: ship,
        shippingChargeMode,
        notes,
      });
      if (result) onClose?.();
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'تعذر تعديل فاتورة المبيعات', 'error');
    } finally { setSaving(false); }
  };

  return h('div', { className: 'fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-2 sm:p-4', style: { backdropFilter: 'blur(6px)' } },
    h('div', { className: 'w-full max-w-4xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-right' },
      h('div', { className: 'shrink-0 flex items-center justify-between gap-3 p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40' },
        h('div', { className: 'flex items-center gap-2' }, h(ReceiptText, { className: 'w-5 h-5 text-blue-600' }), h('div', null, h('div', { className: 'font-black text-sm' }, `تعديل فاتورة المبيعات ${invoice.invoiceNumber}`), h('div', { className: 'text-[10px] text-slate-500' }, 'سيتم إلغاء أثر القيم القديمة ثم إعادة حساب المخزون والحسابات بالقيم الجديدة'))),
        h('button', { type: 'button', onClick: onClose, className: 'p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700' }, h(X, { className: 'w-5 h-5' }))
      ),
      h('div', { className: 'flex-1 overflow-y-auto p-4 space-y-4' },
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          h(SearchableDropdown, { id: `edit-sale-customer-${invoice.id}`, label: 'العميل', options: customerOptions, selectedId: customerId, onSelect: setCustomerId, placeholder: 'اختر العميل...' }),
          h(SearchableDropdown, { id: `edit-sale-account-${invoice.id}`, label: 'حساب استلام المدفوع', options: accountOptions, selectedId: accountId, onSelect: setAccountId, placeholder: 'اختر الحساب...' })
        ),
        h('div', { className: 'overflow-x-auto rounded-xl border dark:border-slate-800' }, h('table', { className: 'w-full min-w-[760px] text-xs' },
          h('thead', null, h('tr', { className: 'bg-slate-50 dark:bg-slate-800 text-slate-500' }, ...['الصنف','الوحدة','الكمية','السعر','الضريبة %','الإجمالي',''].map((x,i)=>h('th',{key:i,className:'p-2 text-right'},x)))),
          h('tbody', null, ...rows.map((r,i) => {
            const p = activeProducts.find(x => x.id === r.productId);
            const unitOptions = (p?.units || []).map(u => ({ id: u.id, label: u.name || 'وحدة', subLabel: `سعر البيع ${money(u.salePrice ?? p?.sellingPrice)}` }));
            return h('tr', { key: `${r.productId}-${i}`, className: 'border-t dark:border-slate-800' },
              h('td', { className: 'p-2 min-w-48' }, h(SearchableDropdown, { id: `edit-sale-product-${invoice.id}-${i}`, options: productOptions, selectedId: r.productId, onSelect: id => updateRow(i,{productId:id}), placeholder: 'الصنف...' })),
              h('td', { className: 'p-2 min-w-36' }, h(SearchableDropdown, { id: `edit-sale-unit-${invoice.id}-${i}`, options: unitOptions, selectedId: r.unitId, onSelect: id => updateRow(i,{unitId:id}), placeholder: 'الوحدة...' })),
              h('td', { className: 'p-2' }, h('input', { type:'number', min:'0.0001', step:'any', value:r.quantity, onChange:e=>updateRow(i,{quantity:e.target.value}), className:'w-24 px-2 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-mono' })),
              h('td', { className: 'p-2' }, h('input', { type:'number', min:'0', step:'any', value:r.unitPrice, onChange:e=>updateRow(i,{unitPrice:e.target.value}), className:'w-28 px-2 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-mono' })),
              h('td', { className: 'p-2' }, h('input', { type:'number', min:'0', step:'any', value:r.taxRate, onChange:e=>updateRow(i,{taxRate:e.target.value}), className:'w-20 px-2 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-mono' })),
              h('td', { className: 'p-2 font-mono font-black' }, `${money(num(r.quantity)*num(r.unitPrice))} ${settings.currencySymbol||''}`),
              h('td', { className: 'p-2' }, h('button', { type:'button', onClick:()=>setRows(prev=>prev.filter((_,idx)=>idx!==i)), className:'p-2 text-rose-600' }, h(Trash2,{className:'w-4 h-4'})))
            );
          }))
        )),
        h('button', { type:'button', onClick:addRow, className:'inline-flex items-center gap-1 text-xs font-black text-blue-700' }, h(Plus,{className:'w-4 h-4'}), 'إضافة صنف'),
        h('div', { className:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' },
          h('div', null, h('label',{className:'text-[11px] font-bold block mb-1'},'نوع الخصم'), h('div',{className:'flex gap-1'}, h('button',{type:'button',onClick:()=>setDiscountType('fixed'),className:`flex-1 py-2 border rounded-lg text-xs font-bold ${discountType==='fixed'?'bg-blue-600 text-white':''}`},'مبلغ'), h('button',{type:'button',onClick:()=>setDiscountType('percent'),className:`flex-1 py-2 border rounded-lg text-xs font-bold ${discountType==='percent'?'bg-blue-600 text-white':''}`},'%'))),
          h('div', null, h('label',{className:'text-[11px] font-bold block mb-1'},'قيمة الخصم'), h('input',{type:'number',min:'0',step:'any',value:discountValue,onChange:e=>setDiscountValue(e.target.value),className:'w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-mono'})),
          h('div', null, h('label',{className:'text-[11px] font-bold block mb-1'},'المبلغ المدفوع'), h('input',{type:'number',min:'0',step:'any',value:paid,onChange:e=>setPaid(e.target.value),className:'w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 font-mono font-black text-emerald-700'})),
          h('div',{className:'p-2 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}, h('div',{className:'text-[10px] text-slate-500'},'المتبقي'), h('div',{className:'text-lg font-black font-mono text-rose-600'},`${money(remaining)} ${settings.currencySymbol||''}`))
        ),
        h('div', { className:'rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-2' },
          h('div',{className:'flex items-center gap-2'},h(Truck,{className:'w-4 h-4 text-blue-600'}),h('div',{className:'text-xs font-black'},'مصروف الشحن')),
          h('div',{className:'grid grid-cols-1 sm:grid-cols-2 gap-2'},
            h('input',{type:'number',min:'0',step:'any',value:shippingCost,onChange:e=>setShippingCost(e.target.value),placeholder:'0.00',className:'w-full px-3 py-2 border border-blue-200 rounded-lg bg-white dark:bg-slate-900 dark:border-blue-800 font-mono'}),
            h('div',{className:'flex rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800'},
              h('button',{type:'button',onClick:()=>setShippingChargeMode('customer'),className:`flex-1 py-2 text-xs font-black ${shippingChargeMode==='customer'?'bg-blue-600 text-white':'bg-white dark:bg-slate-900'}`},'على العميل'),
              h('button',{type:'button',onClick:()=>setShippingChargeMode('profit'),className:`flex-1 py-2 text-xs font-black ${shippingChargeMode==='profit'?'bg-blue-600 text-white':'bg-white dark:bg-slate-900'}`},'من الربح')
            )
          )
        ),
        h('input',{value:notes,onChange:e=>setNotes(e.target.value),placeholder:'ملاحظات الفاتورة...',className:'w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-slate-900 dark:border-slate-700'}),
        h('div',{className:'rounded-xl bg-slate-900 text-white p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center'},
          h('div',null,h('div',{className:'text-[10px] text-slate-400'},'قبل الخصم'),h('b',{className:'font-mono'},money(beforeDiscount))),
          h('div',null,h('div',{className:'text-[10px] text-slate-400'},'الخصم'),h('b',{className:'font-mono text-rose-300'},money(discountAmount))),
          h('div',null,h('div',{className:'text-[10px] text-slate-400'},shippingChargeMode==='customer'?'الشحن على العميل':'الشحن من الربح'),h('b',{className:'font-mono text-blue-300'},money(ship))),
          h('div',null,h('div',{className:'text-[10px] text-slate-400'},'الصافي'),h('b',{className:'font-mono text-emerald-300 text-lg'},`${money(total)} ${settings.currencySymbol||''}`))
        )
      ),
      h('div',{className:'shrink-0 flex justify-end gap-2 p-3 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'},
        h('button',{type:'button',onClick:onClose,className:'px-4 py-2 border rounded-xl text-xs font-bold'},'إلغاء'),
        h('button',{type:'button',disabled:saving,onClick:submit,className:'inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black disabled:opacity-50'},h(Save,{className:'w-4 h-4'}),saving?'جاري إعادة الحساب...':'حفظ التعديلات وإعادة الحساب')
      )
    )
  );
};
