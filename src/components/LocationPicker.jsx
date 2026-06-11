// ============================================================================
// בורר מיקום (LocationPicker)
// ----------------------------------------------------------------------------
// תפקיד: לאסוף את המיקום של המשתמש (כתובת + קו רוחב/אורך).
// השרת דורש lat/lng (קואורדינטות), ולכן יש כאן שני מסלולים:
//   1. כפתור "אתר את מיקומי הנוכחי" - משתמש ב-Geolocation של הדפדפן וממלא
//      אוטומטית את קו הרוחב והאורך (הכי מדויק ונוח למשתמש בשטח).
//   2. הזנה ידנית של קו רוחב/אורך - גיבוי אם המשתמש חוסם מיקום.
//
// הערה: בשרת המלא מתוכנן Geocoding (המרת כתובת -> קואורדינטות) בעזרת מפתח
// Google. עד שזה יוטמע, הרכיב הזה נותן פתרון מלא ועובד מצד הלקוח.
//
// הרכיב "מבוקר" (controlled): הוא לא מחזיק state משלו אלא מקבל את הערכים
// ואת פונקציית העדכון מההורה (טופס הבקשה). כך כל המידע נשמר במקום אחד.
// ============================================================================

import { useState } from 'react'
import FormField from './FormField.jsx'

export default function LocationPicker({ values, onChange, errors = {} }) {
  // הודעת סטטוס של איתור המיקום (טעינה / שגיאה)
  const [geoStatus, setGeoStatus] = useState('')

  // פונקציית עזר לעדכון שדה בודד אצל ההורה
  function update(field, value) {
    onChange({ ...values, [field]: value })
  }

  // איתור המיקום הנוכחי דרך ה-API של הדפדפן
  function detectLocation() {
    // בדיקה שהדפדפן תומך באיתור מיקום
    if (!navigator.geolocation) {
      setGeoStatus('הדפדפן לא תומך באיתור מיקום. אנא הזינו ידנית.')
      return
    }
    setGeoStatus('מאתר את מיקומך...')

    navigator.geolocation.getCurrentPosition(
      // הצלחה: ממלאים את קו הרוחב והאורך (מעוגלים ל-6 ספרות כמו ב-DB)
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        onChange({ ...values, lat, lng })
        setGeoStatus('✓ המיקום אותר בהצלחה ומולא אוטומטית.')
      },
      // כישלון: הסבר מה לעשות
      (err) => {
        setGeoStatus(
          err.code === err.PERMISSION_DENIED
            ? 'הגישה למיקום נחסמה. אנא הזינו את הקואורדינטות ידנית.'
            : 'לא הצלחנו לאתר את המיקום. אנא הזינו ידנית.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 } // ביקוש דיוק גבוה, פסק זמן 10 שניות
    )
  }

  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      {/* שדה כתובת חופשי (לתצוגה ולשימוש עתידי ב-Geocoding בשרת) */}
      <FormField
        label="כתובת"
        name="address"
        value={values.address}
        onChange={(e) => update('address', e.target.value)}
        placeholder="לדוגמה: הרצל 10, תל אביב"
        hint="כתובת מילולית לאיתור. בעתיד השרת ימיר אותה אוטומטית לקואורדינטות."
        error={errors.address}
      />

      {/* כפתור איתור מיקום אוטומטי */}
      <button type="button" className="btn btn-outline" onClick={detectLocation} style={{ marginBottom: 'var(--space-sm)' }}>
        📍 אתר את מיקומי הנוכחי
      </button>
      {/* הודעת סטטוס של האיתור */}
      {geoStatus && <span className="form-hint" style={{ display: 'block', marginBottom: 'var(--space-md)' }}>{geoStatus}</span>}

      {/* קו רוחב + קו אורך זה לצד זה */}
      <div className="form-row">
        <FormField
          label="קו רוחב (Latitude)"
          name="lat"
          type="number"
          step="0.000001"
          value={values.lat}
          onChange={(e) => update('lat', e.target.value)}
          required
          placeholder="32.0853"
          error={errors.lat}
        />
        <FormField
          label="קו אורך (Longitude)"
          name="lng"
          type="number"
          step="0.000001"
          value={values.lng}
          onChange={(e) => update('lng', e.target.value)}
          required
          placeholder="34.7818"
          error={errors.lng}
        />
      </div>
    </fieldset>
  )
}
