
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier si l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        enrollment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les statistiques
    const stats = {
      total: users.length,
      active: users.filter((u: any) => u.status === 'active').length,
      suspended: users.filter((u: any) => u.status === 'suspended').length,
      pending: users.filter((u: any) => u.status === 'pending').length
    }

    // Retirer les mots de passe
    const sanitizedUsers = users.map(({ password, ...user }: any) => user)

    return NextResponse.json({
      users: sanitizedUsers,
      stats
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier si l'utilisateur est admin
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, status, hasAccess } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Mettre à jour le statut de l'utilisateur
    if (status !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { status }
      })
    }

    // Mettre à jour l'accès de l'utilisateur
    if (hasAccess !== undefined) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { enrollment: true }
      })

      if (user?.enrollment) {
        await prisma.enrollment.update({
          where: { id: user.enrollment.id },
          data: { hasAccess }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    )
  }
}
