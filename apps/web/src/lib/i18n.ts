export type Locale = "en" | "ar" | "ur";

export const LOCALES: { value: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
  { value: "ur", label: "اردو", dir: "rtl" },
];

export const DEFAULT_LOCALE: Locale = "en";

// A representative subset of the UI's copy, per the brief's "dummy/local UI translations"
// allowance — the app's real content ships in English; ar/ur cover nav + header + shared actions.
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "app.name": "Ride Platform",
    "nav.dashboard": "Dashboard",
    "nav.drivers": "Drivers",
    "nav.rides": "Rides",
    "nav.bookRide": "Request a ride",
    "profile.profile": "Profile",
    "profile.accountSettings": "Account settings",
    "profile.notifications": "Notifications",
    "profile.changePassword": "Change password",
    "profile.logOut": "Log out",
    "header.logIn": "Log in",
    "notifications.title": "Notifications",
    "notifications.markAllRead": "Mark all as read",
    "notifications.empty": "You're all caught up",
    "common.search": "Search",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.language": "Language",
    "common.theme": "Theme",
  },
  ar: {
    "app.name": "منصة ركوب",
    "nav.dashboard": "لوحة التحكم",
    "nav.drivers": "السائقون",
    "nav.rides": "الرحلات",
    "nav.bookRide": "اطلب رحلة",
    "profile.profile": "الملف الشخصي",
    "profile.accountSettings": "إعدادات الحساب",
    "profile.notifications": "الإشعارات",
    "profile.changePassword": "تغيير كلمة المرور",
    "profile.logOut": "تسجيل الخروج",
    "header.logIn": "تسجيل الدخول",
    "notifications.title": "الإشعارات",
    "notifications.markAllRead": "تعليم الكل كمقروء",
    "notifications.empty": "لا توجد إشعارات جديدة",
    "common.search": "بحث",
    "common.retry": "إعادة المحاولة",
    "common.cancel": "إلغاء",
    "common.confirm": "تأكيد",
    "common.language": "اللغة",
    "common.theme": "المظهر",
  },
  ur: {
    "app.name": "رائیڈ پلیٹ فارم",
    "nav.dashboard": "ڈیش بورڈ",
    "nav.drivers": "ڈرائیورز",
    "nav.rides": "رائیڈز",
    "nav.bookRide": "رائیڈ بک کریں",
    "profile.profile": "پروفائل",
    "profile.accountSettings": "اکاؤنٹ کی ترتیبات",
    "profile.notifications": "اطلاعات",
    "profile.changePassword": "پاسورڈ تبدیل کریں",
    "profile.logOut": "لاگ آؤٹ",
    "header.logIn": "لاگ ان",
    "notifications.title": "اطلاعات",
    "notifications.markAllRead": "سب کو پڑھا ہوا نشان زد کریں",
    "notifications.empty": "کوئی نئی اطلاع نہیں",
    "common.search": "تلاش کریں",
    "common.retry": "دوبارہ کوشش کریں",
    "common.cancel": "منسوخ کریں",
    "common.confirm": "تصدیق کریں",
    "common.language": "زبان",
    "common.theme": "تھیم",
  },
};

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
}
