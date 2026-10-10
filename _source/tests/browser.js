/* Launch options shared by every gate and tool here.

   The gates used to hard-code the Claude sandbox's Chromium path, which does
   not exist on anyone's own computer — so on a Mac or a PC every one of them
   died before running a single check. Now: CHROME_PATH if you set it, else
   the sandbox's build when it is there, else Playwright's own browser
   (install it once with `npx playwright install chromium`). */
const fs = require('fs');

const SANDBOX = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const exe = process.env.CHROME_PATH || (fs.existsSync(SANDBOX) ? SANDBOX : undefined);

module.exports = { executablePath: exe, args: ['--no-sandbox'] };
