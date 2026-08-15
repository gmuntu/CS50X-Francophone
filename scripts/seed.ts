
import { prisma } from '../lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Starting seed...')

  // Créer les universités
  const universities = [
    { name: 'Université Officielle de Mbuji-Mayi (UOM)', code: 'UOM2024' },
    { name: 'Université de Kinshasa (UNIKIN)', code: 'UNIKIN2024' },
    { name: 'Université de Lubumbashi (UNILU)', code: 'UNILU2024' },
    { name: 'Université Pédagogique Nationale (UPN)', code: 'UPN2024' },
  ]

  for (const uni of universities) {
    await prisma.university.upsert({
      where: { name: uni.name },
      update: {},
      create: uni
    })
  }

  console.log('✅ Universities created')

  // Créer le compte de test admin
  const hashedPassword = await bcrypt.hash('johndoe123', 10)
  
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      enrollment: {
        create: {
          enrollmentType: 'university',
          university: 'Université Officielle de Mbuji-Mayi (UOM)',
          accessCode: 'UOM2024',
          hasAccess: true,
          paymentStatus: 'completed'
        }
      }
    }
  })

  console.log('✅ Test admin user created')
  console.log('🌱 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
