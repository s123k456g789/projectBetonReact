// ============================================================================
// סרגל ניווט עליון (Navbar)
// ----------------------------------------------------------------------------
// תפקיד: להציג את הלוגו, קישורי ניווט בין הדפים, ואת פרטי המשתמש המחובר.
// הסרגל "דביק" (sticky) ונשאר למעלה גם בזמן גלילה.
// ============================================================================

import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES, ROLE_LABELS } from '../config/constants.js'

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth() // פרטי המשתמש המחובר
  const navigate = useNavigate()                 // לניווט אחרי התנתקות

  // פעולה בלחיצה על "התנתקות"
  function handleLogout() {
    logout()
    navigate('/') // חזרה לדף הבית
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* לוגו + שם המותג - לחיצה מחזירה לדף הבית */}
        <Link to="/" className="navbar-brand">
          <img src="/beton.svg" alt="לוגו Beton" className="navbar-logo" />
          <span>Beton</span>
        </Link>

        {/* קישורי הניווט */}
        <ul className="navbar-links">
          {/* NavLink מוסיף className="active" אוטומטית לקישור של הדף הנוכחי */}
          <li><NavLink to="/">דף הבית</NavLink></li>

          {/* קישורים שתלויים בתפקיד המשתמש המחובר */}
          {isLoggedIn && user.role === ROLES.CUSTOMER && (
            <li><NavLink to="/customer/request">הגשת בקשה</NavLink></li>
          )}
          {isLoggedIn && user.role === ROLES.CONTRACTOR && (
            <li><NavLink to="/contractor/request">פרסום הצעה</NavLink></li>
          )}

          {/* אם המשתמש לא מחובר - מציגים הרשמה/התחברות */}
          {!isLoggedIn && (
            <>
              <li><NavLink to="/login">התחברות</NavLink></li>
              <li><NavLink to="/register">הרשמה</NavLink></li>
            </>
          )}

          {/* אם המשתמש מחובר - מציגים את שמו + כפתור התנתקות */}
          {isLoggedIn && (
            <li className="navbar-user">
              <span className="navbar-user-name">
                שלום, {user.name || 'משתמש'}
                {/* תגית קטנה שמראה אם זה לקוח או קבלן */}
                <span className={`badge badge-${user.role}`} style={{ marginInlineStart: 8 }}>
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '6px 14px' }}>
                התנתקות
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}
