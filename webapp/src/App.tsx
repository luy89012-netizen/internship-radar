import { ConfigProvider, Layout, Menu, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import SubmitPage from './pages/SubmitPage';
import QuickAddPage from './pages/QuickAddPage';
import './App.css';

const { Header, Content, Footer } = Layout;

function AppShell() {
  const location = useLocation();
  const active = location.pathname === '/' ? 'home'
    : location.pathname.startsWith('/list') ? 'list'
    : location.pathname.startsWith('/quick') ? 'quick'
    : location.pathname.startsWith('/submit') ? 'submit'
    : 'home';

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <Header style={{
        background: '#ffffff',
        borderBottom: '1px solid #ebe7e0',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '0 32px',
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#2d3f2b',
          letterSpacing: 0.5,
        }}>
          🌱 实习雷达 · Internship Radar
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[active]}
          style={{ flex: 1, background: 'transparent', borderBottom: 'none' }}
          items={[
            { key: 'home', label: <Link to="/">首页</Link> },
            { key: 'list', label: <Link to="/list">全部岗位</Link> },
            { key: 'quick', label: <Link to="/quick">⚡ AI 快速录入</Link> },
            { key: 'submit', label: <Link to="/submit">手动录入</Link> },
          ]}
        />
      </Header>
      <Content style={{ padding: '32px 48px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/quick" element={<QuickAddPage />} />
          <Route path="/submit" element={<SubmitPage />} />
        </Routes>
      </Content>
      <Footer style={{
        textAlign: 'center',
        background: 'transparent',
        color: '#8a8378',
        fontSize: 12,
      }}>
        实习雷达 · 数据来自各公司官网校招页 + 小红书公开笔记 + 用户提交
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
