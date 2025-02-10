import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";

  try {
    const hast = fromHtml(html, { fragment: true });
    const mdast = toMdast(hast);
    return toMarkdown(mdast);
  } catch (e) {
    console.warn(
      "Failed to convert HTML to Markdown, returning raw content:",
      e,
    );
    return typeof html === "string" ? html : "";
  }
}
