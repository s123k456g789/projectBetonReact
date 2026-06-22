// ============================================================================
// דף פרסום הצעה מקבלן (ContractorRequestPage)  ←  הסעיף "ד. הגשת בקשה מקבלן"
// ----------------------------------------------------------------------------
// תפקיד הדף: קבלן מחובר מפרסם הצעה על עודפי בטון שנשארו לו. ההצעה כוללת את
// סוג הבטון, הכמות, המיקום, ו"זמן תפוגה" - הרגע שבו הבטון יתקשה ולא יהיה שמיש.
// הנתונים נשלחים לשרת (POST /contractor-offers/) לטבלת ContractorConcreteRequests.
//
// השדות תואמים למודל בשרת:
//   contractor_id (מהמשתמש המחובר), concrete_id, quantity, address,
//   lat, lng, expiry_time, region
//
// תכונה נחמדה: סוג הבטון בשרת הוא "מורכב" (מצביע על חוזק/סומך/גודל אבן/מטרה
// דרך מזהים). כדי שהקבלן יבין מה הוא בוחר, אנחנו טוענים גם את טבלאות העזר
// ובונים תווית קריאה לכל סוג בטון.
// ============================================================================

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { contractorOffersApi, lookupsApi } from '../api/betonApi.js'
import { REGIONS } from '../config/constants.js'
import FormField from '../components/FormField.jsx'
import LocationPicker from '../components/LocationPicker.jsx'
import Alert from '../components/Alert.jsx'

export default function ContractorRequestPage() {
  const { user } = useAuth() // הקבלן המחובר

  // ---- נתונים שנטענים מהשרת ----
  const [concreteOptions, setConcreteOptions] = useState([]) // [{ id, label }]
  const [loadingTypes, setLoadingTypes] = useState(true)

  // ---- שדות הטופס ----
  const [concreteId, setConcreteId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [region, setRegion] = useState('')
  const [expiryTime, setExpiryTime] = useState('')   // זמן תפוגה (datetime-local)
  const [location, setLocation] = useState({ address: '', lat: '', lng: '' })

  // ---- מצבי תצוגה ----
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // טעינת סוגי הבטון + טבלאות העזר, ובניית תווית קריאה לכל סוג.
  useEffect(() => {
    async function loadConcreteTypes() {
      try {
        // טוענים את כל הטבלאות הדרושות במקביל (מהיר יותר מאשר אחת-אחת)
        const [types, strengths, reliants, stoneSizes, purposes] = await Promise.all([
          lookupsApi.concreteTypes(),
          lookupsApi.strengths(),
          lookupsApi.reliants(),
          lookupsApi.stoneSizes(),
          lookupsApi.purposes(),
        ])

        // בונים "מילונים" מ-id לשם, לחיפוש מהיר
        const byId = (arr, field) => Object.fromEntries(arr.map((x) => [x.id, x[field]]))
        const strengthMap = byId(strengths, 'strength')
        const reliantMap = byId(reliants, 'Reliant')
        const stoneMap = byId(stoneSizes, 'Stone_size')
        const purposeMap = byId(purposes, 'Purpose')

        // לכל סוג בטון - בונים תווית מהמאפיינים שלו
        const options = types.map((t) => {
          const parts = [
            strengthMap[t.strength_id] && `חוזק: ${strengthMap[t.strength_id]}`,
            reliantMap[t.Reliant_id] && `סומך: ${reliantMap[t.Reliant_id]}`,
            stoneMap[t.Stone_size_id] && `אבן: ${stoneMap[t.Stone_size_id]}`,
            purposeMap[t.Purpose_id] && `מטרה: ${purposeMap[t.Purpose_id]}`,
          ].filter(Boolean) // מסננים מאפיינים ריקים
          // אם אין שום מאפיין - מציגים לפחות את המזהה
          return { id: t.id, label: parts.length ? parts.join(' · ') : `סוג בטון #${t.id}` }
        })
        setConcreteOptions(options)
      } catch {
        setServerError('לא הצלחנו לטעון את רשימת סוגי הבטון מהשרת.')
      } finally {
        setLoadingTypes(false)
      }
    }
    loadConcreteTypes()
  }, [])

  function validate() {
    const errs = {}
    if (!quantity) errs.quantity = 'יש להזין כמות'
    else if (Number(quantity) <= 0) errs.quantity = 'הכמות חייבת להיות גדולה מ-0'
    // קו רוחב/אורך אופציונליים בשרת עבור הצעת קבלן, אך אם הוזנו - שיהיו תקינים
    if (location.lat !== '' && isNaN(Number(location.lat))) errs.lat = 'קו רוחב לא תקין'
    if (location.lng !== '' && isNaN(Number(location.lng))) errs.lng = 'קו אורך לא תקין'
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
      const payload = {
        contractor_id: user.id,                                // מזהה הקבלן המחובר
        concrete_id: concreteId ? Number(concreteId) : null,   // סוג הבטון
        quantity: Number(quantity),                            // כמות העודפים במ"ק
        address: location.address || null,
        lat: location.lat !== '' ? Number(location.lat) : null,
        lng: location.lng !== '' ? Number(location.lng) : null,
        // זמן תפוגה: שדה datetime-local מחזיר מחרוזת ISO שהשרת יודע לפענח
        expiry_time: expiryTime || null,
        region: region || null,
      }
      await contractorOffersApi.create(payload)

      setSuccess('ההצעה פורסמה בהצלחה! לקוחות באזור יוכלו לראות אותה לפני שהבטון מתקשה.')
      setConcreteId(''); setQuantity(''); setRegion(''); setExpiryTime('')
      setLocation({ address: '', lat: '', lng: '' })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">פרסום הצעת בטון</h1>
      <p className="page-subtitle">נשארו לך עודפי בטון? פרסם הצעה ומצא לקוח לפני שהבטון מתקשה.</p>

      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <Alert type="success">{success}</Alert>
        <Alert type="danger">{serverError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          {/* בחירת סוג הבטון */}
          <FormField
            as="select"
            label="סוג הבטון"
            name="concrete"
            value={concreteId}
            onChange={(e) => setConcreteId(e.target.value)}
            hint={loadingTypes ? 'טוען סוגי בטון...' : 'בחר/י את הסוג שמתאר את העודפים שלך.'}
          >
            <option value="">-- בחר/י סוג בטון (אופציונלי) --</option>
            {concreteOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </FormField>

          {/* כמות העודפים */}
          <FormField
            label='כמות בטון פנויה (מ"ק)'
            name="quantity"
            type="number"
            step="0.5"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="לדוגמה: 3"
            error={errors.quantity}
          />

          {/* זמן תפוגה - קריטי בבטון! */}
          <FormField
            label="זמן תפוגת ההצעה"
            name="expiry"
            type="datetime-local"
            value={expiryTime}
            onChange={(e) => setExpiryTime(e.target.value)}
            hint="עד מתי הבטון עדיין שמיש? אחרי זמן זה ההצעה אינה רלוונטית."
          />

          {/* אזור */}
          <FormField
            as="select"
            label="אזור"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            hint="האזור עוזר להתאים אותך ללקוחות קרובים."
          >
            <option value="">-- בחר/י אזור (אופציונלי) --</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </FormField>

          {/* מיקום */}
          <LocationPicker values={location} onChange={setLocation} errors={errors} />

          <button type="submit" className="btn btn-secondary btn-block btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : 'פרסום ההצעה'}
          </button>
        </form>
      </div>
    </div>
  )
}
