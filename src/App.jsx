// ============================================================================
// קומפוננטת השורש (App)
// ----------------------------------------------------------------------------
// תפקיד: להגדיר את מבנה כל האתר - סרגל ניווט קבוע למעלה, אזור תוכן שמשתנה
// לפי הנתיב (Routes), ופוטר קבוע למטה. כאן מוגדרת "מפת הדרכים" של האתר:
// איזה כתובת (URL) מציגה איזה דף.
// ============================================================================

import { Routes, Route, Navigate } from 'react-router-dom'

// קומפוננטות מבנה
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// הדפים
import HomePage from './pages/HomePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CustomerRequestPage from './pages/CustomerRequestPage.jsx'
import ContractorRequestPage from './pages/ContractorRequestPage.jsx'

import { ROLES } from './config/constants.js'

export default function App() {
  return (
    // app-shell: מבנה גמיש שדוחף את הפוטר לתחתית (ראה index.css)
    <div className="app-shell">
      {/* סרגל ניווט - מופיע בכל דף */}
      <Navbar />

      {/* אזור התוכן המרכזי - משתנה לפי הנתיב */}
      <main className="app-main">
        <Routes>
          {/* דף הבית */}
          <Route path="/" element={<HomePage />} />

          {/* הרשמה והתחברות - פתוחים לכולם */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* הגשת בקשה מלקוח - מוגן: רק לקוח מחובר */}
          <Route
            path="/customer/request"
            element={
              <ProtectedRoute requiredRole={ROLES.CUSTOMER}>
                <CustomerRequestPage />
              </ProtectedRoute>
            }
          />

          {/* פרסום הצעה מקבלן - מוגן: רק קבלן מחובר */}
          <Route
            path="/contractor/request"
            element={
              <ProtectedRoute requiredRole={ROLES.CONTRACTOR}>
                <ContractorRequestPage />
              </ProtectedRoute>
            }
          />

          {/* כל נתיב לא מוכר -> הפניה לדף הבית */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* פוטר - מופיע בכל דף */}
      <Footer />
    </div>
  )
}
