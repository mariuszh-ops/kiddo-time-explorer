import { FEATURES } from "@/lib/featureFlags";

const BASE_URL = "https://familyfun.pl";
const CONTACT_EMAIL = "kontakt@familyfun.pl";

/**
 * Profile FamilyFun w mediach społecznościowych — jedno źródło dla stopki
 * (Footer) i dla `sameAs` w JSON-LD. Oba pokazują je tylko przy
 * FEATURES.SOCIAL_LINKS, żeby dane strukturalne nie ogłaszały profili,
 * których interfejs celowo nie pokazuje.
 */
export const SOCIAL_PROFILES = {
  instagram: "https://instagram.com/familyfun.pl",
  facebook: "https://facebook.com/familyfunpl",
} as const;

/**
 * Samodzielny blok Organization dla strony głównej (AF-3-050). Wcześniej
 * Organization był tylko publisherem/autorem artykułu (BlogPostPage), więc
 * wyszukiwarka nie dostawała danych serwisu: logo i kontaktu.
 * Logo = ikona serwisu z index.html i manifest.json (public/icon-512.png, PNG 512×512,
 * stały adres; Google wymaga min. 112×112). NIE og-image.png: to plik JPEG z
 * rozszerzeniem .png, serwowany jako image/png z nosniff.
 */
export function buildOrganizationJsonLd(socialLinks: boolean = FEATURES.SOCIAL_LINKS) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    "name": "FamilyFun",
    "url": BASE_URL,
    "logo": `${BASE_URL}/icon-512.png`,
    "email": CONTACT_EMAIL,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": CONTACT_EMAIL,
      "availableLanguage": "pl",
    },
    ...(socialLinks ? { "sameAs": Object.values(SOCIAL_PROFILES) } : {}),
  };
}
