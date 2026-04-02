import { Link } from "react-router-dom";
import { Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlogPost } from "@/data/blogPosts";

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard = ({ post }: BlogCardProps) => {
  return (
    <Link to={`/inspiracje/${post.slug}`} className="group">
      <article className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5">
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {post.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {post.readTimeMinutes} min
            </span>
          </div>
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </article>
    </Link>
  );
};

export default BlogCard;
