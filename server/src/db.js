import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Debug log (VERY IMPORTANT for Render)
console.log("ENV CHECK:")
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

const rawConnectionString = process.env.DATABASE_URL

// DO NOT crash app — just log error
if (!rawConnectionString) {
  console.error("DATABASE_URL is missing. Please check Render environment variables.")
}

// Build connection config safely
function buildPoolConfig(connectionString) {
  try {
    const parsed = new URL(connectionString)
    const isRenderHost = parsed.hostname.endsWith('.render.com')
    const sslMode = parsed.searchParams.get('sslmode')
    const requiresSsl = isRenderHost && sslMode !== 'disable'

    const poolConfig = { connectionString }

    if (requiresSsl) {
      poolConfig.ssl = { rejectUnauthorized: false }
    }

    return poolConfig
  } catch (err) {
    console.error("Error parsing DATABASE_URL:", err.message)
    return { connectionString }
  }
}

if (!globalForPrisma.prisma) {
  try {
    const adapter = rawConnectionString
      ? new PrismaPg(buildPoolConfig(rawConnectionString))
      : undefined

    globalForPrisma.prisma = new PrismaClient(
      adapter ? { adapter } : {}
    )

    console.log("Prisma Client Initialized")
  } catch (err) {
    console.error("Prisma initialization failed:", err)
  }
}

export const prisma = globalForPrisma.prisma

prisma?.$connect()
  .then(() => {
    console.log("Database connected successfully")
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message)
  })
