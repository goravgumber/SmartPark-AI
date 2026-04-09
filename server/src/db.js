import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

console.log("ENV CHECK:")
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

const globalForPrisma = globalThis

let prisma

if (!globalForPrisma.prisma) {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: ['error', 'warn']
  })
  globalForPrisma.prisma = prisma
  console.log("Prisma Client Initialized")
} else {
  prisma = globalForPrisma.prisma
}

prisma.$connect()
  .then(() => {
    console.log("Database connected successfully")
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message)
  })

export { prisma }
