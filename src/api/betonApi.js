// ============================================================================
// שירותי ה-API לפי ישות (Beton API services)
// ----------------------------------------------------------------------------
// תפקיד: לעטוף כל endpoint של השרת בפונקציה בעלת שם ברור בעברית-אנגלית.
// הנתיבים כאן תואמים בדיוק לשרת ה-FastAPI שבמאגר projectBeton.
// כך, אם נתיב בשרת משתנה - מתקנים רק כאן, ולא בכל הדפים.
// ============================================================================

import { api } from './apiClient.js'

// ---- לקוחות (Customers) ----
export const customersApi = {
  getAll: () => api.get('/customers/'),                 // כל הלקוחות
  getById: (id) => api.get(`/customers/${id}`),         // לקוח לפי מזהה
  create: (data) => api.post('/customers/', data),      // הרשמת לקוח חדש
}

// ---- קבלנים (Contractors) ----
export const contractorsApi = {
  getAll: () => api.get('/contractors/'),               // כל הקבלנים
  getById: (id) => api.get(`/contractors/${id}`),       // קבלן לפי מזהה
  create: (data) => api.post('/contractors/', data),    // הרשמת קבלן חדש
}

// ---- בקשות בטון של לקוחות (ConcreteRequests) ----
export const concreteRequestsApi = {
  getAll: () => api.get('/concrete-requests/'),
  create: (data) => api.post('/concrete-requests/', data), // הגשת בקשה מלקוח
  getByCustomer: (customerId) => api.get(`/concrete-requests/customer/${customerId}`),
}

// ---- הצעות של קבלנים (ContractorConcreteRequests) ----
export const contractorOffersApi = {
  getAll: () => api.get('/contractor-offers/'),
  create: (data) => api.post('/contractor-offers/', data), // הגשת הצעה מקבלן
  getByContractor: (contractorId) => api.get(`/contractor-offers/contractor/${contractorId}`),
}

// ---- טבלאות עזר (Lookups) - נטענות כדי למלא רשימות נפתחות בטפסים ----
export const lookupsApi = {
  purposes: () => api.get('/purposes/'),          // מטרות שימוש בבטון
  strengths: () => api.get('/strengths/'),        // חוזקים
  reliants: () => api.get('/reliants/'),          // סומכים
  stoneSizes: () => api.get('/stone-sizes/'),     // גדלי אבן
  concreteTypes: () => api.get('/concrete-types/'), // סוגי בטון מורכבים
}
