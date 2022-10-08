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
  estimatedReadingTime: string;
};

const PostHeader = ({
  title,
  coverImage,
  date,
  author,
  estimatedReadingTime,
}: Props) => {
  return (
    <>
      <div className="max-w-2xl mx-auto">
        <PostTitle>{title}</PostTitle>
        <div className="mt-2 mb-6 text-lg text-white font-semibold">
          <div className="mb-1">
            <DateFormatter dateString={date} /> |{" "}
            <span>Jithya Nanayakkara</span> |{" "}
            <span>{estimatedReadingTime}</span>
          </div>
          <div>
            <a
              className="text-base  text-teal-500 underline hover:text-sky-400"
              href="#inject-comments-for-uterances"
            >
              Jump to comments
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostHeader;
