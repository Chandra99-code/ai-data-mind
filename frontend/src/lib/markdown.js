// Very small markdown renderer for chat messages (headings, bold, code, lists)
export function renderMarkdown(text = "") {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/(^|\s)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Bullet lists
  html = html.replace(/^(?:- |\* )(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");
  // Numbered
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
  // Paragraphs
  html = html
    .split(/\n\n+/)
    .map((b) => (b.match(/^<(h1|h2|h3|ul|pre|ol|li)/) ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return html;
}
