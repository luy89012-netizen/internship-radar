import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Typography, Spin, Empty, Button, Space, Divider } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { supabase, type Internship } from '../lib/supabase';
import { getCategoryColor, getSourceIcon, getSourceLabel } from '../lib/constants';
import ReviewSection from '../components/ReviewSection';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Internship | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('internships')
        .select('*')
        .eq('id', id)
        .single();
      setItem(data);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!item) {
    return (
      <Card>
        <Empty description="岗位不存在或已下线" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/list')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, color: '#5c7f4f' }}
      >
        返回
      </Button>

      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#2d3f2b' }}>
              {item.title}
            </Title>
            <div style={{ marginTop: 8, color: '#6e6a63', fontSize: 15 }}>
              @ <Text strong>{item.company}</Text>
            </div>
          </div>

          <Space wrap>
            {item.category && (
              <Tag color={getCategoryColor(item.category)} style={{ fontSize: 13, padding: '4px 10px' }}>
                {item.category}
              </Tag>
            )}
            {item.city && <Tag style={{ fontSize: 13, padding: '4px 10px' }}>📍 {item.city}</Tag>}
            {item.is_remote && <Tag color="green" style={{ fontSize: 13, padding: '4px 10px' }}>可远程</Tag>}
            <Tag style={{ fontSize: 13, padding: '4px 10px' }}>
              {getSourceIcon(item.source)} {getSourceLabel(item.source)}
            </Tag>
          </Space>

          <Descriptions column={2} size="small" bordered style={{ background: '#fafafa' }}>
            {item.salary && <Descriptions.Item label="薪资">{item.salary}</Descriptions.Item>}
            {item.duration && <Descriptions.Item label="实习时长">{item.duration}</Descriptions.Item>}
            {item.base_departments && <Descriptions.Item label="所属部门">{item.base_departments}</Descriptions.Item>}
            {item.posted_at && (
              <Descriptions.Item label="发布时间">
                {dayjs(item.posted_at).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {item.deadline && (
              <Descriptions.Item label="截止时间">
                {dayjs(item.deadline).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {item.description && (
            <div>
              <Title level={5} style={{ color: '#2d3f2b' }}>岗位描述</Title>
              <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#4a453f' }}>
                {item.description}
              </Paragraph>
            </div>
          )}

          {item.requirements && (
            <div>
              <Title level={5} style={{ color: '#2d3f2b' }}>岗位要求</Title>
              <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#4a453f' }}>
                {item.requirements}
              </Paragraph>
            </div>
          )}

          {item.source_url && (
            <>
              <Divider />
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<LinkOutlined />}
                  href={item.source_url}
                  target="_blank"
                  style={{ background: '#5c7f4f' }}
                >
                  去原页面投递
                </Button>
                <div style={{ marginTop: 8, fontSize: 12, color: '#8a8378' }}>
                  原链接：<a href={item.source_url} target="_blank" rel="noreferrer">{item.source_url}</a>
                </div>
              </div>
            </>
          )}
        </Space>
      </Card>

      <div style={{ marginTop: 16 }}>
        <ReviewSection
          internshipId={item.id}
          title="本岗位评论"
        />
        <ReviewSection
          companyName={item.company}
          title={`「${item.company}」相关评论（覆盖公司所有岗位）`}
        />
      </div>
    </div>
  );
}
