import React, { useEffect, useState } from 'react';
import './MarkdownViewer.css';

function MarkdownViewer({ content }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!content) return;

    async function render() {
      try {
        const { marked } = await import('marked');
        marked.setOptions({
          gfm: true,
          breaks: true,
          highlight: null,
        });

        let htmlContent = marked.parse(content);

        // Process code blocks
        htmlContent = htmlContent.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
          const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
          return `<pre class="code-block" data-lang="${lang}"><code class="language-${lang}">${decoded}</code></pre>`;
        });

        // Process inline code
        htmlContent = htmlContent.replace(/<code>([\s\S]*?)<\/code>/g, '<code class="inline-code">$1</code>');

        // Process tables
        htmlContent = htmlContent.replace(/<table>/g, '<div class="table-wrapper"><table>');
        htmlContent = htmlContent.replace(/<\/table>/g, '</table></div>');

        // Process links
        htmlContent = htmlContent.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');

        setHtml(htmlContent);
      } catch (e) {
        setHtml(`<p>文档渲染失败</p>`);
      }
    }
    render();
  }, [content]);

  return <div className="markdown-viewer" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default MarkdownViewer;
