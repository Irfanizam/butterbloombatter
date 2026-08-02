import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The next ledger position — one above the current highest across manual
 * entries and orders. New rows get this so they land on top of the ledger.
 */
export async function nextLedgerOrder(client: Db = prisma): Promise<number> {
  const [f, o] = await Promise.all([
    client.finance.aggregate({ _max: { ledgerOrder: true } }),
    client.order.aggregate({ _max: { ledgerOrder: true } }),
  ]);
  return Math.max(f._max.ledgerOrder ?? 0, o._max.ledgerOrder ?? 0) + 1;
}
