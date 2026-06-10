import { DeleteOutlined, EditOutlined, GoogleOutlined, LinkOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { getApiErrorMessage } from '../services/api'
import { createGDriveMovie, deleteMovie, listMovies, updateMovie } from '../services/movieService'
import { getUser } from '../stores/authStore'
import { formatDateTime, getMovieTitle } from '../utils/format'

const { Paragraph, Title, Text } = Typography

export default function MoviesPage() {
  const [movies, setMovies] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const currentUser = getUser()

  const loadMovies = async (params = {}) => {
    setError('')
    setLoading(true)

    try {
      const result = await listMovies({ page: 1, per_page: 20, search, ...params })
      setMovies(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal memuat movie'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function fetchInitialMovies() {
      try {
        const result = await listMovies({ page: 1, per_page: 20 })

        if (!active) {
          return
        }

        setMovies(result.data)
        setMeta(result.meta)
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err, 'Gagal memuat movie'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchInitialMovies()

    return () => {
      active = false
    }
  }, [])

  const handleCreate = async (values) => {
    setSubmitting(true)
    try {
      await createGDriveMovie(values)
      setCreateOpen(false)
      createForm.resetFields()
      loadMovies()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal membuat movie Google Drive'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (values) => {
    setSubmitting(true)
    try {
      await updateMovie(editingMovie.id, values)
      setEditOpen(false)
      setEditingMovie(null)
      editForm.resetFields()
      loadMovies()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mengupdate movie'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    setError('')

    try {
      await deleteMovie(id)
      setError('')
      loadMovies()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus movie'))
    }
  }

  const openEdit = (record) => {
    setEditingMovie(record)
    editForm.setFieldsValue({
      title: record.title,
      description: record.description || '',
      drive_url: record.drive_url || '',
      thumbnail_url: record.thumbnail_url || '',
    })
    setEditOpen(true)
  }

  const isOwner = (record) => {
    const uploaderId = record?.uploaded_by?.id

    return uploaderId && currentUser?.id && uploaderId === currentUser.id
  }

  const columns = [
    {
      title: 'Judul',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <strong>{getMovieTitle(record)}</strong>
          <Text type="secondary">{record.description || 'Tanpa deskripsi'}</Text>
        </Space>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source_type',
      render: () => <Tag color="blue">Google Drive</Tag>,
    },
    {
      title: 'Drive File ID',
      dataIndex: 'drive_file_id',
      render: (value) => value || '-',
    },
    {
      title: 'Link',
      render: (_, record) => (
        <Space wrap>
          {record.drive_url ? (
            <Button href={record.drive_url} target="_blank" icon={<LinkOutlined />} size="small">
              Buka
            </Button>
          ) : null}
          {record.drive_preview_url ? (
            <Button href={record.drive_preview_url} target="_blank" icon={<GoogleOutlined />} size="small">
              Preview
            </Button>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Dibuat',
      dataIndex: 'created_at',
      render: formatDateTime,
    },
    {
      title: 'Aksi',
      render: (_, record) =>
        isOwner(record) ? (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Hapus movie ini?"
              description="Movie yang dihapus tidak bisa dikembalikan."
              okText="Hapus"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                Hapus
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Text type="secondary">Bukan milikmu</Text>
        ),
    },
  ]

  return (
    <AppLayout>
      <Space orientation="vertical" size={24} className="full-width">
        <div className="page-heading">
          <div>
            <Title level={1}>Movies Google Drive</Title>
            <Paragraph>Kelola katalog video Nobarkan dari link Google Drive. Hanya movie milikmu yang bisa diedit/dihapus.</Paragraph>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tambah Google Drive
          </Button>
        </div>

        {error ? <Alert type="warning" title={error} showIcon closable onClose={() => setError('')} /> : null}

        <Card variant="borderless" className="dashboard-card">
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Input.Search placeholder="Cari judul movie" allowClear value={search} onChange={(e) => setSearch(e.target.value)} onSearch={() => loadMovies()} />
            </Col>
            <Col xs={24} md={12}>
              <Space wrap>
                <Button type="primary" onClick={() => loadMovies()}>
                  Cari
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => loadMovies({ search: '' })}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card variant="borderless" className="dashboard-card">
          <Table rowKey="id" loading={loading} columns={columns} dataSource={movies} scroll={{ x: 900 }} pagination={{ pageSize: meta.per_page || 20, total: meta.total || movies.length }} />
        </Card>
      </Space>

      {/* Create Modal */}
      <Modal title="Tambah movie Google Drive" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} destroyOnHidden>
        <Form form={createForm} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Form.Item label="Judul" name="title" rules={[{ required: true, message: 'Judul wajib diisi' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Deskripsi" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label="Google Drive URL"
            name="drive_url"
            rules={[
              { required: true, message: 'Link Google Drive wajib diisi' },
              { pattern: /^https:\/\/((www\.)?drive\.google\.com|drive\.usercontent\.google\.com)\//, message: 'Gunakan link Google Drive yang valid' },
            ]}
          >
            <Input prefix={<GoogleOutlined />} placeholder="https://drive.google.com/file/d/.../view" />
          </Form.Item>
          <Form.Item label="Thumbnail URL" name="thumbnail_url">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Simpan
          </Button>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit movie" open={editOpen} onCancel={() => { setEditOpen(false); setEditingMovie(null) }} footer={null} destroyOnHidden>
        <Form form={editForm} layout="vertical" onFinish={handleEdit} requiredMark={false}>
          <Form.Item label="Judul" name="title" rules={[{ required: true, message: 'Judul wajib diisi' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Deskripsi" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label="Google Drive URL"
            name="drive_url"
            rules={[
              { pattern: /^https:\/\/((www\.)?drive\.google\.com|drive\.usercontent\.google\.com)\//, message: 'Gunakan link Google Drive yang valid' },
            ]}
          >
            <Input prefix={<GoogleOutlined />} placeholder="https://drive.google.com/file/d/.../view" />
          </Form.Item>
          <Form.Item label="Thumbnail URL" name="thumbnail_url">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Update
          </Button>
        </Form>
      </Modal>
    </AppLayout>
  )
}
