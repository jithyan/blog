import Container from "./container";

const Footer = () => {
  return (
    <footer className="bg-slate-800">
      <div
        style={{ display: "table", marginLeft: "auto", marginRight: "auto" }}
      >
        <ul className="list-none flex flex-row text-lg text-teal-500 underline font-semibold p-2">
          <li className="mr-4 max-w-md">
            <a href="https://github.com/jithyan" className="">
              github
            </a>
          </li>
          <li className="">
            <a href="https://www.linkedin.com/in/jithyan/" className="">
              linkedin
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
