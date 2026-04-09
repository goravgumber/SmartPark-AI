import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

console.log("ENV CHECK:")
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

const globalForPrisma = globalThis

let prisma

if (!globalForPrisma.prisma) {
  prisma = new PrismaClient({
    adapter: {
      url: process.env.DATABASE_URL
    }
  })
  globalForPrisma.prisma = prisma
  console.log("Prisma Client Initialized")
} else {
  prisma = globalForPrisma.prisma
}

prisma.$connect()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("DB Error:", err))

export { prisma }
