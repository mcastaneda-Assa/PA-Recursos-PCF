# Referencia Rápida - pcf-msg

## Compilación Rápida
```bash
cd ~/Desktop/pcf-msg
npm install
npm run build
```

## Nomenclaturas Clave

| Elemento | Valor |
|----------|-------|
| **Namespace** | `MSGViewer` |
| **Constructor** | `Base64MSGViewer` |
| **Carpeta Control** | `Base64MSGViewer/` |
| **Clase CSS Prefix** | `.msg-` |
| **Blob Type** | `application/vnd.ms-outlook` |

## Propiedades del Control

```xml
<property name="fileName" 
  display-name-key="Nombre del Archivo" 
  of-type="SingleLine.Text" />

<property name="base64Content" 
  display-name-key="Contenido Base64" 
  of-type="Multiple" />
```

## Métodos de la Clase Principal

```typescript
class Base64MSGViewer {
  // Métodos públicos
  public init()           // Inicialización
  public updateView()     // Actualizar vista
  public getOutputs()     // Retornar outputs
  public destroy()        // Limpieza
  
  // Métodos privados clave
  private _buildUI()      // Construir interfaz
  private _loadMSG()      // Cargar archivo
  private _downloadFile() // Descargar
  private _printFile()    // Imprimir
}
```

## Estructura CSS

```
.msg-viewer-container      ← Contenedor principal
  ├─ .msg-toolbar         ← Barra de herramientas
  │  ├─ .msg-toolbar-left
  │  └─ .msg-toolbar-right
  ├─ .msg-button          ← Botones de acción
  └─ .msg-viewer-wrapper  ← Área de contenido
     ├─ .msg-iframe       ← iframe de renderizado
     └─ .msg-empty-state  ← Estado vacío/error
```

## Estados del Control

1. **Empty State**: `base64Content` está vacío
2. **Loaded State**: Archivo renderizado en iframe
3. **Error State**: Error en decodificación

## Breakpoints Responsivos

- **Desktop**: Sin restricciones
- **Tablet**: `< 768px` - Toolbar en dos filas
- **Mobile**: `< 480px` - Botones a ancho completo

## Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `Base64MSGViewer/index.ts` | Lógica principal |
| `Base64MSGViewer/ControlManifest.Input.xml` | Definición del control |
| `Base64MSGViewer/css/Base64MSGViewer.css` | Estilos responsivos |
| `package.json` | Dependencias y scripts |
| `tsconfig.json` | Config TypeScript |
| `.eslintrc.json` | Rules de linting |

## Scripts npm

```bash
npm run build       # Compilar
npm run clean       # Limpiar outputs
npm start          # Servidor dev
npm start:watch    # Modo watch
npm run lint       # Validar código
npm run lint:fix   # Arreglar automáticamente
npm run rebuild    # Limpiar + compilar
npm run refreshTypes # Actualizar tipos de PCF
```

## Iconos Disponibles

- `download`: Ícono de descarga
- `print`: Ícono de impresión
- `newTab`: Ícono de nueva pestaña
- `emptyDoc`: Ícono de documento vacío

## Integración en Power Apps

1. Compilar: `npm run build`
2. Empaquetar: Usar PAC CLI
3. Importar en solución
4. Agregar a formulario
5. Configurar propiedades

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Error npm | `npm install` |
| Errores TypeScript | `npm run refreshTypes` |
| Errores ESLint | `npm run lint:fix` |
| Build falla | `npm run clean && npm run rebuild` |

## Características Responsivas

- ✅ Mobile-first design
- ✅ Dark mode support (prefers-color-scheme)
- ✅ Print styles
- ✅ Touch-friendly buttons
- ✅ Flexible toolbar

## Compatibilidad

- Power Apps Model-driven Apps
- Power Apps Portal
- Todos los navegadores modernos
- Mobile browsers
