#!/usr/bin/env bash
# init.sh — Oráculo del arnés SDD para Next.js + TS + Tailwind.
# Sale en verde (0) solo si el repo está en estado válido para trabajar.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

PM=""
if command -v pnpm >/dev/null 2>&1; then PM="pnpm"
elif command -v yarn >/dev/null 2>&1; then PM="yarn"
elif command -v npm >/dev/null 2>&1; then PM="npm"
else fail "No se encontró pnpm/yarn/npm en el PATH"
fi

run_script() {
  local script="$1"
  case "$PM" in
    pnpm) pnpm "$script" ;;
    yarn) yarn "$script" ;;
    npm)  npm run "$script" ;;
  esac
}

echo "── Harness SDD (Next.js): verificación ──"
echo "Gestor de paquetes detectado: $PM"

# 1. feature_list.json
[[ -f feature_list.json ]] || fail "feature_list.json no existe"
if command -v jq >/dev/null 2>&1; then
  jq empty feature_list.json >/dev/null 2>&1 || fail "feature_list.json no es JSON válido"
  ok "feature_list.json válido"
else
  warn "jq no instalado; saltando validación estricta"
fi

# 2. Una sola feature in_progress
if command -v jq >/dev/null 2>&1; then
  IN_PROGRESS=$(jq '[.features[] | select(.status == "in_progress")] | length' feature_list.json)
  (( IN_PROGRESS > 1 )) && fail "Hay $IN_PROGRESS features in_progress. Solo se permite UNA."
  ok "Features in_progress: $IN_PROGRESS (máx: 1)"
fi

# 3. Specs presentes para features SDD no-pending
if command -v jq >/dev/null 2>&1; then
  MISSING=0
  while IFS=$'\t' read -r name status sdd; do
    if [[ "$sdd" == "true" && "$status" != "pending" ]]; then
      for f in requirements.md design.md tasks.md; do
        if [[ ! -f "specs/$name/$f" ]]; then
          warn "Feature '$name' ($status, sdd:true) sin specs/$name/$f"
          MISSING=$((MISSING+1))
        fi
      done
    fi
  done < <(jq -r '.features[] | [.name, .status, (.sdd|tostring)] | @tsv' feature_list.json)
  (( MISSING > 0 )) && fail "Faltan $MISSING archivos de spec."
  ok "Specs presentes para features no-pending con sdd:true"
fi

# 4. Directorios obligatorios
for d in specs progress docs .opencode/agents src; do
  [[ -d "$d" ]] || fail "Falta directorio: $d"
done
ok "Directorios obligatorios presentes"

# 5. progress sentinels
[[ -f progress/current.md ]] || { echo "# Sesión activa" > progress/current.md; warn "Creado progress/current.md"; }
[[ -f progress/history.md ]] || { echo "# Bitácora (append-only)" > progress/history.md; warn "Creado progress/history.md"; }
ok "progress/{current,history}.md presentes"

# 6. package.json
[[ -f package.json ]] || fail "package.json no existe"

# 7. node_modules — instalar si falta
if [[ ! -d node_modules ]]; then
  warn "node_modules ausente; ejecutando '$PM install'..."
  case "$PM" in
    pnpm) pnpm install --frozen-lockfile 2>/dev/null || pnpm install ;;
    yarn) yarn install --frozen-lockfile 2>/dev/null || yarn install ;;
    npm)  npm ci 2>/dev/null || npm install ;;
  esac
fi
ok "Dependencias instaladas"

# 8. Pipeline: lint → typecheck → test → build
echo "── lint ──"
run_script lint || fail "lint falló"
ok "lint OK"

echo "── typecheck ──"
run_script typecheck || fail "typecheck falló"
ok "typecheck OK"

echo "── tests (vitest) ──"
TEST_OUTPUT=""
TEST_STATUS=0
case "$PM" in
  pnpm) TEST_OUTPUT=$(pnpm test -- --run 2>&1) || TEST_STATUS=$? ;;
  yarn) TEST_OUTPUT=$(yarn test --run 2>&1) || TEST_STATUS=$? ;;
  npm)  TEST_OUTPUT=$(npm test -- --run 2>&1) || TEST_STATUS=$? ;;
esac
printf "%s\n" "$TEST_OUTPUT"
if [[ $TEST_STATUS -ne 0 ]]; then
  if grep -q "No test files found" <<< "$TEST_OUTPUT"; then
    warn "No hay tests todavía; se permite durante bootstrap"
  else
    fail "tests fallaron"
  fi
fi
ok "tests OK"

echo "── build (next) ──"
run_script build || fail "build falló"
ok "build OK"

echo
echo -e "${GREEN}── Arnés OK. Abre AGENTS.md y arranca opencode. ──${NC}"
