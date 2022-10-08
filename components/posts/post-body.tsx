import markdownStyles from "../../styles/markdown-styles.module.css";
import React from "react";
import ReactMarkdown from "react-markdown";
import { PrismAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { CodeComponent } from "react-markdown/lib/ast-to-react";
import { generateIdFromText } from "../../lib/ids";

type Props = {
  content: string;
};

const CodeBlock: CodeComponent = ({
  node,
  inline,
  className,
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
    <SyntaxHighlighter
      children={String(children).replace(/\n$/, "")}
      style={vscDarkPlus as Record<string, any>}
      language={match[1]}
      PreTag="div"
      {...props}
    />
  ) : (
    <code className="bg-slate-800 px-2" {...props}>
      {children}
    </code>
  );
};

const PostBody = ({ content }: Props) => {
  return (
    <div className="max-w-2xl mx-auto text-gray-300">
      <ReactMarkdown
        className={markdownStyles["markdown"]}
        remarkPlugins={[remarkGfm]}
        components={{
          h2: (props) => {
            const id = generateIdFromText(props.children[0]);
            return <h2 {...props} id={id} />;
          },
          code: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PostBody;
