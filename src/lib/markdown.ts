/**
 * Lightweight markdown → HTML renderer.
 * Handles: headings, tables, code blocks (fenced ```), inline code,
 * bold, italic, links, horizontal rules, blockquotes, unordered/ordered lists.
 * No external dependencies.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(s: string): string {
  return s
    // inline code — do first so nothing inside is processed
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // bold+italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      out.push(`<pre data-lang="${escapeHtml(lang)}"><code>${codeLines.join('\n')}</code></pre>`);
      i++;
      continue;
    }

    // Table — detect by leading pipe
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // row 0 = header, row 1 = separator, rest = body
      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r.split('|').slice(1, -1).map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        const body = tableLines.slice(2).map(parseRow);
        const head = headers.map((h) => `<th>${renderInline(h)}</th>`).join('');
        const rows = body
          .map((r) => '<tr>' + r.map((c) => `<td>${renderInline(c)}</td>`).join('') + '</tr>')
          .join('');
        out.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`);
      }
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const id = hMatch[2].toLowerCase().replace(/[^a-z0-9]+/g, '-');
      out.push(`<h${level} id="${id}">${renderInline(escapeHtml(hMatch[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push('<hr />');
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      out.push(`<blockquote>${renderInline(escapeHtml(line.slice(2)))}</blockquote>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^[\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i])) {
        items.push(`<li>${renderInline(escapeHtml(lines[i].slice(2)))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, '');
        items.push(`<li>${renderInline(escapeHtml(text))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      out.push('<br />');
      i++;
      continue;
    }

    // Paragraph
    out.push(`<p>${renderInline(escapeHtml(line))}</p>`);
    i++;
  }

  return out.join('\n');
}

/** Extract all headings from markdown for a TOC */
export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function extractHeadings(md: string): Heading[] {
  const result: Heading[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m) {
      result.push({
        level: m[1].length,
        text: m[2].replace(/\*\*|`/g, ''),
        id: m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
    }
  }
  return result;
}
