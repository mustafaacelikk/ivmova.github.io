import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).filter(Boolean).map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/); if (bold) return <strong key={index} className="font-black text-[#0b1b33]">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/); if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0d9688] underline decoration-slate-300 underline-offset-4 hover:decoration-[#0d9688]">{link[1]}</a>;
    return part;
  });
}

export function ArticleBody({ body }: { body: string[] | string }) {
  const lines = (Array.isArray(body) ? body : body.split(/\n/)).map((line) => line.trim()).filter(Boolean);
  const content: ReactNode[] = []; let list: string[] = [];
  const flushList = () => { if (list.length) { content.push(<ul key={`list-${content.length}`} className="mb-7 list-disc space-y-2 pl-6 text-lg leading-8 text-slate-700">{list.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>); list = []; } };
  for (const line of lines) {
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flushList();
    if (line.startsWith("## ")) content.push(<h2 key={content.length} className="mb-4 mt-10 text-2xl font-black leading-tight tracking-tight text-[#0b1b33] sm:text-3xl">{inline(line.slice(3))}</h2>);
    else if (line.startsWith("> ")) content.push(<blockquote key={content.length} className="mb-7 border-l-4 border-[#12b8a6] bg-white px-5 py-4 text-xl font-semibold leading-8 text-[#0b1b33]">{inline(line.slice(2))}</blockquote>);
    else content.push(<p key={content.length} className="mb-7 text-lg leading-8 text-slate-700">{inline(line)}</p>);
  }
  flushList(); return <div className="min-w-0 [overflow-wrap:anywhere] [word-break:normal]">{content}</div>;
}
