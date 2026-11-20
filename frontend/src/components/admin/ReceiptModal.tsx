import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { BUSINESS } from '../../lib/business';
import { formatDate, formatRM } from '../../lib/format';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Order } from '../../types';

interface Props {
  order: Order | null;
  onClose: () => void;
}

/** Normalises a phone number to wa.me digits (Malaysia-friendly). */
function toWaNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '60' + digits.slice(1);
  else if (!digits.startsWith('60') && digits.length <= 10) digits = '60' + digits;
  return digits || null;
}

function receiptText(order: Order): string {
  const lines = [
    `🍪 ${BUSINESS.name} — Receipt`,
    `Order: ${order.orderNumber}`,
    `Date: ${formatDate(order.completedAt ?? order.createdAt)}`,
    order.customer?.name ? `Customer: ${order.customer.name}` : '',
    '',
    ...(order.orderItems ?? []).map(
      (it) =>
        `• ${it.quantity}× ${it.product?.name ?? 'Item'} — ${formatRM(it.unitPrice * it.quantity)}`
    ),
    '',
    `Total: ${formatRM(order.totalAmount)}`,
    `Status: ${order.status}`,
    order.deliveryDate ? `Delivery: ${formatDate(order.deliveryDate)}` : '',
    '',
    `Thank you! ${BUSINESS.tagline}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/** Renders the preview card itself to a PNG, so the download and the print match the modal exactly. */
async function captureReceipt(node: HTMLElement): Promise<string> {
  await document.fonts.ready;
  return toPng(node, { pixelRatio: 2 });
}

function printImage(w: Window, dataUrl: string, title: string): void {
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      @page{margin:12mm}
      body{margin:0;padding:24px;display:flex;justify-content:center;background:#fff}
      img{width:100%;max-width:420px;height:auto}
      @media print{body{padding:0}}
    </style></head><body>
    <img src="${dataUrl}" alt="${title}" onload="setTimeout(function(){window.print()},150)"/>
    </body></html>`);
  w.document.close();
}

export function ReceiptModal({ order, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const toast = useToast();
  const waNumber = toWaNumber(order?.customer?.phone);

  async function downloadImage(o: Order): Promise<void> {
    const node = cardRef.current;
    if (!node) return;
    setBusy('download');
    try {
      const dataUrl = await captureReceipt(node);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `receipt-${o.orderNumber}.png`;
      a.click();
    } catch {
      toast.error('Could not create the receipt image');
    } finally {
      setBusy(null);
    }
  }

  async function printReceipt(o: Order): Promise<void> {
    const node = cardRef.current;
    if (!node) return;
    // Opened before the await so the browser still treats it as part of the click.
    const w = window.open('', '_blank', 'width=480,height=720');
    if (!w) {
      toast.error('Allow pop-ups for this site to print the receipt');
      return;
    }
    setBusy('print');
    try {
      const dataUrl = await captureReceipt(node);
      printImage(w, dataUrl, `Receipt ${o.orderNumber}`);
    } catch {
      w.close();
      toast.error('Could not create the receipt image');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={order !== null} onClose={onClose} title="Receipt" maxWidth="max-w-sm">
      {order && (
        <div>
          <div ref={cardRef} className="rounded-brand-lg border border-brand-border-soft bg-brand-bg p-5 text-center">
            <div className="text-3xl">🍪</div>
            <h3 className="mt-1 text-xl font-bold text-brand-dark">{BUSINESS.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary">Receipt</p>
            <div className="mt-4 text-left text-sm text-brand-muted">
              <p>
                Order: <span className="font-semibold text-brand-dark">{order.orderNumber}</span>
              </p>
              <p>
                Date: <span className="font-semibold text-brand-dark">{formatDate(order.completedAt ?? order.createdAt)}</span>
              </p>
              {order.customer?.name && (
                <p>
                  Customer: <span className="font-semibold text-brand-dark">{order.customer.name}</span>
                </p>
              )}
            </div>
            <div className="mt-3 space-y-1 text-left text-sm">
              {(order.orderItems ?? []).map((it) => (
                <div key={it.id} className="flex justify-between border-b border-dashed border-brand-border py-1">
                  <span>
                    {it.quantity}× {it.product?.name ?? 'Item'}
                  </span>
                  <span className="text-brand-muted">{formatRM(it.unitPrice * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-bold text-brand-dark">
              <span>Total</span>
              <span>{formatRM(order.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {waNumber ? (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://wa.me/${waNumber}?text=${encodeURIComponent(receiptText(order))}`,
                    '_blank',
                    'noopener'
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-brand bg-[#25D366] px-4 py-2.5 font-semibold text-white hover:opacity-90"
              >
                💬 Send receipt on WhatsApp
              </button>
            ) : (
              <p className="rounded-brand bg-brand-soft px-3 py-2 text-center text-xs text-brand-muted">
                Add a phone number to this customer to send via WhatsApp.
              </p>
            )}
            <Button
              variant="secondary"
              loading={busy === 'download'}
              disabled={busy !== null}
              onClick={() => downloadImage(order)}
            >
              ⬇️ Download image
            </Button>
            <Button
              variant="secondary"
              loading={busy === 'print'}
              disabled={busy !== null}
              onClick={() => printReceipt(order)}
            >
              🖨️ Print / Save PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
