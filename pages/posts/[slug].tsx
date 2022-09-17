import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Container from "../../components/layout/container";
import PostBody from "../../components/posts/post-body";
import Header from "../../components/layout/header";
import PostHeader from "../../components/posts/post-header";
import Layout from "../../components/layout/layout";
import { getPostBySlug, getAllPosts } from "../../lib/api";
import PostTitle from "../../components/posts/post-title";
import Head from "next/head";
import markdownToHtml from "../../lib/markdownToHtml";
import { readingTime } from "reading-time-estimator";
import type PostType from "../../interfaces/post";

type Props = {
  post: PostType;
  morePosts: PostType[];
  preview?: boolean;
  estimatedReadingTime: ReturnType<typeof readingTime>;
};

export default function Post({
  post,
  morePosts,
  preview,
  estimatedReadingTime,
}: Props) {
  const router = useRouter();

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <Layout>
      <Container>
        <Header />
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <>
            <article className="mb-32">
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
              <PostBody content={post.content} />
            </article>
          </>
        )}
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

  return {
    props: {
      post: {
        ...post,
        content,
      },
      estimatedReadingTime,
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
