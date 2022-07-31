import Avatar from "./avatar";
import DateFormatter from "./date-formatter";
import CoverImage from "./cover-image";
import PostTitle from "./post-title";
import type Author from "../../interfaces/author";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: Author;
};

const PostHeader = ({ title, coverImage, date, author }: Props) => {
  return (
    <>
      <div className="max-w-2xl mx-auto">
        <PostTitle>{title}</PostTitle>
        <div className="mt-2 mb-6 text-lg text-white font-semibold">
          <DateFormatter dateString={date} /> | <span>Jithya Nanayakkara</span>
        </div>
      </div>
    </>
  );
};

export default PostHeader;
