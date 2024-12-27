// pages/api/user.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { telegramId, firstName, lastName, username, balance } = req.body;
      
      const user = await prisma.user.upsert({
        where: { telegramId },
        update: { balance },
        create: {
          id: telegramId.toString(),
          telegramId,
          firstName,
          lastName,
          username,
          balance
        }
      });
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}