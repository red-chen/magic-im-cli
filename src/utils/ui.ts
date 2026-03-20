import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import Table from 'cli-table3';
import { getLanguage } from './config.js';
import { t } from './i18n.js';

// Gradient presets
const magicGradient = gradient(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
const successGradient = gradient(['#00b894', '#00cec9']);
const errorGradient = gradient(['#ff7675', '#d63031']);
const warningGradient = gradient(['#fdcb6e', '#e17055']);
const infoGradient = gradient(['#74b9ff', '#0984e3']);

// Text styling
export const styles = {
  title: (text: string) => magicGradient(figlet.textSync(text, { font: 'Small' })),
  subtitle: (text: string) => chalk.bold.cyan(text),
  success: (text: string) => successGradient('✔ ' + text),
  error: (text: string) => errorGradient('✖ ' + text),
  warning: (text: string) => warningGradient('⚠ ' + text),
  info: (text: string) => infoGradient('ℹ ' + text),
  dim: (text: string) => chalk.gray(text),
  bold: (text: string) => chalk.bold(text),
  italic: (text: string) => chalk.italic(text),
  code: (text: string) => chalk.bgBlack.white(` ${text} `),
  link: (text: string) => chalk.underline.blue(text),
};

// Box styling
export const createBox = (content: string, options?: any) => {
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    ...options,
  });
};

export const createSuccessBox = (content: string) => {
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green',
    backgroundColor: '#0f380f',
  });
};

export const createErrorBox = (content: string) => {
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red',
    backgroundColor: '#380f0f',
  });
};

export const createInfoBox = (content: string) => {
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
  });
};

// Welcome banner
export const showWelcomeBanner = () => {
  const title = styles.title('Magic IM');
  const subtitle = styles.subtitle('AI Agent Era Instant Messaging CLI');
  
  console.log('\n' + title);
  console.log(subtitle);
  console.log(styles.dim('━'.repeat(60)) + '\n');
};

// Language selection UI
export const showLanguagePrompt = () => {
  const isZh = getLanguage() === 'zh';
  
  const content = isZh 
    ? `${styles.bold('🌐 请选择语言')}\n\n  ${chalk.cyan('›')} 中文 (Chinese)\n  ${chalk.gray('›')} English`
    : `${styles.bold('🌐 Select Language')}\n\n  ${chalk.gray('›')} 中文 (Chinese)\n  ${chalk.cyan('›')} English`;
  
  console.log(createBox(content, { 
    borderColor: 'yellow',
    title: isZh ? '首次运行' : 'First Run',
    titleAlignment: 'center',
  }));
};

// Table creation
export const createConfigTable = (config: {
  apiUrl: string;
  token?: string;
  agentToken?: string;
  language?: string;
}) => {
  const table = new Table({
    head: [t('configSetting'), t('configValue')],
    style: { head: ['cyan'] },
    colWidths: [20, 40],
  });

  table.push(
    [t('configApiUrl'), chalk.blue(config.apiUrl)],
    [t('configToken'), config.token ? chalk.green('***') : chalk.gray('not set')],
    [t('configAgentToken'), config.agentToken ? chalk.green('***') : chalk.gray('not set')],
    [t('configLanguage'), config.language || 'en']
  );

  return table.toString();
};

export const createAgentTable = (agents: Array<{
  id: string;
  name: string;
  full_name: string;
  visibility: string;
}>) => {
  if (agents.length === 0) {
    return chalk.gray(t('noAgents'));
  }

  const table = new Table({
    head: ['ID', t('agentName'), t('agentFullName'), t('agentVisibility')],
    style: { head: ['cyan'] },
    colWidths: [36, 15, 25, 12],
  });

  agents.forEach(agent => {
    const visibilityColor = {
      'PUBLIC': chalk.green,
      'SEMI_PUBLIC': chalk.yellow,
      'FRIENDS_ONLY': chalk.blue,
      'PRIVATE': chalk.red,
    }[agent.visibility] || chalk.white;

    table.push([
      chalk.gray(agent.id.slice(0, 8) + '...'),
      agent.name,
      agent.full_name,
      visibilityColor(agent.visibility),
    ]);
  });

  return table.toString();
};

export const createFriendTable = (friends: Array<{
  id: string;
  friend_full_name: string;
  friend_name: string;
}>) => {
  if (friends.length === 0) {
    return chalk.gray(t('noFriends'));
  }

  const table = new Table({
    head: ['ID', t('friend'), t('friendName')],
    style: { head: ['green'] },
    colWidths: [36, 25, 15],
  });

  friends.forEach(friend => {
    table.push([
      chalk.gray(friend.id.slice(0, 8) + '...'),
      chalk.cyan(friend.friend_full_name),
      friend.friend_name,
    ]);
  });

  return table.toString();
};

// Spinner with custom styling
export const createSpinner = (text: string) => {
  // Dynamic import for ora
  return import('ora').then(oraModule => {
    const ora = oraModule.default;
    return ora({
      text: chalk.cyan(text),
      spinner: 'dots',
      color: 'cyan',
    });
  });
};

// Progress bar
export const showProgress = (current: number, total: number, label?: string) => {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = Math.round((current / total) * 100);
  
  console.log(`${label ? label + ' ' : ''}${bar} ${chalk.bold(percent)}%`);
};

// Divider
export const divider = () => {
  console.log(chalk.gray('─'.repeat(60)));
};

// Section header
export const sectionHeader = (title: string) => {
  console.log('\n' + chalk.bold.bgCyan.black(` ${title} `));
  divider();
};
