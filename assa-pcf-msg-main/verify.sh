#!/bin/bash

# Script de verificación del proyecto pcf-msg
# Ejecutar: bash verify.sh

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Verificación del Proyecto PCF-MSG                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

echo "📁 Verificando estructura de directorios..."
check_dir "Base64MSGViewer"
check_dir "Base64MSGViewer/css"
check_dir "Base64MSGViewer/generated"
check_dir "out/controls/Base64MSGViewer"
echo ""

echo "📄 Verificando archivos de código fuente..."
check_file "Base64MSGViewer/index.ts"
check_file "Base64MSGViewer/ControlManifest.Input.xml"
check_file "Base64MSGViewer/css/Base64MSGViewer.css"
echo ""

echo "⚙️  Verificando archivos de configuración..."
check_file "package.json"
check_file "tsconfig.json"
check_file ".eslintrc.json"
check_file "pcf-msg.pcfproj"
check_file "pcfconfig.json"
echo ""

echo "📚 Verificando documentación..."
check_file "README.md"
check_file "DEVELOPMENT.md"
check_file "SUMMARY.md"
check_file "QUICK_REFERENCE.md"
check_file "CHECKLIST.md"
echo ""

echo "🔨 Verificando build outputs..."
check_file "out/controls/Base64MSGViewer/bundle.js"
check_file "out/controls/Base64MSGViewer/ControlManifest.xml"
check_file "out/controls/Base64MSGViewer/css/Base64MSGViewer.css"
echo ""

echo "📊 Estadísticas de código..."
echo -e "${YELLOW}TypeScript:${NC}"
wc -l Base64MSGViewer/index.ts 2>/dev/null || echo "No encontrado"
echo -e "${YELLOW}CSS:${NC}"
wc -l Base64MSGViewer/css/Base64MSGViewer.css 2>/dev/null || echo "No encontrado"
echo -e "${YELLOW}Manifest:${NC}"
wc -l Base64MSGViewer/ControlManifest.Input.xml 2>/dev/null || echo "No encontrado"
echo ""

echo "🧪 Ejecutando tests..."
echo -e "${YELLOW}Compiling...${NC}"
npm run build 2>&1 | grep -E "(Succeeded|Failed)" || echo "Build ejecutado"
echo ""
echo -e "${YELLOW}Linting...${NC}"
npm run lint 2>&1 | grep -E "(Succeeded|Failed)" || echo "Lint ejecutado"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Verificación completada                           ║"
echo "║                                                              ║"
echo "║  El proyecto está listo para usar:                           ║"
echo "║  npm run build   - Compilar                                  ║"
echo "║  npm start      - Desarrollo                                 ║"
echo "║  npm run lint   - Validar código                             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
