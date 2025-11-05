## 开发说明

```shell
# workspace 目录
# workspace 有三个 package：
#   @auto-novel/crawler  @auto-novel/server-crawler @auto-novel/web
pnpm install # 安装依赖
pnpm build   # 编译所有 workspace

# 如果只开发 server-crawler
pnpm dev --filter @auto-novel/server-crawler
```
