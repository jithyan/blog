import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import PostType from "../interfaces/post";

const postsDirectory = join(process.cwd(), "_posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug<F extends keyof PostType>(
  slug: string,
  fields: Readonly<F[]>
): { [key in F]: PostType[key] } {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const items: Record<string, any> = {};

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === "slug") {
      items[field] = realSlug;
    }
    if (field === "content") {
      items[field] = content;
    }

    if (typeof data[field] !== "undefined") {
      items[field] = data[field];
    }
  });

  return items as { [key in F]: PostType[key] };
}

export function getAllPosts<F extends keyof PostType>(fields: Readonly<F[]>) {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug, ["date", "publish", ...fields] as const))
    .filter(({ publish }) => Boolean(publish))
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}
