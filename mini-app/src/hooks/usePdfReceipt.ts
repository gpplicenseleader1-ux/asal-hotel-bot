import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import type { Translations } from '../i18n'
import type { BookingSuccessData, RoomType } from '../types'

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Samarkand+86,+Bukhara,+Uzbekistan'

type RGB = [number, number, number]
const TERRA:    RGB = [197, 107,  74]
const CLAY:     RGB = [138,  75,  51]
const CHARCOAL: RGB = [ 43,  36,  32]
const SAND:     RGB = [232, 220, 200]
const OFFWHITE: RGB = [250, 246, 240]
const WHITE:    RGB = [255, 255, 255]
const LABEL:    RGB = [120, 100,  88]

const PW = 210          // A4 width mm
const ML = 20           // margin left
const MR = 20           // margin right
const CW = PW - ML - MR // content width

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

function row(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LABEL)
  doc.text(label, ML, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...CHARCOAL)
  doc.text(value, PW - MR, y, { align: 'right' })

  doc.setDrawColor(...SAND)
  doc.setLineWidth(0.3)
  doc.line(ML, y + 3, PW - MR, y + 3)
}

export async function downloadBookingPdf(
  data: BookingSuccessData,
  t: Translations,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const qrDataUrl = await QRCode.toDataURL(MAPS_URL, {
    width: 200,
    margin: 1,
    color: { dark: '#8A4B33', light: '#FAF6F0' },
  })

  // ── Header banner
  doc.setFillColor(...CLAY)
  doc.rect(0, 0, PW, 30, 'F')
  doc.setFillColor(...TERRA)
  doc.rect(0, 25, PW, 8, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('times', 'bold')
  doc.setFontSize(22)
  doc.text('Asal Boutique Hotel', PW / 2, 15, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('Samarkand St 86, Bukhara, Uzbekistan', PW / 2, 22, { align: 'center' })

  doc.setFontSize(7.5)
  doc.text('BOOKING RECEIPT', PW / 2, 30, { align: 'center' })

  // ── Booking ID badge
  doc.setFillColor(...OFFWHITE)
  doc.roundedRect(ML, 38, CW, 14, 2.5, 2.5, 'F')
  doc.setDrawColor(...TERRA)
  doc.setLineWidth(0.5)
  doc.roundedRect(ML, 38, CW, 14, 2.5, 2.5, 'S')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LABEL)
  doc.text('Booking #', ML + 5, 47)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...CLAY)
  doc.text(data.bookingId.slice(0, 8).toUpperCase(), PW - MR - 5, 47, { align: 'right' })

  // ── Details rows
  const ROOM_LABEL: Record<RoomType, string> = {
    standard:     t.standard,
    junior_suite: t.juniorSuite,
    suite:        t.suite,
  }

  let y = 63
  const R = (label: string, value: string) => { row(doc, label, value, y); y += 11 }

  R('Guest', data.guestName)
  if (data.guestPhone) R('Phone', data.guestPhone)
  R('Room', `${ROOM_LABEL[data.roomType] ?? data.roomType}  #${data.roomNumber}`)
  R('Check-in', fmtDate(data.checkIn))
  R('Check-out', fmtDate(data.checkOut))
  R('Nights', String(data.nights))
  if (data.paymentMethod) R('Payment', data.paymentMethod)

  // ── Total price box
  y += 4
  doc.setFillColor(...CLAY)
  doc.roundedRect(ML, y, CW, 16, 2.5, 2.5, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('TOTAL', ML + 5, y + 10)

  doc.setFont('times', 'bold')
  doc.setFontSize(18)
  doc.text(`${data.totalPrice.toLocaleString('ru-RU')} sum`, PW - MR - 5, y + 10.5, { align: 'right' })

  y += 24

  // ── QR code (right side)
  const QR_SIZE = 38
  const QR_X = PW - MR - QR_SIZE
  doc.addImage(qrDataUrl, 'PNG', QR_X, y, QR_SIZE, QR_SIZE)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...LABEL)
  doc.text('Scan for Google Maps', QR_X + QR_SIZE / 2, y + QR_SIZE + 4, { align: 'center' })

  // ── Hotel contact block (left of QR)
  doc.setFontSize(8)
  doc.setTextColor(...CHARCOAL)
  doc.setFont('helvetica', 'bold')
  doc.text('Asal Boutique Hotel', ML, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...LABEL)
  doc.text('Samarkand St 86, Bukhara', ML, y + 13)
  doc.text('+998 78 333 22 00', ML, y + 20)
  doc.text('@asal_boutique_hotel', ML, y + 27)
  doc.text('Check-in from 14:00  |  Check-out by 12:00', ML, y + 34)

  // ── Footer
  doc.setFillColor(...TERRA)
  doc.rect(0, 278, PW, 19, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.text('Thank you for choosing Asal Boutique Hotel', PW / 2, 289, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('We look forward to welcoming you in Bukhara', PW / 2, 294, { align: 'center' })

  doc.save(`asal-hotel-booking-${data.bookingId}.pdf`)
}
