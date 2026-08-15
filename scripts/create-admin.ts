
import { prisma } from '../lib/db'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function createAdmin() {
  try {
    const adminEmail = 'admin@cs50xfrancais.com'
    const adminPassword = 'Admin@CS50X2024'

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      console.log('Admin already exists')
      
      // Mettre à jour pour s'assurer qu'il est admin
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          role: 'admin',
          status: 'active'
        }
      })
      
      console.log('Admin role updated')
      return
    }

    // Créer le compte admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrateur',
        role: 'admin',
        status: 'active',
        enrollment: {
          create: {
            enrollmentType: 'university',
            university: 'Admin',
            hasAccess: true,
            paymentStatus: 'completed'
          }
        }
      }
    })

    console.log('Admin created successfully:')
    console.log('Email:', adminEmail)
    console.log('Password:', adminPassword)
    console.log('ID:', admin.id)
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
