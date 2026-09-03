import { buildSrcSet } from "@/lib/imageSrcSet";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Clock, Tag, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import ActivityCard from "@/components/ActivityCard";
import { Badge } from "@/components/ui/badge";
import { blogPosts, LEGACY_BLOG_SLUGS } from "@/data/blogPosts";
import NotFound from "@/pages/NotFound";
import { getActivities } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { useDataStatus } from "@/hooks/useDataStatus";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);
  // Strona renderuje się bez czekania na katalog; hook dosyła re-render,
  // gdy dane się załadują (sekcja powiązanych atrakcji).
  useDataStatus();

  // Stare (literówkowe) adresy artykułów → trwałe przekierowanie na nowy slug.
  if (!post && slug && LEGACY_BLOG_SLUGS[slug]) {
    return <Navigate to={`/inspiracje/${LEGACY_BLOG_SLUGS[slug]}`} replace />;
  }

  // Nieznany slug → ten sam komponent 404 co pozostałe trasy (noindex + canonical).
  if (!post) {
    return <NotFound />;
  }

  // Powiązane atrakcje — sekcja dodatkowa, korzysta z katalogu tylko
  // jeśli został już dociągnięty (nie wywołujemy pełnego pobrania na wpisie).
  const relatedActivities = post.city
    ? getActivities()
        .filter((a) => a.city === post.city && (!a.isEvent || FEATURES.EVENTS))
        .slice(0, 3)
    : [];

  const BASE_URL = "https://familyfun.pl";

  // JSON-LD: Article + BreadcrumbList (rich snippets w Google)
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.imageUrl,
    "datePublished": post.publishedAt,
    "author": {
      "@type": "Organization",
      "name": "FamilyFun",
      "url": BASE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": "FamilyFun",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/og-image.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/inspiracje/${post.slug}`,
    },
    ...(post.readTimeMinutes ? {
      "timeRequired": `PT${post.readTimeMinutes}M`,
    } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Strona główna",
        "item": `${BASE_URL}/`,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Inspiracje",
        "item": `${BASE_URL}/inspiracje`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
      },
    ],
  };

  const combinedJsonLd = [articleJsonLd, breadcrumbJsonLd];

  // Formatowanie w linii: **pogrubienie** oraz [etykieta](/atrakcje/slug).
  // Bez tego treść artykułu pokazywała dosłowne gwiazdki, a linki do kart
  // atrakcji nie były w ogóle możliwe. Ścieżki wewnętrzne (zaczynające się
  // od "/") jadą przez <Link>, żeby nie przeładowywać całej aplikacji.
  const INLINE_PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let n = 0;

    INLINE_PATTERN.lastIndex = 0;
    while ((match = INLINE_PATTERN.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const [, bold, label, href] = match;
      if (bold) {
        parts.push(
          <strong key={`${keyPrefix}-b-${n++}`} className="font-semibold text-foreground">
            {bold}
          </strong>
        );
      } else if (label && href) {
        parts.push(
          href.startsWith("/") ? (
            <Link key={`${keyPrefix}-l-${n++}`} to={href} className="text-primary underline underline-offset-2">
              {label}
            </Link>
          ) : (
            <a
              key={`${keyPrefix}-l-${n++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {label}
            </a>
          )
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let key = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc pl-5 space-y-1 my-2">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) {
        flushList();
        elements.push(<br key={`br-${key++}`} />);
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={`h2-${key++}`} className="text-lg font-semibold text-foreground mt-6 mb-2">
            {renderInline(trimmed.slice(3), `h2-${key}`)}
          </h2>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h2 key={`h2-${key++}`} className="text-xl font-serif font-semibold text-foreground mt-4 mb-3">
            {trimmed.slice(2)}
          </h2>
        );
        continue;
      }
      if (trimmed.startsWith("- ")) {
        listItems.push(
          <li key={`li-${key++}`} className="text-foreground/90">
            {renderInline(trimmed.slice(2), `li-${key}`)}
          </li>
        );
        continue;
      }
      flushList();
      elements.push(
        <p key={`p-${key++}`} className="text-foreground/90 leading-relaxed mb-2">
          {renderInline(trimmed, `p-${key}`)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  return (
    <PageTransition>
      {/* og:image z public/og/blog/ — zdjęcia wpisów mają 800x450, a Facebook
          wymaga 1200x630 (audyt 400: BC-E-05). Generator: scripts/og_blog.py */}
      <SEOHead
        title={post.title}
        description={post.excerpt}
        path={`/inspiracje/${post.slug}`}
        image={`/og/blog/${post.slug}.jpg`}
        imageWidth={1200}
        imageHeight={630}
        type="article"
        publishedTime={post.publishedAt}
        jsonLd={combinedJsonLd as unknown as Record<string, unknown>}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main id="main-content" className="container py-6 md:py-10">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumbs - desktop */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm mb-6" aria-label="breadcrumb">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Strona główna</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <Link to="/inspiracje" className="text-muted-foreground hover:text-foreground transition-colors">Inspiracje</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium truncate max-w-[400px]">{post.title}</span>
            </nav>

            {/* Mobile: back link */}
            <Link
              to="/inspiracje"
              className="md:hidden inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do Inspiracji
            </Link>

            {/* Hero image */}
            <div className="aspect-[16/9] rounded-xl overflow-hidden mb-6">
              <img
                src={post.imageUrl}
                srcSet={buildSrcSet(post.imageUrl)}
                sizes="(max-width: 768px) 100vw, 800px"
                alt={post.title}
                width={800}
                height={450}
                loading="eager"
                decoding="async"
                style={{ aspectRatio: "16 / 9" }}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.removeAttribute("srcset");
                    img.src = "/blog/placeholder.webp";
                  }
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {post.readTimeMinutes} min czytania
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Content */}
            <article className="prose-sm">{renderContent(post.content)}</article>

            {/* Tags */}
            <div className="flex items-center gap-2 mt-8 pt-6 border-t border-border">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Related activities */}
          {relatedActivities.length > 0 && (
            <div className="max-w-4xl mx-auto mt-12">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Powiązane atrakcje
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    id={activity.id}
                    title={activity.title}
                    location={activity.location}
                    rating={activity.rating}
                    reviewCount={activity.reviewCount}
                    ageRange={activity.ageRange}
                    matchPercentage={activity.matchPercentage}
                    imageUrl={activity.imageUrl}
                    tags={activity.tags}
                    type={activity.type}
                    slug={activity.slug}
                    amenities={activity.amenities}
                    google_rating={activity.google_rating}
                    google_review_count={activity.google_review_count}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default BlogPostPage;
