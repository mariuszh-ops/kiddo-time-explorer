import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Tag, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import ActivityCard from "@/components/ActivityCard";
import { Badge } from "@/components/ui/badge";
import { blogPosts } from "@/data/blogPosts";
import { getActivities } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-serif text-foreground mb-4">Nie znaleziono artykułu</h1>
            <Link to="/inspiracje" className="text-primary hover:underline">
              Wróć do Inspiracji
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Related activities from same city
  const relatedActivities = post.city
    ? getActivities()
        .filter((a) => a.city === post.city && (!a.isEvent || FEATURES.EVENTS))
        .slice(0, 3)
    : [];

  // Simple markdown-like rendering (headers and paragraphs)
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith("## "))
        return (
          <h2 key={i} className="text-lg font-semibold text-foreground mt-6 mb-2">
            {trimmed.slice(3)}
          </h2>
        );
      if (trimmed.startsWith("# "))
        return (
          <h1 key={i} className="text-xl font-serif font-semibold text-foreground mt-4 mb-3">
            {trimmed.slice(2)}
          </h1>
        );
      if (trimmed.startsWith("- "))
        return (
          <li key={i} className="text-foreground/90 ml-4 list-disc">
            {trimmed.slice(2)}
          </li>
        );
      return (
        <p key={i} className="text-foreground/90 leading-relaxed mb-2">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <PageTransition>
      <SEOHead
        title={post.title}
        description={post.excerpt}
        path={`/inspiracje/${post.slug}`}
        image={post.imageUrl}
        type="article"
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container py-6 md:py-10">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumbs - desktop */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm mb-6" aria-label="breadcrumb">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Strona główna</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <Link to="/inspiracje" className="text-muted-foreground hover:text-foreground transition-colors">Inspiracje</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
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
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
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
