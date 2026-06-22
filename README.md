# projectBetonReact — צד לקוח (React)

פרויקט **Beton** — פלטפורמה לתיווך שאריות בטון בין **קבלנים** (שנשארו להם עודפי בטון
טריים) לבין **לקוחות** (שצריכים כמות קטנה), לפני שהבטון מתקשה.

זהו **צד הלקוח** (Frontend) ב-React, שמתחבר לשרת ה-FastAPI שבמאגר
[`projectBeton`](https://github.com/s123k456g789/projectBeton).

---

## מה יש כאן

```
projectBetonReact/
├── src/                     ← קוד צד הלקוח (React)
│   ├── pages/               ← הדפים: בית, הרשמה, התחברות, בקשת לקוח, הצעת קבלן
│   ├── components/          ← רכיבים לשימוש חוזר (Navbar, טפסים, מיקום...)
│   ├── context/             ← ניהול התחברות (AuthContext)
│   ├── api/                 ← תקשורת עם שרת ה-FastAPI
│   ├── config/              ← קבועים (תפקידים, אזורים)
│   └── index.css            ← מערכת העיצוב המלאה (צבעים מתועדים)
├── python-service/          ← מימוש מלא של שכבת ה-service בפייתון (להעתקה ל-projectBeton)
│   └── service/             ← geocoding, region, matching (R-Tree), notification
├── ANSWERS_HE.txt           ← תשובות, המלצות (R-TREE), פקודות SQL, הסברים מפורטים
├── EXPLANATION_HE.md        ← מדריך מפורט לצד הלקוח ולבחירות העיצוב
└── README.md                ← הקובץ הזה
```

---

## התקנה והרצה (צד לקוח)

דרישה מוקדמת: **Node.js 18+**.

```powershell
# 1. התקנת החבילות
npm install

# 2. הגדרת כתובת השרת (פעם אחת)
Copy-Item .env.example .env
#   ← ערכו את .env כך ש-VITE_API_URL יצביע לשרת ה-FastAPI (ברירת מחדל: http://localhost:8000)

# 3. הרצת שרת הפיתוח
npm run dev
#   ← נפתח בדפדפן בכתובת http://localhost:5173
```

> ודאו ששרת ה-FastAPI (מאגר projectBeton) רץ במקביל, אחרת הטפסים לא יוכלו לשמור נתונים.

לבנייה לייצור: `npm run build` (התוצר נכנס לתיקיית `dist/`).

---

## הדפים (לפי המפרט)

| דף | נתיב | מה הוא עושה |
|----|------|-------------|
| דף הבית | `/` | הצגת הרעיון ובחירת מסלול (לקוח / קבלן) |
| **א. הרשמה** | `/register` | פתיחת חשבון לקוח או קבלן (שם + טלפון) |
| **ב. התחברות** | `/login` | כניסה חוזרת לפי טלפון + תפקיד |
| **ג. בקשת לקוח** | `/customer/request` | לקוח מפרסם בקשה לבטון (כמות, מטרה, מיקום) |
| **ד. הצעת קבלן** | `/contractor/request` | קבלן מפרסם עודפי בטון (סוג, כמות, תפוגה, מיקום) |

---

## שכבת השרת (Python)

המימוש המלא של שכבת ה-service (שהייתה "שלד בלבד" במאגר projectBeton) נמצא ב-
[`python-service/`](python-service/). הוא כולל Geocoding מול Google, אינדקס מרחבי
**R-Tree**, חישוב מרחק ועדיפות, וחיבור התראות.

📄 **כל ההסברים, ההמלצות (כולל R-TREE), פקודות ה-SQL ובחירות העיצוב — בקובץ
[`ANSWERS_HE.txt`](ANSWERS_HE.txt).**
