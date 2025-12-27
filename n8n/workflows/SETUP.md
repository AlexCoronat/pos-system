# Migración a Evolution API

## Resumen

Este documento describe cómo migrar de Twilio a Evolution API para la integración de WhatsApp.

## Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WhatsApp       │───▶│  Evolution API  │───▶│      n8n        │
│  (Cliente)      │    │  (Docker)       │    │   (Workflow)    │
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                       │
                       ┌─────────────────┐    ┌────────▼────────┐
                       │    Supabase     │◀───│   OpenAI/Claude │
                       │   (PostgreSQL)  │    │   (IA)          │
                       └─────────────────┘    └─────────────────┘
```

## Servicios Docker

| Servicio       | Puerto | Descripción                    |
|----------------|--------|--------------------------------|
| n8n            | 5678   | Workflow automation            |
| Evolution API  | 8080   | WhatsApp Business API          |

## Pasos de Migración

### 1. Ejecutar migración SQL

Ejecuta el archivo `migrations/001_add_evolution_api_support.sql` en Supabase SQL Editor.

### 2. Importar workflow en n8n

1. Abre http://localhost:5678
2. Ve a Workflows > Import from File
3. Selecciona `workflows/whatsapp-evolution-api.json`

### 3. Configurar credenciales en n8n

#### PostgreSQL (Supabase)
- Host: `db.<tu-proyecto>.supabase.co`
- Database: `postgres`
- User: `postgres`
- Password: `<tu-password>`
- Port: `5432`
- SSL: `true`

#### OpenAI API
- API Key: `sk-...`

### 4. Crear instancia en Evolution API

```bash
curl -X POST "http://localhost:8080/instance/create" \
  -H "apikey: pos_evolution_key_2024" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "mi_negocio",
    "token": "mi_token_seguro",
    "qrcode": true
  }'
```

### 5. Conectar WhatsApp

1. Obtener QR Code:
```bash
curl -X GET "http://localhost:8080/instance/connect/mi_negocio" \
  -H "apikey: pos_evolution_key_2024"
```

2. Escanear el QR con WhatsApp
3. Esperar confirmación de conexión

### 6. Registrar número en base de datos

```sql
INSERT INTO whatsapp_numbers (
  business_id,
  phone_number,
  evolution_instance_name,
  connection_type,
  is_active,
  is_verified
) VALUES (
  1,  -- Tu business_id
  '+521234567890',  -- Número de WhatsApp
  'mi_negocio',  -- Nombre de instancia
  'evolution',
  true,
  true
);
```

### 7. Activar el workflow

1. En n8n, abre el workflow importado
2. Configura las credenciales en cada nodo
3. Activa el workflow (toggle en la esquina superior)

## Webhook URL

La URL del webhook es:
```
http://n8n_pos_system:5678/webhook/whatsapp
```

Esta URL ya está configurada en Evolution API via la variable de entorno `WEBHOOK_GLOBAL_URL`.

## Diferencias con Twilio

| Aspecto           | Twilio                  | Evolution API          |
|-------------------|-------------------------|------------------------|
| Costo             | ~$0.05/mensaje          | Gratis (self-hosted)   |
| Setup             | Console + verificación  | QR Code                |
| Multi-device      | No                      | Sí                     |
| API               | REST estándar           | REST + Webhook         |
| Estado sesión     | Stateless               | Persistent             |

## Troubleshooting

### El webhook no recibe mensajes

1. Verificar que n8n está en la misma red Docker:
```bash
docker network ls
docker network inspect pos_system_network
```

2. Verificar logs de Evolution API:
```bash
docker logs evolution_api_pos -f
```

### Error de conexión a PostgreSQL

Asegúrate de que el host usa el formato correcto:
- Local: `host.docker.internal` (Windows/Mac)
- Supabase: `db.<proyecto>.supabase.co`

### Mensajes duplicados

Verifica que solo tienes UN workflow activo y que el filtro de `messages.upsert` está funcionando.
