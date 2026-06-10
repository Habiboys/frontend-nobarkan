import { LockOutlined, LoginOutlined, MailOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Layout, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../services/api'
import { login } from '../services/authService'

const { Content } = Layout
const { Paragraph, Title, Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (values) => {
    setError('')
    setLoading(true)

    try {
      await login(values)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login gagal. Periksa email dan password.'))
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
              <Title level={2}>Masuk ke akun</Title>
              <Paragraph>Lanjutkan room nobar, chat, dan dashboard kamu.</Paragraph>
            </div>

            {error ? <Alert type="error" title={error} showIcon /> : null}

            <Form layout="vertical" size="large" onFinish={handleSubmit} requiredMark={false}>
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
                rules={[{ required: true, message: 'Password wajib diisi' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Masukkan password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} icon={<LoginOutlined />}>
                Masuk
              </Button>
            </Form>

            <Paragraph className="auth-switch">
              Belum punya akun? <Link to="/register">Daftar di sini</Link>
            </Paragraph>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}
