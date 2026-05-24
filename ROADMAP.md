# 🚀 Roadmap: Siguientes Niveles (Enterprise Grade)

Este documento detalla las implementaciones planeadas a futuro para llevar la API de un estado "Excelente" a un estándar de producción de grado empresarial (Senior Level). Estas mejoras no son estrictamente necesarias para el funcionamiento base, pero son vitales para la mantenibilidad, escalabilidad y confiabilidad del proyecto a gran escala.

---

## 1. Validación de Esquemas (Schema Validation)
Actualmente, los datos de las peticiones (`req.body`) se validan manualmente en la capa de controladores (ej. `if (!username || !password) throw Error...`).

**Implementación a futuro:** 
Integrar una librería de validación estricta como **Zod**, **Joi** o **express-validator**. 
- **Objetivo:** Definir esquemas declarativos (ej. "el password debe tener al menos 8 letras, un número y un símbolo") y utilizar un middleware que valide automáticamente el "Payload" antes de que siquiera llegue al controlador. Esto limpia el código y asegura que solo datos matemáticamente correctos toquen la lógica de negocio.

## 2. Observabilidad (Logging Estructurado)
Actualmente, el manejo de logs y errores se realiza mediante `console.error()`.

**Implementación a futuro:**
Sustituir la consola estándar por librerías profesionales de logging como **Winston** o **Pino**.
- **Objetivo:** Guardar los registros y errores en archivos de texto o flujos estándar en formato `JSON`, incluyendo marcas de tiempo exactas (timestamps), niveles de severidad (`info`, `warn`, `error`) y un contexto detallado (Stack Trace estructurado). Esto permitirá que herramientas de monitoreo como Datadog, AWS CloudWatch o el stack ELK lean y alerten al equipo si ocurre un fallo en producción.

## 3. Tests Automatizados (Testing)
Actualmente, la validación del comportamiento de la API es manual. Un proyecto de grado empresarial no está completo sin una suite de pruebas.

**Implementación a futuro:**
Implementar pruebas unitarias y de integración utilizando **Jest** y **Supertest**.
- **Objetivo:** Crear scripts que simulen peticiones HTTP contra la API de forma automatizada (ej. `it('debería retornar 401 si el token es inválido')`). Esto garantiza que los nuevos cambios o refactorizaciones no rompan funcionalidades existentes (Regression Testing).

## 4. Integración y Despliegue Continuo (CI/CD)
En la actualidad los despliegues y pruebas dependen de la disciplina del desarrollador.

**Implementación a futuro:**
Configurar flujos de trabajo (workflows) automatizados usando **GitHub Actions**, **GitLab CI** o **Jenkins**.
- **Objetivo:** Cada vez que se haga un `git commit` o se abra un Pull Request (PR), los servidores de CI/CD deben levantar temporalmente una base de datos PostgreSQL, instalar dependencias y ejecutar toda la suite de tests automatizados (los creados en el punto 3). Si un solo test falla, el PR se bloquea automáticamente y no se puede fusionar con la rama principal (main), garantizando que nunca llegue código roto a producción.

## 5. Validación de Entorno (Fail Fast)
Actualmente, la API asume que las variables de entorno críticas existen y son correctas.

**Implementación a futuro:**
Añadir una capa de validación en la fase de arranque (`server/index.js`) que revise el archivo `.env`.
- **Objetivo:** Si falta una variable crítica como `process.env.JWT_SECRET` o `DATABASE_URL`, el servidor debe abortar su inicio de inmediato (`process.exit(1)`) lanzando un error claro y descriptivo. Es preferible que la aplicación "falle rápido" al intentar desplegarse, en lugar de arrancar silenciosamente y generar errores asíncronos horas después cuando un usuario intente iniciar sesión.
