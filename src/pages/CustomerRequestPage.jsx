// ============================================================================
// דף הגשת בקשה מלקוח (CustomerRequestPage)  ←  הסעיף "ג. הגשת בקשה מלקוח"
// ----------------------------------------------------------------------------
// תפקיד הדף: לקוח מחובר מפרסם בקשה לקבלת בטון. הבקשה כוללת את הכמות הדרושה,
// מטרת השימוש, והמיקום (כתובת + קואורדינטות). הנתונים נשלחים לשרת
// (POST /concrete-requests/) ונשמרים בטבלת ConcreteRequests.
//
// השדות תואמים בדיוק למודל בשרת:
//   customer_id (מהמשתמש המחובר), purpose_id, quantity, address, lat, lng, region
//
// הדף מוגן ב-ProtectedRoute (רק לקוח מחובר יכול להגיע אליו).
// ============================================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { concreteRequestsApi, lookupsApi } from '../api/betonApi.js'
import { REGIONS } from '../config/constants.js'
import FormField from '../components/FormField.jsx'
import LocationPicker from '../components/LocationPicker.jsx'
import Alert from '../components/Alert.jsx'

export default function CustomerRequestPage() {
  const { user } = useAuth() // הלקוח המחובר (נשתמש ב-id שלו)

  // ---- רשימת המטרות (Purposes) שתיטען מהשרת ל-dropdown ----
  const [purposes, setPurposes] = useState([])

  // ---- שדות הטופס ----
  const [purposeId, setPurposeId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [region, setRegion] = useState('')
  // המיקום מנוהל כאובייקט אחד (מועבר ל-LocationPicker)
  const [location, setLocation] = useState({ address: '', lat: '', lng: '' })

  // ---- מצבי תצוגה ----
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // טעינת רשימת המטרות מהשרת פעם אחת כשהדף נטען
  useEffect(() => {
    lookupsApi.purposes()
      .then(setPurposes)
      .catch(() => setServerError('לא הצלחנו לטעון את רשימת המטרות מהשרת.'))
  }, [])

  /**
   * ולידציה. בשרת lat/lng הם חובה, ולכן בודקים אותם בקפדנות.
   */
  function validate() {
    const errs = {}
    if (!quantity) errs.quantity = 'יש להזין כמות'
    else if (Number(quantity) <= 0) errs.quantity = 'הכמות חייבת להיות גדולה מ-0'

    // קואורדינטות חובה (כך מוגדר בשרת)
    if (location.lat === '' || isNaN(Number(location.lat))) errs.lat = 'יש להזין קו רוחב תקין'
    if (location.lng === '' || isNaN(Number(location.lng))) errs.lng = 'יש להזין קו אורך תקין'

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')
    setSuccess('')

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      // בניית גוף הבקשה בדיוק לפי ה-DTO של השרת
      const payload = {
        customer_id: user.id,                                  // מזהה הלקוח המחובר
        purpose_id: purposeId ? Number(purposeId) : null,      // מטרה (אופציונלי)
        quantity: Number(quantity),                            // כמות במ"ק
        address: location.address || null,                     // כתובת מילולית
        lat: Number(location.lat),                             // קו רוחב (חובה)
        lng: Number(location.lng),                             // קו אורך (חובה)
        region: region || null,                                // אזור לסינון מהיר
      }
      await concreteRequestsApi.create(payload)

      // הצלחה - מציגים הודעה ומאפסים את הטופס
      setSuccess('הבקשה נשלחה בהצלחה! קבלנים באזורך יוכלו לראות אותה ולפנות אליך.')
      setPurposeId(''); setQuantity(''); setRegion('')
      setLocation({ address: '', lat: '', lng: '' })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">הגשת בקשה לבטון</h1>
      <p className="page-subtitle">פרסם בקשה וקבלנים עם עודפי בטון באזורך יוכלו להציע לך.</p>

      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <Alert type="success">{success}</Alert>
        <Alert type="danger">{serverError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          {/* בחירת מטרת השימוש בבטון - מתוך רשימה שנטענת מהשרת */}
          <FormField
            as="select"
            label="מטרת השימוש"
            name="purpose"
            value={purposeId}
            onChange={(e) => setPurposeId(e.target.value)}
            hint="למה מיועד הבטון? (יסודות, רצפה, גדר וכו')"
          >
            <option value="">-- בחר/י מטרה (אופציונלי) --</option>
            {purposes.map((p) => (
              // שם העמודה בשרת הוא "Purpose" (באות גדולה) - לכן p.Purpose
              <option key={p.id} value={p.id}>{p.Purpose}</option>
            ))}
          </FormField>

          {/* כמות הבטון הנדרשת */}
          <FormField
            label='כמות בטון (מ"ק)'
            name="quantity"
            type="number"
            step="0.5"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="לדוגמה: 2.5"
            error={errors.quantity}
          />

          {/* בחירת אזור גיאוגרפי */}
          <FormField
            as="select"
            label="אזור"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            hint="האזור עוזר להתאמה מהירה לקבלנים בקרבתך."
          >
            <option value="">-- בחר/י אזור (אופציונלי) --</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </FormField>

          {/* רכיב המיקום (כתובת + קואורדינטות + איתור אוטומטי) */}
          <LocationPicker values={location} onChange={setLocation} errors={errors} />

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : 'שליחת הבקשה'}
          </button>
        </form>
      </div>
    </div>
  )
}
