
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, enrollmentType, university, accessCode } = body

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom complet sont requis' },
        { status: 400 }
      )
    }

    // Par défaut, si enrollmentType n'est pas fourni, on utilise "independent"
    const finalEnrollmentType = enrollmentType || 'independent'

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 400 }
      )
    }

    // Validation spécifique pour inscription universitaire
    if (finalEnrollmentType === 'university') {
      if (!university || !accessCode) {
        return NextResponse.json(
          { error: 'Université et code d\'accès requis pour inscription universitaire' },
          { status: 400 }
        )
      }

      // Vérifier l'université
      const validUniversity = await prisma.university.findFirst({
        where: {
          name: university,
          code: accessCode,
          active: true
        }
      })

      if (!validUniversity) {
        return NextResponse.json(
          { error: 'Université ou code d\'accès invalide' },
          { status: 400 }
        )
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Créer l'utilisateur et l'inscription
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        enrollment: {
          create: {
            enrollmentType: finalEnrollmentType,
            university: finalEnrollmentType === 'university' ? university : null,
            accessCode: finalEnrollmentType === 'university' ? accessCode : null,
            hasAccess: finalEnrollmentType === 'university', // Accès immédiat pour universitaires
            paymentStatus: finalEnrollmentType === 'university' ? 'completed' : 'pending'
          }
        }
      },
      include: {
        enrollment: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        enrollmentType: user.enrollment?.enrollmentType,
        hasAccess: user.enrollment?.hasAccess
      }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    )
  }
}
