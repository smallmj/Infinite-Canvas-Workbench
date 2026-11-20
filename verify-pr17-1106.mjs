// verify-pr17-1106.mjs — 代码级验证 v0.24.12 对 issue #16 / PR #17 的修复
// 模拟：网关绑 0.0.0.0、无显式 PUBLIC_BASE_URL，远程(ZT IP)与本机两种请求来源
import { loadConfig } from "./comfyui-gateway/src/config.js";
import { requestBaseUrl, absoluteTaskUrl } from "./comfyui-gateway/src/public-url.js";

process.env.ALLOW_REMOTE = "1";
delete process.env.PUBLIC_BASE_URL;

const cfg = loadConfig({ host: "0.0.0.0", port: 8190 });
const remote = { headers: { host: "10.44.152.1:8190" }, protocol: "http" };
const local = { headers: { host: "127.0.0.1:8190" }, protocol: "http" };

const results = [];
function check(name, got, want) {
  const ok = got === want;
  results.push(ok);
  console.log((ok ? "PASS" : "FAIL") + " | " + name + " | got=" + got + (ok ? "" : " want=" + want));
}

check("cfg.publicBaseUrl(legacy field)", cfg.publicBaseUrl, "http://0.0.0.0:8190");
check("remote(ZT) request base", requestBaseUrl(cfg, remote), "http://10.44.152.1:8190");
check("local request base", requestBaseUrl(cfg, local), "http://127.0.0.1:8190");
check("relative /files path rebased (remote)", absoluteTaskUrl(cfg, remote, "/files/task_x.mp4"), "http://10.44.152.1:8190/files/task_x.mp4");
check("old 0.0.0.0 absolute url rebased (remote)", absoluteTaskUrl(cfg, remote, "http://0.0.0.0:8190/files/task_x.mp4"), "http://10.44.152.1:8190/files/task_x.mp4");
check("relative /files path rebased (local)", absoluteTaskUrl(cfg, local, "/files/task_x.mp4"), "http://127.0.0.1:8190/files/task_x.mp4");

// 显式 PUBLIC_BASE_URL 仍被尊重（我们 start-local.bat 注入的场景）
process.env.PUBLIC_BASE_URL = "http://10.44.152.1:8190";
const cfg2 = loadConfig({ host: "0.0.0.0", port: 8190 });
check("explicit PUBLIC_BASE_URL kept", cfg2.publicBaseUrl + "|" + cfg2.publicBaseUrlExplicit, "http://10.44.152.1:8190|true");
check("explicit + remote req base", requestBaseUrl(cfg2, remote), "http://10.44.152.1:8190");

// 显式 PUBLIC_BASE_URL + 本机回环请求：0.0.0.0 绑定下回环会落配置回退（上游新逻辑残留缺口），显式值兜底
check("explicit + local loopback req base", requestBaseUrl(cfg2, local), "http://10.44.152.1:8190");
check("explicit + loopback rel path", absoluteTaskUrl(cfg2, local, "/files/task_x.mp4"), "http://10.44.152.1:8190/files/task_x.mp4");

// 反代转发头优先
const proxied = { headers: { host: "internal:8190", "x-forwarded-host": "canvas.example.com", "x-forwarded-proto": "https" }, protocol: "http" };
check("reverse-proxy forwarded host wins", requestBaseUrl(cfg2, proxied), "https://canvas.example.com");

console.log(results.every(Boolean) ? "PR17_VERIFY_ALL_PASS" : "PR17_VERIFY_FAILED");
process.exit(results.every(Boolean) ? 0 : 1);
