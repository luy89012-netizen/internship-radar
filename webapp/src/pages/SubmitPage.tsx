import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Checkbox, Button, DatePicker,
  Typography, Alert, message, Modal,
} from 'antd';
import { supabase } from '../lib/supabase';
import { CATEGORIES, CITIES } from '../lib/constants';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

// 简单共享密码（第一版：所有人共用一个，你和同学知道就行）
// 后续如果嫌不安全，改成 Supabase magic link 登录
const SHARED_PASSWORD = 'pkuintern2026';

export default function SubmitPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem('ir_authed') === '1';
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: any) {
    setSubmitting(true);
    try {
      // 先确保贡献者存在（按 name 找，找不到就建）
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

      // 插入岗位
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
        posted_at: values.posted_at ? values.posted_at.toISOString() : new Date().toISOString(),
        deadline: values.deadline ? values.deadline.toISOString() : null,
        contributor_id: contributorId,
      };

      const { error } = await supabase.from('internships').insert(payload);

      if (error) {
        message.error('提交失败：' + error.message);
        console.error(error);
        return;
      }

      Modal.success({
        title: '提交成功 🎉',
        content: '你的岗位已上线，其他同学都能看到了。',
        onOk: () => navigate('/list?source=manual'),
      });
      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (!authed) {
    return (
      <Card style={{ maxWidth: 480, margin: '80px auto' }}>
        <Title level={4} style={{ color: '#2d3f2b' }}>提交岗位需要口令</Title>
        <Paragraph style={{ color: '#6e6a63' }}>
          为避免恶意灌数据，需要输入分享给同学的口令。忘记口令找刘雨妍要。
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
        <div style={{ marginTop: 8, fontSize: 12, color: '#8a8378' }}>
          Tip：按回车提交
        </div>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <Title level={3} style={{ color: '#2d3f2b', marginBottom: 8 }}>
          提交一个实习岗位
        </Title>
        <Paragraph style={{ color: '#6e6a63' }}>
          看到不错的实习信息，填在这里让大家都能看到。带 * 的必填。
        </Paragraph>

        <Alert
          type="info"
          showIcon
          message="内容审核提醒"
          description="请不要提交虚假、传销、涉及资金骗局的岗位。所有提交都会记录你的署名。"
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            posted_at: dayjs(),
          }}
        >
          <Form.Item
            label="岗位名称"
            name="title"
            rules={[{ required: true, message: '必填' }]}
          >
            <Input placeholder="例：品牌营销实习生 / 数据分析实习生" />
          </Form.Item>

          <Form.Item
            label="公司"
            name="company"
            rules={[{ required: true, message: '必填' }]}
          >
            <Input placeholder="例：小红书 / 字节跳动 / 腾讯" />
          </Form.Item>

          <Form.Item label="方向" name="category">
            <Select
              placeholder="选一个最接近的方向"
              options={CATEGORIES.map(c => ({ label: c.label, value: c.key }))}
              allowClear
            />
          </Form.Item>

          <Form.Item label="城市" name="city">
            <Select
              placeholder="工作地点"
              options={CITIES.map(c => ({ label: c, value: c }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="is_remote" valuePropName="checked">
            <Checkbox>支持远程 / 混合办公</Checkbox>
          </Form.Item>

          <Form.Item label="薪资" name="salary">
            <Input placeholder="例：200/天 / 4000-6000/月 / 面议" />
          </Form.Item>

          <Form.Item label="实习时长要求" name="duration">
            <Input placeholder="例：3 个月以上 / 每周 4 天 / 长期" />
          </Form.Item>

          <Form.Item label="岗位描述" name="description">
            <TextArea rows={4} placeholder="干什么活、团队/业务介绍等" />
          </Form.Item>

          <Form.Item label="岗位要求" name="requirements">
            <TextArea rows={3} placeholder="学历/年级/技能/软性要求" />
          </Form.Item>

          <Form.Item label="原始链接" name="source_url">
            <Input placeholder="投递页 / 招聘 JD 页 URL（可选，但有更好）" />
          </Form.Item>

          <Form.Item label="发布时间" name="posted_at">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="截止时间（可选）" name="deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="你的署名"
            name="contributor_name"
            rules={[{ required: true, message: '填个昵称，让大家知道是谁贡献的' }]}
          >
            <Input placeholder="随便一个花名都行" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              style={{ background: '#5c7f4f', width: '100%' }}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
