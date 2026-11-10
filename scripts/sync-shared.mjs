// Ortak parçaları her şablona dağıtır (kopyalar repoda durur: her şablon tek başına indirilip çalışabilsin).
//   1) _shared/src/shared → <şablon>/web/src/shared
//   2) _shared/base (tsconfig, vite.config, .env.example, .gitignore) → <şablon>/web
//   3) README'deki <!-- kurulum:başla --> … <!-- kurulum:bitir --> arası → scripts/setup-block.md
// Ortak bir şeyi değiştirince: node scripts/sync-shared.mjs
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const block = readFileSync(join(root, 'scripts/setup-block.md'), 'utf8').trim();
const templates = readdirSync(root).filter((d) => !d.startsWith('_') && !d.startsWith('.') && existsSync(join(root, d, 'template.json')));

for (const t of templates) {
  const dir = join(root, t);
  const meta = JSON.parse(readFileSync(join(dir, 'template.json'), 'utf8'));
  const web = join(dir, 'web');
  if (existsSync(web)) {
    cpSync(join(root, '_shared/src/shared'), join(web, 'src/shared'), { recursive: true });
    cpSync(join(root, '_shared/base'), web, { recursive: true });
    // Paylaşım parçaları yalnız isteyen şablonlara (template.json: "sharing": true)
    if (meta.sharing) cpSync(join(root, '_shared/sharing/people.tsx'), join(web, 'src/people.tsx'));
  }
  const readme = join(dir, 'README.md');
  if (existsSync(readme)) {
    const hasSeed = existsSync(join(dir, 'seed.json'));
    const setup = block
      .replaceAll('__ID__', t)
      .replaceAll('__ROLES__', meta.roles?.length ? `, rolleri (${meta.roles.join(', ')})` : '')
      .replaceAll('__SEED__', hasSeed ? ' ve örnek veriyi yazar (`--no-seed` ile yazmaz)' : '')
      .replaceAll('__SEEDCMD__', hasSeed ? '\n   npx @gridbasetr/cli seed                                       # örnek veri (isteğe bağlı)' : '');
    const text = readFileSync(readme, 'utf8');
    const next = text.replace(/<!-- kurulum:başla -->[\s\S]*?<!-- kurulum:bitir -->/, `<!-- kurulum:başla -->\n${setup}\n<!-- kurulum:bitir -->`);
    if (next !== text) writeFileSync(readme, next);
  }
  console.log(`✓ ${t}`);
}
