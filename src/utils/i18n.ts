import { getLanguage } from './config.js';
import { Language } from '../types/index.js';

type TranslationKey = 
  | 'welcome'
  | 'selectLanguage'
  | 'languageSet'
  | 'configCurrent'
  | 'configSetting'
  | 'configValue'
  | 'configApiUrl'
  | 'configToken'
  | 'configAgentToken'
  | 'configLanguage'
  | 'signUpSuccess'
  | 'signInSuccess'
  | 'signOutSuccess'
  | 'agentTokenSuccess'
  | 'tokenRefreshSuccess'
  | 'agentCreated'
  | 'agentUpdated'
  | 'agentDeleted'
  | 'agentList'
  | 'agentName'
  | 'agentFullName'
  | 'agentVisibility'
  | 'noAgents'
  | 'friendRequestSent'
  | 'friendRequestAccepted'
  | 'friendRequestRejected'
  | 'friendRemoved'
  | 'friend'
  | 'friendName'
  | 'noFriends'
  | 'noPendingRequests'
  | 'messageSent'
  | 'noMessages'
  | 'noConversations'
  | 'searchResults'
  | 'noSearchResults'
  | 'chatStarted'
  | 'chatEnded'
  | 'typeMessage'
  | 'quitChat'
  | 'errorRequired'
  | 'errorAuth'
  | 'errorNetwork'
  | 'errorUnknown';

const translations: Record<Language, Record<TranslationKey, string>> = {
  zh: {
    welcome: '欢迎使用 Magic IM CLI!',
    selectLanguage: '请选择语言 / Select language:',
    languageSet: '语言已设置为中文',
    configCurrent: '当前配置:',
    configSetting: '配置项',
    configValue: '值',
    configApiUrl: 'API 地址',
    configToken: '用户令牌',
    configAgentToken: 'Agent 令牌',
    configLanguage: '语言',
    signUpSuccess: '注册成功!',
    signInSuccess: '登录成功!',
    signOutSuccess: '登出成功!',
    agentTokenSuccess: 'Agent 令牌生成成功!',
    tokenRefreshSuccess: '令牌刷新成功!',
    agentCreated: 'Agent 创建成功!',
    agentUpdated: 'Agent 更新成功!',
    agentDeleted: 'Agent 删除成功!',
    agentList: 'Agent 列表:',
    agentName: '名称',
    agentFullName: '全名',
    agentVisibility: '可见性',
    noAgents: '暂无 Agent',
    friendRequestSent: '好友请求已发送!',
    friendRequestAccepted: '已接受好友请求!',
    friendRequestRejected: '已拒绝好友请求!',
    friendRemoved: '好友已删除!',
    friend: '好友',
    friendName: '名称',
    noFriends: '暂无好友',
    noPendingRequests: '暂无待处理的好友请求',
    messageSent: '消息已发送!',
    noMessages: '暂无消息',
    noConversations: '暂无会话',
    searchResults: '搜索结果:',
    noSearchResults: '未找到匹配的 Agent',
    chatStarted: '聊天已开始，输入 /quit 或 /q 退出',
    chatEnded: '聊天已结束',
    typeMessage: '输入消息:',
    quitChat: '退出聊天',
    errorRequired: '缺少必填项',
    errorAuth: '认证失败，请先登录',
    errorNetwork: '网络错误',
    errorUnknown: '未知错误',
  },
  en: {
    welcome: 'Welcome to Magic IM CLI!',
    selectLanguage: 'Select language / 请选择语言:',
    languageSet: 'Language set to English',
    configCurrent: 'Current configuration:',
    configSetting: 'Setting',
    configValue: 'Value',
    configApiUrl: 'API URL',
    configToken: 'User Token',
    configAgentToken: 'Agent Token',
    configLanguage: 'Language',
    signUpSuccess: 'Sign up successful!',
    signInSuccess: 'Sign in successful!',
    signOutSuccess: 'Sign out successful!',
    agentTokenSuccess: 'Agent token generated successfully!',
    tokenRefreshSuccess: 'Token refreshed successfully!',
    agentCreated: 'Agent created successfully!',
    agentUpdated: 'Agent updated successfully!',
    agentDeleted: 'Agent deleted successfully!',
    agentList: 'Agent list:',
    agentName: 'Name',
    agentFullName: 'Full Name',
    agentVisibility: 'Visibility',
    noAgents: 'No agents found',
    friendRequestSent: 'Friend request sent!',
    friendRequestAccepted: 'Friend request accepted!',
    friendRequestRejected: 'Friend request rejected!',
    friendRemoved: 'Friend removed!',
    friend: 'Friend',
    friendName: 'Name',
    noFriends: 'No friends found',
    noPendingRequests: 'No pending friend requests',
    messageSent: 'Message sent!',
    noMessages: 'No messages',
    noConversations: 'No conversations',
    searchResults: 'Search results:',
    noSearchResults: 'No agents found matching your search',
    chatStarted: 'Chat started, type /quit or /q to exit',
    chatEnded: 'Chat ended',
    typeMessage: 'You:',
    quitChat: 'Quit chat',
    errorRequired: 'Missing required field',
    errorAuth: 'Authentication failed, please sign in first',
    errorNetwork: 'Network error',
    errorUnknown: 'Unknown error',
  },
};

export const t = (key: TranslationKey, ...args: string[]): string => {
  const lang = getLanguage();
  let text = translations[lang][key] || translations['en'][key];
  // Simple interpolation
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  return text;
};

export const getAvailableLanguages = (): { value: Language; label: string }[] => [
  { value: 'zh', label: '中文 (Chinese)' },
  { value: 'en', label: 'English' },
];

