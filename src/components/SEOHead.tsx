import { Helmet } from "react-helmet-async";

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
  // Nie doklejaj brandu, jeśli tytuł już go zawiera (np. seoTitle z categoryPages).
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
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
      <meta property="og:image:width" content={String(isFallbackImage ? 1200 : imageWidth ?? 1200)} />
      <meta property="og:image:height" content={String(isFallbackImage ? 630 : imageHeight ?? 630)} />
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
