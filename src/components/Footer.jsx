// ============================================================================
// פוטר (Footer) - תחתית הדף
// ----------------------------------------------------------------------------
// תפקיד: להציג זכויות יוצרים וקישור לתיעוד השרת. מופיע בתחתית כל דף.
// ============================================================================

import { BASE_URL } from '../api/apiClient.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>
          © {new Date().getFullYear()} Beton · פלטפורמה לתיווך שאריות בטון ·{' '}
          {/* קישור לתיעוד ה-Swagger של השרת - נוח לבדיקות */}
          <a href={`${BASE_URL}/docs`} target="_blank" rel="noreferrer">
            תיעוד ה-API
          </a>
        </p>
      </div>
    </footer>
  )
}
