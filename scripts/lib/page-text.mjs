const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Copy is plain text: layout and HTML stay in the template. */
export function renderPageText(template, copy, downloads) {
  return template.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => {
    if (key === 'runtimeMessages') {
      const json = JSON.stringify(copy.messages || {}).replaceAll('<', '\\u003c');
      return `<script id="page-messages" type="application/json">${json}</script>`;
    }
    if (key === 'downloads.total')
      return downloads ? downloads.total.toLocaleString('en-US') : 'Unavailable';
    let value = copy;
    for (const part of key.split('.')) {
      if (!value || !Object.hasOwn(value, part)) throw new Error(`Missing page text: ${key}`);
      value = value[part];
    }
    if (typeof value !== 'string') throw new Error(`Page text must be a string: ${key}`);
    return escapeHtml(value);
  });
}
