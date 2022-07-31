import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

const PostTitle = ({ children }: Props) => {
  return (
    <h1 className="text-pink-500 font-bold text-center text-6xl tracking-tighter leading-tight mx-auto md:text-left">
      {children}
    </h1>
  );
};

export default PostTitle;
