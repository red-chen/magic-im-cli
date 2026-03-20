declare module 'gradient-string' {
  type Gradient = (text: string) => string;
  
  interface GradientOptions {
    interpolation?: 'hsv' | 'rgb' | 'hsl' | 'hsi' | 'lab' | 'lch' | 'lrgb';
    hsvSpin?: 'short' | 'long';
  }
  
  function gradient(colors: string[], options?: GradientOptions): Gradient;
  function gradient(colors: string[][]): Gradient;
  
  export default gradient;
  export { gradient };
}

declare module 'boxen' {
  interface Options {
    borderColor?: string;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    backgroundColor?: string;
    title?: string;
    titleAlignment?: 'left' | 'center' | 'right';
    textAlignment?: 'left' | 'center' | 'right';
    dimBorder?: boolean;
  }
  
  function boxen(text: string, options?: Options): string;
  
  export default boxen;
  export { boxen };
}

declare module 'cli-table3' {
  interface TableOptions {
    head?: string[];
    colWidths?: number[];
    rowHeights?: number[];
    colAligns?: ('left' | 'center' | 'right')[];
    rowAligns?: ('top' | 'center' | 'bottom')[];
    style?: {
      head?: string[];
      border?: string[];
      'padding-left'?: number;
      'padding-right'?: number;
      compact?: boolean;
    };
    chars?: Record<string, string>;
    wordWrap?: boolean;
    wrapOnWordBoundary?: boolean;
  }
  
  class Table {
    constructor(options?: TableOptions);
    push(...rows: any[]): void;
    toString(): string;
  }
  
  export default Table;
}

declare module 'figlet' {
  interface FigletOptions {
    font?: string;
    horizontalLayout?: 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
    verticalLayout?: 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
    width?: number;
    whitespaceBreak?: boolean;
  }
  
  function textSync(text: string, options?: FigletOptions): string;
  
  export { textSync };
  export default { textSync };
}
