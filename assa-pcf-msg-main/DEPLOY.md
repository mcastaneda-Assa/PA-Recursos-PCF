# 🚀 Guía de Despliegue - PCF-MSG a Power Apps ASSA

## Estado Actual

✅ **Control compilado y listo para producción**

- Bundle: `21 KB`
- Manifest: Validado
- CSS: Responsivo incluido
- TypeScript: Compilado exitosamente

## Archivos Listos para Desplegar

```
/Users/javierpereyra/Desktop/pcf-msg/out/controls/Base64MSGViewer/
├── bundle.js              (21 KB - Código compilado)
├── ControlManifest.xml    (993 B - Definición del control)
└── css/
    └── Base64MSGViewer.css (Estilos incluidos)
```

## Pasos para Desplegar

### Opción 1: Despliegue Rápido (Recomendado)

**Paso 1: Autenticarse en PAC CLI**
```bash
cd ~/Desktop/pcf-msg
npx @microsoft/power-apps-cli@latest auth create --username tu.email@assa.com.br
```

**Paso 2: Verificar conexión**
```bash
npx @microsoft/power-apps-cli@latest auth list
```

**Paso 3: Hacer push del control**
```bash
npx @microsoft/power-apps-cli@latest pcf push --publisher-prefix assa
```

### Opción 2: Despliegue Manual (Power Apps Studio)

1. Ir a https://make.powerapps.com
2. Seleccionar entorno ASSA
3. Crear solución nueva o usar existente
4. Soluciones → Agregar existente → Componente de código
5. Cargar archivos desde:
   - `out/controls/Base64MSGViewer/bundle.js`
   - `out/controls/Base64MSGViewer/ControlManifest.xml`
   - `out/controls/Base64MSGViewer/css/Base64MSGViewer.css`

## Información del Control

| Propiedad | Valor |
|-----------|-------|
| **Namespace** | `MSGViewer` |
| **Constructor** | `Base64MSGViewer` |
| **Versión** | 1.0.0 |
| **Tipo** | Code Component (PCF) |
| **Framework** | Power Apps Component Framework v1.3.18 |

## Propiedades del Control

### Input Properties

1. **fileName** (SingleLine.Text)
   - Nombre del archivo a mostrar
   - Usado en el header del control
   - Ej: "correo_importante.msg"

2. **base64Content** (Multiple)
   - Contenido del archivo .msg en base64
   - El control parsea y renderiza automáticamente
   - Ej: "RnJvbTogdXN1YXJpb0BleGFt..."

## Funcionalidades del Control

- 📥 **Descargar**: Descarga el archivo .msg original
- 🖨️ **Imprimir**: Abre el diálogo de impresión
- 🔗 **Nueva Pestaña**: Abre el contenido en ventana nueva
- 📱 **Responsive**: Funciona en desktop, tablet y mobile
- 🌙 **Dark Mode**: Soporte automático
- 📧 **Parser**: Detecta automáticamente formato de email y lo renderiza

## Uso en Power Apps

Una vez desplegado, podrás usarlo en:

1. **Model-driven Apps**
   ```
   - Formularios
   - Vistas personalizadas
   - Paneles
   ```

2. **Canvas Apps**
   ```
   - Agregar componente > MSGViewer
   - Configurar propiedades
   - Conectar a datos de base de datos
   ```

## Ejemplo de Uso

```javascript
// En una canvas app
Set(varBase64, 
    Base64Encode(
        FileContent(FileUpload1.Value[0])
    )
);

// Pasar al control
MSGViewer.base64Content = varBase64;
MSGViewer.fileName = FileUpload1.Value[0].Name;
```

## Troubleshooting

### Error: "Authentication failed"
```bash
npx @microsoft/power-apps-cli@latest auth clear
# Luego ejecutar auth create nuevamente
```

### Error: "Publisher prefix not found"
- Verificar que el publisher prefix exista en el entorno ASSA
- Contactar al admin del entorno

### El control no aparece
- Verificar que está en la solución correcta
- Esperar 5-10 minutos para que se sincronice
- Hacer refresh (F5) en Power Apps Studio

## Notas Importantes

- ✅ Control optimizado para archivos .msg en formato RFC 2822
- ✅ Soporta email con cabeceras estándar (From, To, CC, BCC, Subject, Date)
- ✅ Renderiza el contenido de forma legible en el navegador
- ✅ No requiere complementos adicionales
- ⚠️ Para archivos .msg binarios puros, mostrar opción de descarga

## Próximos Pasos

1. **Confirmar información de entorno ASSA**
   - Email: ?
   - Entorno URL: ?
   - Publisher Prefix: ?

2. **Ejecutar despliegue**

3. **Validar en Power Apps Studio**

4. **Agregar a formulario de prueba**

---

**Última actualización**: 6 de Marzo de 2026
**Estado**: Listo para desplegar
**Versión**: 1.0.0
