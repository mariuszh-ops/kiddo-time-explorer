import { describe, it, expect } from "vitest";
import { isInAppBrowser } from "@/lib/inAppBrowser";

// Te same userAgenty, którymi audyt AF-7 (faza 1 i 2) sprawdzał wykrycie.
const UA = {
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/565756040;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/pl_PL;FBOP/5]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.30.113;]",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.12.108 (iPhone14,5; iOS 17_4; pl_PL; pl-PL; scale=3.00; 1170x2532; 558421398)",
  messenger:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0.0.38.108;FBBV/565756040;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBLC/pl_PL]",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 trill_340005 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.0.5 ByteLocale/pl-PL ByteFullLocale/pl-PL",
  tiktokBytedance:
    "Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 musical_ly_2023200030 BytedanceWebview/d8a21c6",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  firefoxDesktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
};

describe("AF-7-001: wykrywanie przeglądarki wbudowanej w aplikację", () => {
  it.each(["facebookIos", "facebookAndroid", "instagram", "messenger", "tiktokAndroid", "tiktokBytedance"] as const)(
    "%s → przeglądarka w aplikacji",
    (k) => {
      expect(isInAppBrowser(UA[k])).toBe(true);
    },
  );

  it.each(["chromeAndroid", "safariIos", "firefoxDesktop"] as const)("%s → zwykła przeglądarka", (k) => {
    expect(isInAppBrowser(UA[k])).toBe(false);
  });

  it("pusty userAgent (prerender, brak navigatora) → zwykła przeglądarka", () => {
    expect(isInAppBrowser("")).toBe(false);
  });
});
