require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '100mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_PAYLOAD_SIZE || '100mb' }));

app.get('/', (req, res) => {
  res.send('Hola Mundo - Backend API');
});

app.get('/api/config', (req, res) => {
  res.json({
    OSM_TILE_URL: process.env.OSM_TILE_URL,
    OSM_NOMINATIM_URL: process.env.OSM_NOMINATIM_URL,
    OSM_OVERPASS_ENDPOINTS: process.env.OSM_OVERPASS_ENDPOINTS ? process.env.OSM_OVERPASS_ENDPOINTS.split(',') : []
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Catch-all 404
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
});

// Error handler global
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
