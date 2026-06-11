// ============================================================================
// דף התחברות (LoginPage)  ←  הסעיף "ב. התחברות לאתר" מהמפרט
// ----------------------------------------------------------------------------
// תפקיד הדף: לאפשר למשתמש קיים להתחבר חזרה לאתר.
// מכיוון שבשרת הנוכחי אין סיסמאות, ההתחברות מתבצעת לפי בחירת תפקיד + מספר
// הטלפון שאיתו נרשמו. ה-AuthContext מחפש את הרשומה המתאימה בשרת.
// (כשתתווסף אבטחת סיסמאות בשרת - נוסיף כאן שדה סיסמה, וזה הקובץ היחיד שישתנה.)
// ============================================================================

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES, ROLE_LABELS } from '../config/constants.js'
import FormField from '../components/FormField.jsx'
import Alert from '../components/Alert.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // ---- מצב הטופס ----
  const [role, setRole] = useState(ROLES.CUSTOMER) // תפקיד נבחר
  const [phone, setPhone] = useState('')           // מספר טלפון
  const [error, setError] = useState('')           // שגיאה (לא נמצא / שרת כבוי)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // ולידציה בסיסית
    if (!phone.trim()) {
      setError('יש להזין מספר טלפון')
      return
    }

    setLoading(true)
    try {
      // חיפוש המשתמש בשרת לפי תפקיד + טלפון
      await login(role, phone.trim())
      // הצלחה - מנווטים לדף הפעולה לפי התפקיד
      navigate(role === ROLES.CONTRACTOR ? '/contractor/request' : '/customer/request')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card card-narrow">
        <div className="card-header">
          <h1 className="card-title">התחברות</h1>
          <p className="card-subtitle">ברוכים השבים! בחרו תפקיד והזינו טלפון</p>
        </div>

        <Alert type="danger">{error}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          {/* בחירת תפקיד */}
          <div className="form-group">
            <label className="form-label">מתחבר/ת בתור<span className="required">*</span></label>
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

          {/* שדה טלפון */}
          <FormField
            label="מספר טלפון"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="050-1234567"
            hint="המספר שאיתו נרשמת לאתר."
          />

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : 'התחברות'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', color: 'var(--color-text-muted)' }}>
          עדיין אין לך חשבון? <Link to="/register">הרשמה</Link>
        </p>
      </div>
    </div>
  )
}
