import Avatar from "../posts/avatar";
import DateFormatter from "../posts/date-formatter";
import CoverImage from "../posts/cover-image";
import Link from "next/link";
import type Author from "../../interfaces/author";

type Props = {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
};

const PostPreview = ({ title, date, excerpt, slug }: Props) => {
  return (
    <article className="mb-8">
      <h4 className="text-pink-500 font-bold text-2xl mb-1 leading-snug">
        <Link as={`/posts/${slug}`} href="/posts/[slug]">
          <a className="hover:underline">{title}</a>
        </Link>
      </h4>
      <h5 className="text-white text-md mb-4">
        <DateFormatter dateString={date} />
      </h5>
      <p className="text-gray-300 text-lg leading-relaxed mb-4">{excerpt}</p>
    </article>
  );
};

export default PostPreview;
