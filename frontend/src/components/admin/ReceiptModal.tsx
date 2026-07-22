import { BUSINESS } from '../../lib/business';
import { formatDate, formatRM } from '../../lib/format';
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

function printReceipt(order: Order): void {
  const rows = (order.orderItems ?? [])
    .map(
      (it) =>
        `<tr><td>${it.quantity}× ${escapeHtml(it.product?.name ?? 'Item')}</td><td style="text-align:right">${formatRM(
          it.unitPrice * it.quantity
        )}</td></tr>`
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Receipt ${order.orderNumber}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Quicksand:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body{font-family:'Quicksand',sans-serif;color:#3e2415;background:#fff6e6;margin:0;padding:32px;}
      .r{max-width:420px;margin:0 auto;background:#fff;border-radius:22px;padding:28px;box-shadow:0 10px 30px rgba(107,66,38,.13);}
      h1{font-family:'Fraunces',serif;font-size:26px;margin:0;color:#6b4226;}
      .tag{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b07a52;font-weight:700;margin-top:4px;}
      .meta{margin:18px 0;font-size:13px;color:#8a6a4f;}
      .meta b{color:#3e2415;}
      table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;}
      td{padding:7px 0;border-bottom:1px dashed #f0ddc4;}
      .total{display:flex;justify-content:space-between;font-family:'Fraunces',serif;font-size:20px;font-weight:700;margin-top:12px;}
      .status{display:inline-block;margin-top:14px;background:#fcebc4;color:#6b4226;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;}
      .thanks{margin-top:20px;text-align:center;font-style:italic;color:#b07a52;font-size:13px;}
      @media print{body{background:#fff;padding:0;}.r{box-shadow:none;}}
    </style></head><body>
    <div class="r">
      <div style="text-align:center">
        <div style="font-size:34px">🍪</div>
        <h1>${escapeHtml(BUSINESS.name)}</h1>
        <div class="tag">Receipt</div>
      </div>
      <div class="meta">
        <div>Order: <b>${order.orderNumber}</b></div>
        <div>Date: <b>${formatDate(order.completedAt ?? order.createdAt)}</b></div>
        ${order.customer?.name ? `<div>Customer: <b>${escapeHtml(order.customer.name)}</b></div>` : ''}
        ${order.deliveryDate ? `<div>Delivery: <b>${formatDate(order.deliveryDate)}</b></div>` : ''}
      </div>
      <table>${rows}</table>
      <div class="total"><span>Total</span><span>${formatRM(order.totalAmount)}</span></div>
      <div class="status">${order.status}</div>
      <div class="thanks">${escapeHtml(BUSINESS.tagline)}</div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
    </body></html>`;
  const w = window.open('', '_blank', 'width=480,height=720');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function ReceiptModal({ order, onClose }: Props) {
  const waNumber = toWaNumber(order?.customer?.phone);

  return (
    <Modal open={order !== null} onClose={onClose} title="Receipt" maxWidth="max-w-sm">
      {order && (
        <div>
          <div className="rounded-brand-lg border border-brand-border-soft bg-brand-bg p-5 text-center">
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
            <Button variant="secondary" onClick={() => printReceipt(order)}>
              🖨️ Print / Save PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
