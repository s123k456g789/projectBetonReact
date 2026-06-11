// קובץ הגדרות של Vite - כלי הבנייה וההרצה של פרויקט ה-React
// Vite נותן לנו שרת פיתוח מהיר מאוד (עם hot-reload) ובנייה מהירה לייצור.
import { defineConfig } from 'vite'        // פונקציה לעטיפת ההגדרות (נותנת השלמות אוטומטיות)
import react from '@vitejs/plugin-react'   // התוסף שמלמד את Vite להבין React/JSX

// https://vitejs.dev/config/
export default defineConfig({
  // רשימת התוספים. plugin-react מאפשר כתיבת קומפוננטות React וקבצי .jsx
  plugins: [react()],
  server: {
    port: 5173,   // הפורט שעליו ירוץ שרת הפיתוח: http://localhost:5173
    open: true,   // לפתוח אוטומטית את הדפדפן כשמריצים npm run dev
  },
})
