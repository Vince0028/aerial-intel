/**
 * GlobeSprites — creates Three.js Sprite objects for each intel category
 * These render IN the WebGL scene (not CSS overlays) so they never glide
 */
import * as THREE from 'three';
import type { LayerKey } from '@/data/tacticalData';

// Cache textures so we don't re-create them every frame
const textureCache = new Map<string, THREE.SpriteMaterial>();

function drawIcon(ctx: CanvasRenderingContext2D, category: LayerKey, color: string) {
    const cx = 32, cy = 32;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    switch (category) {
        case 'combat': {
            // Crosshair reticle
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, 6); ctx.lineTo(cx, 18);
            ctx.moveTo(cx, 46); ctx.lineTo(cx, 58);
            ctx.moveTo(6, cy); ctx.lineTo(18, cy);
            ctx.moveTo(46, cy); ctx.lineTo(58, cy);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'unrest': {
            // Warning triangle
            ctx.beginPath();
            ctx.moveTo(cx, 8);
            ctx.lineTo(56, 52);
            ctx.lineTo(8, 52);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, 24); ctx.lineTo(cx, 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, 44, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'danger': {
            // Double triangle warning
            ctx.beginPath();
            ctx.moveTo(cx, 10);
            ctx.lineTo(54, 50);
            ctx.lineTo(10, 50);
            ctx.closePath();
            ctx.stroke();
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', cx, 36);
            break;
        }
        case 'aviation': {
            // Plane silhouette (pointing up by default — rotated by heading)
            ctx.beginPath();
            ctx.moveTo(cx, 8);                // nose
            ctx.lineTo(cx + 4, 22);           // right fuselage
            ctx.lineTo(cx + 20, 30);          // right wing tip
            ctx.lineTo(cx + 20, 34);          // right wing bottom
            ctx.lineTo(cx + 4, 30);           // right wing join
            ctx.lineTo(cx + 4, 42);           // right tail start
            ctx.lineTo(cx + 10, 48);          // right tail tip
            ctx.lineTo(cx + 10, 52);          // right tail bottom
            ctx.lineTo(cx, 46);              // tail center
            ctx.lineTo(cx - 10, 52);          // left tail bottom
            ctx.lineTo(cx - 10, 48);          // left tail tip
            ctx.lineTo(cx - 4, 42);           // left tail start
            ctx.lineTo(cx - 4, 30);           // left wing join
            ctx.lineTo(cx - 20, 34);          // left wing bottom
            ctx.lineTo(cx - 20, 30);          // left wing tip
            ctx.lineTo(cx - 4, 22);           // left fuselage
            ctx.closePath();
            ctx.fill();
            break;
        }
        case 'naval': {
            // Anchor
            ctx.beginPath();
            ctx.arc(cx, 14, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, 20); ctx.lineTo(cx, 48);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(14, 50); ctx.lineTo(50, 50);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx, 48, 14, 0, Math.PI);
            ctx.stroke();
            break;
        }
        case 'satellite': {
            // Satellite dish
            ctx.beginPath();
            ctx.arc(cx, 28, 16, Math.PI * 1.2, Math.PI * 1.8);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx, 28);
            ctx.lineTo(cx + 14, 48);
            ctx.lineTo(cx - 4, 48);
            ctx.closePath();
            ctx.fill();
            // Signal waves
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(cx - 6, 18, 6, -0.8, 0.8); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx - 10, 14, 12, -0.6, 0.6); ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'cyber': {
            // Signal tower with waves
            ctx.beginPath();
            ctx.moveTo(cx, 22); ctx.lineTo(cx + 8, 52); ctx.lineTo(cx - 8, 52);
            ctx.closePath();
            ctx.fill();
            // Waves
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(cx, 22, 10, -Math.PI * 0.7, -Math.PI * 0.3); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, 22, 10, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(cx, 22, 18, -Math.PI * 0.7, -Math.PI * 0.3); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, 22, 18, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'nuclear': {
            // Radiation trefoil
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            // Three blades
            for (let i = 0; i < 3; i++) {
                const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, 20, angle - 0.4, angle + 0.4);
                ctx.lineTo(cx + Math.cos(angle + 0.4) * 10, cy + Math.sin(angle + 0.4) * 10);
                ctx.arc(cx, cy, 10, angle + 0.4, angle - 0.4, true);
                ctx.lineTo(cx + Math.cos(angle - 0.4) * 20, cy + Math.sin(angle - 0.4) * 20);
                ctx.fill();
            }
            break;
        }
        case 'base': {
            // Shield
            ctx.beginPath();
            ctx.moveTo(cx, 8);
            ctx.lineTo(cx + 18, 16);
            ctx.lineTo(cx + 18, 32);
            ctx.quadraticCurveTo(cx + 18, 50, cx, 56);
            ctx.quadraticCurveTo(cx - 18, 50, cx - 18, 32);
            ctx.lineTo(cx - 18, 16);
            ctx.closePath();
            ctx.stroke();
            // Checkmark
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 8, 32);
            ctx.lineTo(cx - 2, 40);
            ctx.lineTo(cx + 10, 22);
            ctx.stroke();
            break;
        }
    }
}

export function createCategorySprite(
    category: LayerKey,
    color: string,
    heading?: number,
    scale: number = 3,
): THREE.Sprite {
    // Check cache
    const cacheKey = `${category}-${color}-${heading ?? 'none'}`;
    let material = textureCache.get(cacheKey);

    if (!material) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        // For aviation, rotate canvas to heading
        if (category === 'aviation' && heading != null) {
            ctx.translate(32, 32);
            ctx.rotate((heading * Math.PI) / 180);
            ctx.translate(-32, -32);
        }

        drawIcon(ctx, category, color);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: true,
        });

        // Only cache static icons (not heading-specific planes)
        if (category !== 'aviation') {
            textureCache.set(cacheKey, material);
        }
    }

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    return sprite;
}
