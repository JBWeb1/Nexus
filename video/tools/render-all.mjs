// Renders every video to out/<id>.mp4. Set CHROME to a Chromium/headless-shell binary if Remotion can't download one.
import { execFileSync } from 'node:child_process';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['proof', 'secure', 'price', 'paid', 'receipts', 'switch', 'accountant', 'pitch', 'leads', 'promo'];
const browser = process.env.CHROME ? [`--browser-executable=${process.env.CHROME}`] : [];
for (const id of ids) {
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', id, `out/${id}.mp4`, '--codec=h264', '--crf=18', '--audio-bitrate=192k', ...browser], { stdio: 'inherit' });
}
