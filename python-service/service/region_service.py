"""
שירות אזורים גיאוגרפיים (Region Service) - מימוש מלא
=====================================================
מחליף את קובץ השלד המקורי. שני תפקידים:
1. get_region_from_coordinates - הופך קואורדינטות לשם אזור (Reverse Geocoding).
2. get_nearby_regions - מחזיר אזורים סמוכים (לסינון ראשוני מהיר לפני חישוב מרחק מדויק).

הרעיון: סינון לפי אזור הוא "סינון גס" וזול - מצמצם מאלפי רשומות לעשרות,
ורק עליהן מריצים את החישוב היקר (R-Tree + Google Routes).
"""

import requests
from typing import List
from service.geo_config import geo_settings


class RegionService:
    """שירות לטיפול באזורים גיאוגרפיים."""

    # מפת שכנויות בין אזורים בארץ. משמשת לסינון ראשוני: אם לקוח בצפון,
    # מספיק להסתכל על הצעות בצפון, בחיפה, ובשרון - לא צריך לבדוק את הדרום.
    # (טבלה זו ניתנת להרחבה/דיוק בהמשך לפי הצורך העסקי.)
    _ADJACENCY = {
        "צפון": ["צפון", "חיפה והקריות", "השרון"],
        "חיפה והקריות": ["חיפה והקריות", "צפון", "השרון"],
        "השרון": ["השרון", "חיפה והקריות", "מרכז", "תל אביב והמרכז"],
        "מרכז": ["מרכז", "השרון", "תל אביב והמרכז", "שפלה", "ירושלים"],
        "תל אביב והמרכז": ["תל אביב והמרכז", "מרכז", "השרון", "שפלה"],
        "ירושלים": ["ירושלים", "מרכז", "שפלה"],
        "שפלה": ["שפלה", "מרכז", "תל אביב והמרכז", "ירושלים", "דרום"],
        "דרום": ["דרום", "שפלה", "אילת והערבה"],
        "אילת והערבה": ["אילת והערבה", "דרום"],
    }

    def get_region_from_coordinates(self, lat: float, lng: float) -> str:
        """
        מחזיר שם אזור/עיר מתוך קואורדינטות, בעזרת Reverse Geocoding של Google.
        :return: שם האזור (administrative_area) או "לא ידוע" אם נכשל
        """
        if not geo_settings.GOOGLE_MAPS_API_KEY:
            raise RuntimeError("חסר GOOGLE_MAPS_API_KEY בקובץ .env")

        params = {
            "latlng": f"{lat},{lng}",                  # הקואורדינטות להמרה הפוכה
            "key": geo_settings.GOOGLE_MAPS_API_KEY,
            "language": "he",
            "result_type": "administrative_area_level_1|locality",  # מחוז / עיר
        }
        response = requests.get(geo_settings.GEOCODING_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "OK" or not data.get("results"):
            return "לא ידוע"

        # מחפשים בתוצאה את רכיב הכתובת שמייצג מחוז/אזור
        for result in data["results"]:
            for comp in result.get("address_components", []):
                if "administrative_area_level_1" in comp.get("types", []):
                    return comp["long_name"]
        # אם לא נמצא מחוז - מחזירים את הכתובת המעוצבת הראשונה
        return data["results"][0].get("formatted_address", "לא ידוע")

    def get_nearby_regions(self, region: str, radius_km: float = 30) -> List[str]:
        """
        מחזיר רשימת אזורים סמוכים לאזור נתון (כולל האזור עצמו).
        משמש לסינון ראשוני זול לפני החישוב המדויק.
        :param region: שם האזור
        :param radius_km: לא בשימוש ישיר כאן (טבלת השכנויות כבר מקודדת מרחק סביר),
                          אך נשמר בחתימה לתאימות עתידית.
        :return: רשימת שמות אזורים
        """
        # אם האזור מוכר - מחזירים את שכניו. אחרת - רק את עצמו.
        return self._ADJACENCY.get(region, [region])
