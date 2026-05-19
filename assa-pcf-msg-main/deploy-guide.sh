#!/bin/bash

# Script para empaquetar y desplegar PCF-MSG a Power Apps
# =====================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Empaquetado de PCF-MSG para Power Apps             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Verificar que el proyecto esté compilado
echo -e "${YELLOW}1. Verificando compilación...${NC}"
if [ -f "out/controls/Base64MSGViewer/bundle.js" ]; then
    echo -e "${GREEN}✓${NC} Control compilado correctamente"
else
    echo -e "${RED}✗${NC} El control no está compilado"
    echo "Ejecuta: npm run build"
    exit 1
fi

# 2. Mostrar estructura del package
echo ""
echo -e "${YELLOW}2. Contenido del package a desplegar:${NC}"
ls -lh out/controls/Base64MSGViewer/

# 3. Información de despliegue
echo ""
echo -e "${YELLOW}3. Para desplegar a Power Apps:${NC}"
echo ""
echo "Opción A: Despliegue manual (Recomendado para desarrollo)"
echo "────────────────────────────────────────────────────────"
echo "1. Autenticarse en el entorno ASSA:"
echo "   npx @microsoft/power-apps-cli@latest auth create --username <tu_email>"
echo ""
echo "2. Hacer push del control:"
echo "   npx @microsoft/power-apps-cli@latest pcf push --publisher-prefix <publisher>"
echo ""
echo ""
echo "Opción B: Crear solución (Recomendado para producción)"
echo "────────────────────────────────────────────────────────"
echo "1. Ir a https://make.powerapps.com"
echo "2. Crear solución nueva"
echo "3. Agregar componente > Code component"
echo "4. Importar desde:"
echo "   $(pwd)/out/controls/Base64MSGViewer/"
echo ""
echo ""
echo -e "${YELLOW}ℹ Información del control:${NC}"
echo "  • Namespace:  MSGViewer"
echo "  • Componente: Base64MSGViewer"
echo "  • Versión:    1.0.0"
echo "  • Tamaño:     $(du -sh out/controls/Base64MSGViewer | cut -f1)"
echo ""

echo -e "${GREEN}✓${NC} Control listo para desplegar"
echo ""
