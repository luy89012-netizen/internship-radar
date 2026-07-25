/**
 * 岗位方向分类（category）白名单
 * - 前端筛选和后端归类都用这个清单，改这里就够
 */
export const CATEGORIES = [
  { key: 'business', label: '商业化 / 客户运营', color: '#5c7f4f' },
  { key: 'brand', label: '品牌 / 营销', color: '#c99871' },
  { key: 'product', label: '产品', color: '#5978a8' },
  { key: 'operations', label: '运营', color: '#7d5c9e' },
  { key: 'data', label: '数据分析 / BI', color: '#c9757e' },
  { key: 'other', label: '其他', color: '#8a8378' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export function getCategoryLabel(key: string | null | undefined): string {
  if (!key) return '未分类';
  const cat = CATEGORIES.find(c => c.key === key);
  return cat?.label || key;
}

export function getCategoryColor(key: string | null | undefined): string {
  if (!key) return '#8a8378';
  const cat = CATEGORIES.find(c => c.key === key);
  return cat?.color || '#8a8378';
}

/**
 * 数据来源
 */
export const SOURCES = [
  { key: 'official', label: '官网校招', icon: '🏢' },
  { key: 'xhs_note', label: '小红书笔记', icon: '📕' },
  { key: 'manual', label: '同学提交', icon: '👥' },
] as const;

export function getSourceLabel(key: string): string {
  const s = SOURCES.find(s => s.key === key);
  return s?.label || key;
}

export function getSourceIcon(key: string): string {
  const s = SOURCES.find(s => s.key === key);
  return s?.icon || '📄';
}

/**
 * 城市白名单（筛选下拉用）
 */
export const CITIES = ['北京', '上海', '杭州', '深圳', '广州', '成都', '远程', '其他'] as const;
