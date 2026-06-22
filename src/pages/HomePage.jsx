// ============================================================================
// דף הבית (HomePage)
// ----------------------------------------------------------------------------
// תפקיד הדף: "שער הכניסה" של האתר. מסביר בקצרה מה הפלטפורמה עושה ומפנה את
// המשתמש לשני המסלולים המרכזיים - לקוח (צריך בטון) או קבלן (יש לו עודפי בטון).
// אם המשתמש כבר מחובר, הכרטיסים מובילים ישר לפעולה הרלוונטית לתפקיד שלו.
// ============================================================================

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../config/constants.js'

export default function HomePage() {
  const { isLoggedIn, user } = useAuth()

  return (
    <div className="container">
      {/* אזור ה-Hero - כותרת ראשית גדולה שמסבירה את הרעיון */}
      <section className="hero">
        <h1>
          לא לתת לבטון <span className="accent">להתקשות</span> לחינם
        </h1>
        <p>
          Beton מחברת בין קבלנים שנשארו להם עודפי בטון טריים, לבין לקוחות שצריכים
          כמות קטנה - לפני שהבטון מתקשה. חיסכון, פחות בזבוז, ומהירות.
        </p>
        {/* אם המשתמש לא מחובר - כפתורי הרשמה/התחברות */}
        {!isLoggedIn && (
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">הרשמה לאתר</Link>
            <Link to="/login" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: '#52606d' }}>
              כבר רשום? התחברות
            </Link>
          </div>
        )}
      </section>

      {/* שני כרטיסי הבחירה: לקוח / קבלן */}
      <section className="choice-grid">
        {/* כרטיס לקוח */}
        <div className="choice-card">
          <div className="choice-icon">🏠</div>
          <h3>אני לקוח</h3>
          <p>צריך כמות קטנה של בטון לפרויקט שלך? פרסם בקשה וקבל הצעות מקבלנים בקרבתך.</p>
          {/* אם מחובר כלקוח -> ישר להגשת בקשה. אחרת -> הרשמה */}
          {isLoggedIn && user.role === ROLES.CUSTOMER ? (
            <Link to="/customer/request" className="btn btn-primary btn-block">הגשת בקשה לבטון</Link>
          ) : (
            <Link to="/register" className="btn btn-primary btn-block">הרשמה כלקוח</Link>
          )}
        </div>

        {/* כרטיס קבלן */}
        <div className="choice-card">
          <div className="choice-icon">🚛</div>
          <h3>אני קבלן</h3>
          <p>נשארו לך שאריות בטון אחרי יציקה? פרסם הצעה ומצא לקוח לפני שהבטון מתקשה.</p>
          {isLoggedIn && user.role === ROLES.CONTRACTOR ? (
            <Link to="/contractor/request" className="btn btn-secondary btn-block">פרסום הצעת בטון</Link>
          ) : (
            <Link to="/register" className="btn btn-secondary btn-block">הרשמה כקבלן</Link>
          )}
        </div>
      </section>

      {/* אזור הסבר על אופן הפעולה (3 שלבים) */}
      <section style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>איך זה עובד?</h2>
        <div className="choice-grid">
          <div className="card">
            <div className="choice-icon">①</div>
            <h4>נרשמים</h4>
            <p style={{ color: 'var(--color-text-muted)' }}>הרשמה מהירה כלקוח או כקבלן עם שם וטלפון.</p>
          </div>
          <div className="card">
            <div className="choice-icon">②</div>
            <h4>מפרסמים</h4>
            <p style={{ color: 'var(--color-text-muted)' }}>לקוח מפרסם בקשה, קבלן מפרסם עודפי בטון - עם מיקום וכמות.</p>
          </div>
          <div className="card">
            <div className="choice-icon">③</div>
            <h4>מתחברים</h4>
            <p style={{ color: 'var(--color-text-muted)' }}>המערכת מתאימה לפי קרבה, סוג וכמות - ושולחת התראה בזמן אמת.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
