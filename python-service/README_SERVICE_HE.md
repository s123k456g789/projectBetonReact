# שכבת ה-Service לפרויקט Beton (מימוש מלא)

תיקייה זו מכילה את המימוש המלא של **שכבת ה-service** שבמאגר
[`projectBeton`](https://github.com/s123k456g789/projectBeton) הייתה עד כה
"שלד בלבד" (זרקה `NotImplementedError`).

## איך לשלב במאגר projectBeton

1. העתק/י את הקבצים מתוך `python-service/service/` לתוך תיקיית `service/`
   במאגר projectBeton (הם מחליפים/משלימים את קבצי השלד).
2. התקן/י את החבילות הנוספות:
   ```powershell
   pip install -r requirements-service.txt
   ```
3. הוסף/י לקובץ `.env` את המפתחות (ראה דוגמה ב-`service/geo_config.py`):
   ```
   GOOGLE_MAPS_API_KEY=...
   MATCH_RADIUS_KM=30
   DISPATCH_STRATEGY=sequential
   SEQUENTIAL_WAIT_SECONDS=180
   ```

## הקבצים

| קובץ | תפקיד |
|------|-------|
| `geo_config.py` | ריכוז המפתחות והקבועים של האלגוריתם |
| `geocoding_service.py` | המרת כתובת -> קואורדינטות ושמירה ב-DB (Google Geocoding) |
| `region_service.py` | המרת קואורדינטות -> אזור, ואזורים סמוכים (סינון גס) |
| `matching_service.py` | הלב: R-Tree + Haversine + סינון + Google Routes + עדיפות |
| `notification_service.py` | התראות SMS + אסטרטגיית הפצה (sequential / broadcast) |

## על libspatialindex (נדרש ל-Rtree)

חבילת `Rtree` בפייתון עוטפת ספריית C בשם `libspatialindex`.
- ב-Windows: `pip install Rtree` בדרך כלל מתקין גם את ה-DLL אוטומטית.
- אם יש בעיה: אפשר להתקין דרך conda (`conda install -c conda-forge rtree`).
- **גיבוי:** אם R-Tree לא זמין, `matching_service` עובר אוטומטית לסריקה
  לינארית (איטית יותר אך עובדת) - כך הקוד לא קורס.

> את ההסבר המלא על R-Tree, החלופות, אסטרטגיית ההפצה, ופקודות ה-SQL Server
> תמצא/י בקובץ **`ANSWERS_HE.txt`** שבשורש המאגר.
