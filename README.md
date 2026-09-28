# Sistema Web de Gestión Comercial y Control de Órdenes - Comercial Valencia (Frontend)

Aplicativo web frontend desarrollado con **React 19**, **Vite** y **Tailwind CSS** para la gestión integral de órdenes de clientes, órdenes de compra, control de inventarios, analítica operativa y asistencia automatizada mediante Inteligencia Artificial para la empresa **Comercial Valencia**.

---

## 🚀 Tecnologías Principales

- **Framework / Librería:** [React 19](https://react.dev/)
- **Empaquetador y Servidor de Desarrollo:** [Vite](https://vitejs.dev/)
- **Estilos y UI:** [Tailwind CSS](https://tailwindcss.com/)
- **Gráficos y Visualización:** [Recharts](https://recharts.org/)
- **Notificaciones UI:** Sileo
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Arquitectura de Conexión:** Fetch API modular REST conectada al backend de Laravel

---

## 📦 Módulos Principales del Sistema

1. **Gestión de Órdenes de Clientes (`GestionOrdenesCliente.jsx`)**
   - Creación, seguimiento y control de pedidos y órdenes.
   - Emisión y renderizado del **Documento Físico Oficial** (`DocumentoOrdenOficial.jsx`) con código de barras SVG, metadatos exactos y balance tributario (Base Imponible + 18% IGV).
   - Generación de comprobantes para impresión matricial/A4.

2. **Gestión de Órdenes de Compra (`GestionOrdenesCompra.jsx`)**
   - Registro de requerimientos a proveedores.
   - Asignación de costos unitarios y control de estados (Pendiente, Completada, Anulada).
   - Impresión oficial de órdenes de compra con identificación de responsables.

3. **Control de Inventarios y Almacén (`GestionMovimientos.jsx` / `GestionAjustesInventario.jsx`)**
   - Registro de órdenes de ingreso y egreso de stock.
   - Ajustes de inventario por mermas, desmedros o regularización de existencias.

4. **Dashboard e Inteligencia de Negocios (`Dashboard.jsx`)**
   - Métricas en tiempo real: volumen de órdenes, stock valorizado, quiebres de stock.
   - Indicadores ejecutivos y visualizaciones gráficas interactivas.

5. **Copiloto / Chatbot de Inteligencia Artificial (`ChatFloating.jsx` / `ChatChart.jsx`)**
   - Asistente conversacional en vivo conectado al modelo de IA para consultas operativas.
   - Generación dinámica de borradores de órdenes y visualización de gráficos estadísticos directamente en el chat.

---

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/jlinanmi-hue/frontend-tesis.git
cd frontend-tesis
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea el archivo `.env` tomando como base `.env.example`:
```bash
cp .env.example .env
```
Configura la URL base del API de Laravel:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### 4. Iniciar en modo desarrollo
```bash
npm run dev
```

### 5. Compilar para producción
```bash
npm run build
```

---

## 👥 Autor
- **Jhonatan Liñan Miranda** - [jlinanmi-hue](https://github.com/jlinanmi-hue)
- Proyecto de Tesis de Ingeniería de Sistemas - Universidad César Vallejo
