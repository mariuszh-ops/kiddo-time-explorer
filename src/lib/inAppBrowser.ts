/**
 * AF-7-001…003 / AF-7-059…062: przeglądarki wbudowane w aplikacje (Facebook,
 * Messenger, Instagram, TikTok). Google odrzuca w nich logowanie OAuth (403
 * „disallowed_useragent”), więc „Kontynuuj z Google” kończy się ślepą uliczką
 * u kogoś, kto wszedł z linku w social mediach.
 *
 * Wykrywamy je po znacznikach, które same aplikacje dokładają do userAgent:
 * - Facebook / Messenger: FBAN, FBAV (iOS), FB_IAB (Android, też Messenger „Orca”),
 * - Instagram: „Instagram <wersja>”,
 * - TikTok: musical_ly / BytedanceWebview / TikTok (zależnie od wersji i systemu).
 * Zwykłe Chrome, Safari i Firefox żadnego z nich nie mają.
 */
const IN_APP_BROWSER_UA = /FBAN|FBAV|FB_IAB|Instagram|musical_ly|BytedanceWebview|TikTok/i;

export const isInAppBrowser = (
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean => IN_APP_BROWSER_UA.test(userAgent);
