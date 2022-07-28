import { CMS_NAME } from "../lib/constants";

const Intro = () => {
  return (
    <hgroup className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        A Dev Blog
      </h1>
      <h2 className="text-center md:text-left text-lg mt-5 md:pl-8">
        A collection of thoughts on full stack web development by{" "}
        <a
          href="https://www.linkedin.com/in/jithyan/"
          className="underline hover:text-blue-600 duration-200 transition-colors"
        >
          Jithya Nanayakkara
        </a>
      </h2>
    </hgroup>
  );
};

export default Intro;
