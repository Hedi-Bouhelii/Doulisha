import QRCode from 'qrcode';

/**
 * E-ticket QR code (TKT-04), rendered on the server as inline SVG so it works
 * offline once the page is loaded. The code is the attendee's ticket code.
 */
export async function TicketQR({
  code,
  reference,
  label,
}: {
  code: string;
  reference: string;
  label: string;
}) {
  const svg = await QRCode.toString(code, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#2A2420', light: '#FFFFFF' },
  });
  return (
    <figure
      className="inline-flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 text-[#2A2420]"
      data-testid="ticket-qr"
    >
      <div
        role="img"
        aria-label={label}
        className="size-44 [&>svg]:size-full"
        // qrcode returns a static SVG string built from our own ticket code.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="ltr-nums font-mono text-sm tracking-widest">{reference}</figcaption>
    </figure>
  );
}
