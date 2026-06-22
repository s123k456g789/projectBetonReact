// ============================================================================
// ספק ההתחברות (Auth Context)
// ----------------------------------------------------------------------------
// תפקיד: לנהל "מי המשתמש המחובר כרגע" ולחשוף את המידע הזה לכל הדפים,
// בלי להעביר אותו ידנית מקומפוננטה לקומפוננטה (זה היתרון של Context ב-React).
//
// הערה חשובה על אבטחה:
// בשרת הנוכחי (projectBeton) הטבלאות Customers/Contractors מכילות רק
// שם וטלפון - אין סיסמאות ואין מנגנון התחברות אמיתי. לכן:
//   • "הרשמה"  = יצירת רשומת לקוח/קבלן חדשה בשרת (POST).
//   • "התחברות" = איתור רשומה קיימת לפי מספר טלפון + תפקיד.
// זהו פתרון תואם-שרת. בהמשך, כשתתווסף אבטחה אמיתית (סיסמאות + JWT),
// יהיה צורך לעדכן רק את הקובץ הזה - שאר האתר לא ישתנה.
// ============================================================================

import { createContext, useContext, useState, useEffect } from 'react'
import { customersApi, contractorsApi } from '../api/betonApi.js'
import { ROLES, AUTH_STORAGE_KEY } from '../config/constants.js'

// יצירת ה-Context עצמו (המכל שיחזיק את נתוני ההתחברות)
const AuthContext = createContext(null)

/**
 * הוק נוח לשליפת פרטי ההתחברות מכל קומפוננטה: const { user, login } = useAuth()
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth חייב לשמש בתוך <AuthProvider>')
  return ctx
}

/**
 * הקומפוננטה שעוטפת את כל האפליקציה ומספקת את נתוני ההתחברות.
 */
export function AuthProvider({ children }) {
  // user = אובייקט המשתמש המחובר: { id, name, phone, role } או null אם לא מחובר.
  const [user, setUser] = useState(null)

  // בעת טעינת האתר - מנסים לשחזר משתמש מחובר מ-localStorage (כדי לא לאבד חיבור ברענון).
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY)
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY) // אם השמירה פגומה - מנקים
      }
    }
  }, [])

  /**
   * שמירת המשתמש גם ב-state וגם ב-localStorage (פונקציית עזר פנימית).
   */
  function persistUser(userObj) {
    setUser(userObj)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj))
  }

  /**
   * הרשמה: יוצרת לקוח/קבלן חדש בשרת ומחברת אותו אוטומטית.
   * @param {('customer'|'contractor')} role - התפקיד
   * @param {{name:string, phone:string}} data - שם וטלפון
   * @returns {Promise<object>} המשתמש שנוצר
   */
  async function register(role, data) {
    // בוחרים את ה-API המתאים לפי התפקיד
    const created = role === ROLES.CONTRACTOR
      ? await contractorsApi.create(data)
      : await customersApi.create(data)

    // השרת מחזיר את הרשומה עם id. מוסיפים את התפקיד ושומרים כמשתמש מחובר.
    const userObj = { ...created, role }
    persistUser(userObj)
    return userObj
  }

  /**
   * התחברות: מחפשת משתמש קיים לפי מספר טלפון + תפקיד.
   * (אין סיסמה בשרת - ראה ההערה למעלה.)
   * @param {('customer'|'contractor')} role
   * @param {string} phone - מספר הטלפון שאיתו נרשמו
   * @returns {Promise<object>} המשתמש שנמצא
   */
  async function login(role, phone) {
    // שולפים את כל הרשומות מהסוג המתאים ומחפשים התאמה לפי טלפון.
    const list = role === ROLES.CONTRACTOR
      ? await contractorsApi.getAll()
      : await customersApi.getAll()

    // השוואה גמישה: מתעלמים מרווחים ומקפים בטלפון.
    const normalize = (p) => (p || '').replace(/[\s-]/g, '')
    const found = list.find((u) => normalize(u.phone) === normalize(phone))

    if (!found) {
      // אם לא נמצא - זורקים שגיאה ברורה שתוצג בטופס.
      throw new Error('לא נמצא משתמש עם מספר הטלפון הזה. אולי צריך להירשם קודם?')
    }

    const userObj = { ...found, role }
    persistUser(userObj)
    return userObj
  }

  /**
   * התנתקות: מנקה את המשתמש מה-state ומ-localStorage.
   */
  function logout() {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  // הערכים שכל האפליקציה תוכל לצרוך דרך useAuth()
  const value = {
    user,                       // המשתמש המחובר (או null)
    isLoggedIn: Boolean(user),  // קיצור נוח לבדיקה אם מחובר
    register,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
