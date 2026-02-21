'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, User, Brain, UserCheck, Calendar } from 'lucide-react'
import { api } from '@/lib/api'
import type { TicketDetail } from '@/types'
import { SegmentBadge, SentimentBadge, PriorityBadge, LangBadge } from '../../components/badges'
import Map from '../../components/map'

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
  return `${age} лет`
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.tickets.get(Number(id))
      .then(setData)
      .catch(() => setError('Тикет не найден'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="page">
      <div className="detail-grid">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: 320, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="page" style={{ textAlign: 'center', padding: '60px 0' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>{error || 'Загрузка...'}</p>
      <button className="btn btn-secondary" onClick={() => router.push('/dashboard')} style={{ marginTop: 16 }}>
        ← Назад
      </button>
    </div>
  )

  const t = data.tickets
  const a = data.ticket_analysis
  const m = data.managers
  const assign = data.assignments

  const priority = a?.priority ?? null
  const priorityPct = priority != null ? (priority / 10) * 100 : 0
  const priorityColor = priority != null
    ? priority <= 3 ? 'var(--success)' : priority <= 6 ? 'var(--warning)' : 'var(--danger)'
    : 'var(--border)'

  return (
    <div className="page">
      {/* Back button + header */}
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')} style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Назад
        </button>
        <h1 className="page-title">Тикет #{t.guid?.slice(0, 16) || t.id}</h1>
        <p className="page-subtitle" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SegmentBadge segment={t.segment} />
          <LangBadge lang={a?.language ?? null} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {t.createdAt ? new Date(t.createdAt).toLocaleString('ru-RU') : ''}
          </span>
        </p>
      </div>

      <div className="detail-grid">
        {/* Column 1: Текст обращения + Клиент */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={15} />Текст обращения
              </h3>
            </div>
            <div className="card-body">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {t.description || '—'}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={15} />Клиент
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Сегмент"><SegmentBadge segment={t.segment} /></Row>
              <Row label="Пол">{t.gender ?? '—'}</Row>
              <Row label="Возраст">{calcAge(t.birthDate)}</Row>
              <Row label="Город">{t.city ?? '—'}</Row>
              <Row label="Адрес">
                {[t.street, t.house].filter(Boolean).join(', ') || '—'}
              </Row>
              {(t.latitude != null && t.longitude != null) && (
                <>
                  <Row label="Координаты">
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                    </span>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <Map center={[t.latitude, t.longitude]} />
                  </div>
                </>
              )}
              <Row label="Источник">
                <span className="badge badge-new">{t.source ?? '—'}</span>
              </Row>
            </div>
          </div>
        </div>

        {/* Column 2: AI-анализ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header" style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
              <h3 className="card-title" style={{ color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={15} />Результат AI-анализа
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Тип обращения</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{a?.ticketType ?? '—'}</div>
              </div>
              <Row label="Тональность"><SentimentBadge sentiment={a?.sentiment ?? null} /></Row>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Приоритет <span style={{ color: priorityColor }}>{priority ?? '—'}/10</span>
                </div>
                <div className="workload-bar-bg">
                  <div style={{ height: '100%', borderRadius: 3, background: priorityColor, width: `${priorityPct}%`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <Row label="Язык"><LangBadge lang={a?.language ?? null} /></Row>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Резюме</h3></div>
            <div className="card-body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {a?.summary || <span style={{ color: 'var(--text-muted)' }}>Не сгенерировано</span>}
              </p>
            </div>
          </div>

          <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div className="card-header" style={{ background: 'transparent', borderBottom: '1px solid #FDE68A' }}>
              <h3 className="card-title" style={{ color: '#92400E' }}>Рекомендация</h3>
            </div>
            <div className="card-body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#78350F', fontStyle: 'italic' }}>
                {a?.recommendation || <span style={{ color: '#B45309' }}>Не сгенерировано</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Назначение */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header" style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
              <h3 className="card-title" style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={15} />Назначен менеджер
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {m?.name ? (
                <>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.position}</div>
                  </div>
                  <Row label="Офис">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} />{m.office}
                    </span>
                  </Row>
                  {m.skills && m.skills.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Навыки</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {m.skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                      </div>
                    </div>
                  )}
                  <Row label="Нагрузка">{m.currentLoad ?? 0} тикетов</Row>
                  {assign?.assignedAt && (
                    <Row label="Назначен">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <Calendar size={13} />
                        {new Date(assign.assignedAt).toLocaleString('ru-RU')}
                      </span>
                    </Row>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  Не назначен
                </p>
              )}
            </div>
          </div>

          {assign?.assignmentReason && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Причина назначения</h3></div>
              <div className="card-body">
                <div className="reason-box">{assign.assignmentReason}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
