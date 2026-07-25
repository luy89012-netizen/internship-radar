import { Card, Col, Row, Statistic, Typography, Tag, Empty, Spin, Button } from 'antd';
import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase, type Internship } from '../lib/supabase';
import { CATEGORIES, getCategoryColor, getSourceIcon } from '../lib/constants';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });
  const [recentList, setRecentList] = useState<Internship[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  async function loadData() {
    setLoading(true);
    try {
      // 全部有效岗位数
      const { count: total } = await supabase
        .from('internships')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 今日新增
      const today = dayjs().startOf('day').toISOString();
      const { count: todayCount } = await supabase
        .from('internships')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // 本周新增
      const weekStart = dayjs().startOf('week').toISOString();
      const { count: weekCount } = await supabase
        .from('internships')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart);

      setStats({
        total: total || 0,
        today: todayCount || 0,
        thisWeek: weekCount || 0,
      });

      // 最新 6 条
      const { data: recent } = await supabase
        .from('internships')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentList(recent || []);

      // 各方向计数
      const counts: Record<string, number> = {};
      for (const cat of CATEGORIES) {
        const { count } = await supabase
          .from('internships')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('category', cat.key);
        counts[cat.key] = count || 0;
      }
      setCategoryCounts(counts);
    } catch (err) {
      console.error('[HomePage] loadData error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      {/* 顶部欢迎 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#2d3f2b' }}>
          实习雷达 · 今天有什么好机会？
        </Title>
        <Paragraph style={{ color: '#6e6a63', marginTop: 8 }}>
          面向北京大学生的商业化/运营/数据方向实习聚合 · 数据来自各公司官网 + 小红书公开笔记 + 同学互助提交
        </Paragraph>
      </div>

      {/* 数据概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="在招岗位"
              value={stats.total}
              valueStyle={{ color: '#5c7f4f' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日新增"
              value={stats.today}
              valueStyle={{ color: '#c99871' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="本周新增"
              value={stats.thisWeek}
              valueStyle={{ color: '#5978a8' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 方向快捷入口 */}
      <Card
        title="按方向快速筛选"
        style={{ marginBottom: 24 }}
        extra={<Link to="/list"><Button type="link" icon={<ArrowRightOutlined />}>看全部</Button></Link>}
      >
        <Row gutter={[12, 12]}>
          {CATEGORIES.map(cat => (
            <Col key={cat.key} xs={12} sm={8} md={4}>
              <Link to={`/list?category=${cat.key}`}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    textAlign: 'center',
                    borderTop: `3px solid ${cat.color}`,
                  }}
                >
                  <div style={{ fontSize: 13, color: '#4a453f', marginBottom: 4 }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: cat.color }}>
                    {loading ? '—' : (categoryCounts[cat.key] || 0)}
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 最新 6 条 */}
      <Card
        title="最新上线"
        extra={
          <>
            <Button type="text" icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Link to="/list"><Button type="link" icon={<ArrowRightOutlined />}>全部</Button></Link>
          </>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : recentList.length === 0 ? (
          <Empty
            description={
              <div>
                <div>还没有岗位数据</div>
                <div style={{ fontSize: 12, color: '#8a8378', marginTop: 8 }}>
                  可以自己去<Link to="/submit">提交一个</Link>，或等每日爬虫拉数据
                </div>
              </div>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {recentList.map(item => (
              <Col key={item.id} xs={24} md={12}>
                <Link to={`/detail/${item.id}`}>
                  <Card size="small" hoverable style={{ height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#2d3f2b' }}>
                        {item.title}
                      </div>
                      <span style={{ fontSize: 12, color: '#8a8378', whiteSpace: 'nowrap' }}>
                        {getSourceIcon(item.source)}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6e6a63' }}>
                      {item.company} · {item.city || '未标注城市'}{item.is_remote ? ' · 可远程' : ''}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.category && (
                        <Tag color={getCategoryColor(item.category)} style={{ margin: 0 }}>
                          {item.category}
                        </Tag>
                      )}
                      {item.posted_at && (
                        <Text style={{ fontSize: 11, color: '#8a8378' }}>
                          {dayjs(item.posted_at).format('MM-DD')}
                        </Text>
                      )}
                    </div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
}
