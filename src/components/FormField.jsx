// ============================================================================
// שדה טופס לשימוש חוזר (FormField)
// ----------------------------------------------------------------------------
// תפקיד: לעטוף תווית (label) + שדה קלט + הסבר + הודעת שגיאה במבנה אחיד.
// כך כל הטפסים נראים זהים ונחסך קוד חוזר. תומך גם ב-input, גם ב-select
// וגם ב-textarea (דרך ה-prop בשם "as").
//
// דוגמה לשימוש:
//   <FormField label="שם מלא" required value={name} onChange={...} hint="כפי שיופיע במערכת" />
// ============================================================================

export default function FormField({
  label,                 // הכותרת מעל השדה
  name,                  // שם השדה (חשוב לטפסים)
  type = 'text',         // סוג הקלט (text/tel/number/datetime-local וכו')
  value,                 // הערך הנוכחי
  onChange,              // פונקציה שמופעלת בכל שינוי
  required = false,      // האם השדה חובה (מוסיף כוכבית אדומה)
  hint,                  // הסבר קטן מתחת לשדה
  error,                 // הודעת שגיאת ולידציה (אם יש)
  placeholder,           // טקסט רמז בתוך השדה
  as = 'input',          // סוג האלמנט: 'input' | 'select' | 'textarea'
  children,              // עבור select - רשימת ה-<option>
  ...rest                // שאר התכונות (min, max, step וכו') מועברות לשדה
}) {
  // בוחרים איזה אלמנט לצייר לפי ה-prop בשם "as"
  const Element = as

  // כיתת השגיאה מתווספת רק אם יש שגיאה (מסמן מסגרת אדומה)
  const controlClass = `form-control${error ? ' invalid' : ''}`

  return (
    <div className="form-group">
      {/* התווית - אם השדה חובה, מוסיפים כוכבית אדומה */}
      <label className="form-label" htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>

      {/* השדה עצמו. עבור input מעבירים type, עבור select/textarea לא צריך */}
      <Element
        id={name}
        name={name}
        className={controlClass}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...(as === 'input' ? { type } : {})}
        {...rest}
      >
        {children}
      </Element>

      {/* הסבר קטן (מוצג רק אם הוגדר ואין שגיאה) */}
      {hint && !error && <span className="form-hint">{hint}</span>}

      {/* הודעת שגיאה (מוצגת רק אם קיימת) */}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
