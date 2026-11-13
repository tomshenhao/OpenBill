# LAN development / 局域网开发

`npm run dev` and `npm start` bind to loopback. To deliberately allow trusted-LAN
development, add the server host(s) to ignored `.env.local`, then use `npm run dev:lan`:

```dotenv
# Replace this example with the server's actual LAN IP/hostname.
OPENBILL_DEV_ORIGINS=192.168.1.10
```

```sh
npm run dev:lan
```

Open `http://<server-LAN-IP>:3000/` or `/zh/electricity/` on the device. The host
must match the browser address, not the client device's IP. Comma-separated exact
hosts are supported. Do not include schemes, ports, paths, credentials, wildcards
or bind-all addresses. `127.0.0.1` remains allowed for local testing; Next.js also
allows localhost. Restart the dev server after changing configuration or server IP.
No firewall, router, public tunnel or production-host configuration is changed.

默认开发和静态预览只监听本机。局域网开发需在 `.env.local` 中填写服务器实际 IP／主机名，
运行 `npm run dev:lan`，再用其他设备访问该地址。填写的应是服务器地址，而不是手机或客户端的地址。
只允许明确主机名，修改 IP 或配置后重启，不自动更改防火墙、路由器或对公网开放。

## Findings and minimal changes / 原因及必要调整

With installed Next.js 16.4.6, binding the development server to `0.0.0.0` does
not automatically allow HMR origins using a numeric loopback/LAN IP. Reproduction
returned HTTP 200 HTML, but `/_next/hmr` handshakes were rejected as unauthorised;
the client did not initialise the calculator, and clicking submit caused a native
GET/navigation. No input values were transmitted in that reproduction because
the existing fields have no `name`; native navigation was still undesirable.

`next.config.ts` now applies `OPENBILL_DEV_ORIGINS` only in development and rejects
broad/malformed entries. No subnet wildcard, CORS exception or Server Action
origin exception is added. This follows the installed framework source/docs and
the official [allowedDevOrigins guide](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins).

The root layout now enforces `form-action 'none'` in development as well as
production. Hydrated forms continue to calculate with `preventDefault()` locally;
if JavaScript is delayed or unavailable, the browser blocks native form navigation.
No calculation or submission handler was changed. Production retains the exact
existing `connect-src 'none'`, `form-action 'none'` and other CSP directives.
No production `unsafe-eval`, WebSocket permission or external connection is added.
Development does not apply production's connection-blocking CSP: HMR/debugging
needs its framework connections, as the [official CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)
distinguishes. Use synthetic inputs in development/QA; production privacy checks
remain against the static build.

复现发现 HTML 正常返回，但 Next.js 拒绝了 IP 来源的 HMR 连接，客户端未正常初始化，表单回退到原生 GET 导航。
修复仅涉及明确的开发主机白名单及开发阶段的表单导航限制；不修改计算或提交逻辑，不放开通配符、CORS、
Server Actions 或生产 CSP。即使 JavaScript 尚未运行，也不能把表单作为普通网页请求提交。

## Regression checks / 回归验证

```sh
npm run check
npm run test:dev
npm run build
npm run test:e2e
```

`test:dev` starts/stops its own server on 3111, with one worker. Its default second
host is `127.0.0.2`, allowing portable checks without hardcoding a contributor's IP.
For an actual LAN-interface run in PowerShell:

```powershell
$env:OPENBILL_TEST_LAN_HOST = '<server-LAN-IP>'
npm run test:dev
Remove-Item Env:OPENBILL_TEST_LAN_HOST
```

The tests cover both languages, both forms and both origins, real HMR stylesheet
updates without reload/input loss, unlisted/opaque origin rejection, and blocked
native navigation when JavaScript cannot initialise. The HMR test temporarily
appends a CSS custom property and restores that exact addition in `finally`,
preserving concurrent edits. Run separately from a build or other source-editing
tests. Traces, screenshots and video are disabled; entered values are synthetic.

Production browser checks also confirm the strict CSP and JavaScript-disabled
form behaviour on all four routes, alongside the existing functionality/privacy
regressions. Config tests check explicit-host validation and production isolation.

回归覆盖中英文、两种表单、本机与局域网来源、真实 CSS 热更新、未授权来源拒绝，以及 JavaScript 禁用时
阻止原生提交。生产环境另验证 CSP 保持严格。所有输入为合成数据，测试结束关闭临时服务器。

## Verified results / 验证结果

- `npm run check`: passed, including lint, TypeScript, **194 unit tests** and all data checks.
- `npm run test:dev`: **4 passed** with the actual LAN interface and again with the portable default host.
- `npm run build`: passed; all four bilingual home/electricity routes exported.
- `npm run test:e2e`: **38 passed**, desktop/mobile Chromium, including strict production CSP and pre-initialisation form blocking.
- No calculation/submission handlers, dependencies, firewall rules or production CSP permissions changed. No commits, pushes or deployment.

The JavaScript-disabled tests explicitly observe the browser's CSP refusal and zero
requests. They avoid waiting for a rejected navigation to commit: Playwright's normal
navigation wait otherwise stalls even though the security policy has worked.

全部检查通过：194 项单元测试、4 项开发回归（分别验证真实局域网及默认地址）、38 项生产浏览器测试。
禁用 JavaScript 的用例明确检查 CSP 拒绝事件及零请求，并避免等待已被拒绝的导航成功完成。
未修改计算、提交处理、依赖、防火墙或生产 CSP 权限；未提交、推送或部署。
