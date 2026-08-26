import type { ManagedBlogPost } from "../lib/blog";

function formatArticleDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function renderBody(body: string) {
  const lines = body.replace(/\r/g, "").split("\n");
  const blocks: Array<
    | { type: "heading"; level: 2 | 3; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
  > = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "list", items: [...listBuffer] });
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function ManagedBlogArticle({ post }: { post: ManagedBlogPost }) {
  const publishedLabel = formatArticleDate(post.publishedAt ?? post.createdAt);
  const blocks = renderBody(post.body);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-[0_36px_90px_-60px_rgba(15,23,42,0.26)]">
        <div className="px-5 py-8 md:px-10 md:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#4F46E5]">
              ChaufX Blog
            </div>
            <h1 className="mt-4 text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.06em] text-[#0F172A] md:text-[3.5rem]">
              {post.title}
            </h1>
            {publishedLabel ? <div className="mt-4 text-lg text-slate-500">{publishedLabel}</div> : null}

            {post.coverImageUrl ? (
              <div className="mt-8 overflow-hidden rounded-[28px]">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full object-cover shadow-[0_24px_70px_-48px_rgba(15,23,42,0.38)]"
                />
              </div>
            ) : null}

            <div className="mt-8 space-y-6">
              {blocks.map((block, index) => {
                if (block.type === "heading") {
                  const Tag = block.level === 2 ? "h2" : "h3";
                  return (
                    <Tag
                      key={`${block.type}-${index}`}
                      className={
                        block.level === 2
                          ? "text-[1.8rem] font-semibold leading-[1.1] tracking-[-0.05em] text-[#0F172A]"
                          : "text-[1.35rem] font-semibold leading-[1.2] tracking-[-0.04em] text-[#0F172A]"
                      }
                    >
                      {block.text}
                    </Tag>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul
                      key={`${block.type}-${index}`}
                      className="list-disc space-y-3 pl-5 text-[1.05rem] leading-8 text-slate-600"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={`${block.type}-${index}`} className="text-[1.06rem] leading-8 text-slate-600">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
