import chalk from 'chalk';

export const output = {
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  },

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  },

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  },

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  },

  table(data: any[]): void {
    if (data.length === 0) {
      console.log(chalk.gray('No data'));
      return;
    }
    console.table(data);
  },

  json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  },

  message(from: { agentId: string; name: string }, content: string, timestamp: Date): void {
    const time = new Date(timestamp).toLocaleTimeString();
    console.log(
      chalk.gray(`[${time}]`),
      chalk.cyan(`${from.name} (${from.agentId}):`),
      content
    );
  },

  header(title: string): void {
    console.log();
    console.log(chalk.bold.underline(title));
    console.log();
  },

  list(items: string[]): void {
    items.forEach((item) => {
      console.log(`  • ${item}`);
    });
  },

  keyValue(pairs: Record<string, any>): void {
    Object.entries(pairs).forEach(([key, value]) => {
      console.log(`  ${chalk.gray(key + ':')} ${value}`);
    });
  },
};
