import { createInterface } from 'readline';
import { existsSync } from 'fs';
import { getLanguage, setLanguage, getConfigFilePath } from './config.js';
import { getAvailableLanguages } from './i18n.js';
import { Language } from '../types/index.js';
import { styles, createBox, createSuccessBox, showWelcomeBanner } from './ui.js';

// Detect if running in non-interactive mode (CI, Agent, etc.)
export const isNonInteractive = (): boolean => {
  // Check for common CI/Agent environment variables
  if (process.env.CI || process.env.NON_INTERACTIVE || process.env.AGENT_MODE) {
    return true;
  }
  // Check if stdin is not a TTY
  if (!process.stdin.isTTY) {
    return true;
  }
  return false;
};

// Get default language from environment or use English
const getDefaultLanguageFromEnv = (): Language => {
  const envLang = process.env.MAGIC_IM_LANGUAGE;
  if (envLang === 'zh' || envLang === 'en') {
    return envLang;
  }
  return 'en';
};

export const isFirstRun = (): boolean => {
  // Check if config file exists and has language set
  const configPath = getConfigFilePath();
  return !existsSync(configPath);
};

export const promptForLanguage = async (): Promise<Language> => {
  // In non-interactive mode, use environment variable or default to English
  if (isNonInteractive()) {
    const defaultLang = getDefaultLanguageFromEnv();
    setLanguage(defaultLang);
    // Output simple message for Agent parsing
    console.log(JSON.stringify({ 
      event: 'language_set', 
      language: defaultLang,
      source: 'environment_variable',
      configPath: getConfigFilePath(),
    }));
    return defaultLang;
  }

  // Show beautiful welcome banner (interactive mode only)
  showWelcomeBanner();
  
  const languages = getAvailableLanguages();
  
  // Show language selection box
  const content = `
${styles.bold('🌐 请选择语言 / Select Language')}

${styles.dim('This will be your default language for the CLI.')}
${styles.dim('您可以在任何时候使用 `magic-im config language` 更改语言。')}
`;
  
  console.log(createBox(content, { 
    borderColor: 'yellow',
    title: 'First Run / 首次运行',
  }));

  // Show options
  languages.forEach((lang, i) => {
    const flag = lang.value === 'en' ? '🇺🇸' : '🇨🇳';
    process.stdout.write(`  ${styles.bold(String(i + 1))}. ${flag}  ${lang.label}\n`);
  });
  process.stdout.write('\n');

  const selectedLang = await new Promise<Language>((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(styles.info('Enter number (default: 1): '), (answer) => {
      rl.close();
      const idx = parseInt(answer.trim(), 10) - 1;
      const lang = languages[idx];
      resolve((lang?.value as Language) ?? 'en');
    });
  });

  setLanguage(selectedLang);
  
  // Show confirmation
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
