// Renders a shareable workout-recap graphic to a PNG blob via the Canvas 2D
// API. No image library dependency — the layout is simple enough to draw
// directly, and this only ever runs on share/download, not on page load.

export interface ShareImageAccessory {
  name: string;
  setsCompleted: number;
  reps: string;
}

export interface ShareImageParams {
  liftName: string;
  waveLabel?: string;
  heroLabel: string;
  heroValue: number;
  unit: string;
  tonnage: number;
  accessories: ShareImageAccessory[];
}

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawShareImage(ctx: CanvasRenderingContext2D, params: ShareImageParams) {
  const { liftName, waveLabel, heroLabel, heroValue, unit, tonnage, accessories } = params;
  const margin = 80;

  // Page surface
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Wordmark
  ctx.fillStyle = '#6b7280';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('IRONFORM', margin, 110);

  // Lift name + wave/phase
  ctx.fillStyle = '#111827';
  ctx.font = `700 60px ${FONT}`;
  ctx.fillText(liftName, margin, 210);
  if (waveLabel) {
    ctx.fillStyle = '#4b5563';
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(waveLabel, margin, 258);
  }

  // Chalk Blue hero block
  const blockY = 330;
  const blockH = 560;
  ctx.fillStyle = '#2563eb';
  roundRectPath(ctx, margin, blockY, WIDTH - margin * 2, blockH, 32);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(heroLabel.toUpperCase(), margin + 48, blockY + 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 200px ${FONT}`;
  const heroText = `${heroValue}`;
  ctx.fillText(heroText, margin + 48, blockY + 320);
  const heroWidth = ctx.measureText(heroText).width;

  ctx.font = `600 48px ${FONT}`;
  ctx.fillText(unit, margin + 48 + heroWidth + 20, blockY + 320);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(`${tonnage.toLocaleString()} ${unit} tonnage`, margin + 48, blockY + blockH - 56);

  // Accessories footer list — name plus sets/reps actually completed, capped
  // to what fits above the wordmark footer with a "+N more" overflow line.
  if (accessories.length > 0) {
    const listTop = blockY + blockH + 60;
    const maxBottom = HEIGHT - 130;
    const lineHeight = 44;
    const maxLines = Math.max(1, Math.floor((maxBottom - listTop) / lineHeight));
    const shown = accessories.slice(0, maxLines - (accessories.length > maxLines ? 1 : 0));

    ctx.fillStyle = '#6b7280';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('ACCESSORIES', margin, listTop);

    ctx.font = `500 30px ${FONT}`;
    shown.forEach((accessory, i) => {
      const y = listTop + 44 + i * lineHeight;
      ctx.fillStyle = '#374151';
      ctx.fillText(accessory.name, margin, y);
      ctx.fillStyle = '#9ca3af';
      const detail = `${accessory.setsCompleted}${accessory.setsCompleted === 1 ? ' set' : ' sets'}${accessory.reps ? ` × ${accessory.reps} reps` : ''}`;
      const detailWidth = ctx.measureText(detail).width;
      ctx.fillText(detail, WIDTH - margin - detailWidth, y);
    });

    if (accessories.length > shown.length) {
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`+ ${accessories.length - shown.length} more`, margin, listTop + 44 + shown.length * lineHeight);
    }
  }

  ctx.fillStyle = '#9ca3af';
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText('Juggernaut wave-periodization training', margin, HEIGHT - 60);
}

export async function buildShareImageBlob(params: ShareImageParams): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawShareImage(ctx, params);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}
