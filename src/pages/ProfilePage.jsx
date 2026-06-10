import { LockOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { getApiErrorMessage } from '../services/api'
import { getMe } from '../services/authService'
import { changePassword, updateProfile } from '../services/userService'
import { getUser, setAuth, getAuth } from '../stores/authStore'

const { Paragraph, Title } = Typography

export default function ProfilePage() {
  const [user, setUser] = useState(getUser())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await getMe()
        setUser(me)
        profileForm.setFieldsValue({ name: me?.name, avatar_url: me?.avatar_url })
      } catch (err) {
        setError(getApiErrorMessage(err, 'Gagal memuat profile'))
      }
    }

    loadUser()
  }, [profileForm])

  const handleUpdateProfile = async (values) => {
    setLoading(true)
    try {
      const updated = await updateProfile(values)
      const auth = getAuth()
      if (auth) {
        setAuth({ ...auth, user: updated })
      }
      setUser(updated)
      message.success('Profile berhasil diupdate')
    } catch (err) {
      message.error(getApiErrorMessage(err, 'Gagal update profile'))
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (values) => {
    const payload = { ...values }
    delete payload.confirm_password

    setLoading(true)
    try {
      await changePassword(payload)
      passwordForm.resetFields()
      message.success('Password berhasil diubah')
    } catch (err) {
      message.error(getApiErrorMessage(err, 'Gagal mengubah password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <Space orientation="vertical" size={24} className="full-width">
        <div className="page-heading">
          <div>
            <Title level={1}>Profile</Title>
            <Paragraph>Kelola data akun dan password Nobarkan.</Paragraph>
          </div>
        </div>

        {error ? <Alert type="warning" title={error} showIcon /> : null}

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={8}>
            <Card variant="borderless" className="dashboard-card profile-summary">
              <Avatar size={84} icon={<UserOutlined />} src={user?.avatar_url} />
              <Title level={3}>{user?.name || '-'}</Title>
              <Paragraph>{user?.email || '-'}</Paragraph>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card variant="borderless" className="dashboard-card" title="Update Profile">
              <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile} requiredMark={false}>
                <Form.Item label="Nama" name="name" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item label="Avatar URL" name="avatar_url">
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} block>
                  Simpan Profile
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card variant="borderless" className="dashboard-card" title="Ubah Password">
              <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} requiredMark={false}>
                <Form.Item label="Password lama" name="old_password" rules={[{ required: true, message: 'Password lama wajib diisi' }]}>
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item
                  label="Password baru"
                  name="new_password"
                  rules={[
                    { required: true, message: 'Password baru wajib diisi' },
                    { min: 6, message: 'Password minimal 6 karakter' },
                  ]}
                  hasFeedback
                >
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item
                  label="Konfirmasi password baru"
                  name="confirm_password"
                  dependencies={["new_password"]}
                  rules={[
                    { required: true, message: 'Konfirmasi password wajib diisi' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('Konfirmasi password tidak sama'))
                      },
                    }),
                  ]}
                  hasFeedback
                >
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Ubah Password
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Space>
    </AppLayout>
  )
}
