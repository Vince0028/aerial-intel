import * as THREE from "three";
const textureCache = /* @__PURE__ */ new Map();
function drawIcon(ctx, category, color) {
  const cx = 32, cy = 32;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  switch (category) {
    case "combat": {
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, 6);
      ctx.lineTo(cx, 18);
      ctx.moveTo(cx, 46);
      ctx.lineTo(cx, 58);
      ctx.moveTo(6, cy);
      ctx.lineTo(18, cy);
      ctx.moveTo(46, cy);
      ctx.lineTo(58, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "unrest": {
      ctx.beginPath();
      ctx.moveTo(cx, 8);
      ctx.lineTo(56, 52);
      ctx.lineTo(8, 52);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, 24);
      ctx.lineTo(cx, 38);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 44, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "danger": {
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(54, 50);
      ctx.lineTo(10, 50);
      ctx.closePath();
      ctx.stroke();
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", cx, 36);
      break;
    }
    case "aviation": {
      ctx.beginPath();
      ctx.moveTo(cx, 8);
      ctx.lineTo(cx + 4, 22);
      ctx.lineTo(cx + 20, 30);
      ctx.lineTo(cx + 20, 34);
      ctx.lineTo(cx + 4, 30);
      ctx.lineTo(cx + 4, 42);
      ctx.lineTo(cx + 10, 48);
      ctx.lineTo(cx + 10, 52);
      ctx.lineTo(cx, 46);
      ctx.lineTo(cx - 10, 52);
      ctx.lineTo(cx - 10, 48);
      ctx.lineTo(cx - 4, 42);
      ctx.lineTo(cx - 4, 30);
      ctx.lineTo(cx - 20, 34);
      ctx.lineTo(cx - 20, 30);
      ctx.lineTo(cx - 4, 22);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "naval": {
      ctx.beginPath();
      ctx.arc(cx, 14, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, 48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, 50);
      ctx.lineTo(50, 50);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, 48, 14, 0, Math.PI);
      ctx.stroke();
      break;
    }
    case "satellite": {
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
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx - 6, 18, 6, -0.8, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 10, 14, 12, -0.6, 0.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "cyber": {
      ctx.beginPath();
      ctx.moveTo(cx, 22);
      ctx.lineTo(cx + 8, 52);
      ctx.lineTo(cx - 8, 52);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx, 22, 10, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 22, 10, Math.PI * 0.3, Math.PI * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(cx, 22, 18, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 22, 18, Math.PI * 0.3, Math.PI * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "nuclear": {
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const angle = i * 2 * Math.PI / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, angle - 0.4, angle + 0.4);
        ctx.lineTo(cx + Math.cos(angle + 0.4) * 10, cy + Math.sin(angle + 0.4) * 10);
        ctx.arc(cx, cy, 10, angle + 0.4, angle - 0.4, true);
        ctx.lineTo(cx + Math.cos(angle - 0.4) * 20, cy + Math.sin(angle - 0.4) * 20);
        ctx.fill();
      }
      break;
    }
    case "base": {
      ctx.beginPath();
      ctx.moveTo(cx, 8);
      ctx.lineTo(cx + 18, 16);
      ctx.lineTo(cx + 18, 32);
      ctx.quadraticCurveTo(cx + 18, 50, cx, 56);
      ctx.quadraticCurveTo(cx - 18, 50, cx - 18, 32);
      ctx.lineTo(cx - 18, 16);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 8, 32);
      ctx.lineTo(cx - 2, 40);
      ctx.lineTo(cx + 10, 22);
      ctx.stroke();
      break;
    }
    case "infrastructure": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(8, cy);
      ctx.lineTo(22, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(42, cy);
      ctx.lineTo(56, cy);
      ctx.stroke();
      ctx.strokeRect(22, cy - 8, 20, 16);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(28, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(36, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(12, cy + 14);
      ctx.quadraticCurveTo(22, cy + 8, 32, cy + 14);
      ctx.quadraticCurveTo(42, cy + 20, 52, cy + 14);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "datacenter": {
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 8, 32, 48);
      ctx.fillRect(20, 14, 24, 6);
      ctx.fillRect(20, 24, 24, 6);
      ctx.fillRect(20, 34, 24, 6);
      ctx.fillStyle = "#00FF00";
      ctx.beginPath();
      ctx.arc(40, 17, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(40, 27, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(40, 37, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx, 48, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 8, 52, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 8, 52, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 48);
      ctx.lineTo(cx - 8, 52);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, 48);
      ctx.lineTo(cx + 8, 52);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "oilsite": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, 6);
      ctx.lineTo(cx + 14, 40);
      ctx.lineTo(cx - 14, 40);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 7, 23);
      ctx.lineTo(cx + 7, 23);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 10, 32);
      ctx.lineTo(cx + 10, 32);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 18, 40);
      ctx.lineTo(cx + 18, 40);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, 46);
      ctx.quadraticCurveTo(cx + 6, 52, cx, 56);
      ctx.quadraticCurveTo(cx - 6, 52, cx, 46);
      ctx.fill();
      break;
    }
    case "seismic": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(8, cy);
      ctx.lineTo(18, cy);
      ctx.lineTo(22, cy - 14);
      ctx.lineTo(26, cy + 16);
      ctx.lineTo(30, cy - 18);
      ctx.lineTo(34, cy + 12);
      ctx.lineTo(38, cy - 6);
      ctx.lineTo(42, cy);
      ctx.lineTo(56, cy);
      ctx.stroke();
      break;
    }
    case "cve": {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 10, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 4);
      ctx.lineTo(cx - 20, cy - 10);
      ctx.moveTo(cx + 10, cy - 4);
      ctx.lineTo(cx + 20, cy - 10);
      ctx.moveTo(cx - 10, cy + 4);
      ctx.lineTo(cx - 20, cy + 4);
      ctx.moveTo(cx + 10, cy + 4);
      ctx.lineTo(cx + 20, cy + 4);
      ctx.moveTo(cx - 10, cy + 12);
      ctx.lineTo(cx - 20, cy + 18);
      ctx.moveTo(cx + 10, cy + 12);
      ctx.lineTo(cx + 20, cy + 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 18);
      ctx.lineTo(cx - 10, cy - 26);
      ctx.moveTo(cx + 4, cy - 18);
      ctx.lineTo(cx + 10, cy - 26);
      ctx.stroke();
      break;
    }
    case "weather": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 6, 22, 10, Math.PI, Math.PI * 1.85);
      ctx.arc(cx + 2, 16, 10, Math.PI * 1.2, Math.PI * 1.9);
      ctx.arc(cx + 12, 22, 8, Math.PI * 1.3, Math.PI * 0.3);
      ctx.lineTo(cx + 18, 28);
      ctx.lineTo(cx - 16, 28);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + 2, 30);
      ctx.lineTo(cx - 4, 42);
      ctx.lineTo(cx + 2, 40);
      ctx.lineTo(cx - 2, 54);
      ctx.lineTo(cx + 6, 40);
      ctx.lineTo(cx, 42);
      ctx.lineTo(cx + 6, 30);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "launch": {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 4);
      ctx.quadraticCurveTo(cx + 8, 14, cx + 8, 24);
      ctx.lineTo(cx - 8, 24);
      ctx.quadraticCurveTo(cx - 8, 14, cx, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 8, 24, 16, 20);
      ctx.beginPath();
      ctx.moveTo(cx - 8, 36);
      ctx.lineTo(cx - 16, 48);
      ctx.lineTo(cx - 8, 44);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 8, 36);
      ctx.lineTo(cx + 16, 48);
      ctx.lineTo(cx + 8, 44);
      ctx.fill();
      ctx.fillStyle = "#FF4500";
      ctx.beginPath();
      ctx.moveTo(cx - 5, 44);
      ctx.quadraticCurveTo(cx, 58, cx + 5, 44);
      ctx.fill();
      break;
    }
    case "ioda": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 22, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 15, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 8, -Math.PI * 0.65, -Math.PI * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12);
      ctx.lineTo(cx + 12, cy + 12);
      ctx.moveTo(cx + 12, cy - 12);
      ctx.lineTo(cx - 12, cy + 12);
      ctx.stroke();
      break;
    }
    case "ooni": {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(6, cy);
      ctx.quadraticCurveTo(cx, cy - 16, 58, cy);
      ctx.quadraticCurveTo(cx, cy + 16, 6, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 52);
      ctx.lineTo(54, 12);
      ctx.stroke();
      break;
    }
    case "threat": {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 6);
      ctx.lineTo(cx + 20, 14);
      ctx.lineTo(cx + 20, 32);
      ctx.quadraticCurveTo(cx + 20, 50, cx, 58);
      ctx.quadraticCurveTo(cx - 20, 50, cx - 20, 32);
      ctx.lineTo(cx - 20, 14);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, 38);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 46, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}
function hexToRgba(hex, alpha) {
  const clean = hex.startsWith("#") ? hex : "#000000";
  const r = parseInt(clean.slice(1, 3), 16) || 0;
  const g = parseInt(clean.slice(3, 5), 16) || 0;
  const b = parseInt(clean.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}
export function createClusterSprite(count, color, scale = 3.8) {
  const cacheKey = `cluster-${count}-${color}`;
  let material = textureCache.get(cacheKey);
  if (!material) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hexToRgba(color, 0.2);
    ctx.beginPath();
    ctx.arc(32, 32, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21);
      ctx.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    const fontSize = count >= 100 ? 13 : count >= 10 ? 16 : 20;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(count), 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    textureCache.set(cacheKey, material);
  }
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}
export function createCategorySprite(category, color, heading, scale = 3) {
  const cacheKey = `${category}-${color}-${heading ?? "none"}`;
  let material = textureCache.get(cacheKey);
  if (!material) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (category === "aviation" && heading != null) {
      ctx.translate(32, 32);
      ctx.rotate(heading * Math.PI / 180);
      ctx.translate(-32, -32);
    }
    drawIcon(ctx, category, color);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    if (category !== "aviation") {
      textureCache.set(cacheKey, material);
    }
  }
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}
