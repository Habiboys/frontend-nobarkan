import {
  CommentOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Layout, Row, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'

const { Header, Content, Footer } = Layout
const { Paragraph, Title, Text } = Typography

const features = [
  {
    icon: <PlayCircleOutlined />,
    title: 'Nobar realtime',
    description: 'Buat room dan tonton film bersama teman dari mana saja.',
  },
  {
    icon: <RocketOutlined />,
    title: 'Sync video',
    description: 'Playback room dirancang agar semua peserta tetap sinkron.',
  },
  {
    icon: <CommentOutlined />,
    title: 'Chat room',
    description: 'Diskusi langsung sambil menonton tanpa pindah aplikasi.',
  },
  {
    icon: <VideoCameraOutlined />,
    title: 'Oncam WebRTC',
    description: 'Siap untuk video call dengan konfigurasi STUN dari backend.',
  },
]

export default function LandingPage() {
  return (
    <Layout className="marketing-shell">
      <Header className="marketing-header">
        <Link to="/" className="brand-link">
          <Space size={10}>
            <PlayCircleOutlined />
            <Text strong className="brand-text">
              Nobarkan
            </Text>
          </Space>
        </Link>
        <Space>
          <Link to="/login">
            <Button>Masuk</Button>
          </Link>
          <Link to="/register">
            <Button type="primary">Daftar</Button>
          </Link>
        </Space>
      </Header>

      <Content>
        <section className="hero-section">
          <div className="hero-glow" />
          <Row gutter={[40, 40]} align="middle" className="hero-grid">
            <Col xs={24} lg={13}>
              <Space orientation="vertical" size={24}>
                <Text className="eyebrow">
                  <TeamOutlined /> Watch party modern untuk komunitasmu
                </Text>
                <Title className="hero-title">
                  Nonton bareng online dengan chat, sync video, dan oncam.
                </Title>
                <Paragraph className="hero-description">
                  Nobarkan membantu kamu membuat ruang nobar realtime: upload atau pilih film,
                  undang teman, ngobrol, dan aktifkan video call berbasis WebRTC saat dibutuhkan.
                </Paragraph>
                <Space size={12} wrap>
                  <Link to="/register">
                    <Button type="primary" size="large" icon={<RocketOutlined />}>
                      Mulai sekarang
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="large">Saya sudah punya akun</Button>
                  </Link>
                </Space>
              </Space>
            </Col>
            <Col xs={24} lg={11}>
              <Card className="hero-card" variant="borderless">
                <Space orientation="vertical" size={18} className="full-width">
                  <div className="preview-player">
                    <PlayCircleOutlined />
                    <span>Movie Night Room</span>
                  </div>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <div className="metric-card">
                        <strong>00:42:18</strong>
                        <span>Synced time</span>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-card">
                        <strong>6 online</strong>
                        <span>Participants</span>
                      </div>
                    </Col>
                  </Row>
                  <div className="chat-bubble">Riko: gas lanjut scene berikutnya!</div>
                  <div className="chat-bubble muted">Naya: oncam sudah ready.</div>
                </Space>
              </Card>
            </Col>
          </Row>
        </section>

        <section className="section-container">
          <div className="section-heading">
            <Text className="eyebrow">
              <SafetyCertificateOutlined /> Fitur awal
            </Text>
            <Title level={2}>Dibangun untuk pengalaman nobar yang rapi</Title>
          </div>
          <Row gutter={[20, 20]}>
            {features.map((feature) => (
              <Col xs={24} md={12} xl={6} key={feature.title}>
                <Card className="feature-card" variant="borderless">
                  <div className="feature-icon">{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph>{feature.description}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      </Content>

      <Footer className="marketing-footer">Nobarkan © 2026</Footer>
    </Layout>
  )
}
