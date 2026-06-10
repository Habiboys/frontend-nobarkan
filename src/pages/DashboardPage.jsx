import {
  ApiOutlined,
  CommentOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { Alert, Avatar, Button, Card, Col, Descriptions, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { API_BASE_URL, getApiErrorMessage } from '../services/api'
import { getMe, getWebRTCConfig } from '../services/authService'
import { listMovies } from '../services/movieService'
import { listMyRooms, listRooms } from '../services/roomService'
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
  const [webrtcConfig, setWebRTCConfig] = useState(null)
  const [stats, setStats] = useState({ movies: 0, rooms: 0, myRooms: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    setError('')
    setLoading(true)

    try {
      const [me, rtcConfig, movieResult, roomResult, ownRooms] = await Promise.all([
        getMe(),
        getWebRTCConfig(),
        listMovies({ page: 1, per_page: 1 }),
        listRooms({ page: 1, per_page: 1 }),
        listMyRooms(),
      ])
      setUser(me)
      setWebRTCConfig(rtcConfig)
      setStats({
        movies: movieResult.meta?.total ?? movieResult.data.length,
        rooms: roomResult.meta?.total ?? roomResult.data.length,
        myRooms: ownRooms.length,
      })
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
        const [me, rtcConfig, movieResult, roomResult, ownRooms] = await Promise.all([
          getMe(),
          getWebRTCConfig(),
          listMovies({ page: 1, per_page: 1 }),
          listRooms({ page: 1, per_page: 1 }),
          listMyRooms(),
        ])

        if (!active) {
          return
        }

        setUser(me)
        setWebRTCConfig(rtcConfig)
        setStats({
          movies: movieResult.meta?.total ?? movieResult.data.length,
          rooms: roomResult.meta?.total ?? roomResult.data.length,
          myRooms: ownRooms.length,
        })
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err, 'Gagal memuat dashboard. Pastikan backend berjalan.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchInitialDashboard()

    return () => {
      active = false
    }
  }, [])

  return (
    <AppLayout>
      <Space orientation="vertical" size={24} className="full-width">
        <div className="dashboard-hero">
          <div>
            <Text className="eyebrow">Dashboard MVP</Text>
            <Title level={1}>Selamat datang{user?.name ? `, ${user.name}` : ''}</Title>
            <Paragraph>
              MVP Nobarkan sudah mencakup auth, movies, rooms, profile, chat history, dan WebRTC config.
            </Paragraph>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadDashboard} loading={loading}>
            Refresh
          </Button>
        </div>

        {error ? <Alert type="warning" title={error} showIcon /> : null}

        <Row gutter={[20, 20]}>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="dashboard-card">
              <Statistic title="Total Movies" value={stats.movies} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="dashboard-card">
              <Statistic title="Room Aktif" value={stats.rooms} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card variant="borderless" className="dashboard-card">
              <Statistic title="Room Saya" value={stats.myRooms} loading={loading} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={12}>
            <Card title="Profil user" variant="borderless" className="dashboard-card">
              {loading && !user ? (
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              ) : (
                <Space align="start" size={16}>
                  <Avatar size={56} icon={<UserOutlined />} src={user?.avatar_url} />
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Nama">{user?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{user?.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Role">{user?.role || 'user'}</Descriptions.Item>
                  </Descriptions>
                </Space>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Status API" variant="borderless" className="dashboard-card">
              <Space orientation="vertical" size={12} className="full-width">
                <Space>
                  <ApiOutlined />
                  <Text strong>Base URL</Text>
                </Space>
                <Tag color="blue">{API_BASE_URL}</Tag>
                <Text type="secondary">Frontend sudah consume endpoint auth, users, movies, rooms, chats, dan WebRTC config.</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <VideoCameraOutlined />
              WebRTC STUN config
            </Space>
          }
          variant="borderless"
          className="dashboard-card"
        >
          {loading && !webrtcConfig ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <Space orientation="vertical" size={12} className="full-width">
              <Descriptions column={{ xs: 1, md: 2 }} size="small">
                <Descriptions.Item label="Mode">STUN-only ready</Descriptions.Item>
                <Descriptions.Item label="Max participants">
                  {webrtcConfig?.max_participants ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              <div>
                <Text strong>ICE servers</Text>
                <div className="tag-list">
                  {(webrtcConfig?.ice_servers || webrtcConfig?.stun_urls || []).length > 0 ? (
                    (webrtcConfig?.ice_servers || webrtcConfig?.stun_urls || []).map((server) => (
                      <Tag color="purple" key={JSON.stringify(server)}>
                        {typeof server === 'string' ? server : server.urls?.toString()}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">Belum ada konfigurasi STUN dari backend.</Text>
                  )}
                </div>
              </div>
            </Space>
          )}
        </Card>

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
