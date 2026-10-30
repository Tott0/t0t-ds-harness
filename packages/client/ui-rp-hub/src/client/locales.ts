/**
 * `rpHub` namespace dictionaries: the sidebar row label, the panel landing copy,
 * and the index states. English is the source of truth; Chinese keeps the key
 * set identical.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'rpHub'

/** English dictionary (the key-set source of truth). */
export const en = {
  'panel': 'RP Hub',
  'page.title': 'RP Hub',
  'page.subtitle': 'Roleplay stories',
  'index.loading': 'Loading stories…',
  'index.error': 'Could not load the story index.',
  'index.retry': 'Retry',
  'index.empty.title': 'No stories yet',
  'index.empty.body': 'Story folders appear here once the data channel reads them from disk.',
  'index.updated': 'Updated {date}',
  'index.sample': 'Sample data — slice 2 proves the data channel; the real index reads story folders next.',
} as const

/** Key domain of the RP Hub namespace. */
export type RpHubLocaleKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** RP Hub panel copy. */
    'rpHub': RpHubLocaleKey
  }
}

/** Chinese dictionary, checked against the English keys. */
export const zh: Record<RpHubLocaleKey, string> = {
  'panel': 'RP 中心',
  'page.title': 'RP 中心',
  'page.subtitle': '角色扮演故事',
  'index.loading': '正在加载故事…',
  'index.error': '无法加载故事索引。',
  'index.retry': '重试',
  'index.empty.title': '还没有故事',
  'index.empty.body': '数据通道读取磁盘后，故事文件夹会出现在这里。',
  'index.updated': '更新于 {date}',
  'index.sample': '示例数据——切片 2 用于验证数据通道；正式索引将在下一步读取故事文件夹。',
}
