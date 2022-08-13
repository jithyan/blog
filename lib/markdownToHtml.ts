// import { remark } from 'remark'
import html from "remark-html";
import matter from "gray-matter";

export default function markdownToHtml(markdown: string) {
  const result = matter(markdown);
  return result.content;
}
