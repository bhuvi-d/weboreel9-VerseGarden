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

export const FLOWER_THEME: Record<FlowerType, { color: string; secondary: string; glow: string; species: FlowerSpecies }> = {
  hope:      { color: '#FFD700', secondary: '#FFF176', glow: '#FFD70066', species: 'lily' },        // Bright Gold
  love:      { color: '#FF3B6B', secondary: '#FFB3C6', glow: '#FF3B6B66', species: 'rose' },        // Hot Pink / Rose Red
  peace:     { color: '#00BFFF', secondary: '#B3ECFF', glow: '#00BFFF66', species: 'wildflower' },  // Sky Blue
  dream:     { color: '#BF5FFF', secondary: '#E8B3FF', glow: '#BF5FFF66', species: 'sunflower' },   // Bright Purple
  gratitude: { color: '#FF7A00', secondary: '#FFD199', glow: '#FF7A0066', species: 'lavender' },    // Vivid Orange
  courage:   { color: '#FF4500', secondary: '#FFB399', glow: '#FF450066', species: 'tulip' },       // Fire Red-Orange
  default:   { color: '#39D353', secondary: '#B3F5C4', glow: '#39D35366', species: 'daisy' },       // Bright Green
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
    scale: Math.random() * 0.6 + 1.2,
    rotation: Math.random() * 40 - 20,
    delay: Math.random() * 0.2
  };
}
