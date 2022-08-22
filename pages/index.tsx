import Container from "../components/layout/container";
import MoreStories from "../components/home/more-stories";
import Intro from "../components/home/intro";
import Layout from "../components/layout/layout";
import { getAllPosts } from "../lib/api";
import Head from "next/head";

export default function Index({
  allPosts,
}: Awaited<ReturnType<typeof getStaticProps>>["props"]) {
  return (
    <>
      <Layout>
        <Head>
          <title>Jithya's Blog</title>
        </Head>
        <Container>
          <Intro />
          {allPosts.length > 0 && <MoreStories posts={allPosts} />}
        </Container>
      </Layout>
    </>
  );
}

export const getStaticProps = async () => {
  const allPosts = getAllPosts(["title", "date", "slug", "excerpt"] as const);

  return {
    props: { allPosts },
  };
};
