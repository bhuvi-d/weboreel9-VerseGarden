export type FlowerSpecies = 'tulip' | 'lily' | 'daisy' | 'lavender' | 'sunflower' | 'rose' | 'wildflower';
export type FlowerType = 'hope' | 'love' | 'peace' | 'dream' | 'gratitude' | 'courage' | 'default';

export interface FlowerInstance {
  id: string;
  text: string;
  type: FlowerType;
  species: FlowerSpecies;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  delay: number;
}

export const FLOWER_THEME: Record<FlowerType, { color: string; secondary: string; species: FlowerSpecies }> = {
  hope: { color: '#94a187', secondary: '#fdfaf6', species: 'lily' },      // Moss/Linen
  love: { color: '#d99a9a', secondary: '#fff5f5', species: 'rose' },      // Muted Coral
  peace: { color: '#c88d67', secondary: '#fdfaf6', species: 'wildflower' }, // Burnt Sienna/Linen
  dream: { color: '#e6ba8c', secondary: '#fffbf0', species: 'sunflower' },  // Soft Gold
  gratitude: { color: '#a5a58d', secondary: '#f5f5f0', species: 'lavender' }, // Olive Drab
  courage: { color: '#8d7b68', secondary: '#f4ede6', species: 'tulip' },    // Bark/Sand
  default: { color: '#b5a190', secondary: '#f8f4f1', species: 'daisy' }     // Muted Taupe
};

export function getFlowerType(text: string): FlowerType {
  const lower = text.toLowerCase();
  if (lower.includes('hope') || lower.includes('believe') || lower.includes('future')) return 'hope';
  if (lower.includes('love') || lower.includes('worthy') || lower.includes('heart')) return 'love';
  if (lower.includes('peace') || lower.includes('rest') || lower.includes('calm')) return 'peace';
  if (lower.includes('dream') || lower.includes('wish') || lower.includes('higher') || lower.includes('fly')) return 'dream';
  if (lower.includes('thank') || lower.includes('grateful') || lower.includes('bless') || lower.includes('life')) return 'gratitude';
  if (lower.includes('courage') || lower.includes('strong') || lower.includes('brave') || lower.includes('try')) return 'courage';
  return 'default';
}

export function generateFlower(text: string): FlowerInstance {
  const type = getFlowerType(text);
  return {
    id: Math.random().toString(36).substr(2, 9),
    text,
    type,
    species: FLOWER_THEME[type].species,
    x: Math.random() * 80 + 10,
    y: Math.random() * 60 + 20,
    scale: Math.random() * 0.5 + 1.2,
    rotation: Math.random() * 40 - 20,
    delay: Math.random() * 0.3
  };
}
