# 🔌 Integración de Periféricos - Desarrollo Futuro

> **Estado:** Pospuesto  
> **Fecha de documentación:** 2025-12-07

---

## 📋 Resumen

Este documento contiene la investigación y planificación para integrar dispositivos periféricos al sistema POS.

---

## 🖨️ Impresora de Tickets

| Tecnología | Compatibilidad | Consideraciones |
|------------|----------------|-----------------|
| **Web USB API** | Chrome/Edge | Conexión directa USB, requiere drivers específicos |
| **ESC/POS Commands** | Universal | Lenguaje estándar (Epson, Star, Bixolon) |
| **Bluetooth/WiFi** | Impresoras modernas | Más flexible pero requiere configuración de red |
| **Print Server Local** | Cualquiera | Aplicación local que actúa como puente (Electron/Tauri) |

**Modelos comunes compatibles:** Epson TM-T20/T88, Star TSP100/TSP650, Bixolon SRP-350

---

## 💰 Caja Registradora (Cash Drawer)

- Usualmente se conectan **a través de la impresora** (puerto RJ-11)
- Se abren con un comando ESC/POS específico
- Algunas tienen conexión USB directa

---

## 📊 Lector de Código de Barras

| Tipo | Implementación |
|------|----------------|
| **USB (modo teclado)** | Funciona automáticamente - simula teclas |
| **USB (modo serial)** | Requiere Web Serial API |
| **Bluetooth** | Web Bluetooth API |
| **Cámara del dispositivo** | Librerías como `quagga2` o `@zxing/library` |

**Nota:** La mayoría de lectores USB funcionan como "teclado", así que solo necesitas un campo de texto enfocado.

---

## ⚖️ Báscula

- Conexión típica: **RS-232 (Serial)** o USB-Serial
- Requiere **Web Serial API** (Chrome/Edge)
- Protocolo varía por fabricante (necesitas la documentación del modelo)

---

## 🏗️ Arquitectura Recomendada

```
┌─────────────────┐     ┌──────────────────┐
│   Tu POS Web    │────►│  Servicio Local  │────► Dispositivos
│  (Next.js/React)│◄────│   (Electron/     │      - Impresora
└─────────────────┘     │    Tauri/Node)   │      - Báscula
                        └──────────────────┘      - Cash Drawer
```

### Opciones de Implementación:

1. **APIs Nativas del Navegador** (Web USB, Web Serial, Web Bluetooth)
   - ✅ Sin instalación adicional
   - ❌ Solo Chrome/Edge, permisos por dispositivo

2. **Aplicación Puente Local** (Electron, Tauri, o servicio Node.js)
   - ✅ Control total sobre cualquier dispositivo
   - ✅ Compatible con todos los navegadores
   - ❌ Requiere instalar aplicación auxiliar

3. **Servicios en la Nube** (PrintNode, QZ Tray)
   - ✅ Fácil integración
   - ❌ Costo mensual, dependencia externa

---

## 🦀 Tauri vs Electron

### Comparativa

| Aspecto | Electron | Tauri |
|---------|----------|-------|
| **Tamaño** | ~150MB | ~10MB |
| **Lenguaje backend** | Node.js | Rust |
| **Curva de aprendizaje** | Más fácil | Más complejo |
| **Rendimiento** | Bueno | Excelente |
| **Acceso a hardware** | Completo | Completo |
| **Comunidad** | Grande | Creciendo |

### Recomendación

**Servicio auxiliar con Tauri** (o Node.js para empezar rápido):

```
┌────────────────────┐         ┌──────────────────────┐
│   Tu POS Web       │◄───────►│  Servicio Local      │
│   (Next.js)        │  HTTP   │  (Tauri/Node.js)     │
│   Navegador/Kiosko │  WS     │  Puerto 3001         │
└────────────────────┘         └──────────┬───────────┘
                                          │
                            ┌─────────────┼─────────────┐
                            │             │             │
                         Impresora    Báscula    Cash Drawer
```

---

## 📦 Instalación Tauri (cuando esté listo)

```bash
# 1. Instalar Rust (requerido)
# Windows: Descargar de https://rustup.rs/

# 2. Instalar CLI de Tauri
npm install -g @tauri-apps/cli

# 3. Inicializar en el proyecto
npm install @tauri-apps/api
npx tauri init

# 4. Desarrollar
npx tauri dev

# 5. Construir para producción
npx tauri build
```

---

## 📦 Librerías Útiles

```bash
# Impresión ESC/POS
npm install escpos escpos-usb

# Lectura de códigos de barras por cámara
npm install @zxing/library

# Web Serial (para básculas)
# Usa la API nativa del navegador
```

---

## 📝 Próximos Pasos (cuando se retome)

1. [ ] Decidir arquitectura final (servicio Node.js o Tauri)
2. [ ] Implementar impresión de tickets ESC/POS
3. [ ] Agregar soporte para apertura de caja
4. [ ] Integrar báscula (si aplica)
5. [ ] Crear instalador del servicio auxiliar
6. [ ] Documentar configuración para usuarios finales
