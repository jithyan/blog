import Container from "./container";

const Footer = () => {
  return (
    <footer className="bg-slate-800">
      <div style={{ display: "table" }} className="mx-auto">
        <ul className="list-none flex flex-row text-lg text-teal-500 underline font-semibold p-2">
          <li className="mr-4 max-w-md">
            <a
              href="https://github.com/jithyan"
              className="hover:text-sky-400 "
              target="_blank"
            >
              Github
            </a>
          </li>
          <li className="mr-4 max-w-md">
            <a
              href="https://www.linkedin.com/in/jithyan/"
              className=" hover:text-sky-400 "
              target="_blank"
            >
              LinkedIn
            </a>
          </li>
          <li className="">
            <a
              href="https://jithyan.github.io/resume/"
              className=" hover:text-sky-400"
              target="_blank"
            >
              Resume
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
