"""
שירות Geocoding - המרת כתובת לקואורדינטות (קו רוחב/אורך)
=========================================================
זהו בדיוק החלק שביקשת: "פונקציה שמקבלת את הכתובת (גם מלקוח וגם מקבלן),
ובעזרת מפתח Google מכניסה למסד הנתונים את קו האורך וקו הרוחב".

איך זה עובד:
1. שולחים את הכתובת ל-Google Geocoding API יחד עם המפתח.
2. Google מחזיר JSON עם הקואורדינטות (lat, lng) של הכתובת.
3. אנחנו שומרים את הקואורדינטות בעמודות lat/lng של הרשומה ב-DB.

למה זה חשוב:
המשתמש מקליד כתובת מילולית ("הרצל 10 תל אביב"), אבל כל חישובי המרחק
וההתאמה דורשים קואורדינטות מספריות. הקובץ הזה הוא הגשר בין השניים.
"""

import requests                              # ספרייה לשליחת בקשות HTTP ל-Google
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from service.geo_config import geo_settings  # המפתח וההגדרות
from models.concrete_request import ConcreteRequest
from models.contractor_concrete_request import ContractorConcreteRequest


class GeocodingService:
    """שירות להמרת כתובות לקואורדינטות ולשמירתן ב-DB."""

    def __init__(self, db: Session):
        self.db = db   # סשן ה-DB שדרכו נעדכן רשומות

    # ------------------------------------------------------------------
    # הליבה: המרת כתובת בודדת לקואורדינטות מול Google
    # ------------------------------------------------------------------
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        מקבל כתובת מילולית ומחזיר (lat, lng) או None אם לא נמצא.
        :param address: כתובת חופשית, למשל "דרך מנחם בגין 1, תל אביב"
        :return: tuple של (קו רוחב, קו אורך) או None
        """
        # אם אין מפתח מוגדר - לא ניתן לבצע Geocoding (נמנע מקריסה שקטה)
        if not geo_settings.GOOGLE_MAPS_API_KEY:
            raise RuntimeError(
                "חסר GOOGLE_MAPS_API_KEY בקובץ .env - לא ניתן להמיר כתובת לקואורדינטות"
            )

        # הפרמטרים שנשלחים ל-Google
        params = {
            "address": address,                              # הכתובת להמרה
            "key": geo_settings.GOOGLE_MAPS_API_KEY,         # המפתח שלך
            "region": "il",                                  # רמז ש-המדינה היא ישראל
            "language": "he",                                # תוצאות בעברית
        }

        # שליחת הבקשה ל-Google (עם פסק זמן כדי לא להיתקע)
        response = requests.get(geo_settings.GEOCODING_URL, params=params, timeout=10)
        response.raise_for_status()   # זורק שגיאה אם ה-HTTP נכשל
        data = response.json()

        # Google מחזיר status="OK" כשמצא, ו-"ZERO_RESULTS" כשלא מצא כתובת
        if data.get("status") != "OK" or not data.get("results"):
            return None

        # חילוץ הקואורדינטות מהתוצאה הראשונה (הכי רלוונטית)
        location = data["results"][0]["geometry"]["location"]
        return (location["lat"], location["lng"])

    # ------------------------------------------------------------------
    # המרה + שמירה לבקשת לקוח
    # ------------------------------------------------------------------
    def geocode_and_save_customer_request(self, request_id: int) -> ConcreteRequest:
        """
        טוען בקשת לקוח, ממיר את הכתובת שלה לקואורדינטות, ושומר ב-DB.
        :param request_id: מזהה בקשת הלקוח
        :return: הרשומה המעודכנת
        """
        # 1. שליפת הבקשה מה-DB
        req = self.db.query(ConcreteRequest).get(request_id)
        if req is None:
            raise ValueError(f"בקשת לקוח {request_id} לא נמצאה")
        if not req.address:
            raise ValueError("לבקשה אין כתובת - אי אפשר להמיר לקואורדינטות")

        # 2. המרת הכתובת
        coords = self.geocode_address(req.address)
        if coords is None:
            raise ValueError(f"Google לא הצליח לאתר את הכתובת: {req.address}")

        # 3. שמירת התוצאה בעמודות lat/lng ושמירה ל-DB
        req.lat, req.lng = coords
        self.db.commit()       # שמירה קבועה ב-DB
        self.db.refresh(req)   # רענון האובייקט מה-DB
        return req

    # ------------------------------------------------------------------
    # המרה + שמירה להצעת קבלן
    # ------------------------------------------------------------------
    def geocode_and_save_contractor_offer(self, offer_id: int) -> ContractorConcreteRequest:
        """
        כמו הפונקציה הקודמת, אך עבור הצעת קבלן (טבלה אחרת, אותו עיקרון).
        כך גם הלקוח וגם הקבלן מקבלים קואורדינטות מהכתובת שלהם - כפי שביקשת.
        """
        offer = self.db.query(ContractorConcreteRequest).get(offer_id)
        if offer is None:
            raise ValueError(f"הצעת קבלן {offer_id} לא נמצאה")
        if not offer.address:
            raise ValueError("להצעה אין כתובת - אי אפשר להמיר לקואורדינטות")

        coords = self.geocode_address(offer.address)
        if coords is None:
            raise ValueError(f"Google לא הצליח לאתר את הכתובת: {offer.address}")

        offer.lat, offer.lng = coords
        self.db.commit()
        self.db.refresh(offer)
        return offer
