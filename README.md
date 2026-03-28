# Netlify Reverse Proxy

部署后你可以通过如下格式访问目标站点：

- `https://你的域名/github.com`
- `https://你的域名/github.com/owner/repo`

默认会将目标地址按 `https://` 协议转发。

## 本地开发

```bash
npm i -g netlify-cli
netlify dev
```

## 部署

```bash
netlify deploy
netlify deploy --prod
```

## 使用说明

1. 访问 `https://你的域名/github.com`，即代理到 `https://github.com`。
2. 访问 `https://你的域名/github.com/search?q=vercel`，查询参数会透传。
3. 如果你需要显式协议，也支持：`https://你的域名/https://example.com/path`。

## 注意事项

- 部分网站有严格的防爬虫、IP 或 Header 校验，可能拒绝代理请求。
- `Set-Cookie` 和跨域行为由上游网站决定，不保证所有登录态可用。
- 请确保你的代理用途符合上游网站条款与当地法律法规。

## Netlify 配置说明

- [netlify.toml](netlify.toml) 将所有路径重写到 `/.netlify/functions/proxy/:splat`。
- 例如访问 `https://你的域名/github.com` 会落到函数并转发到 `https://github.com`。
