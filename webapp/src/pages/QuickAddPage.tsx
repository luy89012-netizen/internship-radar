import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Input, Button, Typography, Alert, message, Modal,
  Form, Select, Checkbox, Space, Divider, Row, Col,
} from 'antd';
import { ThunderboltFilled, LoadingOutlined, EditOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { parseJobText } from '../lib/parseJob';
import { CATEGORIES, CITIES } from '../lib/constants';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const SHARED_PASSWORD = 'pkuintern2026';

export default function QuickAddPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ir_authed') === '1');

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  async function handleParse() {
    if (!rawText.trim() || rawText.length < 20) {
      message.warning('内容太短，请粘贴完整的岗位描述');
      return;
    }
    setParsing(true);
    try {
      const res = await parseJobText(rawText);
      if (!res.ok || !res.data) {
        message.error('解析失败：' + (res.error || '未知错误'));
        return;
      }
      // 填充表单
      form.setFieldsValue({
        ...res.data,
      });
      setStep('confirm');
      message.success('已自动解析，请检查并补充');
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(values: any) {
    setSubmitting(true);
    try {
      let contributorId: number | null = null;
      if (values.contributor_name) {
        const { data: existing } = await supabase
          .from('contributors')
          .select('id')
          .eq('name', values.contributor_name)
          .maybeSingle();

        if (existing) {
          contributorId = existing.id;
        } else {
          const { data: created } = await supabase
            .from('contributors')
            .insert({ name: values.contributor_name })
            .select('id')
            .single();
          contributorId = created?.id || null;
        }
      }

      const payload = {
        title: values.title,
        company: values.company,
        city: values.city || null,
        is_remote: values.is_remote || false,
        category: values.category || null,
        description: values.description || null,
        requirements: values.requirements || null,
        salary: values.salary || null,
        duration: values.duration || null,
        source: 'manual',
        source_url: values.source_url || null,
        external_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        posted_at: new Date().toISOString(),
        contributor_id: contributorId,
      };

      const { error } = await supabase.from('internships').insert(payload);
      if (error) {
        message.error('提交失败：' + error.message);
        return;
      }

      Modal.success({
        title: '提交成功 🎉',
        content: '岗位已上线，其他同学都能看到了。',
        onOk: () => navigate('/list?source=manual'),
      });
      form.resetFields();
      setRawText('');
      setStep('input');
    } finally {
      setSubmitting(false);
    }
  }

  if (!authed) {
    return (
      <Card style={{ maxWidth: 480, margin: '80px auto' }}>
        <Title level={4} style={{ color: '#2d3f2b' }}>需要口令</Title>
        <Paragraph style={{ color: '#6e6a63' }}>
          为避免恶意灌数据，需要输入分享给同学的口令。
        </Paragraph>
        <Input.Password
          placeholder="输入口令"
          onPressEnter={e => {
            const v = (e.target as HTMLInputElement).value;
            if (v === SHARED_PASSWORD) {
              sessionStorage.setItem('ir_authed', '1');
              setAuthed(true);
              message.success('已解锁');
            } else {
              message.error('口令不对');
            }
          }}
        />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <Title level={3} style={{ color: '#2d3f2b', marginBottom: 8 }}>
          <ThunderboltFilled style={{ color: '#c99871' }} /> AI 快速录入
        </Title>
        <Paragraph style={{ color: '#6e6a63' }}>
          从小红书笔记 / 公众号 / BOSS 直聘 / 群消息 复制一段实习信息，粘贴后自动解析，比手动填快 5 倍。
        </Paragraph>

        {step === 'input' && (
          <>
            <TextArea
              rows={12}
              placeholder={`把复制的岗位信息粘贴在这里，例如：

【招聘】小红书商业化策略实习生
公司：小红书
地点：上海市
薪资：220-260/天
方向：商业化，参与品牌广告业务
要求：本科大二以上、每周4天到岗、3个月+
链接：https://job.xiaohongshu.com/xxx

内容不需要格式化，AI 会自动提取。`}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              style={{ marginBottom: 16, fontFamily: 'inherit' }}
            />
            <Space>
              <Button
                type="primary"
                size="large"
                icon={parsing ? <LoadingOutlined /> : <ThunderboltFilled />}
                loading={parsing}
                onClick={handleParse}
                style={{ background: '#5c7f4f' }}
              >
                {parsing ? '解析中...' : 'AI 解析'}
              </Button>
              <Button onClick={() => navigate('/submit')} icon={<EditOutlined />}>
                改用手动完整表单
              </Button>
            </Space>
            <Alert
              type="info"
              showIcon
              message="Tip"
              description="内容尽量完整——公司、城市、岗位名、要求都有的话解析质量最高。链接如果有也粘上，会自动提取。"
              style={{ marginTop: 24 }}
            />
          </>
        )}

        {step === 'confirm' && (
          <>
            <Alert
              type="success"
              showIcon
              message="AI 解析完成"
              description="下面是提取的结果，请检查并补充/修正后提交。方向和城市如果没识别到，请手动选一下。"
              style={{ marginBottom: 24 }}
            />
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Row gutter={12}>
                <Col span={16}>
                  <Form.Item label="岗位名称" name="title" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="公司" name="company" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label="方向" name="category">
                    <Select
                      options={CATEGORIES.map(c => ({ label: c.label, value: c.key }))}
                      allowClear
                      placeholder="选一个"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="城市" name="city">
                    <Select
                      options={CITIES.map(c => ({ label: c, value: c }))}
                      allowClear
                      placeholder="选一个"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label=" " name="is_remote" valuePropName="checked">
                    <Checkbox>支持远程</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="薪资" name="salary">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="实习时长" name="duration">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="岗位描述" name="description">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item label="岗位要求" name="requirements">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item label="原始链接" name="source_url">
                <Input />
              </Form.Item>
              <Form.Item
                label="你的署名"
                name="contributor_name"
                rules={[{ required: true, message: '填个花名让大家知道是谁贡献的' }]}
              >
                <Input placeholder="随便一个昵称" />
              </Form.Item>

              <Divider />

              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep('input')}>← 返回重新解析</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  size="large"
                  style={{ background: '#5c7f4f' }}
                >
                  确认提交
                </Button>
              </Space>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
