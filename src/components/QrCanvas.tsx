import { forwardRef, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type QrCanvasProps = { value: string; size?: number; logoSrc?: string; dark?: string; light?: string; className?: string };

const QrCanvas = forwardRef<HTMLCanvasElement, QrCanvasProps>(function QrCanvas(
  { value, size = 320, logoSrc, dark = '#0c1f18', light = '#ffffff', className },
  ref,
) {
  const innerRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = innerRef.current;
    if (!canvas) return;
    let cancelled = false;
    QRCode.toCanvas(canvas, value, { width: size, margin: 1, errorCorrectionLevel: 'H', color: { dark, light } })
      .then(() => {
        // qrcode sets an inline width/height style matching `size`, which would
        // override our own CSS sizing classes since inline styles win on specificity.
        canvas.style.removeProperty('width');
        canvas.style.removeProperty('height');
        if (cancelled || !logoSrc) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          const logoSize = size * 0.2;
          const pad = logoSize * 0.18;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          ctx.fillStyle = light;
          roundRect(ctx, x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 12);
          ctx.fill();
          ctx.save();
          roundRect(ctx, x, y, logoSize, logoSize, 10);
          ctx.clip();
          ctx.drawImage(img, x, y, logoSize, logoSize);
          ctx.restore();
        };
        img.src = logoSrc;
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [value, size, logoSrc, dark, light]);

  return <canvas
    ref={(node) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }}
    width={size}
    height={size}
    className={className}
  />;
});

export default QrCanvas;
