# Guía de Desarrollo - pcf-msg

## Resumen del Proyecto

**pcf-msg** es un control Power Apps Component Framework (PCF) responsivo que renderiza archivos `.msg` (Outlook) en formato base64 dentro de Power Apps. 

El proyecto sigue la misma nomenclatura y estructura que **pcf-base64** (visor PDF), pero está optimizado para correos electrónicos en formato `.msg`.

## Estructura del Proyecto

```
pcf-msg/
├── Base64MSGViewer/              # Carpeta principal del control
│   ├── ControlManifest.Input.xml # Definición del control
│   ├── index.ts                  # Lógica principal (class Base64MSGViewer)
│   ├── css/
│   │   └── Base64MSGViewer.css  # Estilos responsivos
│   └── generated/
│       └── ManifestTypes.d.ts    # Tipos generados automáticamente
├── out/                          # Salida compilada
│   └── controls/Base64MSGViewer/
│       ├── bundle.js
│       ├── ControlManifest.xml
│       └── css/Base64MSGViewer.css
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración TypeScript
├── .eslintrc.json               # Configuración ESLint
├── pcf-msg.pcfproj              # Archivo de proyecto MSBuild
└── README.md                     # Este archivo
```

## Nomenclatura Utilizada

- **Namespace**: `MSGViewer` (vs `PDFViewer` en pcf-base64)
- **Constructor**: `Base64MSGViewer` (vs `Base64PDFViewer` en pcf-base64)
- **Carpeta Control**: `Base64MSGViewer`
- **Clase CSS Prefix**: `.msg-` (vs `.pdf-` en pcf-base64)

## Propiedades del Control

### 1. **fileName**
- **Tipo**: SingleLine.Text
- **Uso**: Nombre del archivo `.msg` para mostrar en la UI
- **Ejemplo**: "mi_correo.msg"

### 2. **base64Content**
- **Tipo**: Multiple
- **Uso**: Contenido del archivo `.msg` codificado en base64
- **Nota**: Se recibe como cadena base64 y se decodifica internamente

## Funcionalidades Implementadas

### Toolbar Responsivo
- **Descargar**: Descarga el archivo `.msg`
- **Imprimir**: Abre el diálogo de impresión
- **Abrir en Nueva Pestaña**: Abre el archivo en una nueva ventana del navegador

### Estados
- **Empty State**: Muestra cuando no hay contenido base64
- **Error State**: Muestra cuando hay error al cargar
- **Loaded State**: Muestra el iframe con el contenido renderizado

### Responsivo
- Desktop: Layout completo con toolbar horizontal
- Tablet (< 768px): Toolbar en dos filas
- Mobile (< 480px): Botones a ancho completo, textos comprimidos
- Dark Mode: Soporte automático según preferencia del sistema

## Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Desarrollo con live reload
npm start
npm start:watch

# Compilar proyecto
npm run build

# Limpiar build
npm run clean

# Linting
npm run lint
npm run lint:fix

# Rebuild completo
npm run rebuild

# Actualizar tipos de PCF
npm run refreshTypes
```

## Clase Principal: Base64MSGViewer

### Métodos Públicos
- `init()`: Inicializa el control
- `updateView()`: Se llama cuando hay cambios en los datos
- `getOutputs()`: Retorna outputs del control
- `destroy()`: Limpia recursos

### Métodos Privados Principales
- `_buildUI()`: Construye la interfaz del control
- `_buildToolbar()`: Crea la barra de herramientas
- `_loadMSG()`: Carga y renderiza el archivo MSG
- `_downloadFile()`: Descarga el archivo
- `_printFile()`: Abre diálogo de impresión
- `_openInNewTab()`: Abre en nueva pestaña
- `_showEmptyState()`: Muestra estado vacío
- `_showErrorState()`: Muestra estado de error
- `_revokeBlob()`: Libera recursos del blob

## Gestión de Estado

El control mantiene tres estados principales:

1. **Empty State**: Cuando `base64Content` está vacío
2. **Loaded State**: Cuando hay contenido válido
3. **Error State**: Cuando hay error en la decodificación

## Compatibilidad

- ✅ Power Apps Portal & Model-driven Apps
- ✅ Responsive Design
- ✅ Dark Mode
- ✅ Mobile optimizado
- ✅ Cross-browser compatible

## Estilos CSS

Todos los estilos usan el prefijo `.msg-` para evitar conflictos:
- `.msg-viewer-container`: Contenedor principal
- `.msg-toolbar`: Barra de herramientas
- `.msg-button`: Botones de acción
- `.msg-iframe`: iframe de renderizado
- `.msg-empty-state`: Estado vacío
- `.msg-viewer-wrapper`: Wrapper del visor

## Archivos Generados Automáticamente

Los siguientes archivos se generan automáticamente durante el build:
- `Base64MSGViewer/generated/ManifestTypes.d.ts`: Tipos TypeScript basados en el manifest
- `out/index.d.ts`: Tipos de exportación
- `out/controls/Base64MSGViewer/bundle.js`: JavaScript compilado y bundled
- `out/controls/Base64MSGViewer/ControlManifest.xml`: Manifest compilado

## Notas de Desarrollo

1. **Sin Copiar/Pegar**: Todo fue generado usando comandos oficiales
2. **Estructura Consistente**: Mantiene la misma estructura que pcf-base64
3. **TypeScript Strict**: Modo strict habilitado
4. **ESLint**: Validación de código automática
5. **Responsive First**: Diseño mobile-first

## Próximos Pasos

Para usar este control en Power Apps:

1. Compilar: `npm run build`
2. Empaquetar con PAC CLI
3. Importar en Solución de Power Apps
4. Configurar propiedades en el formulario

## Troubleshooting

### Error: "Cannot find module"
```bash
npm install
```

### Error: "ESLint validation error"
```bash
npm run lint:fix
```

### Error: "Manifest validation"
- Verificar `ControlManifest.Input.xml` está bien formado
- Ejecutar `npm run refreshTypes`

### Build falla
```bash
npm run clean
npm run rebuild
```

## Referencias

- [PCF Documentation](https://docs.microsoft.com/en-us/power-apps/developer/component-framework/overview)
- [pcf-base64 (PDF Reference)](file:///Users/javierpereyra/Desktop/pcf-base64)
- [Power Apps CLI Documentation](https://docs.microsoft.com/en-us/power-apps/developer/cli/)
