"""
הגדרות מפתחות וקבועים לשכבת השירות הגיאוגרפית
================================================
מטרת הקובץ: לרכז במקום אחד את מפתח Google ואת הקבועים של אלגוריתם ההתאמה.
את המפתחות אנחנו טוענים ממשתני סביבה (קובץ .env) - לעולם לא כותבים מפתח
ישירות בקוד שנדחף ל-Git!

הוסיפי לקובץ .env שלך (לצד ההגדרות הקיימות):
    GOOGLE_MAPS_API_KEY=AIza....            # המפתח שלך מ-Google Cloud
    MATCH_RADIUS_KM=30                       # רדיוס חיפוש מקסימלי (ק"מ אוויר)
    DISPATCH_STRATEGY=sequential             # אסטרטגיית שליחה: sequential / broadcast
    SEQUENTIAL_WAIT_SECONDS=180              # כמה שניות מחכים לתשובה (3 דקות)
"""

import os
from dotenv import load_dotenv   # טוען את קובץ ה-.env

load_dotenv()


class GeoSettings:
    """ריכוז כל ההגדרות הגיאוגרפיות והאלגוריתמיות במקום אחד."""

    # ----- מפתח Google -----
    # מפתח אחד יכול לשמש גם ל-Geocoding API וגם ל-Routes API
    # (צריך להפעיל את שני ה-APIs ב-Google Cloud Console).
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # כתובות הבסיס של שירותי Google
    GEOCODING_URL: str = "https://maps.googleapis.com/maps/api/geocode/json"
    ROUTES_URL: str = "https://routes.googleapis.com/directions/v2:computeRoutes"

    # ----- פרמטרים של אלגוריתם ההתאמה -----
    # רדיוס מקסימלי לחיפוש מועמדים (במרחק אווירי). מעבר לזה כבר לא משתלם בבטון.
    MATCH_RADIUS_KM: float = float(os.getenv("MATCH_RADIUS_KM", "30"))

    # סטיית כמות מותרת: עד כמה אחוז מעל הבקשה עדיין נחשב "מתאים".
    # למשל לקוח שצריך 2 מ"ק - הצעה של 2 עד ~3 מ"ק עדיין טובה.
    QUANTITY_TOLERANCE: float = float(os.getenv("QUANTITY_TOLERANCE", "0.5"))  # 50% מעל

    # ----- פרמטרים של נוסחת העדיפות -----
    # משקל לזמן ההמתנה של הלקוח (כמה ימים הוא כבר מחכה).
    PRIORITY_WAIT_WEIGHT: float = float(os.getenv("PRIORITY_WAIT_WEIGHT", "1.0"))
    # משקל (שלילי) לזמן הנסיעה - נסיעה ארוכה מורידה עדיפות.
    PRIORITY_TRAVEL_WEIGHT: float = float(os.getenv("PRIORITY_TRAVEL_WEIGHT", "0.3"))

    # ----- אסטרטגיית שליחת התראות -----
    # "sequential" = שולחים לעדיפות הגבוהה, מחכים, ועוברים הלאה (מומלץ).
    # "broadcast"   = שולחים לכולם בו-זמנית, הראשון שתופס זוכה.
    DISPATCH_STRATEGY: str = os.getenv("DISPATCH_STRATEGY", "sequential")
    # כמה שניות מחכים לתשובה מכל קבלן/לקוח לפני שעוברים לבא בתור.
    SEQUENTIAL_WAIT_SECONDS: int = int(os.getenv("SEQUENTIAL_WAIT_SECONDS", "180"))


# אובייקט גלובלי לייבוא מכל קובץ בשכבת השירות
geo_settings = GeoSettings()
