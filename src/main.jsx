// ============================================================================
// נקודת הכניסה של אפליקציית React (Entry Point)
// זהו הקובץ הראשון שרץ. תפקידו: לקחת את קומפוננטת השורש <App /> ולצייר אותה
// לתוך אלמנט ה-#root שב-index.html.
// ============================================================================

import React from 'react'                       // ספריית React הבסיסית
import ReactDOM from 'react-dom/client'          // החבילה שמחברת בין React ל-DOM של הדפדפן
import { BrowserRouter } from 'react-router-dom' // ראוטר שמאפשר ניווט בין דפים בלי רענון העמוד
import App from './App.jsx'                       // קומפוננטת השורש של האפליקציה
import { AuthProvider } from './context/AuthContext.jsx' // ספק ההתחברות (מי המשתמש המחובר)
import './index.css'                              // עיצוב גלובלי (מערכת העיצוב של האתר)

// יצירת ה-"root" של React וציור האפליקציה לתוכו.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode = מצב פיתוח שעוזר לאתר באגים נפוצים (מריץ אפקטים פעמיים בפיתוח בלבד)
  <React.StrictMode>
    {/* BrowserRouter עוטף את כל האפליקציה כדי שכל דף יוכל להגדיר נתיב (route) */}
    <BrowserRouter>
      {/* AuthProvider שומר את פרטי המשתמש המחובר וזמין לכל הדפים */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
