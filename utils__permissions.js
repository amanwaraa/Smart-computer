export const GENERAL_PAGE_PERMISSIONS = [
  ['canAccessCashier','pos','الكاشير'],
  ['canAccessDashboard','dashboard','لوحة التحكم'],
  ['canAccessSales','sales','المبيعات والفواتير'],
  ['canAccessPurchases','purchases','المشتريات والتوريد'],
  ['canAccessVouchers','vouchers','سندات القبض والصرف'],
  ['canAccessEmployees','employees','الموظفون والصلاحيات'],
  ['canAccessProducts','products','إدارة الأصناف'],
  ['canAccessCategories','categories','التصنيفات'],
  ['canAccessInventory','inventory','المخزون والتحويلات'],
  ['canAccessCustomers','customers','العملاء والديون'],
  ['canAccessSuppliers','suppliers','الموردون والحسابات'],
  ['canAccessAccounts','accounts','الصندوق والورديات'],
  ['canAccessExpenses','expenses','المصروفات اليومية'],
  ['canAccessBarcodes','barcodes','طباعة الباركود'],
  ['canAccessReports','reports','التقارير والأرباح'],
  ['canAccessTrash','trash','سلة المحذوفات'],
  ['canAccessSettings','settings','إعدادات النظام'],
];
export const PAGE_PERMISSION_MAP = Object.fromEntries(GENERAL_PAGE_PERMISSIONS.map(([key, tab]) => [tab, key]));
export const GENERAL_PAGE_KEYS = GENERAL_PAGE_PERMISSIONS.map(([key]) => key);
export const ALL_PAGE_KEYS = [...GENERAL_PAGE_KEYS];
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
export function normalizeEmployeePermissions(rawPermissions = {}, roleCode = 'custom') {
  const out = { ...(rawPermissions && typeof rawPermissions === 'object' && !Array.isArray(rawPermissions) ? rawPermissions : {}) };
  const role = String(roleCode || 'custom').trim().toLowerCase();
  for (const key of ['canAccessAI','canAccessRestaurantTables','canAccessRestaurantWaiter','canAccessRestaurantKitchen','canAccessRestaurantOrders','canAccessRestaurantWaste']) delete out[key];
  if (role === 'admin') { for (const key of ALL_PAGE_KEYS) out[key] = true; return out; }
  const hasGeneralPageSchema = GENERAL_PAGE_KEYS.some(key => hasOwn(out, key));
  if (!hasGeneralPageSchema) {
    for (const key of GENERAL_PAGE_KEYS) out[key] = false;
    if (role === 'cashier') { out.canAccessCashier = true; out.canAccessSales = true; out.canAccessCustomers = true; }
    else if (role === 'accountant') { out.canAccessDashboard = true; out.canAccessSales = true; out.canAccessPurchases = true; out.canAccessVouchers = true; out.canAccessCustomers = true; out.canAccessSuppliers = true; out.canAccessAccounts = true; out.canAccessExpenses = true; out.canAccessReports = true; }
    else if (role === 'inventory_mgr') { out.canAccessProducts = true; out.canAccessCategories = true; out.canAccessInventory = true; out.canAccessPurchases = true; out.canAccessBarcodes = true; }
    else { if (out.canManagePurchases === true) out.canAccessPurchases = true; if (out.canManageVouchers === true) out.canAccessVouchers = true; if (out.canManageInventory === true) out.canAccessInventory = true; if (out.canViewReports === true) out.canAccessReports = true; if (out.canAccessSettings === true) out.canAccessSettings = true; }
  } else { for (const key of GENERAL_PAGE_KEYS) if (!hasOwn(out, key)) out[key] = false; }
  return out;
}
export function isManagerAccess({ runtime = null, currentUser = null, activeEmployee = null } = {}) {
  const rt = runtime || (typeof window !== 'undefined' ? window.OscarActivation?.readRuntime?.() : null);
  if (rt?.type === 'company-manager' || currentUser?.isCompanyManager) return true;
  const roleCode = String(currentUser?.roleCode || rt?.account?.role || activeEmployee?.role || '').trim().toLowerCase();
  return roleCode === 'admin';
}
export function canAccessPermission(permissionKey, { runtime = null, currentUser = null, activeEmployee = null } = {}) {
  if (!permissionKey) return true;
  if (isManagerAccess({ runtime, currentUser, activeEmployee })) return true;
  const rt = runtime || (typeof window !== 'undefined' ? window.OscarActivation?.readRuntime?.() : null);
  const roleCode = String(currentUser?.roleCode || rt?.account?.role || activeEmployee?.role || 'custom').trim().toLowerCase();
  const raw = currentUser?.permissions ?? rt?.account?.permissions ?? activeEmployee?.permissions ?? {};
  const perms = normalizeEmployeePermissions(raw, roleCode);
  return perms?.[permissionKey] === true;
}
export function canAccessTab(tab, { runtime = null, currentUser = null, activeEmployee = null } = {}) {
  if (tab === 'no_access') return false;
  const permissionKey = PAGE_PERMISSION_MAP[tab];
  if (!permissionKey) return false;
  return canAccessPermission(permissionKey, { runtime, currentUser, activeEmployee });
}
export const DEFAULT_TAB_ORDER = ['pos','dashboard','sales','purchases','products','inventory','customers','suppliers','accounts','expenses','vouchers','reports','barcodes','categories','employees','settings','trash'];
export function firstAllowedTab(args = {}) { return DEFAULT_TAB_ORDER.find(tab => canAccessTab(tab, args)) || null; }
