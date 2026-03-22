// ─── Spinner ────────────────────────────────────────────────────────────────
// Simple ora-compatible spinner using process.stdout + interval

export function spinner(text: string): () => void {
  let i = 0;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  process.stdout.write('\x1b[?25l'); // hide cursor
  process.stdout.write(`${frames[0]} ${text}`);
  const id = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]} ${text}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[K\x1b[?25h'); // clear line + show cursor
  };
}
