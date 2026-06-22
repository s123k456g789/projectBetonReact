// ============================================================================
// דף הרשמה (RegisterPage)  ←  הסעיף "א. הרשמה לאתר" מהמפרט
// ----------------------------------------------------------------------------
// תפקיד הדף: לאפשר למשתמש חדש להירשם כ"לקוח" או כ"קבלן".
// הדף שולח את השם והטלפון לשרת (POST /customers/ או POST /contractors/),
// ואז מחבר את המשתמש אוטומטית ומפנה אותו לדף הפעולה המתאים לתפקידו.
//
// הערה: בשרת הנוכחי אין שדה סיסמה (הטבלאות מכילות רק שם + טלפון), ולכן
// טופס ההרשמה כולל רק את השדות שהשרת באמת תומך בהם. מספר הטלפון משמש
// בהמשך כ"מזהה" להתחברות חוזרת.
// ============================================================================

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES, ROLE_LABELS } from '../config/constants.js'
import FormField from '../components/FormField.jsx'
import Alert from '../components/Alert.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  // ---- מצב הטופס (state) ----
  const [role, setRole] = useState(ROLES.CUSTOMER) // התפקיד הנבחר (ברירת מחדל: לקוח)
  const [name, setName] = useState('')             // שם
  const [phone, setPhone] = useState('')           // טלפון
  const [errors, setErrors] = useState({})         // שגיאות ולידציה לכל שדה
  const [serverError, setServerError] = useState('') // שגיאה כללית מהשרת
  const [loading, setLoading] = useState(false)    // האם הבקשה בטעינה (לחסימת כפילויות)

  /**
   * ולידציה של הטופס לפני שליחה. מחזירה אובייקט שגיאות (ריק = תקין).
   * המגבלות תואמות ל-DB: שם עד 15 תווים, טלפון עד 20.
   */
  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'יש להזין שם'
    else if (name.length > 15) errs.name = 'השם ארוך מדי (עד 15 תווים)'

    if (!phone.trim()) errs.phone = 'יש להזין מספר טלפון'
    else if (!/^[\d\-+\s]{7,20}$/.test(phone)) errs.phone = 'מספר טלפון לא תקין'

    return errs
  }

  /**
   * שליחת הטופס.
   */
  async function handleSubmit(e) {
    e.preventDefault()         // מונע רענון עמוד (התנהגות ברירת מחדל של טופס)
    setServerError('')

    // בדיקת ולידציה - אם יש שגיאות, מציגים אותן ועוצרים
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      // קריאה לשרת דרך ה-AuthContext (שמטפל גם בשמירת המשתמש)
      await register(role, { name: name.trim(), phone: phone.trim() })

      // אחרי הרשמה מוצלחת - מנווטים לדף הפעולה המתאים לתפקיד
      navigate(role === ROLES.CONTRACTOR ? '/contractor/request' : '/customer/request')
    } catch (err) {
      // הצגת שגיאה שחזרה מהשרת (למשל השרת כבוי)
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card card-narrow">
        <div className="card-header">
          <h1 className="card-title">הרשמה לאתר</h1>
          <p className="card-subtitle">פתיחת חשבון חדש בכמה שניות</p>
        </div>

        {/* הצגת שגיאת שרת כללית אם קיימת */}
        <Alert type="danger">{serverError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          {/* בחירת תפקיד - שני כפתורים גדולים, ברורים יותר מרשימה נפתחת */}
          <div className="form-group">
            <label className="form-label">אני נרשם/ת בתור<span className="required">*</span></label>
            <div className="form-row">
              {[ROLES.CUSTOMER, ROLES.CONTRACTOR].map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`btn ${role === r ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setRole(r)}
                >
                  {r === ROLES.CUSTOMER ? '🏠 ' : '🚛 '}{ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* שדה שם */}
          <FormField
            label="שם מלא"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="לדוגמה: דני כהן"
            error={errors.name}
            maxLength={15}
          />

          {/* שדה טלפון */}
          <FormField
            label="מספר טלפון"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="050-1234567"
            hint="מספר הטלפון ישמש אותך גם להתחברות חוזרת לאתר."
            error={errors.phone}
          />

          {/* כפתור שליחה - מציג ספינר בזמן טעינה */}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : 'הרשמה'}
          </button>
        </form>

        {/* קישור למי שכבר רשום */}
        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', color: 'var(--color-text-muted)' }}>
          כבר יש לך חשבון? <Link to="/login">התחברות</Link>
        </p>
      </div>
    </div>
  )
}
