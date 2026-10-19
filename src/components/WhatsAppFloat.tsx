import { garage } from "@/config/garage";
import type { Locale } from "@/i18n/config";
import { getStrings, type Strings } from "@/i18n/strings";
import { whatsappUrl } from "@/lib/whatsapp";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function WhatsAppFloat({ t }: { locale: Locale; t: Strings }) {
  const text = getStrings(garage.messageLocale).message.general;
  return (
    <a
      href={whatsappUrl(garage.whatsapp, text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.floating.label}
      title={t.floating.label}
      className="fixed bottom-5 end-5 z-40 grid size-13 place-items-center rounded-full border border-line-strong bg-ink-800/90 text-snow shadow-[0_10px_40px_-10px_rgba(0,0,0,.8)] backdrop-blur transition-colors hover:bg-ink-700"
      data-event="whatsapp_click"
    >
      <WhatsAppIcon className="size-6" />
    </a>
  );
}
