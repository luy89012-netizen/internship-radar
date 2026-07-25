import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Input, Select, Checkbox, Row, Col, Tag, Space, Typography, Empty, Spin, Pagination, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase, type Internship } from '../lib/supabase';
import { CATEGORIES, CITIES, SOURCES, getCategoryColor, getSourceIcon, getSourceLabel } from '../lib/constants';
import dayjs from 'dayjs';

const { Text } = Typography;
const PAGE_SIZE = 20;

export default function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Internship[]>([]);
  const [total, setTotal] = useState(0);

  // 筛选状态从 URL 读取，方便分享和刷新保持
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const source = searchParams.get('source') || '';
  const keyword = searchParams.get('q') || '';
  const remoteOnly = searchParams.get('remote') === '1';
  const page = parseInt(searchParams.get('page') || '1');

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page'); // 改筛选就回第一页
    setSearchParams(next);
  }

  async function loadData() {
    setLoading(true);
    try {
      let query = supabase
        .from('internships')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      if (category) query = query.eq('category', category);
      if (city) query = query.eq('city', city);
      if (source) query = query.eq('source', source);
      if (remoteOnly) query = query.eq('is_remote', true);
      if (keyword) {
        // 关键词模糊匹配 title / company / description
        query = query.or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%,description.ilike.%${keyword}%`);
      }

      query = query
        .order('posted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count } = await query;
      setList(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error('[ListPage] loadData error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, city, source, keyword, remoteOnly, page]);

  return (
    <div>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Input
              placeholder="搜索岗位名 / 公司 / 关键词"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={e => updateParam('q', e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="方向"
              value={category || undefined}
              onChange={v => updateParam('category', v || null)}
              allowClear
              style={{ width: '100%' }}
              options={CATEGORIES.map(c => ({ label: c.label, value: c.key }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="城市"
              value={city || undefined}
              onChange={v => updateParam('city', v || null)}
              allowClear
              style={{ width: '100%' }}
              options={CITIES.map(c => ({ label: c, value: c }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="来源"
              value={source || undefined}
              onChange={v => updateParam('source', v || null)}
              allowClear
              style={{ width: '100%' }}
              options={SOURCES.map(s => ({ label: `${s.icon} ${s.label}`, value: s.key }))}
            />
          </Col>
          <Col xs={12} md={3}>
            <Checkbox
              checked={remoteOnly}
              onChange={e => updateParam('remote', e.target.checked ? '1' : null)}
            >
              仅远程
            </Checkbox>
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          </Col>
        </Row>
      </Card>

      {/* 结果统计 */}
      <div style={{ marginBottom: 12, color: '#6e6a63', fontSize: 13 }}>
        找到 <Text strong style={{ color: '#5c7f4f' }}>{total}</Text> 个岗位
        {(category || city || source || keyword || remoteOnly) && (
          <Button type="link" size="small" onClick={() => setSearchParams({})}>
            清空筛选
          </Button>
        )}
      </div>

      {/* 结果列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : list.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <div>没有匹配的岗位</div>
                <div style={{ fontSize: 12, color: '#8a8378', marginTop: 8 }}>
                  换个筛选条件试试，或<Link to="/submit">自己提交一个</Link>
                </div>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {list.map(item => (
              <Col key={item.id} xs={24}>
                <Link to={`/detail/${item.id}`}>
                  <Card hoverable size="small">
                    <Row gutter={16} align="middle">
                      <Col flex="auto">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 15, color: '#2d3f2b' }}>
                            {item.title}
                          </span>
                          <span style={{ color: '#6e6a63', fontSize: 13 }}>
                            @ {item.company}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.category && (
                            <Tag color={getCategoryColor(item.category)}>{item.category}</Tag>
                          )}
                          {item.city && <Text style={{ fontSize: 12, color: '#6e6a63' }}>📍 {item.city}</Text>}
                          {item.is_remote && <Tag color="green">可远程</Tag>}
                          {item.salary && <Text style={{ fontSize: 12, color: '#6e6a63' }}>💰 {item.salary}</Text>}
                          {item.duration && <Text style={{ fontSize: 12, color: '#6e6a63' }}>⏱ {item.duration}</Text>}
                        </div>
                        {item.description && (
                          <div style={{ marginTop: 8, color: '#4a453f', fontSize: 13, lineHeight: 1.6 }}>
                            {item.description.slice(0, 140)}{item.description.length > 140 ? '...' : ''}
                          </div>
                        )}
                      </Col>
                      <Col flex="120px" style={{ textAlign: 'right' }}>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Tag color="default">{getSourceIcon(item.source)} {getSourceLabel(item.source)}</Tag>
                          {item.posted_at && (
                            <Text style={{ fontSize: 12, color: '#8a8378' }}>
                              {dayjs(item.posted_at).format('MM-DD')} 发布
                            </Text>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>

          {total > PAGE_SIZE && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                onChange={p => updateParam('page', String(p))}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
