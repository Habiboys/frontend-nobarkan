import {
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlayCircleOutlined,
  UnorderedListOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Layout, Menu, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../services/authService'

const { Header, Content } = Layout

const menuItems = [
  {
    key: '/dashboard',
    icon: <HomeOutlined />,
    label: <Link to="/dashboard">Dashboard</Link>,
  },
  {
    key: '/movies',
    icon: <VideoCameraOutlined />,
    label: <Link to="/movies">Movies</Link>,
  },
  {
    key: '/rooms',
    icon: <UnorderedListOutlined />,
    label: <Link to="/rooms">Rooms</Link>,
  },
  {
    key: '/profile',
    icon: <UserOutlined />,
    label: <Link to="/profile">Profile</Link>,
  },
]

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key || '/dashboard'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Link to="/dashboard" className="brand-link" onClick={closeMobileMenu}>
          <Space size={10}>
            <PlayCircleOutlined />
            <Typography.Text strong className="brand-text">
              Nobarkan
            </Typography.Text>
          </Space>
        </Link>

        <Menu className="app-menu app-menu-desktop" mode="horizontal" selectedKeys={[selectedKey]} items={menuItems} />

        <Button className="logout-button" icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Button>

        <Button
          className="mobile-menu-button"
          type="text"
          icon={<MenuOutlined />}
          aria-label="Buka menu navigasi"
          onClick={() => setMobileMenuOpen(true)}
        />
      </Header>

      <Drawer
        title={
          <Space size={10}>
            <PlayCircleOutlined />
            <span>Nobarkan</span>
          </Space>
        }
        placement="right"
        width={280}
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        className="mobile-nav-drawer"
      >
        <Menu mode="vertical" selectedKeys={[selectedKey]} items={menuItems} onClick={closeMobileMenu} />
        <Button className="mobile-logout-button" icon={<LogoutOutlined />} onClick={handleLogout} block>
          Logout
        </Button>
      </Drawer>

      <Content className="app-content">{children}</Content>
    </Layout>
  )
}
