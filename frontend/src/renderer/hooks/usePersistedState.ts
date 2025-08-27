import { useState, useEffect } from 'react'

/**
 * 自定义Hook，用于创建持久化到localStorage的状态
 * @param key localStorage中存储的键名
 * @param defaultValue 默认值
 * @returns 状态值和设置状态的函数
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue !== null) {
        return JSON.parse(storedValue)
      }
      return defaultValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (error) {
      console.warn(`Error saving to localStorage key "${key}":`, error)
    }
  }, [key, state])

  return [state, setState] as const
}

/**
 * 清除指定的持久化状态
 * @param key localStorage中存储的键名
 */
export function clearPersistedState(key: string) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Error clearing localStorage key "${key}":`, error)
  }
}

export interface SearchResultData {
  repositories: any[];
  searchType: 'trending' | 'basic' | 'enhanced' | 'recommendation';
  timestamp: number;
  query?: string;
  filters?: any;
}

/**
 * 检查数据是否在有效期内（30分钟）
 */
export function isDataValid(timestamp: number): boolean {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000; // 30分钟
  return now - timestamp < thirtyMinutes;
}

/**
 * 保存搜索结果数据
 */
export function saveSearchResults(key: string, data: SearchResultData): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Error saving search results to localStorage key "${key}":`, error);
  }
}

/**
 * 获取搜索结果数据，并检查有效期
 */
export function getSearchResults(key: string): SearchResultData | null {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      const data = JSON.parse(storedValue) as SearchResultData;
      if (isDataValid(data.timestamp)) {
        return data;
      } else {
        // 数据已过期，清除它
        localStorage.removeItem(key);
      }
    }
    return null;
  } catch (error) {
    console.warn(`Error reading search results from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * 获取所有GitHub相关的持久化状态键名
 */
export const GITHUB_STORAGE_KEYS = {
  SEARCH_QUERY: 'github-search-query',
  FILTERS: 'github-filters',
  SHOW_FILTERS: 'github-show-filters',
  SEARCH_RESULTS: 'github-search-results',
  SEARCH_TYPE: 'github-search-type'
} as const
