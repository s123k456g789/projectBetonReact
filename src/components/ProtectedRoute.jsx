// ============================================================================
// מסלול מוגן (ProtectedRoute)
// ----------------------------------------------------------------------------
// תפקיד: לעטוף דפים שדורשים התחברות (ולעיתים גם תפקיד מסוים).
// אם המשתמש לא מחובר - מפנים אותו לדף ההתחברות.
// אם מחובר אך בתפקיד הלא נכון (למשל קבלן שמנסה להיכנס לדף הגשת בקשה של לקוח) -
// מפנים לדף הבית. כך מונעים גישה לא מתאימה ושומרים על חוויה ברורה.
// ============================================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ requiredRole, children }) {
  const { user, isLoggedIn } = useAuth()

  // 1) לא מחובר בכלל -> שולחים לדף ההתחברות
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // 2) מחובר אבל בתפקיד הלא נכון -> שולחים לדף הבית
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  // 3) הכל תקין -> מציגים את הדף המבוקש
  return children
}
