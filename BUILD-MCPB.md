# Building the `.mcpb` Bundle

This repo ships an MCPB (MCP Bundle) for one-click install into Claude Desktop. The bundle is **not** committed; it's a build artifact regenerated on demand from the same `dist/` that goes to npm.

## Prerequisites

1. Node.js 18+ and npm.
2. The MCPB CLI installed globally:

   ```bash
   npm install -g @anthropic-ai/mcpb
   ```

   This installs the `mcpb` binary. Verify with `mcpb --version` (>= 2.1.x).

## Build

From the repo root:

```bash
# 1. Compile TypeScript -> dist/
npm run build

# 2. Stage a clean build directory with production-only node_modules.
#    (Packing the repo node_modules ships devDeps; we don't want that.)
BUILD_DIR="$(mktemp -d)/warpweb-mcpb-build"
mkdir -p "$BUILD_DIR"
cp manifest.json icon.png package.json package-lock.json README.md LICENSE .mcpbignore "$BUILD_DIR/"
cp -R dist "$BUILD_DIR/"

# 3. Install only production deps in the staging dir.
(cd "$BUILD_DIR" && npm install --omit=dev --ignore-scripts)

# 4. Pack to .mcpb (zip with manifest validation).
mkdir -p build
mcpb pack "$BUILD_DIR" "build/warpweb-$(node -p "require('./package.json').version").mcpb"

# 5. (Optional) Inspect the resulting bundle.
mcpb info "build/warpweb-$(node -p "require('./package.json').version").mcpb"
mcpb validate "$BUILD_DIR/manifest.json"
```

The output bundle lands in `build/warpweb-<version>.mcpb` (gitignored).

## Smoke-test the bundle

```bash
# Unpack into a scratch dir and run the server with a placeholder key.
SCRATCH="$(mktemp -d)/mcpb-verify"
mkdir -p "$SCRATCH"
mcpb unpack build/warpweb-*.mcpb "$SCRATCH"
( cd "$SCRATCH" && WARPWEB_API_KEY=wwk_test node dist/index.js < /dev/null ) &
sleep 1; kill $! 2>/dev/null
# Expect:
#   warpweb-mcp v0.1.0 starting up...
#     API base: https://api.warpweb.ai/v1
#     Tools registered. Ready on stdio.
```

For a deeper smoke test (verifies the 10 tools register over MCP):

```bash
cat <<'EOF' > /tmp/mcp-init.jsonl
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF
( cd "$SCRATCH" && (cat /tmp/mcp-init.jsonl; sleep 1) | WARPWEB_API_KEY=wwk_test node dist/index.js 2>/dev/null )
```

Expect a JSON response with `serverInfo.name = "warpweb"` and a `tools/list` result containing all 10 tools.

## Install locally in Claude Desktop

Double-click the `.mcpb` file in Finder. Claude Desktop opens an install dialog, prompts for the `WARPWEB_API_KEY` (sensitive), and offers an optional `WARPWEB_API_URL` override.

## Bumping the version

The MCPB version is read from `manifest.json` (kept in sync with `package.json`). When releasing a new version:

1. Bump `package.json` `version`.
2. Bump `manifest.json` `version` to match.
3. Rebuild per the steps above.

## Submission to Anthropic's Desktop Extension directory

The form lives at <https://clau.de/desktop-extention-submission>. Upload the built `.mcpb` and fill in the metadata fields (most copy directly from `manifest.json`).
