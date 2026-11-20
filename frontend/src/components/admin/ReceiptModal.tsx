import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { BUSINESS } from '../../lib/business';
import { formatDate, formatRM } from '../../lib/format';
import { ORDER_STATUS_LABEL } from '../../lib/order-status';
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
    `Status: ${ORDER_STATUS_LABEL[order.status]}`,
    order.deliveryDate ? `Delivery: ${formatDate(order.deliveryDate)}` : '',
    '',
    `Thank you! ${BUSINESS.tagline}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/** Renders the preview card itself to a PNG, so the download and the print match the modal exactly. */
async function captureReceipt(node: HTMLElement): Promise<string> {
  await document.fonts.ready;
  return toPng(node, { pixelRatio: 3 });
}

/** The window title becomes the default file name when the user picks "Save as PDF". */
function printImage(w: Window, dataUrl: string, title: string): void {
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      @page{margin:12mm}
      body{margin:0;padding:24px;display:flex;justify-content:center;background:#fff}
      img{width:100%;max-width:440px;height:auto}
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
      a.download = `${o.orderNumber}.png`;
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
    const w = window.open('', '_blank', 'width=520,height=760');
    if (!w) {
      toast.error('Allow pop-ups for this site to print the receipt');
      return;
    }
    setBusy('print');
    try {
      const dataUrl = await captureReceipt(node);
      printImage(w, dataUrl, o.orderNumber);
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
          <div ref={cardRef} className="rounded-brand-lg bg-brand-bg p-4">
            <div className="rounded-brand-lg bg-white px-6 py-7 text-center shadow-brand-lg">
              <div className="text-4xl leading-none">🍪</div>
              <h3 className="mt-2 font-serif text-[26px] font-bold leading-tight text-brand-dark">{BUSINESS.name}</h3>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-primary">Receipt</p>
              <div className="mt-4 space-y-0.5 text-left text-[13px] text-brand-muted">
                <p>
                  Order: <span className="font-semibold text-brand-text">{order.orderNumber}</span>
                </p>
                <p>
                  Date: <span className="font-semibold text-brand-text">{formatDate(order.completedAt ?? order.createdAt)}</span>
                </p>
                {order.customer?.name && (
                  <p>
                    Customer: <span className="font-semibold text-brand-text">{order.customer.name}</span>
                  </p>
                )}
                {order.deliveryDate && (
                  <p>
                    Delivery: <span className="font-semibold text-brand-text">{formatDate(order.deliveryDate)}</span>
                  </p>
                )}
              </div>
              <div className="mt-3 text-left text-sm text-brand-text">
                {(order.orderItems ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start justify-between gap-3 border-b border-dashed border-brand-border py-1.5"
                  >
                    <span className="min-w-0 flex-1">
                      {it.quantity}× {it.product?.name ?? 'Item'}
                    </span>
                    <span className="whitespace-nowrap text-brand-muted">{formatRM(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between font-serif text-xl font-bold text-brand-text">
                <span>Total</span>
                <span className="whitespace-nowrap">{formatRM(order.totalAmount)}</span>
              </div>
              <span className="mt-3.5 inline-block rounded-full bg-brand-soft px-3.5 py-1 text-xs font-bold text-brand-dark">
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              <p className="mt-5 text-[13px] italic text-brand-primary">{BUSINESS.tagline}</p>
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
