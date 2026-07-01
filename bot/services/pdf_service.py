import io
import logging
from typing import Any

import qrcode
from fpdf import FPDF

logger = logging.getLogger(__name__)

MAPS_URL = (
    "https://www.google.com/maps/search/?api=1"
    "&query=Samarkand+86,+Bukhara,+Uzbekistan"
)

ROOM_LABELS: dict[str, str] = {
    "standard":     "Standard",
    "junior_suite": "Junior Suite",
    "suite":        "Suite",
}

PAYMENT_LABELS: dict[str, str] = {
    "cash":     "Cash on arrival",
    "transfer": "Bank transfer",
    "card":     "Card (Visa/MC)",
}

# Colors as (R, G, B) tuples
_CLAY     = (138,  75,  51)
_TERRA    = (197, 107,  74)
_CHARCOAL = ( 43,  36,  32)
_SAND     = (232, 220, 200)
_OFFWHITE = (250, 246, 240)
_WHITE    = (255, 255, 255)
_LABEL    = (120, 100,  88)

_PW = 210   # A4 width mm
_ML = 20    # margin left
_MR = 20    # margin right
_CW = _PW - _ML - _MR  # content width


def _fmt_date(d: str) -> str:
    try:
        y, m, day = str(d).split("-")
        return f"{day}.{m}.{y}"
    except (ValueError, AttributeError):
        return str(d)


def generate_booking_pdf(booking: dict[str, Any], room_number: str) -> bytes:
    pdf = FPDF(unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(False)

    # ── Header banner
    pdf.set_fill_color(*_CLAY)
    pdf.rect(0, 0, _PW, 30, "F")
    pdf.set_fill_color(*_TERRA)
    pdf.rect(0, 25, _PW, 8, "F")

    pdf.set_text_color(*_WHITE)
    pdf.set_font("Times", "B", 22)
    pdf.set_xy(0, 7)
    pdf.cell(_PW, 10, "Asal Boutique Hotel", align="C")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(0, 18)
    pdf.cell(_PW, 5, "Samarkand St 86, Bukhara, Uzbekistan", align="C")

    pdf.set_font("Helvetica", "", 7)
    pdf.set_xy(0, 24)
    pdf.cell(_PW, 5, "BOOKING RECEIPT", align="C")

    # ── Booking ID badge
    bid = str(booking.get("id", ""))[:8].upper()
    pdf.set_fill_color(*_OFFWHITE)
    pdf.set_draw_color(*_TERRA)
    pdf.set_line_width(0.5)
    pdf.rect(_ML, 38, _CW, 14, "FD")

    pdf.set_text_color(*_LABEL)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_xy(_ML + 5, 43)
    pdf.cell(40, 5, "Booking #")

    pdf.set_text_color(*_CLAY)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(_ML, 43)
    pdf.cell(_CW - 5, 5, bid, align="R")

    # ── Detail rows
    y = 63

    def detail_row(label: str, value: str) -> None:
        nonlocal y
        pdf.set_text_color(*_LABEL)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(_ML, y - 4)
        pdf.cell(60, 5, label)

        pdf.set_text_color(*_CHARCOAL)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_xy(_ML, y - 4)
        pdf.cell(_CW, 5, value, align="R")

        pdf.set_draw_color(*_SAND)
        pdf.set_line_width(0.3)
        pdf.line(_ML, y + 3, _PW - _MR, y + 3)
        y += 11

    detail_row("Guest", str(booking.get("guest_name", "")))
    phone = str(booking.get("guest_phone", ""))
    if phone:
        detail_row("Phone", phone)
    room_type = str(booking.get("room_type", ""))
    room_label = ROOM_LABELS.get(room_type, room_type)
    detail_row("Room", f"{room_label}  #{room_number}")
    detail_row("Check-in",  _fmt_date(booking.get("check_in", "")))
    detail_row("Check-out", _fmt_date(booking.get("check_out", "")))
    detail_row("Nights", str(booking.get("nights", "")))
    pay_label = PAYMENT_LABELS.get(str(booking.get("payment_method", "")), str(booking.get("payment_method", "")))
    if pay_label:
        detail_row("Payment", pay_label)

    # ── Total price box
    y += 4
    pdf.set_fill_color(*_CLAY)
    pdf.rect(_ML, y, _CW, 16, "F")
    pdf.set_text_color(*_WHITE)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(_ML + 5, y + 5)
    pdf.cell(40, 6, "TOTAL")
    pdf.set_font("Times", "B", 18)
    pdf.set_xy(_ML, y + 4)
    total_price_val = booking.get("total_price", 0)
    total_price_fmt = f"{int(total_price_val):,} sum".replace(",", " ")
    pdf.cell(_CW - 5, 8, total_price_fmt, align="R")
    y += 24

    # ── QR code
    qr = qrcode.QRCode(version=None, box_size=4, border=1)
    qr.add_data(MAPS_URL)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#8A4B33", back_color="#FAF6F0")
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    QR_SIZE = 38
    QR_X = _PW - _MR - QR_SIZE
    pdf.image(buf, x=QR_X, y=y, w=QR_SIZE, h=QR_SIZE)

    pdf.set_text_color(*_LABEL)
    pdf.set_font("Helvetica", "", 6)
    pdf.set_xy(QR_X, y + QR_SIZE + 1)
    pdf.cell(QR_SIZE, 4, "Scan for Google Maps", align="C")

    # ── Hotel info block
    pdf.set_text_color(*_CHARCOAL)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(_ML, y + 3)
    pdf.cell(80, 5, "Asal Boutique Hotel")

    pdf.set_text_color(*_LABEL)
    pdf.set_font("Helvetica", "", 7)
    for i, line in enumerate([
        "Samarkand St 86, Bukhara",
        "+998 78 333 22 00",
        "@asal_boutique_hotel",
        "Check-in 14:00  |  Check-out 12:00",
    ]):
        pdf.set_xy(_ML, y + 10 + i * 7)
        pdf.cell(80, 5, line)

    # ── Footer
    pdf.set_fill_color(*_TERRA)
    pdf.rect(0, 278, _PW, 19, "F")
    pdf.set_text_color(*_WHITE)
    pdf.set_font("Times", "B", 10)
    pdf.set_xy(0, 284)
    pdf.cell(_PW, 6, "Thank you for choosing Asal Boutique Hotel", align="C")
    pdf.set_font("Helvetica", "", 7)
    pdf.set_xy(0, 291)
    pdf.cell(_PW, 5, "We look forward to welcoming you in Bukhara", align="C")

    return bytes(pdf.output())
