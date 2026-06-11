import { EditOutlined, LoginOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Form, Input, InputNumber, List, Modal, Row, Select, Space, Switch, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getApiErrorMessage } from '../services/api'
import { listMovies } from '../services/movieService'
import { createRoom, joinRoom, listMyRooms, listRooms, updateRoom } from '../services/roomService'
import { getUser } from '../stores/authStore'
import { formatDateTime, getMovieTitle, getRoomCode } from '../utils/format'

const { Paragraph, Title, Text } = Typography

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [myRooms, setMyRooms] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [createForm] = Form.useForm()
  const [joinForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const createIsPrivate = Form.useWatch('is_private', createForm)
  const editIsPrivate = Form.useWatch('is_private', editForm)
  const navigate = useNavigate()
  const currentUser = getUser()

  const loadRooms = async () => {
    setError('')
    setLoading(true)

    try {
      const [publicRooms, ownRooms, movieResult] = await Promise.all([
        listRooms({ page: 1, per_page: 50 }),
        listMyRooms(),
        listMovies({ page: 1, per_page: 100 }),
      ])

      setRooms(publicRooms.data)
      setMyRooms(ownRooms)
      setMovies(movieResult.data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal memuat room'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function fetchInitialRooms() {
      try {
        const [publicRooms, ownRooms, movieResult] = await Promise.all([
          listRooms({ page: 1, per_page: 50 }),
          listMyRooms(),
          listMovies({ page: 1, per_page: 100 }),
        ])

        if (!active) {
          return
        }

        setRooms(publicRooms.data)
        setMyRooms(ownRooms)
        setMovies(movieResult.data)
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err, 'Gagal memuat room'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchInitialRooms()

    return () => {
      active = false
    }
  }, [])

  const handleCreateRoom = async (values) => {
    const isPrivate = !!values.is_private
    const payload = {
      ...values,
      is_private: isPrivate,
      movie_id: values.movie_id || null,
      mode: 'gdrive',
      password: isPrivate ? (values.password || null) : null,
      max_members: values.max_members || 10,
    }

    setSubmitting(true)
    try {
      const room = await createRoom(payload)
      setCreateOpen(false)
      createForm.resetFields()
      navigate(`/rooms/${getRoomCode(room)}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal membuat room'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinRoom = async (values) => {
    setError('')
    setSubmitting(true)
    try {
      const code = String(values.code || '').trim().toUpperCase()
      await joinRoom(code, { password: values.password || null })
      setError('')
      setJoinOpen(false)
      joinForm.resetFields()
      navigate(`/rooms/${code}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal join room'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditRoom = async (values) => {
    setSubmitting(true)
    try {
      const code = getRoomCode(editingRoom)
      const isPrivate = !!values.is_private
      await updateRoom(code, {
        name: values.name || undefined,
        is_private: isPrivate,
        password: isPrivate ? (values.password || null) : null,
        max_members: values.max_members || 10,
      })
      setEditOpen(false)
      setEditingRoom(null)
      editForm.resetFields()
      loadRooms()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mengupdate room'))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (room) => {
    setEditingRoom(room)
    editForm.setFieldsValue({
      name: room.name,
      is_private: room.is_private,
      password: '',
      max_members: room.max_members,
    })
    setEditOpen(true)
  }

  const handleOpenJoin = (code) => {
    setJoinCode(code || '')
    joinForm.setFieldsValue({ code: code || '' })
    setJoinOpen(true)
  }

  const isMyRoom = (room) => {
    const hostId = room?.host?.id || room?.host_id

    return hostId && currentUser?.id && hostId === currentUser.id
  }

  const allRooms = [...myRooms]
  rooms.forEach((room) => {
    if (!allRooms.find((r) => r.id === room.id || getRoomCode(r) === getRoomCode(room))) {
      allRooms.push(room)
    }
  })

  return (
    <AppLayout>
      <Space orientation="vertical" size={24} className="full-width">
        <div className="page-heading">
          <div>
            <Title level={1}>Rooms</Title>
            <Paragraph>Buat room nobar, join dengan kode, dan pantau room milikmu.</Paragraph>
          </div>
          <Space wrap>
            <Button icon={<LoginOutlined />} onClick={() => { setJoinCode(''); joinForm.setFieldsValue({ code: '' }); setJoinOpen(true) }}>
              Join Room
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Buat Room
            </Button>
          </Space>
        </div>

        {error ? <Alert type="warning" title={error} showIcon closable onClose={() => setError('')} /> : null}

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={8}>
            <Card variant="borderless" className="dashboard-card" title="Room Saya">
              <Space orientation="vertical" size={12} className="full-width">
                {myRooms.length > 0 ? (
                  <List
                    dataSource={myRooms}
                    locale={{ emptyText: 'Belum ada room yang kamu buat.' }}
                    renderItem={(room) => (
                      <List.Item>
                        <Link className="list-card-link" to={`/rooms/${getRoomCode(room)}`} style={{ width: '100%' }}>
                          <strong>{room.name}</strong>
                          <Text type="secondary">{getRoomCode(room)}</Text>
                        </Link>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Paragraph className="muted-text">Belum ada room yang kamu buat.</Paragraph>
                )}
                <Button icon={<ReloadOutlined />} onClick={loadRooms} loading={loading} block>
                  Refresh
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card variant="borderless" className="dashboard-card" title="Semua Room">
              <List
                dataSource={allRooms}
                loading={loading}
                locale={{ emptyText: 'Belum ada room aktif.' }}
                renderItem={(room) => {
                  const code = getRoomCode(room)
                  const owned = isMyRoom(room)

                  return (
                    <List.Item
                      actions={[
                        owned ? (
                          <Link to={`/rooms/${code}`}>
                            <Button size="small">Detail</Button>
                          </Link>
                        ) : (
                          <Button size="small" icon={<LoginOutlined />} onClick={() => handleOpenJoin(code)}>
                            Join
                          </Button>
                        ),
                        owned ? (
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(room)}>
                            Edit
                          </Button>
                        ) : null,
                        owned ? (
                          <Tag color="green">Host</Tag>
                        ) : null,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <strong>{room.name}</strong>
                            <Tag>{room.status}</Tag>
                          </Space>
                        }
                        description={
                          <Space orientation="vertical" size={2}>
                            <Text type="secondary">Kode: {code}</Text>
                            <Space size={12}>
                              <Tag>{room.mode}</Tag>
                              <Text type="secondary">{formatDateTime(room.created_at)}</Text>
                              {room.movie ? <Text type="secondary">Movie: {getMovieTitle(room.movie)}</Text> : null}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            </Card>
          </Col>
        </Row>
      </Space>

      <Modal title="Buat room baru" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} destroyOnHidden>
        <Form form={createForm} layout="vertical" onFinish={handleCreateRoom} initialValues={{ max_members: 10, is_private: false }} requiredMark={false}>
          <Form.Item label="Nama room" name="name" rules={[{ required: true, message: 'Nama room wajib diisi' }]}>
            <Input placeholder="Movie night bareng" />
          </Form.Item>
          <Form.Item label="Movie" name="movie_id">
            <Select
              allowClear
              showSearch
              placeholder="Pilih movie opsional"
              optionFilterProp="label"
              options={movies.map((movie) => ({ label: getMovieTitle(movie), value: movie.id }))}
            />
          </Form.Item>
          <Form.Item label="Private" name="is_private" valuePropName="checked">
            <Switch checkedChildren="Private" unCheckedChildren="Public" />
          </Form.Item>
          <Form.Item
            label="Password room"
            name="password"
            rules={createIsPrivate ? [{ required: true, message: 'Password wajib diisi untuk private room' }] : []}
          >
            <Input.Password disabled={!createIsPrivate} placeholder={createIsPrivate ? 'Password private room' : 'Tidak perlu password untuk public room'} />
          </Form.Item>
          <Form.Item label="Maksimal member" name="max_members">
            <InputNumber className="full-width" min={2} max={100} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Buat Room
          </Button>
        </Form>
      </Modal>

      <Modal title="Edit room" open={editOpen} onCancel={() => { setEditOpen(false); setEditingRoom(null) }} footer={null} destroyOnHidden>
        <Form form={editForm} layout="vertical" onFinish={handleEditRoom} requiredMark={false}>
          <Form.Item label="Nama room" name="name" rules={[{ required: true, message: 'Nama room wajib diisi' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Private" name="is_private" valuePropName="checked">
            <Switch checkedChildren="Private" unCheckedChildren="Public" />
          </Form.Item>
          <Form.Item
            label="Password baru"
            name="password"
            rules={editIsPrivate && !editingRoom?.is_private ? [{ required: true, message: 'Password wajib diisi untuk private room' }] : []}
          >
            <Input.Password disabled={!editIsPrivate} placeholder={editIsPrivate ? 'Kosongkan jika tidak ingin ganti password' : 'Public room tidak memakai password'} />
          </Form.Item>
          <Form.Item label="Maksimal member" name="max_members">
            <InputNumber className="full-width" min={2} max={100} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Simpan Perubahan
          </Button>
        </Form>
      </Modal>

      <Modal title="Join room" open={joinOpen} onCancel={() => { setJoinOpen(false); setJoinCode('') }} footer={null} destroyOnHidden>
        <Form form={joinForm} layout="vertical" onFinish={(values) => { handleJoinRoom(values); setJoinCode('') }} requiredMark={false}>
          <Form.Item label="Kode room" name="code" rules={[{ required: true, message: 'Kode room wajib diisi' }]}>
            <Input placeholder="Contoh: ABC123" disabled={!!joinCode} />
          </Form.Item>
          <Form.Item label="Password" name="password">
            <Input.Password placeholder="Isi jika room private" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Join
          </Button>
        </Form>
      </Modal>
    </AppLayout>
  )
}
