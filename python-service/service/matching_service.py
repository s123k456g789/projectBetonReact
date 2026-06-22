"""
שירות התאמה (Matching Service) - מימוש מלא
============================================
זהו לב הלוגיקה של הפרויקט - התאמה בין לקוחות (שצריכים בטון) לקבלנים
(שיש להם עודפים), תוך שימוש ב-R-Tree, בחישוב מרחק, בזמן נסיעה אמיתי
מ-Google, ובנוסחת עדיפות.

שלבי ההתאמה (Pipeline):
  שלב 1 - סינון גס לפי אזור (זול): מצמצמים את מאגר המועמדים.
  שלב 2 - אינדקס מרחבי R-Tree (מהיר): מאתרים מי בכלל קרוב גיאוגרפית.
  שלב 3 - סינון מדויק: מרחק אווירי (Haversine), חפיפת סוג בטון, כמות, תוקף.
  שלב 4 - חישוב זמן נסיעה אמיתי (Google Routes) רק למי ששרד את הסינון.
  שלב 5 - חישוב ציון עדיפות ומיון.

מדוע הסדר הזה? כל שלב יקר יותר מקודמו. אנחנו מצמצמים הרבה בשלבים הזולים,
וכך מריצים את הקריאות היקרות ל-Google רק על מספר קטן של מועמדים.
"""

import math
import requests
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy.orm import Session

from service.geo_config import geo_settings
from service.region_service import RegionService
from models.concrete_request import ConcreteRequest
from models.contractor_concrete_request import ContractorConcreteRequest
from models.concrete_type import ConcreteType

# ייבוא R-Tree הוא "רך": אם הספרייה לא מותקנת, נופלים אוטומטית לסריקה לינארית
# (כך הקוד תמיד רץ, גם אם libspatialindex עוד לא הותקן). ראה הסבר בקובץ ה-txt.
try:
    from rtree import index as rtree_index
    _RTREE_AVAILABLE = True
except Exception:
    _RTREE_AVAILABLE = False


# ===========================================================================
# מבנה עזר להחזרת תוצאת התאמה (במקום dict "עיוור")
# ===========================================================================
class MatchResult:
    """תוצאת התאמה בודדת - מחזיקה את הרשומה ואת המדדים שחושבו עבורה."""

    def __init__(self, record, distance_km, travel_minutes, priority_score):
        self.record = record                 # רשומת הלקוח/הקבלן שהותאמה
        self.distance_km = distance_km        # מרחק אווירי בק"מ
        self.travel_minutes = travel_minutes  # זמן נסיעה אמיתי בדקות (או None)
        self.priority_score = priority_score  # ציון עדיפות (גבוה = עדיף)

    def to_dict(self):
        """המרה ל-dict נוח להחזרה כ-JSON מה-API."""
        return {
            "record_id": getattr(self.record, "request_id", getattr(self.record, "id", None)),
            "distance_km": round(self.distance_km, 2),
            "travel_minutes": self.travel_minutes,
            "priority_score": round(self.priority_score, 2),
        }


class MatchingService:
    """שירות שמתאים בין בקשות לקוחות להצעות קבלנים, ולהיפך."""

    def __init__(self, db: Session):
        self.db = db
        self.region_service = RegionService()

    # =======================================================================
    # שלב 3א: חישוב מרחק אווירי בין שתי נקודות - נוסחת Haversine
    # =======================================================================
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        מחשב את המרחק האווירי (בק"מ) בין שתי נקודות על פני כדור הארץ.
        נוסחת Haversine מתחשבת בעקמומיות כדור הארץ (לא קו ישר על מפה שטוחה).
        """
        R = 6371.0  # רדיוס כדור הארץ בק"מ

        # המרת מעלות לרדיאנים (הפונקציות הטריגונומטריות עובדות ברדיאנים)
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lng2 - lng1)

        # נוסחת Haversine
        a = (math.sin(d_phi / 2) ** 2
             + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # =======================================================================
    # שלב 4: זמן נסיעה אמיתי בכביש - Google Routes API
    # =======================================================================
    def travel_time_minutes(self, origin_lat, origin_lng, dest_lat, dest_lng) -> Optional[float]:
        """
        מחזיר את זמן הנסיעה ברכב (בדקות) בין מוצא ליעד, לפי Google Routes API.
        אם אין מפתח או שהקריאה נכשלה - מחזיר None (וההתאמה תסתמך על מרחק אווירי).
        """
        if not geo_settings.GOOGLE_MAPS_API_KEY:
            return None

        # גוף הבקשה ל-Routes API (פורמט v2)
        body = {
            "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lng}}},
            "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lng}}},
            "travelMode": "DRIVE",                 # נסיעה ברכב (משאית בטון)
            "routingPreference": "TRAFFIC_AWARE",  # להתחשב בעומסי תנועה
        }
        # ה-Routes API דורש כותרת מיוחדת שמציינת אילו שדות מחזירים (חוסך עלות)
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": geo_settings.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "routes.duration",
        }
        try:
            resp = requests.post(geo_settings.ROUTES_URL, json=body, headers=headers, timeout=10)
            resp.raise_for_status()
            routes = resp.json().get("routes", [])
            if not routes:
                return None
            # duration מגיע כמחרוזת שניות, למשל "1234s"
            duration_str = routes[0]["duration"]
            seconds = float(duration_str.rstrip("s"))
            return round(seconds / 60.0, 1)   # המרה לדקות
        except Exception:
            return None  # כל תקלה -> מסתמכים על המרחק האווירי בלבד

    # =======================================================================
    # שלב 5: נוסחת עדיפות
    # =======================================================================
    def calculate_priority(self, waiting_days: float, travel_minutes: Optional[float]) -> float:
        """
        מחשב ציון עדיפות. ציון גבוה = עדיפות גבוהה יותר.

        הרעיון (בדיוק כמו בדוגמה שלך):
          • ככל שהלקוח מחכה יותר זמן - העדיפות עולה (משקל חיובי).
          • ככל שזמן הנסיעה ארוך יותר - העדיפות יורדת (משקל שלילי), כי נסיעה
            ארוכה מסכנת את הבטון (שמתקשה) ומייקרת.

        ציון = (משקל_המתנה * ימי_המתנה) − (משקל_נסיעה * דקות_נסיעה)

        דוגמה (עם משקלי ברירת המחדל 1.0 ו-0.3):
          לקוח א': מחכה 14 יום, נסיעה 30 דק' → 14 − 9 = 5.0
          לקוח ב': מחכה 7 יום,  נסיעה 10 דק' → 7  − 3 = 4.0
          => לקוח א' מקבל עדיפות גבוהה יותר, כי המתנה ארוכה גוברת. בדיוק כרצונך.
        """
        score = geo_settings.PRIORITY_WAIT_WEIGHT * waiting_days
        if travel_minutes is not None:
            score -= geo_settings.PRIORITY_TRAVEL_WEIGHT * travel_minutes
        return score

    # =======================================================================
    # שלב 3ב: בדיקת חפיפת סוג בטון
    # =======================================================================
    def _concrete_types_overlap(self, customer_purpose_id, contractor_concrete_id) -> bool:
        """
        בודק אם סוג הבטון של הקבלן מתאים לבקשת הלקוח.

        הערה חשובה על המודל הקיים: בקשת הלקוח שומרת רק purpose_id (מטרה),
        בעוד הצעת הקבלן מצביעה על Concrete_type מלא (חוזק/סומך/אבן/מטרה).
        המכנה המשותף היחיד הוא ה-Purpose. לכן ההתאמה כאן היא לפי מטרה:
        ה-Purpose_id של סוג הבטון אצל הקבלן צריך להיות שווה ל-purpose_id של הלקוח.

        שיפור עתידי מומלץ (מתועד גם בקובץ ה-txt): להוסיף לבקשת הלקוח גם
        strength_id / stone_size_id וכו', כדי לאפשר התאמה מדויקת יותר.
        """
        # אם לאחד הצדדים אין נתון - לא חוסמים (נחשב "אולי מתאים")
        if customer_purpose_id is None or contractor_concrete_id is None:
            return True

        concrete_type = self.db.query(ConcreteType).get(contractor_concrete_id)
        if concrete_type is None:
            return True
        # התאמה לפי מטרה
        return concrete_type.Purpose_id == customer_purpose_id

    def _quantity_fits(self, needed: float, offered: float) -> bool:
        """
        בודק אם הכמות שהקבלן מציע מספיקה לבקשת הלקוח.
        מותר עודף קטן (עד QUANTITY_TOLERANCE מעל), אבל לא פחות מהדרוש.
        """
        if needed is None or offered is None:
            return True
        max_ok = needed * (1 + geo_settings.QUANTITY_TOLERANCE)
        return offered >= needed and offered <= max_ok

    # =======================================================================
    # כלי עזר: בניית אינדקס R-Tree על רשימת רשומות (לפי lat/lng)
    # =======================================================================
    def _build_rtree(self, records):
        """
        בונה אינדקס R-Tree מרחבי מעל רשימת רשומות בעלות lat/lng.
        מחזיר את האינדקס + מילון שממפה מזהה-באינדקס -> הרשומה.
        אם R-Tree לא זמין (הספרייה לא מותקנת) - מחזיר (None, mapping).
        """
        mapping = {}
        if not _RTREE_AVAILABLE:
            # ללא R-Tree - עדיין שומרים מיפוי לשימוש בסריקה לינארית
            for i, rec in enumerate(records):
                mapping[i] = rec
            return None, mapping

        idx = rtree_index.Index()
        for i, rec in enumerate(records):
            if rec.lat is None or rec.lng is None:
                continue
            lng, lat = float(rec.lng), float(rec.lat)
            # נקודה מיוצגת כתיבה (bounding box) מנוונת: (minx,miny,maxx,maxy)
            idx.insert(i, (lng, lat, lng, lat))
            mapping[i] = rec
        return idx, mapping

    def _query_rtree(self, idx, mapping, center_lat, center_lng, radius_km):
        """
        מאתר את כל הרשומות שנמצאות בתוך תיבה בגודל radius_km סביב המרכז.
        זהו "סינון גס מהיר" - אחר כך נחדד עם Haversine למעגל מדויק.
        """
        # המרת רדיוס מק"מ למעלות (קירוב): 1 מעלת רוחב ~ 111 ק"מ.
        # עבור קו אורך מתחשבים ב-cos(הרוחב) כי קווי האורך מתקרבים בקטבים.
        delta_lat = radius_km / 111.0
        delta_lng = radius_km / (111.0 * max(math.cos(math.radians(center_lat)), 0.01))
        bbox = (center_lng - delta_lng, center_lat - delta_lat,
                center_lng + delta_lng, center_lat + delta_lat)

        if idx is not None:
            # שאילתת R-Tree אמיתית - מהירה מאוד גם על מאות אלפי נקודות
            hit_ids = list(idx.intersection(bbox))
            return [mapping[i] for i in hit_ids]
        else:
            # נפילה רכה: סריקה לינארית עם אותה תיבה
            results = []
            for rec in mapping.values():
                if rec.lat is None or rec.lng is None:
                    continue
                if (bbox[0] <= float(rec.lng) <= bbox[2]
                        and bbox[1] <= float(rec.lat) <= bbox[3]):
                    results.append(rec)
            return results

    # =======================================================================
    # התאמה ראשית 1: מהצעת קבלן -> לקוחות מתאימים (כולל עדיפות!)
    # זהו התרחיש מהדוגמה שלך: לקבלן יש עודפים, ויש כמה לקוחות מתאימים.
    # =======================================================================
    def find_matches_for_contractor(self, offer_id: int) -> List[MatchResult]:
        """
        מקבל מזהה הצעת קבלן ומחזיר רשימת לקוחות מתאימים, ממוינת לפי עדיפות
        (הגבוה ראשון). זו הרשימה שלפיה שולחים את ההתראות (ראה notification_service).
        """
        offer = self.db.query(ContractorConcreteRequest).get(offer_id)
        if offer is None:
            raise ValueError(f"הצעת קבלן {offer_id} לא נמצאה")
        if offer.lat is None or offer.lng is None:
            raise ValueError("להצעת הקבלן אין קואורדינטות - יש להריץ Geocoding קודם")

        # --- שלב 1: סינון גס לפי אזור ---
        candidate_query = self.db.query(ConcreteRequest)
        if offer.region:
            nearby = self.region_service.get_nearby_regions(offer.region)
            candidate_query = candidate_query.filter(ConcreteRequest.region.in_(nearby))
        candidates = candidate_query.all()

        # --- שלב 2: אינדקס R-Tree וסינון מרחבי ---
        idx, mapping = self._build_rtree(candidates)
        spatial_hits = self._query_rtree(
            idx, mapping, float(offer.lat), float(offer.lng), geo_settings.MATCH_RADIUS_KM
        )

        today = date.today()
        results: List[MatchResult] = []

        # --- שלבים 3-5 על המועמדים ששרדו ---
        for req in spatial_hits:
            # 3א: מרחק אווירי מדויק (מעגל, לא תיבה)
            dist = self.calculate_distance(
                float(offer.lat), float(offer.lng), float(req.lat), float(req.lng)
            )
            if dist > geo_settings.MATCH_RADIUS_KM:
                continue

            # 3ב: חפיפת סוג בטון (לפי מטרה)
            if not self._concrete_types_overlap(req.purpose_id, offer.concrete_id):
                continue

            # 3ג: כמות מתאימה (הקבלן מציע מספיק)
            if not self._quantity_fits(
                float(req.quantity) if req.quantity else None,
                float(offer.quantity) if offer.quantity else None,
            ):
                continue

            # 4: זמן נסיעה אמיתי (רק עכשיו, למי ששרד)
            travel = self.travel_time_minutes(
                float(offer.lat), float(offer.lng), float(req.lat), float(req.lng)
            )

            # 5: עדיפות - כמה ימים הלקוח כבר מחכה
            waiting_days = (today - req.date).days if req.date else 0
            score = self.calculate_priority(waiting_days, travel)

            results.append(MatchResult(req, dist, travel, score))

        # מיון לפי עדיפות (גבוה ראשון)
        results.sort(key=lambda r: r.priority_score, reverse=True)
        return results

    # =======================================================================
    # התאמה ראשית 2: מבקשת לקוח -> הצעות קבלנים מתאימות
    # כאן ממיינים לפי קרבה ודחיפות תפוגה (איזו הצעה הכי קרובה ופנויה).
    # =======================================================================
    def find_matches_for_customer(self, request_id: int) -> List[MatchResult]:
        """
        מקבל מזהה בקשת לקוח ומחזיר רשימת הצעות קבלנים מתאימות, ממוינת לפי
        מרחק (הקרוב ראשון), תוך סינון הצעות שכבר פגו (expiry_time עבר).
        """
        req = self.db.query(ConcreteRequest).get(request_id)
        if req is None:
            raise ValueError(f"בקשת לקוח {request_id} לא נמצאה")
        if req.lat is None or req.lng is None:
            raise ValueError("לבקשת הלקוח אין קואורדינטות - יש להריץ Geocoding קודם")

        # שלב 1: סינון גס לפי אזור
        candidate_query = self.db.query(ContractorConcreteRequest)
        if req.region:
            nearby = self.region_service.get_nearby_regions(req.region)
            candidate_query = candidate_query.filter(ContractorConcreteRequest.region.in_(nearby))
        candidates = candidate_query.all()

        # שלב 2: R-Tree
        idx, mapping = self._build_rtree(candidates)
        spatial_hits = self._query_rtree(
            idx, mapping, float(req.lat), float(req.lng), geo_settings.MATCH_RADIUS_KM
        )

        now = datetime.now()
        results: List[MatchResult] = []

        for offer in spatial_hits:
            # סינון הצעות שכבר פגו (הבטון התקשה)
            if offer.expiry_time and offer.expiry_time < now:
                continue

            dist = self.calculate_distance(
                float(req.lat), float(req.lng), float(offer.lat), float(offer.lng)
            )
            if dist > geo_settings.MATCH_RADIUS_KM:
                continue

            if not self._concrete_types_overlap(req.purpose_id, offer.concrete_id):
                continue
            if not self._quantity_fits(
                float(req.quantity) if req.quantity else None,
                float(offer.quantity) if offer.quantity else None,
            ):
                continue

            travel = self.travel_time_minutes(
                float(req.lat), float(req.lng), float(offer.lat), float(offer.lng)
            )
            # עבור הלקוח, "העדיפות" היא קרבה: ציון גבוה = קרוב יותר (לכן מינוס מרחק)
            score = -dist if travel is None else -travel
            results.append(MatchResult(offer, dist, travel, score))

        # מיון: הקרוב/המהיר ביותר ראשון
        results.sort(key=lambda r: r.priority_score, reverse=True)
        return results
