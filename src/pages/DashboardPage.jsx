import {
  CommentOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Space, Statistic, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getApiErrorMessage } from '../services/api'
import { getMe } from '../services/authService'
import { joinRoom, listMyRooms } from '../services/roomService'
import { getUser } from '../stores/authStore'

const { Paragraph, Title, Text } = Typography

const shortcuts = [
  {
    icon: <PlayCircleOutlined />,
    title: 'Kelola Movies',
    description: 'Tambah movie external atau upload video lokal.',
    to: '/movies',
  },
  {
    icon: <TeamOutlined />,
    title: 'Buat / Join Room',
    description: 'Mulai ruang nobar atau masuk memakai kode room.',
    to: '/rooms',
  },
  {
    icon: <CommentOutlined />,
    title: 'Chat History',
    description: 'Lihat riwayat chat dari detail room yang kamu ikuti.',
    to: '/rooms',
  },
]

export default function DashboardPage() {
  const [user, setUser] = useState(getUser())
  const [myRooms, setMyRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinForm] = Form.useForm()
  const navigate = useNavigate()

  const loadDashboard = async () => {
    setError('')
    setLoading(true)
    try {
      const [me, ownRooms] = await Promise.all([
        getMe(),
        listMyRooms(),
      ])
      setUser(me)
      setMyRooms(ownRooms)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal memuat dashboard. Pastikan backend berjalan.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function fetchInitialDashboard() {
      try {
        const [me, ownRooms] = await Promise.all([
          getMe(),
          listMyRooms(),
        ])
        if (!active) return
        setUser(me)
        setMyRooms(ownRooms)
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'Gagal memuat dashboard. Pastikan backend berjalan.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInitialDashboard()
    return () => { active = false }
  }, [])

  const handleQuickJoin = async (values) => {
    setError('')
    setJoinLoading(true)
    try {
      const code = String(values.code || '').trim().toUpperCase()
      await joinRoom(code, { password: values.password || null })
      joinForm.resetFields()
      navigate(`/rooms/${code}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal join room. Cek kode dan password.'))
    } finally {
      setJoinLoading(false)
    }
  }

  const roomCount = myRooms.length

  return (
    <AppLayout>
      <Space orientation="vertical" size={24} className="full-width">
        <div className="dashboard-hero">
          <div>
            <Title level={1}>Selamat datang{user?.name ? `, ${user.name}` : ''}</Title>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={loading}>
            Refresh
          </Button>
        </div>

        {error ? <Alert type="warning" title={error} showIcon closable onClose={() => setError('')} /> : null}

        <Card variant="borderless" className="dashboard-card">
          <Title level={4}>Gabung ke Room</Title>
          <Form form={joinForm} layout="inline" onFinish={handleQuickJoin} requiredMark={false} style={{ flexWrap: 'wrap', gap: 12 }}>
            <Form.Item
              name="code"
              rules={[{ required: true, message: 'Masukkan kode room' }]}
              style={{ minWidth: 180 }}
            >
              <Input
                placeholder="Kode room, contoh: ABC123"
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase()
                }}
              />
            </Form.Item>
            <Form.Item name="password" style={{ minWidth: 160 }}>
              <Input.Password placeholder="Password (jika private)" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={joinLoading}>
                Join
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Row gutter={[20, 20]}>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="dashboard-card">
              <Statistic title="Room Saya" value={roomCount} loading={loading} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={12}>
            <Card title="Profil" variant="borderless" className="dashboard-card">
              <Space align="start" size={16}>
                <Avatar size={56} icon={<UserOutlined />} src={user?.avatar_url} />
                <Space direction="vertical" size={4}>
                  <Text strong>{user?.name || '-'}</Text>
                  <Text type="secondary">{user?.email || '-'}</Text>
                  <Tag>{user?.role || 'user'}</Tag>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          {shortcuts.map((item) => (
            <Col xs={24} md={8} key={item.title}>
              <Link to={item.to} className="card-link">
                <Card variant="borderless" className="shortcut-card">
                  <div className="feature-icon">{item.icon}</div>
                  <Title level={4}>{item.title}</Title>
                  <Paragraph>{item.description}</Paragraph>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Space>
    </AppLayout>
  )
}
