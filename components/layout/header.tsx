import Link from "next/link";

const Header = () => {
  return (
    <h2 className="text-lg md:text-xl font-bold underline text-teal-500 mb-20 pt-8">
      <Link href="/">
        <a className="hover:text-sky-400">Home</a>
      </Link>
    </h2>
  );
};

export default Header;
