import { useRef } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { QRCodeCanvas } from 'qrcode.react';
import { useClientContext, C, S, F } from './ClientLayout';

export default function QRPage() {
  const { shop, customer, primaryColor } = useClientContext();
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const fullName = customer.first_name
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : customer.phone;

  const cardRef = customer.id.slice(0, 8).toUpperCase();

  // Payload QR encodant les infos nécessaires à l'identification en caisse
  const qrValue = JSON.stringify({
    shop_id: shop.id,
    customer_id: customer.id,
    phone: customer.phone,
  });

  const handleDownload = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `fidelys-qr-${shop.slug}-${cardRef}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Titre */}
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.3s ease-out both' }}>
        <h1 style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 22, color: C.textDark, marginBottom: 6, letterSpacing: '-0.5px' }}>
          Mon QR Code
        </h1>
        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, maxWidth: 260 }}>
          Présentez ce code en caisse pour être identifié rapidement.
        </p>
      </div>

      {/* Carte QR */}
      <div style={{
        background: C.card,
        borderRadius: 20,
        padding: '2rem 1.75rem',
        boxShadow: S.md,
        border: `1px solid ${C.border}`,
        width: '100%',
        maxWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        animation: 'fadeUp 0.35s 0.05s ease-out both',
      }}>
        {/* QR code canvas (download-ready) */}
        <div
          ref={qrContainerRef}
          style={{ padding: 16, background: C.bg, borderRadius: 16, border: `1px solid ${C.border}` }}
        >
          <QRCodeCanvas
            value={qrValue}
            size={200}
            level="M"
            fgColor={C.textDark}
            bgColor="transparent"
          />
        </div>

        {/* Identité */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 18, color: C.textDark, marginBottom: 4 }}>
            {fullName}
          </p>
          <p style={{ fontSize: 13, color: C.textMid }}>{customer.phone}</p>
        </div>

        {/* Solde */}
        <div style={{
          width: '100%',
          background: C.primaryPale,
          borderRadius: 12,
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${primaryColor}20`,
        }}>
          <p style={{ fontSize: 13, color: primaryColor, fontWeight: 500 }}>Solde</p>
          <p style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 20, color: primaryColor }}>
            {customer.total_points.toLocaleString()} pts
          </p>
        </div>

        {/* Bouton télécharger */}
        <button
          onClick={handleDownload}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0.75rem 1.25rem',
            background: primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: F.body,
            cursor: 'pointer',
            minHeight: 44,
            transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <DownloadSimple size={20} weight="bold" />
          Télécharger le QR
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: '1.125rem 1.25rem',
        width: '100%',
        border: `1px solid ${C.border}`,
        boxShadow: S.sm,
        animation: 'fadeUp 0.4s 0.1s ease-out both',
      }}>
        <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 14, color: C.textDark, marginBottom: '0.6rem' }}>
          Comment ça marche ?
        </p>
        {[
          'Présentez ce QR code au vendeur',
          'Il scanne votre code pour vous identifier',
          'Vos points sont crédités après votre achat',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 2 ? 6 : 0, alignItems: 'flex-start' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.primaryPale, color: primaryColor, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              {i + 1}
            </span>
            <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: C.textLight, textAlign: 'center' }}>
        {shop.name} · Carte #{cardRef}
      </p>
    </div>
  );
}
