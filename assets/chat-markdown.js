const inlineTokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

export function parseChatInline(value) {
  const input = String(value ?? '');
  const segments = [];
  let cursor = 0;

  for (const match of input.matchAll(inlineTokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: 'text', value: input.slice(cursor, index) });

    const token = match[0];
    if (token.startsWith('`')) {
      segments.push({ type: 'code', value: token.slice(1, -1) });
    } else if (token.startsWith('**') || token.startsWith('__')) {
      segments.push({ type: 'strong', value: token.slice(2, -2) });
    } else {
      segments.push({ type: 'emphasis', value: token.slice(1, -1) });
    }
    cursor = index + token.length;
  }

  if (cursor < input.length) segments.push({ type: 'text', value: input.slice(cursor) });
  if (segments.length === 0) segments.push({ type: 'text', value: input });
  return segments;
}

export function parseChatMarkdown(value) {
  const lines = String(value ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const blocks = [];
  let paragraphLines = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({
      type: 'paragraph',
      lines: paragraphLines.map(parseChatInline),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? 'unordered-list' : 'ordered-list';
      if (list?.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(parseChatInline((unordered ?? ordered)[1]));
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
