import BlogCard from "@/components/BlogCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import { blogPosts } from "@/data/blogPosts";

/**
 * Karuzela „Z naszego bloga" wydzielona do osobnego chunku — dane wpisów
 * (blogPosts.ts) nie obciążają już bundla wejściowego home/listingu.
 */
const HomeBlogSection = () => {
  if (blogPosts.length === 0) return null;
  return (
    <HorizontalCarousel visibleCards={[1.5, 2.5, 3]}>
      {blogPosts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </HorizontalCarousel>
  );
};

export default HomeBlogSection;
