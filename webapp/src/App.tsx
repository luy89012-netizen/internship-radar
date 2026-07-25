import { lazy, Suspense } from 'react';
import { ConfigProvider, Layout, Menu, Spin, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import './App.css';

// 非首屏路由懒加载（减小首屏 JS 体积）
const ListPage = lazy(() => import('./pages/ListPage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const SubmitPage = lazy(() => import('./pages/SubmitPage'));
const QuickAddPage = lazy(() => import('./pages/QuickAddPage'));

const { Header, Content, Footer } = Layout;

const fallback = (
  <div style={{ textAlign: 'center', padding: 80 }}>
    <Spin size="large" />
  </div>
);

function AppShell() {
  const location = useLocation();
  const active = location.pathname === '/' ? 'home'
    : location.pathname.startsWith('/list') ? 'list'
    : location.pathname.startsWith('/quick') ? 'quick'
    : location.pathname.startsWith('/submit') ? 'submit'
    : 'home';

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <Header className="ir-header" style={{
        background: '#ffffff',
        borderBottom: '1px solid #ebe7e0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
      }}>
        <div className="ir-logo" style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#2d3f2b',
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}>
          🌱 实习雷达
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[active]}
          style={{ flex: 1, background: 'transparent', borderBottom: 'none', minWidth: 0 }}
          items={[
            { key: 'home', label: <Link to="/">首页</Link> },
            { key: 'list', label: <Link to="/list">全部岗位</Link> },
            { key: 'quick', label: <Link to="/quick">⚡ AI 录入</Link> },
            { key: 'submit', label: <Link to="/submit">手动录入</Link> },
          ]}
        />
      </Header>
      <Content className="ir-content" style={{ padding: '20px 16px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Suspense fallback={fallback}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/detail/:id" element={<DetailPage />} />
            <Route path="/quick" element={<QuickAddPage />} />
            <Route path="/submit" element={<SubmitPage />} />
          </Routes>
        </Suspense>
      </Content>
      <Footer style={{
        textAlign: 'center',
        background: 'transparent',
        color: '#8a8378',
        fontSize: 12,
      }}>
        实习雷达 · 官网校招 + 小红书公开笔记 + 同学提交
      </Footer>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#5c7f4f',
          colorLink: '#5c7f4f',
          borderRadius: 6,
          fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ConfigProvider>
  );
}
