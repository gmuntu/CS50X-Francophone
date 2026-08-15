import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { 
      email: providedEmail, 
      paymentMethod, 
      amount = 300, 
      currency = 'USD', 
      paymentDetails 
    } = body

    const userEmail = session?.user?.email || providedEmail

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email requis pour valider le paiement' },
        { status: 400 }
      )
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Mode de paiement requis' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { enrollment: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable. Veuillez vérifier votre adresse email.' },
        { status: 404 }
      )
    }

    // Générer une référence de transaction unique
    const transactionRef = paymentDetails?.transactionRef || `PAY-${paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Mettre à jour ou créer l'inscription
    if (user.enrollment) {
      await prisma.enrollment.update({
        where: { id: user.enrollment.id },
        data: {
          paymentStatus: 'completed',
          hasAccess: true,
          stripePaymentId: transactionRef,
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          enrollmentType: 'independent',
          paymentStatus: 'completed',
          hasAccess: true,
          stripePaymentId: transactionRef
        }
      })
    }

    // S'assurer que le statut de l'utilisateur est actif
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'active' }
    })

    return NextResponse.json({
      success: true,
      message: 'Paiement confirmé avec succès ! Accès activé.',
      transaction: {
        reference: transactionRef,
        amount,
        currency,
        paymentMethod,
        userEmail: user.email,
        userName: user.name,
        date: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors du traitement du paiement' },
      { status: 500 }
    )
  }
}
