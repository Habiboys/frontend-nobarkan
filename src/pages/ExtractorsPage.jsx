import { GithubOutlined, GlobalOutlined, SearchOutlined } from '@ant-design/icons'
import { Card, Col, Input, Row, Space, Tag, Typography, Alert, Spin, Empty } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { listExtractors } from '../services/extractorService'
import { getApiErrorMessage } from '../services/api'

const { Title, Text, Paragraph, Link } = Typography

function categorizeExtractor(name) {
  // Normalize: lowercase, collapse whitespace
  const colonIdx = name.indexOf(':')
  if (colonIdx > 0) return name.slice(0, colonIdx).trim()
  const parts = name.split(/[:.\s]/)
  return parts[0] || 'Other'
}

export default function ExtractorsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listExtractors()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Gagal memuat daftar extractor'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const grouped = useMemo(() => {
    if (!data?.extractors) return {}
    const list = data.extractors
    const groups = {}
    for (const name of list) {
      if (search && !name.toLowerCase().includes(search.toLowerCase())) continue
      const cat = categorizeExtractor(name)
      if (!groups[cat]) groups[cat] = new Set()
      groups[cat].add(name)
    }
    // Convert sets to arrays and sort by name
    const sorted = Object.entries(groups)
      .map(([cat, set]) => [cat, [...set].sort()])
      .sort((a, b) => {
        if (b[1].length !== a[1].length) return b[1].length - a[1].length
        return a[0].localeCompare(b[0])
      })
    return Object.fromEntries(sorted)
  }, [data, search])

  const visibleCount = useMemo(() => {
    return Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
  }, [grouped])

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <GlobalOutlined style={{ marginRight: 8 }} />
            Supported Sites
          </Title>
          <Paragraph type="secondary">
            Daftar situs dan platform yang didukung oleh{' '}
            <Link href="https://github.com/yt-dlp/yt-dlp" target="_blank">
              yt-dlp <GithubOutlined />
            </Link>
            . Anda dapat menambahkan film dari URL mana pun yang terdaftar di sini.
          </Paragraph>
          <Alert
            type="info"
            showIcon
            title="Situs streaming ilegal (LK21, IndoXXI, dan sejenisnya) tidak didukung oleh yt-dlp. Hanya platform legit."
            style={{ marginBottom: 16 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" />
            <br />
            <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
              Memuat daftar extractor...
            </Text>
          </div>
        ) : error ? (
          <Empty
            description={
              <Text type="danger">{error}</Text>
            }
          />
        ) : data ? (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Cari extractor..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Tag color="blue">{search ? `${visibleCount} found` : `${data.count} extractors`}</Tag>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Tag color="green">{Object.keys(grouped).length} categories</Tag>
              </Col>
            </Row>

            {Object.keys(grouped).length === 0 ? (
              <Empty description="Tidak ada extractor yang cocok dengan pencarian." />
            ) : (
              <Row gutter={[16, 16]}>
                {Object.entries(grouped).map(([category, extractors]) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={category}>
                    <Card
                      title={
                        <Space>
                          <Text strong>{category}</Text>
                          <Tag>{extractors.length}</Tag>
                        </Space>
                      }
                      size="small"
                      styles={{ body: { maxHeight: 300, overflowY: 'auto' } }}
                    >
                      {extractors.map((name) => (
                        <div key={name} style={{ padding: '2px 0', fontSize: 13 }}>
                          <Text code style={{ fontSize: 12 }}>{name}</Text>
                        </div>
                      ))}
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <div style={{ textAlign: 'center', marginTop: 24, padding: '16px 0' }}>
              <Text type="secondary">
                Powered by{' '}
                <Link href="https://github.com/yt-dlp/yt-dlp" target="_blank">
                  yt-dlp <GithubOutlined />
                </Link>
              </Text>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
