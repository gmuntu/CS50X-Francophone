
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const universities = await prisma.university.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ universities })
  } catch (error) {
    console.error('Error fetching universities:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des universités' },
      { status: 500 }
    )
  }
}
