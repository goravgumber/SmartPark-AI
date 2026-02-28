import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Prisma.')
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg({ connectionString })
  globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma
