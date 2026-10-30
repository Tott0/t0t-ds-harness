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
  'index.empty.body': 'Add a folder with a story.json under the data directory, then reopen this panel.',
  'index.updated': 'Updated {date}',
  'index.open': 'Open {title}',
  'reader.back': 'All stories',
  'reader.loading': 'Loading story…',
  'reader.error': 'Could not load this story.',
  'reader.empty': 'This story has no turns yet.',
  'reader.turnCount': '{count} turns',
  'reader.user': 'You',
  'reader.response': 'Response',
  'composer.placeholder': 'Write the next turn… (Ctrl+Enter to add)',
  'composer.add': 'Add turn',
  'composer.sending': 'Adding…',
  'composer.error': 'Could not add the turn.',
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
  'index.empty.body': '在数据目录下添加一个含 story.json 的文件夹，然后重新打开此面板。',
  'index.updated': '更新于 {date}',
  'index.open': '打开 {title}',
  'reader.back': '全部故事',
  'reader.loading': '正在加载故事…',
  'reader.error': '无法加载此故事。',
  'reader.empty': '这个故事还没有回合。',
  'reader.turnCount': '{count} 个回合',
  'reader.user': '你',
  'reader.response': '回应',
  'composer.placeholder': '写下一个回合…（Ctrl+Enter 添加）',
  'composer.add': '添加回合',
  'composer.sending': '正在添加…',
  'composer.error': '无法添加该回合。',
}
