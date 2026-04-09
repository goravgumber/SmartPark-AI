import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// ENV DEBUG
console.log("ENV CHECK:")
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Check Render environment variables.")
}

// Use global to prevent multiple instances (important in dev + serverless)
const globalForPrisma = globalThis

let prisma

if (!globalForPrisma.prisma) {
  prisma = new PrismaClient({
    log: ['error', 'warn'] 
  })

  globalForPrisma.prisma = prisma
  console.log("Prisma Client Initialized (native)")
} else {
  prisma = globalForPrisma.prisma
}

// Safe DB connection (non-crashing)
prisma.$connect()
  .then(() => {
    console.log("Database connected successfully")
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message)
  })

export { prisma }
