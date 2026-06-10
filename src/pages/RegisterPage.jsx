import { LockOutlined, MailOutlined, PlayCircleOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Layout, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../services/api'
import { register } from '../services/authService'

const { Content } = Layout
const { Paragraph, Title, Text } = Typography

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (values) => {
    const payload = { ...values }
    delete payload.confirm_password

    setError('')
    setLoading(true)

    try {
      await register(payload)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registrasi gagal. Silakan coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout className="auth-shell">
      <Content className="auth-content">
        <Card className="auth-card" variant="borderless">
          <Space orientation="vertical" size={24} className="full-width">
            <div className="auth-heading">
              <Link to="/" className="brand-link auth-brand">
                <Space size={10}>
                  <PlayCircleOutlined />
                  <Text strong className="brand-text">
                    Nobarkan
                  </Text>
                </Space>
              </Link>
              <Title level={2}>Buat akun baru</Title>
              <Paragraph>Daftar untuk mulai membuat room nobar realtime.</Paragraph>
            </div>

            {error ? <Alert type="error" title={error} showIcon /> : null}

            <Form layout="vertical" size="large" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                label="Nama"
                name="name"
                rules={[{ required: true, message: 'Nama wajib diisi' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nama lengkap" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Email wajib diisi' },
                  { type: 'email', message: 'Format email tidak valid' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="nama@email.com" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: 'Password wajib diisi' },
                  { min: 6, message: 'Password minimal 6 karakter' },
                ]}
                hasFeedback
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Buat password" />
              </Form.Item>

              <Form.Item
                label="Konfirmasi password"
                name="confirm_password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: 'Konfirmasi password wajib diisi' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }

                      return Promise.reject(new Error('Konfirmasi password tidak sama'))
                    },
                  }),
                ]}
                hasFeedback
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Ulangi password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} icon={<UserAddOutlined />}>
                Daftar
              </Button>
            </Form>

            <Paragraph className="auth-switch">
              Sudah punya akun? <Link to="/login">Masuk di sini</Link>
            </Paragraph>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}
