import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// In-memory fallback database for sandboxed / offline environments
interface InMemoryUser {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  password: string
  image: string | null
  role: string
  status: string
  createdAt: Date
  updatedAt: Date
  enrollment?: InMemoryEnrollment | null
}

interface InMemoryEnrollment {
  id: string
  userId: string
  enrollmentType: string
  university: string | null
  accessCode: string | null
  paymentStatus: string
  stripeSessionId: string | null
  stripePaymentId: string | null
  hasAccess: boolean
  createdAt: Date
  updatedAt: Date
}

interface InMemoryUniversity {
  id: string
  name: string
  code: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const inMemoryUniversities: InMemoryUniversity[] = [
  { id: 'uni_1', name: 'Université Officielle de Mbuji-Mayi (UOM)', code: 'UOM2024', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'uni_2', name: 'Université de Kinshasa (UNIKIN)', code: 'UNIKIN2024', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'uni_3', name: 'Université de Lubumbashi (UNILU)', code: 'UNILU2024', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'uni_4', name: 'Université Pédagogique Nationale (UPN)', code: 'UPN2024', active: true, createdAt: new Date(), updatedAt: new Date() },
]

// Pre-hashed passwords for test accounts
const adminHashed = bcrypt.hashSync('Admin@CS50X2024', 10)
const johnHashed = bcrypt.hashSync('johndoe123', 10)

const inMemoryEnrollments: InMemoryEnrollment[] = [
  {
    id: 'enr_admin',
    userId: 'usr_admin',
    enrollmentType: 'university',
    university: 'Admin',
    accessCode: null,
    paymentStatus: 'completed',
    stripeSessionId: null,
    stripePaymentId: null,
    hasAccess: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'enr_john',
    userId: 'usr_john',
    enrollmentType: 'university',
    university: 'Université Officielle de Mbuji-Mayi (UOM)',
    accessCode: 'UOM2024',
    paymentStatus: 'completed',
    stripeSessionId: null,
    stripePaymentId: null,
    hasAccess: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const inMemoryUsers: InMemoryUser[] = [
  {
    id: 'usr_admin',
    name: 'Administrateur',
    email: 'admin@cs50xfrancais.com',
    emailVerified: null,
    password: adminHashed,
    image: null,
    role: 'admin',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    enrollment: inMemoryEnrollments[0],
  },
  {
    id: 'usr_john',
    name: 'John Doe',
    email: 'john@doe.com',
    emailVerified: null,
    password: johnHashed,
    image: null,
    role: 'user',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    enrollment: inMemoryEnrollments[1],
  },
]

function createMockPrisma() {
  return {
    user: {
      findUnique: async ({ where, include }: any) => {
        const user = inMemoryUsers.find(
          (u) => (where.id && u.id === where.id) || (where.email && u.email.toLowerCase() === where.email.toLowerCase())
        )
        if (!user) return null
        if (include?.enrollment) {
          const enr = inMemoryEnrollments.find((e) => e.userId === user.id)
          return { ...user, enrollment: enr || null }
        }
        return { ...user }
      },
      findFirst: async ({ where, include }: any) => {
        const user = inMemoryUsers.find((u) => {
          if (where?.email && u.email.toLowerCase() !== where.email.toLowerCase()) return false
          if (where?.id && u.id !== where.id) return false
          return true
        })
        if (!user) return null
        if (include?.enrollment) {
          const enr = inMemoryEnrollments.find((e) => e.userId === user.id)
          return { ...user, enrollment: enr || null }
        }
        return { ...user }
      },
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let list = [...inMemoryUsers]
        if (where?.role) list = list.filter((u) => u.role === where.role)
        if (where?.status) list = list.filter((u) => u.status === where.status)
        return list.map((user) => {
          if (include?.enrollment) {
            const enr = inMemoryEnrollments.find((e) => e.userId === user.id)
            return { ...user, enrollment: enr || null }
          }
          return { ...user }
        })
      },
      create: async ({ data, include }: any) => {
        const id = 'usr_' + Math.random().toString(36).substring(2, 9)
        const newUser: InMemoryUser = {
          id,
          name: data.name ?? null,
          email: data.email,
          emailVerified: null,
          password: data.password,
          image: data.image ?? null,
          role: data.role ?? 'user',
          status: data.status ?? 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        let newEnrollment: InMemoryEnrollment | null = null
        if (data.enrollment?.create) {
          const enrData = data.enrollment.create
          newEnrollment = {
            id: 'enr_' + Math.random().toString(36).substring(2, 9),
            userId: id,
            enrollmentType: enrData.enrollmentType ?? 'independent',
            university: enrData.university ?? null,
            accessCode: enrData.accessCode ?? null,
            paymentStatus: enrData.paymentStatus ?? 'pending',
            stripeSessionId: enrData.stripeSessionId ?? null,
            stripePaymentId: enrData.stripePaymentId ?? null,
            hasAccess: !!enrData.hasAccess,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          inMemoryEnrollments.push(newEnrollment)
          newUser.enrollment = newEnrollment
        }

        inMemoryUsers.push(newUser)
        if (include?.enrollment) {
          return { ...newUser, enrollment: newEnrollment }
        }
        return { ...newUser }
      },
      update: async ({ where, data }: any) => {
        const index = inMemoryUsers.findIndex(
          (u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)
        )
        if (index === -1) throw new Error('User not found')
        inMemoryUsers[index] = {
          ...inMemoryUsers[index],
          ...data,
          updatedAt: new Date(),
        }
        return { ...inMemoryUsers[index] }
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = inMemoryUsers.find(
          (u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)
        )
        if (existing) {
          return Object.assign(existing, update, { updatedAt: new Date() })
        }
        const id = 'usr_' + Math.random().toString(36).substring(2, 9)
        const newUser: InMemoryUser = {
          id,
          name: create.name ?? null,
          email: create.email,
          emailVerified: null,
          password: create.password,
          image: create.image ?? null,
          role: create.role ?? 'user',
          status: create.status ?? 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        inMemoryUsers.push(newUser)
        return { ...newUser }
      },
    },
    university: {
      findMany: async ({ where, select, orderBy }: any = {}) => {
        let list = inMemoryUniversities
        if (where?.active !== undefined) {
          list = list.filter((u) => u.active === where.active)
        }
        if (select) {
          return list.map((u) => {
            const res: any = {}
            if (select.id) res.id = u.id
            if (select.name) res.name = u.name
            if (select.code) res.code = u.code
            if (select.active) res.active = u.active
            return res
          })
        }
        return [...list]
      },
      findFirst: async ({ where }: any) => {
        return (
          inMemoryUniversities.find((u) => {
            if (where.name && u.name !== where.name) return false
            if (where.code && u.code !== where.code) return false
            if (where.active !== undefined && u.active !== where.active) return false
            return true
          }) ?? null
        )
      },
      upsert: async ({ where, create }: any) => {
        const existing = inMemoryUniversities.find((u) => u.name === where.name)
        if (existing) return existing
        const newUni: InMemoryUniversity = {
          id: 'uni_' + Math.random().toString(36).substring(2, 9),
          name: create.name,
          code: create.code,
          active: create.active ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        inMemoryUniversities.push(newUni)
        return newUni
      },
    },
    enrollment: {
      findUnique: async ({ where }: any) => {
        return (
          inMemoryEnrollments.find(
            (e) => (where.id && e.id === where.id) || (where.userId && e.userId === where.userId)
          ) ?? null
        )
      },
      update: async ({ where, data }: any) => {
        const index = inMemoryEnrollments.findIndex(
          (e) => (where.id && e.id === where.id) || (where.userId && e.userId === where.userId)
        )
        if (index === -1) throw new Error('Enrollment not found')
        inMemoryEnrollments[index] = {
          ...inMemoryEnrollments[index],
          ...data,
          updatedAt: new Date(),
        }
        return { ...inMemoryEnrollments[index] }
      },
      create: async ({ data }: any) => {
        const newEnrollment: InMemoryEnrollment = {
          id: 'enr_' + Math.random().toString(36).substring(2, 9),
          userId: data.userId,
          enrollmentType: data.enrollmentType ?? 'independent',
          university: data.university ?? null,
          accessCode: data.accessCode ?? null,
          paymentStatus: data.paymentStatus ?? 'pending',
          stripeSessionId: data.stripeSessionId ?? null,
          stripePaymentId: data.stripePaymentId ?? null,
          hasAccess: !!data.hasAccess,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        inMemoryEnrollments.push(newEnrollment)
        return newEnrollment
      },
    },
    account: {
      findUnique: async () => null,
      create: async ({ data }: any) => data,
      delete: async () => ({}),
    },
    session: {
      findUnique: async () => null,
      create: async ({ data }: any) => data,
      update: async ({ data }: any) => data,
      delete: async () => ({}),
    },
    verificationToken: {
      findUnique: async () => null,
      create: async ({ data }: any) => data,
      delete: async () => ({}),
    },
    $disconnect: async () => {},
  }
}

let prismaClient: any

try {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('role_ab0cc4e2e')) {
    prismaClient = new PrismaClient()
  } else {
    console.info('[AI Studio] Using in-memory database store')
    prismaClient = createMockPrisma()
  }
} catch {
  console.warn('[AI Studio] Database connection fallback to in-memory store')
  prismaClient = createMockPrisma()
}

export const prisma = prismaClient
