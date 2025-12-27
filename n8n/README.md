# n8n - Workflow Automation

Configuración de n8n para la automatización de cotizaciones por WhatsApp + IA.

## Requisitos

- Docker Desktop instalado y corriendo

## Iniciar n8n

```bash
cd n8n
docker-compose up -d
```

## Acceso

- **URL**: http://localhost:5678
- **Usuario**: admin
- **Password**: pos_system_n8n_2024

> ⚠️ **Importante**: Cambia las credenciales en `docker-compose.yml` antes de usar en producción.

## Detener n8n

```bash
docker-compose down
```

## Ver logs

```bash
docker-compose logs -f n8n
```

## Próximos pasos

1. Crear webhook para recibir mensajes de Twilio
2. Configurar nodo de OpenAI/Claude
3. Conectar con Supabase para consultar productos
4. Configurar respuesta por WhatsApp

## Estructura

```
n8n/
├── docker-compose.yml    # Configuración de Docker
├── workflows/            # Workflows exportados (backup)
└── README.md            # Esta documentación
```
