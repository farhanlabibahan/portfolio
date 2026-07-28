import * as THREE from 'three';

/**
 * ============================================================================
 * CANVAS TEXTURES
 * ============================================================================
 * Real text inside the 3D scene — the code on the CRT, the neon on the window,
 * the titles on the book spines — is drawn to a 2D canvas and used as a
 * texture.
 *
 * Why not drei's <Text>: that needs a font file fetched at runtime, which is
 * another asset, another failure mode, and another thing to host. Canvas uses
 * fonts the browser already has, renders once, and costs nothing after that.
 * ============================================================================
 */

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Draw once into an offscreen canvas and wrap it as a texture. */
export function makeCanvasTexture(width: number, height: number, draw: DrawFn): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const DISPLAY = "'Space Grotesk', 'SF Pro Display', system-ui, sans-serif";

/** Soft outer glow, applied by drawing the same text several times. */
function glowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colour: string,
  blurs: number[] = [46, 24, 10]
) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  for (const b of blurs) {
    ctx.shadowBlur = b;
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ==========================================================================
   THE CRT — a blue screen of C++, like the reference
   ========================================================================== */
export function makeCodeTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 768, (ctx, w, h) => {
    // Classic IBM-blue screen.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0B36C4');
    g.addColorStop(1, '#0A2AA0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const lines: [string, string][] = [
      ['#C9D6FF', '#include<iostream>'],
      ['#C9D6FF', '#include<stdio.h>'],
      ['', ''],
      ['#FFFFFF', 'using namespace std;'],
      ['#FFFFFF', 'int main(){'],
      ['#9FE8B4', '    bool is_in_love = true;'],
      ['#9FE8B4', '    while(is_in_love){'],
      ['#FFE08A', '        cout << "CSE-DU" << "\\n";'],
      ['#9FE8B4', '    }'],
      ['#9FE8B4', '    return 0;'],
      ['#FFFFFF', '}'],
    ];

    ctx.font = `30px ${MONO}`;
    ctx.textBaseline = 'top';
    let y = 92;
    for (const [colour, text] of lines) {
      if (text) {
        ctx.fillStyle = colour;
        ctx.fillText(text, 78, y);
      }
      y += 46;
    }

    // Block cursor.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(78, y + 12, 18, 30);

    // Scanlines — subtle, the shader adds the rest.
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 2);
  });
}

/* ==========================================================================
   THE WINDOW — neon lettering behind rain-streaked glass
   ========================================================================== */
export function makeNeonTexture(name: string): THREE.CanvasTexture {
  return makeCanvasTexture(2048, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Big tube-neon wordmark.
    ctx.font = `700 330px ${DISPLAY}`;
    glowText(ctx, 'CSE', w * 0.32, h * 0.42, '#9FE9FF');

    ctx.font = `700 330px ${DISPLAY}`;
    glowText(ctx, 'DU', w * 0.70, h * 0.42, '#9FE9FF');

    // Name underneath, smaller and cooler.
    ctx.font = `500 74px ${MONO}`;
    glowText(ctx, name.toUpperCase(), w * 0.5, h * 0.74, '#7FD4FF', [26, 12]);

    ctx.font = `500 46px ${MONO}`;
    glowText(ctx, 'UNIVERSITY OF DHAKA', w * 0.5, h * 0.87, '#5FA8D8', [18, 8]);
  });
}

/* ==========================================================================
   BOOK SPINES
   ========================================================================== */
export function makeSpineTexture(title: string, bg: string, fg: string): THREE.CanvasTexture {
  return makeCanvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Cloth texture + a highlight along the top edge.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 220; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, w, 3);

    ctx.fillStyle = fg;
    ctx.font = `600 52px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, h / 2 + 2);
  });
}

/* ==========================================================================
   BACKLIT WALL FRAMES
   ========================================================================== */
export function makeFrameTexture(
  lines: string[],
  accent: string,
  sub?: string
): THREE.CanvasTexture {
  return makeCanvasTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#F2F5FA';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Crest-ish shield mark.
    ctx.save();
    ctx.translate(w / 2, h * 0.38);
    ctx.beginPath();
    ctx.moveTo(-96, -110);
    ctx.lineTo(96, -110);
    ctx.lineTo(96, 40);
    ctx.quadraticCurveTo(96, 128, 0, 158);
    ctx.quadraticCurveTo(-96, 128, -96, 40);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0E1726';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 46px ${DISPLAY}`;
    lines.forEach((l, i) => ctx.fillText(l, 0, -40 + i * 56));
    ctx.restore();

    if (sub) {
      ctx.fillStyle = '#16233A';
      ctx.font = `600 40px ${DISPLAY}`;
      ctx.fillText(sub, w / 2, h * 0.83);
    }
  });
}

/** The small framed picture on the desk. */
export function makeDeskFrameTexture(text: string, sub: string): THREE.CanvasTexture {
  return makeCanvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#FBF7EE';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#1B7F6B';
    ctx.font = `700 76px ${DISPLAY}`;
    ctx.fillText(text, w / 2, h * 0.42);

    ctx.fillStyle = '#C2410C';
    ctx.font = `600 44px ${DISPLAY}`;
    ctx.fillText(sub, w / 2, h * 0.68);
  });
}
