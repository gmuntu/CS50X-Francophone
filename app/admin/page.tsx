
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import AuthHeader from '@/components/auth-header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  UserX,
  Shield,
  Search,
  RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  enrollment: {
    enrollmentType: string
    university: string | null
    hasAccess: boolean
    paymentStatus: string
  } | null
  createdAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      
      if (res.ok) {
        setUsers(data.users || [])
        setStats(data.stats || { total: 0, active: 0, suspended: 0, pending: 0 })
      } else {
        if (data.error === 'Accès non autorisé') {
          router.push('/courses')
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      })

      if (res.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleAccessChange = async (userId: string, hasAccess: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hasAccess })
      })

      if (res.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('Error updating user access:', error)
    }
  }

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AuthHeader />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Administration
              </h1>
            </div>
            <p className="text-gray-600">
              Gérez les utilisateurs, les accès et les inscriptions
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Actifs</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Suspendus</p>
                    <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
                  </div>
                  <UserX className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Refresh */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadUsers} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nom</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Université</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Accès</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.name || 'N/A'}</span>
                            {user.role === 'admin' && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Admin
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant={user.enrollment?.enrollmentType === 'university' ? 'default' : 'secondary'}>
                            {user.enrollment?.enrollmentType === 'university' ? 'Universitaire' : 'Libre'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {user.enrollment?.university || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={
                              user.status === 'active' ? 'default' : 
                              user.status === 'suspended' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {user.status === 'active' ? 'Actif' : 
                             user.status === 'suspended' ? 'Suspendu' : 
                             'En attente'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={user.enrollment?.hasAccess ? 'default' : 'secondary'}>
                            {user.enrollment?.hasAccess ? 'Autorisé' : 'Non autorisé'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {user.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(user.id, 'suspended')}
                              >
                                Suspendre
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleStatusChange(user.id, 'active')}
                              >
                                Activer
                              </Button>
                            )}
                            
                            {user.enrollment?.hasAccess ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAccessChange(user.id, false)}
                              >
                                Retirer l'accès
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAccessChange(user.id, true)}
                              >
                                Donner l'accès
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun utilisateur trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
