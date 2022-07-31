import { CMS_NAME } from "../../lib/constants";

const Intro = () => {
  return (
    <hgroup className="flex-col flex items-center md:justify-between pt-12 pb-12 md:mb-12">
      <h1 className="text-pink-500 text-2xl md:text-4xl font-bold tracking-tighter leading-tight md:pr-8">
        Jithya's Blog
      </h1>
      <h2 className="text-center text-gray-300 md:text-left text-lg mt-5 mb-1 md:pl-8">
        A place to consolidate my thoughts on building web apps in React and
        Typescript.
      </h2>
      <h3 className="text-gray-300">
        By{" "}
        <a
          href="https://www.linkedin.com/in/jithyan/"
          className="text-teal-500 underline hover:text-sky-400 duration-200 transition-colors"
        >
          Jithya Nanayakkara
        </a>
      </h3>
    </hgroup>
  );
};

export default Intro;
