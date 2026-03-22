import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import BlogCard from "@/components/BlogCard";
import { blogPosts } from "@/data/blogPosts";

const BlogListPage = () => {
  return (
    <PageTransition>
      <SEOHead
        title="Inspiracje — porady i pomysły dla rodziców"
        description="Porady, rankingi i pomysły na czas z dzieckiem. Blog FamilyFun."
        path="/inspiracje"
      />
      <div className="min-h-screen bg-background pb-20 sm:pb-0">
        <Header />
        <main className="container py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Inspiracje
            </h1>
            <p className="text-muted-foreground mt-1 mb-8">
              Porady, rankingi i pomysły na czas z dzieckiem
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {blogPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default BlogListPage;
