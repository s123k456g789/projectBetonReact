// ============================================================================
// לקוח ה-API (API Client)
// ----------------------------------------------------------------------------
// תפקיד: לרכז במקום אחד את כל התקשורת מול שרת ה-FastAPI בפייתון.
// כל בקשה (GET/POST/PUT/DELETE) עוברת דרך הפונקציה request() כדי שנטפל
// בצורה אחידה בכותרות, ב-JSON ובשגיאות. כך הדפים נשארים נקיים מקוד רשת.
// ============================================================================

// כתובת הבסיס של השרת. נטענת ממשתנה הסביבה VITE_API_URL (ראה קובץ .env).
// אם לא הוגדר - ברירת מחדל היא הכתובת המקומית של FastAPI.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * פונקציית עזר כללית לשליחת בקשה לשרת.
 * @param {string} path  - הנתיב היחסי, למשל '/customers/'
 * @param {object} options - אפשרויות: method (שיטה), body (גוף הבקשה כאובייקט)
 * @returns {Promise<any>} - התשובה מהשרת כאובייקט JavaScript
 */
async function request(path, { method = 'GET', body } = {}) {
  // בניית הגדרות הבקשה
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }, // אנחנו שולחים ומקבלים JSON
  }
  // אם יש גוף לבקשה (POST/PUT) - הופכים אותו למחרוזת JSON
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  let response
  try {
    // שליחת הבקשה בפועל לשרת
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch (networkError) {
    // שגיאת רשת = השרת כבוי / אין אינטרנט / חסימת CORS
    throw new Error(
      'לא ניתן להתחבר לשרת. ודאו שה-API בפייתון רץ בכתובת ' + BASE_URL
    )
  }

  // אם השרת החזיר קוד שגיאה (4xx / 5xx) - מנסים לחלץ הודעה ולזרוק שגיאה
  if (!response.ok) {
    let detail = `השרת החזיר שגיאה (${response.status})`
    try {
      const errData = await response.json()
      // FastAPI מחזיר שגיאות בשדה "detail"
      if (errData.detail) detail = typeof errData.detail === 'string'
        ? errData.detail
        : JSON.stringify(errData.detail)
    } catch {
      /* אם אין גוף JSON - נשארים עם ההודעה הכללית */
    }
    throw new Error(detail)
  }

  // קוד 204 = "אין תוכן" (קורה אחרי DELETE) - אין מה לפענח
  if (response.status === 204) return null

  // החזרת התשובה כאובייקט JavaScript
  return response.json()
}

// ----------------------------------------------------------------------------
// קיצורי דרך נוחים לכל סוגי הבקשות
// ----------------------------------------------------------------------------
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}

export { BASE_URL }
