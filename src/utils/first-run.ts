import inquirer from 'inquirer';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { getLanguage, setLanguage, getConfigFilePath } from './config.js';
import { getAvailableLanguages } from './i18n.js';
import { Language } from '../types/index.js';
import { styles, createBox, createSuccessBox, showWelcomeBanner } from './ui.js';

export const isFirstRun = (): boolean => {
  // Check if config file exists and has language set
  const configPath = getConfigFilePath();
  return !existsSync(configPath);
};

export const promptForLanguage = async (): Promise<Language> => {
  // Show beautiful welcome banner
  showWelcomeBanner();
  
  const languages = getAvailableLanguages();
  
  // Show language selection box
  const content = `
${styles.bold('🌐 请选择语言 / Select Language')}

${chalk.gray('This will be your default language for the CLI.')}
${chalk.gray('您可以在任何时候使用 `magic-im config language` 更改语言。')}
`;
  
  console.log(createBox(content, { 
    borderColor: 'yellow',
    title: 'First Run / 首次运行',
    titleAlignment: 'center',
  }));
  
  const answer = await inquirer.prompt([{
    type: 'list',
    name: 'language',
    message: chalk.cyan('➜'),
    choices: languages.map(lang => ({
      name: lang.value === 'en' 
        ? `  🇺🇸  ${lang.label}` 
        : `  🇨🇳  ${lang.label}`,
      value: lang.value,
    })),
    default: 'en',
    prefix: '',
  }]);

  const selectedLang = answer.language as Language;
  setLanguage(selectedLang);
  
  // Show confirmation in a beautiful box
  const confirmationContent = selectedLang === 'zh' 
    ? `${styles.success('语言已设置为中文')}\n\n${styles.dim('Settings saved to:')}\n${getConfigFilePath()}`
    : `${styles.success('Language set to English')}\n\n${styles.dim('Settings saved to:')}\n${getConfigFilePath()}`;
  
  console.log(createSuccessBox(confirmationContent));
  
  return selectedLang;
};

export const checkFirstRun = async (): Promise<void> => {
  if (isFirstRun()) {
    await promptForLanguage();
  }
};
