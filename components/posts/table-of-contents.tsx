import { generateIdFromText } from "../../lib/ids";

export function TableOfContents({
  headings,
}: {
  headings: string[];
}): JSX.Element {
  return (
    <section className="mx-auto max-w-md text-sm text-left text-gray-500 dark:text-gray-400 mb-2 rounded-lg">
      <h2 className="text-center font-semibold text-basis text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 py-1.5 px-2.5">
        Table of Contents
      </h2>
      <div>
        {headings.map((heading, i) => {
          const id = `#${generateIdFromText(heading)}`;
          return (
            <div
              key={id}
              className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-pink-400  py-2 px-3 "
            >
              <a
                href={id}
                className="underline text-gray-900 whitespace-nowrap dark:text-white"
              >
                {i + 1}. {heading}
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
