import React, { useState, useEffect } from 'react';
import { NavBar } from 'antd-mobile';
import { FileTextOutlined, ApiOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import './DocsPage.css';

const docSections = [
  {
    key: 'product',
    icon: <FileTextOutlined />,
    title: '需求文档',
    file: '/docs/PRD.md',
  },
  {
    key: 'manual',
    icon: <FileTextOutlined />,
    title: '使用手册',
    file: '/docs/USER_GUIDE.md',
  },
  {
    key: 'design',
    icon: <FileTextOutlined />,
    title: '设计规范',
    file: '/docs/UI_DESIGN.md',
  },
  {
    key: 'api',
    icon: <ApiOutlined />,
    title: 'API 文档',
    file: '/docs/API.md',
  },
  {
    key: 'testing',
    icon: <ExperimentOutlined />,
    title: '测试文档',
    file: '/docs/TEST_PLAN.md',
  }
];

const versionItems = [
  { key: 'v1.0', title: 'v1.0', anchor: 'v1.0' },
  { key: 'v1.1', title: 'v1.1', anchor: 'v1.1' },
  { key: 'v1.2', title: 'v1.2', anchor: 'v1.2' },
  { key: 'v1.3', title: 'v1.3', anchor: 'v1.3' },
  { key: 'v1.4', title: 'v1.4', anchor: 'v1.4' },
  { key: 'v1.5', title: 'v1.5', anchor: 'v1.5' },
];

function DocsPage() {
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState('product');
  const [docContent, setDocContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState(null);

  const contentRef = React.useRef(null);

  useEffect(() => {
    const section = docSections.find(s => s.key === activeDoc);
    if (!section) return;

    setLoading(true);
    fetch(section.file)
      .then(res => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then(text => {
        setDocContent(text);
        requestAnimationFrame(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = 0;
          }
        });
      })
      .catch(() => {
        setDocContent(`# ${section.title}\n\n> 文档加载中，请稍后刷新重试。`);
      })
      .finally(() => setLoading(false));
  }, [activeDoc]);

  const scrollToAnchor = (anchor) => {
    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleVersionChange = (version) => {
    setActiveVersion(version);
    const item = versionItems.find(v => v.key === version);
    if (item) {
      scrollToAnchor(item.anchor);
    }
  };

  const handleSectionClick = (sectionKey) => {
    setActiveDoc(sectionKey);
    setActiveVersion(null);
  };

  const showVersions = activeDoc === 'product';

  return (
    <div className="docs-page">
      <NavBar backText="返回" onBack={() => navigate(-1)} className="docs-nav">
        <img src="/logo.svg" alt="" className="docs-nav-logo" />
        项目文档中心
      </NavBar>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-header">
            <img src="/logo.svg" alt="" className="docs-sidebar-logo" />
            <span className="docs-logo-text">文档中心</span>
          </div>

          <div className="docs-sidebar-sections">
            {docSections.map(section => (
              <div
                key={section.key}
                className={`docs-section-title ${activeDoc === section.key ? 'active' : ''}`}
                onClick={() => handleSectionClick(section.key)}
              >
                <span className="docs-section-icon">{section.icon}</span>
                <span className="docs-section-name">{section.title}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="docs-content">
          <div className="docs-markdown-wrapper" ref={contentRef}>
            <div className="docs-markdown-area">
              {loading ? (
                <div className="docs-loading">
                  <div className="docs-loading-spinner"></div>
                  <p>正在加载文档...</p>
                </div>
              ) : (
                <MarkdownViewer content={docContent} />
              )}
            </div>

            {showVersions && (
              <div className="docs-version-pills">
                {versionItems.map(item => (
                  <div
                    key={item.key}
                    className={`docs-version-pill ${activeVersion === item.key ? 'active' : ''}`}
                    onClick={() => handleVersionChange(item.key)}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DocsPage;
