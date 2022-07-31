import PostPreview from "./post-preview";
import type Post from "../../interfaces/post";

type Props = {
  posts: Post[];
};

const MoreStories = ({ posts }: Props) => {
  return (
    <section
      className="max-w-2xl"
      style={{
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {posts.map((post) => (
        <PostPreview
          key={post.slug}
          title={post.title}
          coverImage={post.coverImage}
          date={post.date}
          author={post.author}
          slug={post.slug}
          excerpt={post.excerpt}
        />
      ))}
    </section>
  );
};

export default MoreStories;
