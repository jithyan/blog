// import { remark } from 'remark'
import html from "remark-html";
import matter from "gray-matter";

export default function markdownToHtml(markdown: string) {
  let { content } = matter(markdown);

  return content;
}
