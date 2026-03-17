/**
 * 颜色工具：根据掌握度生成渐变色
 */

function hexToHSL(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * 根据掌握度 (0~1) 和章节基础色生成渐变色
 * 0% → 近白色（s=10, l=95）
 * 100% → 章节原始色
 */
export function masteryToColor(mastery, baseHex) {
  const base = hexToHSL(baseHex);
  const s = 10 + mastery * (base.s - 10);
  const l = 95 - mastery * (95 - base.l);
  return `hsl(${Math.round(base.h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/** 未测试知识点的颜色 */
export const NOT_TESTED_COLOR = '#e0e0e0';
export const NOT_TESTED_BORDER = '#ccc';

/** 掌握度转节点大小（教师端） */
export function masteryToSize(mastery, isLeaf) {
  if (isLeaf) {
    return 5 + mastery * 9; // 5~14
  }
  return 8 + mastery * 6; // 8~14
}
