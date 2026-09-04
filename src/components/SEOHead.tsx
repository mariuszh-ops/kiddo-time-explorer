import { Helmet } from "react-helmet-async";
import { buildSeoTitle } from "@/lib/seoTitle";

const SITE_NAME = "FamilyFun";
const BASE_URL = "https://familyfun.pl";
const FALLBACK_IMAGE = `${BASE_URL}/og-image-1200x630.jpg`;

// Open Graph wymaga absolutnych URL-i — relatywne (np. /placeholder.svg) są
// ignorowane przez parsery social, więc podmieniamy je na baner zastępczy.
const toAbsoluteImage = (image?: string) => {
  if (!image) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/") && !image.endsWith(".svg")) return `${BASE_URL}${image}`;
  return FALLBACK_IMAGE;
};

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

const SEOHead = ({
  title,
  description,
  path,
  image,
  imageWidth,
  imageHeight,
  type = "website",
  jsonLd,
  noindex = false,
  publishedTime,
  modifiedTime,
}: SEOHeadProps) => {
  // Brand doklejany tylko raz (seoTitle z categoryPages już go ma), a całość
  // przycinana do 65 znaków — dłuższe tytuły Google i tak ucina (BC-E-02).
  const fullTitle = buildSeoTitle(title);
  const canonicalUrl = `${BASE_URL}${path}`;
  const ogImage = toAbsoluteImage(image);
  const isFallbackImage = ogImage === FALLBACK_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {!noindex && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="pl_PL" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />
      {/* Wymiary podajemy tylko wtedy, gdy je naprawdę znamy (baner sitewide
          albo jawnie przekazane) — fałszywe 1200x630 psuło podglądy. */}
      {isFallbackImage && <meta property="og:image:width" content="1200" />}
      {isFallbackImage && <meta property="og:image:height" content="630" />}
      {!isFallbackImage && imageWidth && <meta property="og:image:width" content={String(imageWidth)} />}
      {!isFallbackImage && imageHeight && <meta property="og:image:height" content={String(imageHeight)} />}
      {!isFallbackImage && !imageWidth && /\.webp(\?|$)/i.test(ogImage) && (
        <meta property="og:image:type" content="image/webp" />
      )}
      <meta property="og:image:alt" content={title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {jsonLd && (
        Array.isArray(jsonLd)
          ? jsonLd.map((ld, i) => (
              <script key={i} type="application/ld+json">
                {JSON.stringify(ld)}
              </script>
            ))
          : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
