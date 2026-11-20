// assistant-proxy rp-1105e — 让内置 pi Agent（assistant 服务）在非本机也能用
// 上游把服务绑死在 127.0.0.1:<随机端口> 并把该地址直接返回给浏览器（comfyui-gateway/src/assistant.js:70/90），
// 远程浏览器只会把它解析成自己的回环 → Failed to fetch。这里做两件事：
//   1) ensure/status 的返回体里，url 改写为网关下的同源代理路径，原地址保留在 directUrl
//   2) /api/assistant/proxy/* 原始流转发到本机服务（含 SSE 与带 body 的 POST）
// 注意：attachAssistantProxy 必须挂在 express.json() 之前，否则 req 流已被消费，
// 转发会抛 "Response body object should not be disturbed or locked"（表现为 assistant_proxy_upstream_failed）。
export function assistantProxyBase(config) {
    const base = String((config && config.publicBaseUrl) || "").replace(/\/+$/, "");
    return base ? `${base}/api/assistant/proxy` : "";
}

export function withAssistantProxyUrl(config, payload) {
    const base = assistantProxyBase(config);
    if (!base || !payload || !payload.url) return payload;
    return { ...payload, directUrl: payload.url, url: base };
}

export function attachAssistantProxy(app, assistant, config) {
    app.use("/api/assistant/proxy", async (req, res) => {
        try {
            if (!assistant.running) {
                const ensured = await assistant.ensure({});
                if (!ensured.ok) {
                    res.status(503).json({ ok: false, error: ensured.error || "assistant_unavailable" });
                    return;
                }
            }
            const target = String(assistant.url || "");
            if (!target) {
                res.status(503).json({ ok: false, error: "assistant_url_missing" });
                return;
            }
            const sub = req.originalUrl.replace(/^\/api\/assistant\/proxy/, "") || "/";
            const headers = {};
            for (const [k, v] of Object.entries(req.headers)) {
                const kk = k.toLowerCase();
                if (kk === "host" || kk === "connection" || kk === "keep-alive" || kk === "transfer-encoding" || kk === "content-length") continue;
                headers[k] = v;
            }
            const upstream = await fetch(target + sub, {
                method: req.method,
                headers,
                body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
                duplex: "half",
                signal: AbortSignal.timeout(30 * 60 * 1000),
            });
            res.status(upstream.status);
            for (const [k, v] of upstream.headers) {
                const kk = k.toLowerCase();
                if (kk === "content-encoding" || kk === "transfer-encoding" || kk === "content-length") continue;
                res.setHeader(k, v);
            }
            if (upstream.body) {
                const { Readable } = await import("node:stream");
                Readable.fromWeb(upstream.body).pipe(res);
            } else {
                res.end();
            }
        } catch (error) {
            if (!res.headersSent) {
                res.status(502).json({ ok: false, error: "assistant_proxy_upstream_failed", message: String((error && error.message) || error) });
            } else {
                res.destroy();
            }
        }
    });
}
