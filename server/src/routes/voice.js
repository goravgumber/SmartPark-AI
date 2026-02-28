import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

function detectIntent(text) {
  const lower = text.toLowerCase()

  const hasAny = (keywords) => keywords.some((keyword) => lower.includes(keyword))

  if (hasAny(['available', 'खाली', 'उपलब्ध'])) return 'AVAILABILITY'
  if (hasAny(['revenue', 'कमाई', 'income'])) return 'REVENUE'
  if (hasAny(['book', 'reserve', 'बुक', 'रिज़र्व'])) return 'BOOKING'
  if (hasAny(['co2', 'emission', 'environment', 'पर्यावरण'])) return 'ENVIRONMENT'
  if (hasAny(['status', 'health', 'स्थिति'])) return 'STATUS'
  return 'UNKNOWN'
}

router.post('/query', async (req, res, next) => {
  try {
    const { text = '', language = 'en' } = req.body
    const lang = language === 'hi' ? 'hi' : 'en'
    const intent = detectIntent(String(text))

    let response = ''
    let data = {}

    if (intent === 'AVAILABILITY') {
      const [availableCount, zones] = await Promise.all([
        prisma.parkingSlot.count({ where: { status: 'AVAILABLE' } }),
        prisma.zone.findMany({
          include: {
            slots: {
              where: { status: 'AVAILABLE' },
              select: { id: true }
            }
          }
        })
      ])

      const bestZone = zones
        .map((zone) => ({ name: zone.name, count: zone.slots.length }))
        .sort((a, b) => b.count - a.count)[0]

      data = {
        availableSlots: availableCount,
        topZone: bestZone?.name || 'Zone A'
      }

      response =
        lang === 'hi'
          ? `अभी ${availableCount} पार्किंग स्लॉट उपलब्ध हैं। ${bestZone?.name || 'Zone A'} में सबसे ज़्यादा जगह है।`
          : `${availableCount} parking slots available right now. ${bestZone?.name || 'Zone A'} has the most space.`
    } else if (intent === 'REVENUE') {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const today = await prisma.reservation.findMany({
        where: {
          createdAt: { gte: startOfDay },
          status: { not: 'CANCELLED' }
        },
        select: { totalAmount: true }
      })

      const amount = Math.round(today.reduce((sum, item) => sum + item.totalAmount, 0))
      data = { amount }
      response = lang === 'hi' ? `आज की कमाई ₹${amount} है।` : `Today's revenue is ₹${amount}.`
    } else if (intent === 'BOOKING') {
      response =
        lang === 'hi'
          ? 'बुकिंग के लिए मैप पर हरे स्लॉट पर क्लिक करें।'
          : 'Click any green slot on the map to make a reservation.'
    } else if (intent === 'ENVIRONMENT') {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const carsGuided = await prisma.reservation.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfDay }
        }
      })

      const fuelSaved = carsGuided * 0.2
      const co2Reduced = Number((fuelSaved * 2.31).toFixed(2))
      const trees = Number((co2Reduced / 21.7).toFixed(2))
      data = {
        carsGuided,
        co2Reduced,
        treesEquivalent: trees
      }
      response =
        lang === 'hi'
          ? `आज ${co2Reduced} kg CO₂ बचाया गया। ${trees} पेड़ों के बराबर।`
          : `Saved ${co2Reduced} kg CO₂ today. Equivalent to ${trees} trees.`
    } else if (intent === 'STATUS') {
      const [online, total] = await Promise.all([
        prisma.device.count({ where: { status: 'ONLINE' } }),
        prisma.device.count()
      ])

      data = { online, total }
      response =
        lang === 'hi'
          ? `सिस्टम सामान्य है। ${online}/${total} डिवाइस ऑनलाइन हैं।`
          : `System operational. ${online}/${total} devices online.`
    } else {
      response =
        lang === 'hi'
          ? 'माफ़ करें, मैं समझ नहीं पाया। कृपया फिर से पूछें।'
          : "I didn't understand. Please try asking differently."
    }

    res.json({
      success: true,
      data: {
        intent,
        response,
        data,
        language: lang
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
