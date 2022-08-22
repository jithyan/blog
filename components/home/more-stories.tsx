import PostPreview from "./post-preview";
import type { getStaticProps } from "../../pages";

type Props = {
  posts: Awaited<ReturnType<typeof getStaticProps>>["props"]["allPosts"];
};

const MoreStories = ({ posts }: Props) => {
  return (
    <section className="max-w-2xl mx-auto">
      {posts.map((post) => (
        <PostPreview
          key={post.slug}
          title={post.title}
          date={post.date}
          slug={post.slug}
          excerpt={post.excerpt}
        />
      ))}
    </section>
  );
};

export default MoreStories;
