import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AnswerDisplay({ text }: { text: string }) {
  return (
    <div
      className="markdown prose prose-invert prose-sm sm:prose-base lg:prose-lg
                 prose-headings:font-semibold prose-h2:mt-2 prose-h2:mb-1
                 prose-p:my-1 prose-li:my-0.5
                 text-neutral-100 leading-relaxed max-w-none"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}