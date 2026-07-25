import { useState, useEffect } from 'react';
import {
  List, Card, Avatar, Tag, Rate, Button, Modal, Form, Input,
  Radio, message, Empty, Space, Divider,
} from 'antd';
import {
  UserOutlined, LikeOutlined, WarningOutlined,
  SolutionOutlined, PlusOutlined,
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { TextArea } = Input;

type Review = {
  id: number;
  internship_id: number | null;
  company_name: string | null;
  kind: 'experience' | 'interview' | 'warning';
  content: string;
  rating: number | null;
  author_name: string | null;
  is_anonymous: boolean;
  created_at: string;
};

const KIND_CONFIG = {
  experience: { label: '前辈实测', color: '#5c7f4f', icon: <LikeOutlined /> },
  interview: { label: '面经', color: '#c99871', icon: <SolutionOutlined /> },
  warning: { label: '避雷', color: '#c86464', icon: <WarningOutlined /> },
};

// 人机验证题库（前端展示，后端也存了）
const CAPTCHAS = [
  { key: '3+7', question: '3 + 7 = ?' },
  { key: '5+8', question: '5 + 8 = ?' },
  { key: '9-4', question: '9 - 4 = ?' },
  { key: '6+11', question: '6 + 11 = ?' },
  { key: '15-6', question: '15 - 6 = ?' },
  { key: '4+9', question: '4 + 9 = ?' },
  { key: '12-5', question: '12 - 5 = ?' },
  { key: '8+7', question: '8 + 7 = ?' },
  { key: '11-3', question: '11 - 3 = ?' },
  { key: '2+14', question: '2 + 14 = ?' },
];

type Props = {
  internshipId?: number;
  companyName?: string;
  title: string;  // 显示的标题，如"本岗位评论" / "「小红书」相关评论"
};

export default function ReviewSection({ internshipId, companyName, title }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState(CAPTCHAS[0]);
  const [form] = Form.useForm();

  async function loadReviews() {
    setLoading(true);
    try {
      let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (internshipId) query = query.eq('internship_id', internshipId);
      else if (companyName) query = query.eq('company_name', companyName).is('internship_id', null);

      const { data, error } = await query;
      if (!error && data) setReviews(data as Review[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [internshipId, companyName]);

  function openModal() {
    setCaptcha(CAPTCHAS[Math.floor(Math.random() * CAPTCHAS.length)]);
    form.resetFields();
    setModalOpen(true);
  }

  async function handleSubmit(values: any) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internship_id: internshipId || null,
          company_name: internshipId ? null : companyName,
          kind: values.kind,
          content: values.content,
          rating: values.rating,
          author_name: values.author_name,
          is_anonymous: values.is_anonymous || false,
          captcha_key: captcha.key,
          captcha_answer: values.captcha_answer,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        message.error('提交失败：' + (data.error || `HTTP ${res.status}`));
        return;
      }
      message.success('评论已发布 🌱');
      setModalOpen(false);
      loadReviews();
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = reviews.length
    ? reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0)
        / Math.max(reviews.filter(r => r.rating).length, 1)
    : 0;

  return (
    <Card
      title={
        <Space>
          <span style={{ color: '#2d3f2b', fontWeight: 600 }}>{title}</span>
          <Tag color="#5c7f4f" style={{ marginLeft: 4 }}>{reviews.length}</Tag>
          {avgRating > 0 && (
            <Space size={4}>
              <Rate disabled allowHalf value={avgRating} style={{ fontSize: 14 }} />
              <span style={{ color: '#6e6a63', fontSize: 12 }}>{avgRating.toFixed(1)}</span>
            </Space>
          )}
        </Space>
      }
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />}
          style={{ background: '#5c7f4f' }} onClick={openModal}>
          发一条
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      {loading ? null : reviews.length === 0 ? (
        <Empty description="还没有评论，来当第一个" />
      ) : (
        <List
          dataSource={reviews}
          renderItem={r => {
            const cfg = KIND_CONFIG[r.kind];
            const displayName = r.is_anonymous ? '匿名同学' : (r.author_name || '匿名');
            return (
              <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0ede8' }}>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ background: cfg.color }} />}
                  title={
                    <Space wrap>
                      <Tag color={cfg.color} icon={cfg.icon} style={{ margin: 0 }}>
                        {cfg.label}
                      </Tag>
                      <span style={{ fontWeight: 600, color: '#2d3f2b' }}>{displayName}</span>
                      {r.rating && (
                        <Rate disabled value={r.rating} style={{ fontSize: 12 }} />
                      )}
                      <span style={{ color: '#a09a91', fontSize: 12 }}>
                        {dayjs(r.created_at).fromNow()}
                      </span>
                    </Space>
                  }
                  description={
                    <div style={{ color: '#3d3a34', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                      {r.content}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      <Modal
        title={`发一条评论 · ${title}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ kind: 'experience', is_anonymous: false }}>
          <Form.Item label="类型" name="kind" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="experience">
                <LikeOutlined /> 前辈实测
              </Radio.Button>
              <Radio.Button value="interview">
                <SolutionOutlined /> 面经
              </Radio.Button>
              <Radio.Button value="warning">
                <WarningOutlined /> 避雷
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="打分（可选）" name="rating"
            tooltip="1星=很不推荐，5星=强烈推荐">
            <Rate allowClear />
          </Form.Item>

          <Form.Item label="内容" name="content"
            rules={[{ required: true, min: 10, max: 2000, message: '10-2000 字' }]}>
            <TextArea rows={5} placeholder="分享你的真实体验/面试问题/坑点等，尽量具体，别人才好参考..." />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <Form.Item label="署名" name="author_name">
            <Input placeholder="花名/昵称，可选" maxLength={20} />
          </Form.Item>

          <Form.Item name="is_anonymous" valuePropName="checked">
            <Radio>匿名发布（不显示署名）</Radio>
          </Form.Item>

          <Form.Item label={`人机验证：${captcha.question}`} name="captcha_answer"
            rules={[{ required: true, message: '算一下嘛' }]}>
            <Input placeholder="填答案" style={{ width: 120 }} />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              style={{ background: '#5c7f4f' }}>
              发布
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
