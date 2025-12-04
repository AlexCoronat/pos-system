'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  MapPin,
  Calendar,
  Lock,
  Clock,
  Globe,
  Sun,
  Moon,
  Bell,
  Edit,
  Save,
  X
} from 'lucide-react'
import { PageHeader, LoadingState, BrandButton } from '@/components/shared'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isOAuthUser, setIsOAuthUser] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Preferences
  const [language, setLanguage] = useState('es')
  const [emailNotifications, setEmailNotifications] = useState(true)

  const { user, loading, initialized, updateProfile, changePassword } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const t = useTranslations('profile')
  const tCommon = useTranslations('common')

  const isAdmin = user?.roleName === 'Admin'

  useEffect(() => {
    if (initialized && !loading) {
      if (!user) {
        router.push('/auth/login')
        return
      }
      loadUserData()
    }
  }, [user, loading, initialized, router])

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      // Load user data
      setProfileData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || ''
      })

      // Check if user is OAuth
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      // OAuth users have identities array with providers
      const hasOAuthIdentity = authUser?.identities?.some(
        identity => identity.provider !== 'email'
      )
      setIsOAuthUser(hasOAuthIdentity || false)

      // Load preferences from localStorage
      const savedLanguage = localStorage.getItem('app_language') || 'es'
      const savedNotifications = localStorage.getItem('email_notifications')

      setLanguage(savedLanguage)
      setEmailNotifications(savedNotifications !== 'false')

    } catch (error) {
      console.error('Error loading user data:', error)
      toast({
        title: tCommon('error'),
        description: t('errors.loadProfileFailed'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      await updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone
      })

      toast({
        title: t('notifications.profileUpdated'),
        description: t('notifications.profileUpdatedDesc'),
      })

      setIsEditingProfile(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('errors.updateProfileFailed'),
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: tCommon('error'),
        description: t('errors.passwordMismatch'),
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: tCommon('error'),
        description: t('errors.passwordTooShort'),
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })

      toast({
        title: t('notifications.passwordChanged'),
        description: t('notifications.passwordChangedDesc'),
      })

      setPasswordDialogOpen(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('errors.changePasswordFailed'),
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    localStorage.setItem('app_language', value)
    // Update i18n cookie
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000`
    toast({
      title: t('notifications.languageUpdated'),
      description: t('notifications.languageUpdatedDesc').replace('{language}', value === 'es' ? t('preferences.spanish') : t('preferences.english')),
    })
    // Reload page to apply new locale
    setTimeout(() => window.location.reload(), 500)
  }

  const handleThemeChange = (value: string) => {
    setTheme(value)
    toast({
      title: t('notifications.themeUpdated'),
      description: t('notifications.themeUpdatedDesc').replace('{theme}', value === 'light' ? t('preferences.light') : t('preferences.dark')),
    })
  }

  const handleNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked)
    localStorage.setItem('email_notifications', checked.toString())
    toast({
      title: t('notifications.notificationsUpdated'),
      description: checked ? t('notifications.notificationsEnabled') : t('notifications.notificationsDisabled'),
    })
  }

  const formatDate = (dateString?: Date) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState message={tCommon('loading')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="space-y-6">
          {/* Profile Overview Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                      <Shield className="w-4 h-4" />
                      {user?.roleName}
                    </span>
                    {user?.locationName && (
                      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {user.locationName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('personalInfo.title')}
                  </CardTitle>
                  <CardDescription>{t('personalInfo.subtitle')}</CardDescription>
                </div>
                {!isEditingProfile && (
                  <BrandButton
                    onClick={() => setIsEditingProfile(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('personalInfo.edit')}
                  </BrandButton>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('personalInfo.firstName')}</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    disabled={!isEditingProfile}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('personalInfo.lastName')}</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    disabled={!isEditingProfile}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('personalInfo.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('personalInfo.emailNote')}</p>
              </div>

              <div>
                <Label htmlFor="phone">{t('personalInfo.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!isEditingProfile}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {isEditingProfile && (
                <div className="flex gap-2 pt-4">
                  <BrandButton
                    onClick={handleSaveProfile}
                    isLoading={isSavingProfile}
                    loadingText={t('personalInfo.saving')}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {t('personalInfo.saveChanges')}
                  </BrandButton>
                  <BrandButton
                    onClick={() => {
                      setIsEditingProfile(false)
                      setProfileData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                        phone: user?.phone || ''
                      })
                    }}
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('personalInfo.cancel')}
                  </BrandButton>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information - Admin Only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t('businessInfo.title')}
                </CardTitle>
                <CardDescription>{t('businessInfo.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">{t('businessInfo.businessName')}</Label>
                    <p className="text-lg font-medium">{user?.businessName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('businessInfo.plan')}</Label>
                    <p className="text-lg font-medium">{user?.planName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('businessInfo.role')}</Label>
                    <p className="text-lg font-medium">{user?.roleName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">{t('businessInfo.status')}</Label>
                    <p className="text-lg font-medium">
                      {user?.isBusinessOwner ? `👑 ${t('businessInfo.owner')}` : t('businessInfo.teamMember')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {t('security.title')}
              </CardTitle>
              <CardDescription>{t('security.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOAuthUser && (
                <>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">{t('security.password')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('security.changePasswordSubtitle')}</p>
                    </div>
                    <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <BrandButton variant="outline" size="sm">
                          {t('security.changePassword')}
                        </BrandButton>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('security.changePassword')}</DialogTitle>
                          <DialogDescription>
                            {t('security.changePasswordSubtitle')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">{t('security.confirmPassword')}</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <BrandButton variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                            {t('common.cancel')}
                          </BrandButton>
                          <BrandButton
                            onClick={handleChangePassword}
                            isLoading={isChangingPassword}
                            loadingText={t('security.changing')}
                          >
                            {t('security.changePassword')}
                          </BrandButton>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Separator />
                </>
              )}

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t('security.activeSessions')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('security.activeSessionsSubtitle')}</p>
                </div>
                <BrandButton
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/sessions')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t('security.viewSessions')}
                </BrandButton>
              </div>

              {isOAuthUser && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{t('security.oauthAccount')}:</strong> {t('security.oauthNote')}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('preferences.title')}
              </CardTitle>
              <CardDescription>{t('preferences.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language */}
              <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                <div>
                  <p className="font-medium">{t('preferences.language')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.languageSubtitle')}</p>
                </div>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">{t('preferences.spanish')}</SelectItem>
                    <SelectItem value="en">{t('preferences.english')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                <div>
                  <p className="font-medium">{t('preferences.theme')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.themeSubtitle')}</p>
                </div>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        {t('preferences.light')}
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        {t('preferences.dark')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t('preferences.emailNotifications')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('preferences.emailNotificationsSubtitle')}</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={handleNotificationsChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('accountDetails.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">{t('accountDetails.lastLogin')}</Label>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{formatDate(user?.lastLoginAt)}</p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">{t('accountDetails.accountStatus')}</Label>
                  <p className="text-lg font-medium">
                    {user?.isActive ? (
                      <span className="text-green-600 dark:text-green-400">✓ {t('accountDetails.active')}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗ {t('accountDetails.inactive')}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
