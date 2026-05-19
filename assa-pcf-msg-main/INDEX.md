# 📑 Índice del Proyecto PCF-MSG

## 🎯 Inicio Rápido

Para comenzar rápidamente con el proyecto:

```bash
cd ~/Desktop/pcf-msg
npm install
npm run build
```

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| **[README.md](README.md)** | Guía principal del proyecto |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Guía detallada de desarrollo |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Referencia rápida de comandos y nomenclatura |
| **[SUMMARY.md](SUMMARY.md)** | Resumen de implementación |
| **[CHECKLIST.md](CHECKLIST.md)** | Checklist de verificación del proyecto |
| **Este archivo** | Índice de documentación |

## 🗂️ Estructura del Proyecto

```
pcf-msg/
├── Base64MSGViewer/
│   ├── index.ts                      (257 líneas - Lógica principal)
│   ├── ControlManifest.Input.xml     (15 líneas - Definición del control)
│   ├── css/
│   │   └── Base64MSGViewer.css      (251 líneas - Estilos responsivos)
│   └── generated/
│       └── ManifestTypes.d.ts        (Tipos generados automáticamente)
│
├── out/
│   └── controls/Base64MSGViewer/     (Build compilado)
│
├── Configuración:
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── pcf-msg.pcfproj
│   └── pcfconfig.json
│
└── Documentación:
    ├── README.md
    ├── DEVELOPMENT.md
    ├── QUICK_REFERENCE.md
    ├── SUMMARY.md
    ├── CHECKLIST.md
    └── INDEX.md (este archivo)
```

## 🚀 Comandos Principales

### Desarrollo
```bash
npm start          # Iniciar servidor de desarrollo
npm start:watch    # Modo watch para cambios automáticos
```

### Build
```bash
npm run build      # Compilar el proyecto
npm run clean      # Limpiar outputs
npm run rebuild    # Limpiar + compilar
```

### Validación
```bash
npm run lint       # Ejecutar ESLint
npm run lint:fix   # Arreglar errores de linting automáticamente
```

### Mantenimiento
```bash
npm install              # Instalar dependencias
npm run refreshTypes     # Actualizar tipos de PCF
bash verify.sh          # Ejecutar verificación del proyecto
```

## 📋 Nomenclatura del Proyecto

| Elemento | Valor |
|----------|-------|
| **Namespace** | `MSGViewer` |
| **Constructor** | `Base64MSGViewer` |
| **Carpeta Principal** | `Base64MSGViewer/` |
| **CSS Prefix** | `.msg-` |
| **Tipo de Blob** | `application/vnd.ms-outlook` |
| **Versión** | 1.0.0 |

## 🎯 Características Principales

### ✅ Control Responsivo
- Desktop optimizado
- Tablet (<768px)
- Mobile (<480px)
- Dark mode support

### ✅ Funcionalidades
- Renderización de archivos .msg desde base64
- Descarga de archivos
- Impresión integrada
- Abrir en nueva pestaña
- Gestión de ciclo de vida completo

### ✅ Calidad de Código
- TypeScript strict mode
- ESLint validado
- Build sin errores
- Documentación completa

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Líneas TypeScript | 257 |
| Líneas CSS | 251 |
| Líneas Manifest | 15 |
| Total Fuente | 523 |
| Bundle Size | 11.1 KiB |

## 🔧 Configuración de Desarrollo

### TypeScript
- **Modo**: Strict
- **Target**: ES2020
- **Module**: ESNext

### ESLint
- **Parser**: @typescript-eslint/parser
- **Extends**: eslint:recommended, plugin:@typescript-eslint/recommended

### Build
- **Bundler**: Webpack
- **Compiler**: TypeScript
- **Output**: out/controls/Base64MSGViewer/

## 📝 Propiedades del Control

```xml
<!-- Nombre del archivo a mostrar -->
<property name="fileName" 
  display-name-key="Nombre del Archivo" 
  of-type="SingleLine.Text" />

<!-- Contenido del archivo en base64 -->
<property name="base64Content" 
  display-name-key="Contenido Base64" 
  of-type="Multiple" />
```

## 🔗 Métodos Principales

### Métodos Públicos
- `init()` - Inicialización del control
- `updateView()` - Actualizar vista con nuevos datos
- `getOutputs()` - Retornar outputs del control
- `destroy()` - Limpieza de recursos

### Métodos Privados
- `_buildUI()` - Construir interfaz
- `_loadMSG()` - Cargar archivo MSG
- `_downloadFile()` - Descargar archivo
- `_printFile()` - Imprimir contenido
- `_openInNewTab()` - Abrir en nueva ventana

## 🎨 Estilos CSS

Todos los estilos usan el prefijo `.msg-`:

- `.msg-viewer-container` - Contenedor principal
- `.msg-toolbar` - Barra de herramientas
- `.msg-button` - Botones de acción
- `.msg-iframe` - Frame de visualización
- `.msg-empty-state` - Estado vacío
- `.msg-viewer-wrapper` - Wrapper del visor

### Responsive Breakpoints
- **Mobile**: < 480px
- **Tablet**: < 768px
- **Desktop**: >= 768px

## 🧪 Verificación

Para verificar que todo está correcto, ejecutar:

```bash
bash verify.sh
```

Este script verifica:
- ✓ Estructura de directorios
- ✓ Archivos fuente
- ✓ Archivos de configuración
- ✓ Documentación
- ✓ Build outputs
- ✓ Compilación exitosa
- ✓ Linting exitoso

## 📦 Despliegue

Para preparar el proyecto para Power Apps:

1. Asegurar compilación exitosa:
   ```bash
   npm run build
   ```

2. Verificar archivos en:
   ```
   out/controls/Base64MSGViewer/
   ├── bundle.js
   ├── ControlManifest.xml
   └── css/Base64MSGViewer.css
   ```

3. Empaquetar con PAC CLI
4. Importar en Power Apps Solution
5. Agregar a formulario/página
6. Configurar propiedades

## 🔍 Troubleshooting

### Error: "Cannot find module"
```bash
npm install
```

### Error: "ESLint validation error"
```bash
npm run lint:fix
```

### Error: "Build failed"
```bash
npm run clean && npm run rebuild
```

### Error: "Manifest validation error"
```bash
npm run refreshTypes
```

## 📞 Notas Importantes

- **Sin Copiar/Pegar**: Todo generado con comandos oficiales
- **Nomenclatura**: Consistente con pcf-base64
- **Responsivo**: Optimizado para todos los dispositivos
- **Accesible**: Soporte para dark mode
- **Producción**: Listo para usar

## 🌟 Referencias

- [PCF Documentation](https://docs.microsoft.com/en-us/power-apps/developer/component-framework/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Webpack Documentation](https://webpack.js.org/)
- [ESLint Documentation](https://eslint.org/)

---

**Última actualización**: 6 de Marzo de 2026  
**Estado**: ✅ COMPLETADO Y FUNCIONAL  
**Versión**: 1.0.0

Para más información, consultar los documentos de referencia arriba listados.
