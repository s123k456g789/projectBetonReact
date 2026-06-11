"""
שירות התראות (Notification Service) - מימוש מלא
=================================================
שולח התראות (SMS) ללקוחות/קבלנים, ומיישם את *אסטרטגיית השליחה* - שזו
אחת השאלות המרכזיות שלך:

  "האם לשלוח לכל 5 הלקוחות המתאימים והראשון שתופס זוכה,
   או לשלוח לעדיפות הגבוהה, לחכות 3 דקות, ואם לא תפס - לעבור לבא בתור?"

מימשנו את *שתי* האסטרטגיות, וניתן להחליף ביניהן דרך ההגדרה DISPATCH_STRATEGY.
המלצתנו המפורטת (sequential) מוסברת בקובץ ה-txt.

הערה על שליחת ה-SMS עצמו: כדי לא לכבול אותך לספק מסוים, הפונקציה send_sms
"פלאגבילית" - אם מוגדרים פרטי Twilio בסביבה, היא שולחת באמת; אחרת היא
מדפיסה ללוג (מצב פיתוח). כך הקוד עובד גם לפני שמתחברים לספק SMS.
"""

import os
import time
from typing import List, Callable, Optional
from sqlalchemy.orm import Session

from service.geo_config import geo_settings
from models.customer import Customer
from models.contractor import Contractor


class NotificationService:
    """שירות לשליחת הודעות וניהול אסטרטגיית ההפצה."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # שליחת SMS בסיסית (פלאגבילית - Twilio או הדפסה ללוג)
    # ------------------------------------------------------------------
    def send_sms(self, phone: str, message: str) -> bool:
        """
        שולח SMS למספר נתון. מחזיר True אם נשלח/נרשם בהצלחה.
        אם מוגדרים משתני Twilio (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM) -
        שולח באמת. אחרת - מדפיס ללוג (נוח לפיתוח ובדיקות).
        """
        sid = os.getenv("TWILIO_SID")
        token = os.getenv("TWILIO_TOKEN")
        from_number = os.getenv("TWILIO_FROM")

        if sid and token and from_number:
            try:
                # ייבוא עצל - רק אם באמת משתמשים ב-Twilio
                from twilio.rest import Client
                client = Client(sid, token)
                client.messages.create(body=message, from_=from_number, to=phone)
                return True
            except Exception as e:
                print(f"[SMS][שגיאה] שליחה ל-{phone} נכשלה: {e}")
                return False
        else:
            # מצב פיתוח - אין ספק SMS מוגדר
            print(f"[SMS][סימולציה] אל: {phone} | הודעה: {message}")
            return True

    # ------------------------------------------------------------------
    # התראות ספציפיות
    # ------------------------------------------------------------------
    def send_match_notification_to_customer(self, customer_id: int, offer_id: int) -> bool:
        """מודיע ללקוח שנמצאה עבורו הצעת בטון מתאימה."""
        customer = self.db.query(Customer).get(customer_id)
        if not customer or not customer.phone:
            return False
        msg = (f"שלום {customer.name or ''}, נמצאה עבורך הצעת בטון מתאימה (מס' {offer_id})! "
               f"היכנס/י לאתר Beton לאישור מהיר - לפני שהבטון מתקשה.")
        return self.send_sms(customer.phone, msg)

    def send_match_notification_to_contractor(self, contractor_id: int, request_id: int) -> bool:
        """מודיע לקבלן שיש לקוח שמעוניין בעודפי הבטון שלו."""
        contractor = self.db.query(Contractor).get(contractor_id)
        if not contractor or not contractor.phone:
            return False
        msg = (f"שלום {contractor.name or ''}, יש לקוח שמעוניין בעודפי הבטון שלך "
               f"(בקשה מס' {request_id}). היכנס/י לאתר Beton לפרטים.")
        return self.send_sms(contractor.phone, msg)

    # ------------------------------------------------------------------
    # אסטרטגיית הפצה - הלב של השאלה שלך
    # ------------------------------------------------------------------
    def dispatch_offer_to_candidates(
        self,
        candidate_customer_ids: List[int],
        offer_id: int,
        is_taken: Callable[[int], bool],
        strategy: Optional[str] = None,
    ) -> Optional[int]:
        """
        מפיץ הצעת קבלן לרשימת לקוחות מתאימים (כבר ממוינת לפי עדיפות).

        :param candidate_customer_ids: מזהי לקוחות לפי סדר עדיפות (גבוה -> נמוך)
        :param offer_id: מזהה ההצעה שמופצת
        :param is_taken: פונקציה שבודקת מול ה-DB אם לקוח כלשהו כבר "תפס" את ההצעה.
                         (כך אנו לא תלויים בלוגיקת ה-DB הפנימית כאן.)
        :param strategy: "sequential" או "broadcast". ברירת מחדל מההגדרות.
        :return: מזהה הלקוח שתפס, או None אם אף אחד לא תפס.

        --- שתי האסטרטגיות ---
        sequential (מומלץ): שולחים לעדיפות הגבוהה, מחכים SEQUENTIAL_WAIT_SECONDS,
                            ואם לא תפס - עוברים לבא בתור. הוגן וממקסם ניצול.
        broadcast: שולחים לכולם בבת אחת, הראשון שמאשר זוכה. מהיר אך עלול
                   ל"שרוף" התראות ולגרום לכמה לקוחות לרוץ לאותה הצעה.
        """
        strategy = strategy or geo_settings.DISPATCH_STRATEGY

        if strategy == "broadcast":
            return self._dispatch_broadcast(candidate_customer_ids, offer_id, is_taken)
        return self._dispatch_sequential(candidate_customer_ids, offer_id, is_taken)

    def _dispatch_sequential(self, candidate_ids, offer_id, is_taken) -> Optional[int]:
        """
        אסטרטגיה סדרתית: אחד-אחד לפי עדיפות, עם המתנה בין שלב לשלב.
        מתאים במיוחד לבטון, כי מימד הזמן קריטי אך הוגנות גם חשובה.
        """
        wait = geo_settings.SEQUENTIAL_WAIT_SECONDS
        for cid in candidate_ids:
            # אם בינתיים מישהו אחר כבר תפס - עוצרים
            if is_taken(offer_id):
                return None
            # שולחים התראה ללקוח הבא בסדר העדיפות
            self.send_match_notification_to_customer(cid, offer_id)
            print(f"[הפצה] נשלחה התראה ללקוח {cid}. ממתינים {wait} שניות לתגובה...")

            # ממתינים לחלון התגובה, ובודקים בתדירות אם נתפס
            waited = 0
            poll = 5  # בודקים כל 5 שניות
            while waited < wait:
                time.sleep(poll)
                waited += poll
                if is_taken(offer_id):
                    print(f"[הפצה] לקוח {cid} תפס את ההצעה {offer_id}.")
                    return cid
            # לא תפס בזמן - ממשיכים ללקוח הבא
            print(f"[הפצה] לקוח {cid} לא הגיב בזמן. עוברים לבא בתור.")
        return None

    def _dispatch_broadcast(self, candidate_ids, offer_id, is_taken) -> Optional[int]:
        """
        אסטרטגיית שידור: שולחים לכל המועמדים בבת אחת.
        הראשון שמאשר (נבדק דרך is_taken) זוכה. מהיר אך פחות הוגן.
        """
        for cid in candidate_ids:
            self.send_match_notification_to_customer(cid, offer_id)
        print(f"[הפצה] הצעה {offer_id} שודרה ל-{len(candidate_ids)} לקוחות. הראשון שתופס זוכה.")
        # בפועל, מי שתפס נקבע ע"י פעולת ה"אישור" של הלקוח באפליקציה/שרת.
        return None

    def send_expiry_warning(self, offer_id: int, contractor_id: int) -> bool:
        """שולח לקבלן התראה שההצעה שלו עומדת לפוג (הבטון עומד להתקשות)."""
        contractor = self.db.query(Contractor).get(contractor_id)
        if not contractor or not contractor.phone:
            return False
        msg = (f"שים/י לב: הצעת הבטון שלך (מס' {offer_id}) עומדת לפוג בקרוב. "
               f"אם עוד יש בטון פנוי - כדאי לעדכן או להאריך.")
        return self.send_sms(contractor.phone, msg)
