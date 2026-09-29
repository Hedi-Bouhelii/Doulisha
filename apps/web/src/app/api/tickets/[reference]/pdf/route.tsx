import {
  formatDate,
  formatPrice,
  formatTime,
  getDirection,
  isLocale,
  type Locale,
} from '@doulisha/i18n';
import { palette } from '@doulisha/ui-tokens';
import { TRPCError } from '@trpc/server';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';

import { ARABIC, imageDataUrl, Line, loadFonts } from '@/server/og-kit';
import { apiForLocale } from '@/trpc/server';

/** A4 at 150 dpi: sharp enough to print and to scan the QR code from a phone. */
const PAGE = { width: 1240, height: 1754 };
const A4_POINTS = { width: 595.28, height: 841.89 };

const statusByTrpcCode: Partial<Record<TRPCError['code'], number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 404,
  NOT_FOUND: 404,
  BAD_REQUEST: 404,
};

/**
 * TKT-04 PDF ticket, one page per person: logo, event, date, place, pick-up,
 * holder, QR code and what is still to pay, in the interface language. Pages
 * are drawn with next/og (Arabic shaped like the share images, ADR 0013) and
 * put in a PDF with pdf-lib (ADR 0017). Only the buyer (member or guest
 * session) can download it, and only once places are confirmed.
 * GET /api/tickets/{reference}/pdf?locale=fr
 */
export async function GET(
  request: Request,
  { params }: RouteContext<'/api/tickets/[reference]/pdf'>,
) {
  const { reference } = await params;
  const localeParam = new URL(request.url).searchParams.get('locale') ?? 'fr';
  const locale: Locale = isLocale(localeParam) ? localeParam : 'fr';

  let order;
  try {
    order = await (await apiForLocale(locale)).booking.byReference({ reference });
  } catch (error) {
    if (error instanceof TRPCError) {
      return new Response(null, { status: statusByTrpcCode[error.code] ?? 500 });
    }
    throw error;
  }
  const tickets = order.tickets.filter((ticket) => ticket.ticketCode);
  if (tickets.length === 0) return new Response(null, { status: 409 });

  const t = await getTranslations({ locale, namespace: 'TicketPdf' });
  const rtl = getDirection(locale) === 'rtl';
  const [fonts, logo, cover] = await Promise.all([
    loadFonts(),
    imageDataUrl('/images/brand/logo.png'),
    imageDataUrl(order.event.coverUrl),
  ]);
  const titleFont = ARABIC.test(order.event.title) ? 'Plex Arabic' : 'Playfair';
  const bodyFont = rtl ? 'Plex Arabic' : 'Inter';
  const align = rtl ? 'flex-end' : 'flex-start';
  const place = [order.event.venueName, order.event.address, order.event.city]
    .filter(Boolean)
    .join(' · ');
  const due = formatPrice(order.dueMillimes, locale);
  const payment =
    order.totalMillimes === 0
      ? t('free')
      : order.dueMillimes <= 0
        ? t('paid')
        : order.manualMethod === 'cash'
          ? t('payAtDoor', { amount: due })
          : t('toPay', { amount: due });
  const paymentColor = order.dueMillimes > 0 ? palette.terracottaStrong : palette.forest;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${order.event.title} · ${order.reference}`);
  pdf.setAuthor('Doulisha');
  pdf.setCreator('Doulisha');
  pdf.setLanguage(locale);

  for (const [index, ticket] of tickets.entries()) {
    const qr = await QRCode.toDataURL(ticket.ticketCode!, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#2A2420', light: '#FFFFFF' },
    });
    const rows: [string, string][] = [
      [
        t('date'),
        `${formatDate(order.event.startsAt, locale)} · ${formatTime(order.event.startsAt, locale)}`,
      ],
      ...(place ? [[t('place'), place] as [string, string]] : []),
      ...(ticket.meetingPoint && ticket.meetAt
        ? [
            [t('pickup'), `${ticket.meetingPoint} · ${formatTime(ticket.meetAt, locale)}`] as [
              string,
              string,
            ],
          ]
        : []),
      [t('holder'), ticket.fullName],
      ...(ticket.ticketName ? [[t('ticket'), ticket.ticketName] as [string, string]] : []),
      [t('reference'), order.reference],
    ];

    const image = new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: palette.cream,
          padding: 56,
          fontFamily: bodyFont,
          color: palette.ink,
        }}
      >
        {/* Header: logo and "E-ticket". */}
        <div
          style={{
            display: 'flex',
            flexDirection: rtl ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
            <img src={logo} alt="" height={96} style={{ height: 96, objectFit: 'contain' }} />
          ) : null}
          <Line
            text={t('title')}
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: palette.white,
              backgroundColor: palette.forest,
              padding: '10px 28px',
              borderRadius: 999,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            backgroundColor: palette.white,
            borderRadius: 36,
            overflow: 'hidden',
            border: `2px solid ${palette.sand}`,
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
            <img
              src={cover}
              alt=""
              width={PAGE.width - 112}
              height={360}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', height: 24, backgroundColor: palette.forest }} />
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: align,
              padding: '40px 56px 0',
            }}
          >
            <Line
              text={order.event.title}
              block
              style={{
                fontFamily: titleFont,
                fontSize: 60,
                fontWeight: 700,
                lineHeight: 1.15,
                textAlign: rtl ? 'right' : 'left',
              }}
            />
            {order.organizer ? (
              <Line
                text={t('organizer', { name: order.organizer.name })}
                style={{ fontSize: 28, color: palette.brown, marginTop: 10 }}
              />
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: rtl ? 'row-reverse' : 'row',
              gap: 48,
              padding: '36px 56px',
              alignItems: 'flex-start',
            }}
          >
            {/* Details. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                flexGrow: 1,
                flexBasis: 0,
              }}
            >
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 4 }}
                >
                  <Line
                    text={label}
                    style={{
                      fontSize: 22,
                      color: palette.brown,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  />
                  <Line
                    text={value}
                    block
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      textAlign: rtl ? 'right' : 'left',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 4 }}>
                <Line
                  text={t('payment')}
                  style={{
                    fontSize: 22,
                    color: palette.brown,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                />
                <Line
                  text={payment}
                  block
                  style={{ fontSize: 32, fontWeight: 700, color: paymentColor }}
                />
              </div>
            </div>

            {/* QR code. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: 24,
                borderRadius: 28,
                border: `3px dashed ${palette.sand}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
              <img src={qr} alt="" width={420} height={420} />
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Inter',
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: 6,
                }}
              >
                {ticket.ticketCode}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexGrow: 1 }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '28px 56px',
              backgroundColor: palette.forest,
              color: palette.white,
            }}
          >
            <Line
              text={t('showAtEntrance')}
              center
              block
              style={{ fontSize: 28, fontWeight: 700 }}
            />
            <Line text={t('onePerPerson')} center block style={{ fontSize: 22, opacity: 0.85 }} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: rtl ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            marginTop: 22,
            fontSize: 22,
            color: palette.brown,
          }}
        >
          <div style={{ display: 'flex', fontFamily: 'Inter' }}>doulisha.tn</div>
          {tickets.length > 1 ? (
            <Line
              text={t('page', { n: index + 1, total: tickets.length })}
              style={{ fontSize: 22 }}
            />
          ) : null}
        </div>
      </div>,
      { ...PAGE, fonts },
    );
    const png = Buffer.from(await image.arrayBuffer());
    const jpeg = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    const embedded = await pdf.embedJpg(jpeg);
    const page = pdf.addPage([A4_POINTS.width, A4_POINTS.height]);
    page.drawImage(embedded, { x: 0, y: 0, ...A4_POINTS });
  }

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="doulisha-${order.reference}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
