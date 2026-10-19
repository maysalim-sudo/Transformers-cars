/** Builds a wa.me deep link. Nothing is sent until the visitor presses send inside WhatsApp. */
export function whatsappUrl(number: string, text: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
