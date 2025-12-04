'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Laptop, Smartphone, Tablet, Globe, Clock, MapPin, XCircle, CheckCircle, RefreshCw, Users, User } from 'lucide-react'
import { PageHeader, LoadingState, BrandButton } from '@/components/shared'

interface Session {
  id: number
  user_id: string
  location_id: number | null
  location_name?: string
  ip_address: string | null
  user_agent: string | null
  is_active: boolean
  started_at: string
  ended_at: string | null
  user_details?: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [terminatingSession, setTerminatingSession] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'my-sessions' | 'team-sessions'>('my-sessions')

  const { user, loading, initialized } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const t = useTranslations('sessions')
  const tCommon = useTranslations('common')

  const canViewTeamSessions = user?.roleName === 'Admin' || user?.roleName === 'Manager'

  useEffect(() => {
    // Wait for auth to initialize before redirecting
    if (initialized && !loading) {
      if (!user) {
        router.push('/auth/login')
        return
      }
      loadSessions(activeTab)
    }
  }, [user, loading, initialized, router, activeTab])

  const loadSessions = async (tab: 'my-sessions' | 'team-sessions') => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      let query = supabase
        .from('user_sessions')
        .select(`
          *,
          location:locations(name),
          user_details:user_details(first_name, last_name, email)
        `)
        .order('started_at', { ascending: false })
        .limit(50)

      // Filter by user or business
      if (tab === 'my-sessions') {
        query = query.eq('user_id', user?.id)
      } else {
        query = query.eq('business_id', user?.businessId)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the data
      const transformedSessions = data.map((session: any) => ({
        ...session,
        location_name: session.location?.name,
        user_details: session.user_details
      }))

      setSessions(transformedSessions)
    } catch (error: any) {
      console.error('Error loading sessions:', error)
      toast({
        title: tCommon('error'),
        description: t('errors.loadFailed'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const terminateSession = async (sessionId: number) => {
    setTerminatingSession(sessionId)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId)

      if (error) throw error

      toast({
        title: t('notifications.sessionTerminated'),
        description: t('notifications.sessionTerminatedDesc'),
      })

      // Reload sessions
      await loadSessions(activeTab)
    } catch (error: any) {
      console.error('Error terminating session:', error)
      toast({
        title: tCommon('error'),
        description: t('errors.terminateFailed'),
        variant: "destructive",
      })
    } finally {
      setTerminatingSession(null)
    }
  }

  const terminateAllSessions = async () => {
    const message = activeTab === 'my-sessions'
      ? t('confirmations.terminateAll')
      : t('confirmations.terminateAllTeam')

    if (!confirm(message)) {
      return
    }

    try {
      const supabase = createClient()
      const currentSessionId = localStorage.getItem('session_id')

      let query = supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('is_active', true)
        .neq('id', currentSessionId ? parseInt(currentSessionId) : 0)

      // Filter by user or business
      if (activeTab === 'my-sessions') {
        query = query.eq('user_id', user?.id)
      } else {
        query = query.eq('business_id', user?.businessId)
      }

      const { error } = await query

      if (error) throw error

      toast({
        title: t('notifications.allSessionsTerminated'),
        description: activeTab === 'my-sessions'
          ? t('notifications.mySessionsTerminatedDesc')
          : t('notifications.teamSessionsTerminatedDesc'),
      })

      // Reload sessions
      await loadSessions(activeTab)
    } catch (error: any) {
      console.error('Error terminating sessions:', error)
      toast({
        title: tCommon('error'),
        description: t('errors.terminateAllFailed'),
        variant: "destructive",
      })
    }
  }

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Laptop className="w-5 h-5" />

    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-5 h-5" />
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-5 h-5" />
    }
    return <Laptop className="w-5 h-5" />
  }

  const getBrowserName = (userAgent: string | null): string => {
    if (!userAgent) return 'Unknown Browser'

    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'

    return 'Unknown Browser'
  }

  const getOSName = (userAgent: string | null): string => {
    if (!userAgent) return 'Unknown OS'

    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'

    return 'Unknown OS'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSessionDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const diff = end.getTime() - start.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('session_id') : null

  const renderSessionsList = () => (
    <>
      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <BrandButton
          onClick={() => loadSessions(activeTab)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t('actions.refresh')}
        </BrandButton>

        <BrandButton
          onClick={terminateAllSessions}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          {activeTab === 'my-sessions' ? t('actions.terminateAllMine') : t('actions.terminateAllTeam')}
        </BrandButton>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <LoadingState message={tCommon('loading')} />
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400">{t('empty.noSessions')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isCurrentSession = currentSessionId === session.id.toString()

            return (
              <div
                key={session.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${isCurrentSession ? 'border-2 border-blue-500 dark:border-blue-400' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Device Icon */}
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      {getDeviceIcon(session.user_agent)}
                    </div>

                    {/* Session Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {getBrowserName(session.user_agent)} on {getOSName(session.user_agent)}
                        </h3>
                        {isCurrentSession && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                            {t('session.currentSession')}
                          </span>
                        )}
                        {session.is_active && !isCurrentSession && (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>

                      {/* User info for team view */}
                      {activeTab === 'team-sessions' && session.user_details && (
                        <div className="mb-2 flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {session.user_details.first_name} {session.user_details.last_name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">({session.user_details.email})</span>
                        </div>
                      )}

                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {session.ip_address && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>{t('session.ipAddress')}: {session.ip_address}</span>
                          </div>
                        )}

                        {session.location_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{t('session.location')}: {session.location_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {t('session.startedAt')}: {formatDate(session.started_at)}
                          </span>
                        </div>

                        {session.ended_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{t('session.endedAt')}: {formatDate(session.ended_at)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {t('session.duration')}: {getSessionDuration(session.started_at, session.ended_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {session.is_active && (
                      <>
                        {isCurrentSession ? (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                            {t('session.active')}
                          </span>
                        ) : (
                          <BrandButton
                            onClick={() => terminateSession(session.id)}
                            variant="destructive"
                            size="sm"
                            isLoading={terminatingSession === session.id}
                            loadingText={t('actions.terminating')}
                          >
                            {t('actions.terminate')}
                          </BrandButton>
                        )}
                      </>
                    )}

                    {!session.is_active && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                        {t('session.inactive')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-400 mb-2">{t('securityNotice.title')}</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t('securityNotice.point1')}</li>
          <li>• {t('securityNotice.point2')}</li>
          <li>• {t('securityNotice.point3')}</li>
          <li>• {t('securityNotice.point4')}</li>
          {activeTab === 'team-sessions' && (
            <li className="font-medium">• {t('securityNotice.point5')}</li>
          )}
        </ul>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
        />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'my-sessions' | 'team-sessions')}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="my-sessions" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('tabs.mySessions')}
            </TabsTrigger>
            {canViewTeamSessions && (
              <TabsTrigger value="team-sessions" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('tabs.teamSessions')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-sessions">
            {renderSessionsList()}
          </TabsContent>

          {canViewTeamSessions && (
            <TabsContent value="team-sessions">
              {renderSessionsList()}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
