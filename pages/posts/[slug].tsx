import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Container from "../../components/layout/container";
import PostBody from "../../components/posts/post-body";
import Header from "../../components/layout/header";
import PostHeader from "../../components/posts/post-header";
import Layout from "../../components/layout/layout";
import { getPostBySlug, getAllPosts } from "../../lib/api";
import Head from "next/head";
import markdownToHtml from "../../lib/markdownToHtml";
import { readingTime } from "reading-time-estimator";
import type PostType from "../../interfaces/post";
import { Comments } from "../../components/posts/comments";
import { TableOfContents } from "../../components/posts/table-of-contents";

type Props = {
  post: PostType;
  morePosts: PostType[];
  preview?: boolean;
  estimatedReadingTime: ReturnType<typeof readingTime>;
  headings: string[];
};

export default function Post({
  post,
  morePosts,
  preview,
  estimatedReadingTime,
  headings,
}: Props) {
  const router = useRouter();

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <Layout>
      <Container>
        <Header />
        <article id="blog-post" className="mb-32">
          <Head>
            <title>{post.title}</title>
          </Head>
          <PostHeader
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            estimatedReadingTime={estimatedReadingTime.text}
          />
          <TableOfContents headings={headings} />
          <PostBody content={post.content} />
          <Comments />
        </article>
      </Container>
    </Layout>
  );
}

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const post = getPostBySlug(params.slug, [
    "title",
    "date",
    "slug",
    "author",
    "content",
    "coverImage",
  ]);
  const content = markdownToHtml(post.content || "");
  const estimatedReadingTime = readingTime(content, 125);

  const l2Headings = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace("## ", "").trim());

  return {
    props: {
      post: {
        ...post,
        content,
      },
      estimatedReadingTime,
      headings: l2Headings,
    },
  };
}

export async function getStaticPaths() {
  const posts = getAllPosts(["slug"]);

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}
