// import { remark } from 'remark'
import html from "remark-html";
import matter from "gray-matter";

export default function markdownToHtml(markdown: string) {
  let { content } = matter(markdown);

  if (process.env.NODE_ENV === "production") {
    const regex = /\!\[(.*?)\]\((.*?)\)/gm;
    let matches;

    while ((matches = regex.exec(content)) !== null) {
      content = content.replace("](" + matches[2], `](/blog${matches[2]}`);
    }
  }

  return content;
}
