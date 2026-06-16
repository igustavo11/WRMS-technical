import { PrismaMssql } from '@prisma/adapter-mssql';
import { type Prisma, PrismaClient } from '@prisma/client';

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

export type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

export { prisma };
