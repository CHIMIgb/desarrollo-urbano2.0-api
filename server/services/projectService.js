const db = require('../db');
const { HttpError } = require('../middleware/errorMiddleware');
const { MESSAGES } = require('../utils/constants');

const saveProject = async (userId, projectData) => {
  const { 
    projectId, 
    name = 'Proyecto Sin Nombre', 
    features = [], 
    metrics,
    nextId = 1,
    map_center_lng = -99.1332, 
    map_center_lat = 19.4326, 
    map_zoom = 13, 
    map_pitch = 65, 
    map_bearing = -20 
  } = projectData;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    let currentProjectId = projectId;

    if (currentProjectId) {
      const checkRes = await client.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [currentProjectId, userId]);
      if (checkRes.rows.length === 0) {
        throw new HttpError(403, 'No tienes permiso para modificar este proyecto o no existe');
      }

      await client.query(`
        UPDATE projects 
        SET name = $1, map_center_lng = $2, map_center_lat = $3, map_zoom = $4, map_pitch = $5, map_bearing = $6, next_id = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [name, map_center_lng, map_center_lat, map_zoom, map_pitch, map_bearing, nextId, currentProjectId]);

      await client.query('DELETE FROM project_features WHERE project_id = $1', [currentProjectId]);
    } else {
      const insertRes = await client.query(`
        INSERT INTO projects (user_id, name, map_center_lng, map_center_lat, map_zoom, map_pitch, map_bearing, next_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
      `, [userId, name, map_center_lng, map_center_lat, map_zoom, map_pitch, map_bearing, nextId]);
      currentProjectId = insertRes.rows[0].id;
    }

    for (const feature of features) {
      await client.query(
        'INSERT INTO project_features (project_id, feature_data) VALUES ($1, $2)',
        [currentProjectId, JSON.stringify(feature)]
      );
    }

    // PASO 3: Guardar snapshot de métricas urbanas (si metrics.global existe)
    let snapshotId = null;
    if (metrics && metrics.global) {
      const g = metrics.global;
      const metricsRes = await client.query(
        `INSERT INTO project_metrics_snapshots 
          (project_id, total_base_area, total_occupied_area, total_built_area, 
           total_green_area, cos, cus, estimated_population) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id`,
        [
          currentProjectId,
          g.total_base_area || 0,
          g.total_occupied_area || 0,
          g.total_built_area || 0,
          g.total_green_area || 0,
          g.cos || 0,
          g.cus || 0,
          g.estimated_population || 0
        ]
      );
      snapshotId = metricsRes.rows[0].id;

      // PASO 4: Guardar métricas por lote (si metrics.lots existe)
      if (Array.isArray(metrics.lots)) {
        for (const lot of metrics.lots) {
          await client.query(
            `INSERT INTO project_lot_metrics_snapshots 
              (snapshot_id, lot_id, name, base_area, occupied_area, built_area, 
               green_area, cos, cus) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              snapshotId,
              lot.lot_id,
              lot.name || null,
              lot.base_area || 0,
              lot.occupied_area || 0,
              lot.built_area || 0,
              lot.green_area || 0,
              lot.cos || 0,
              lot.cus || 0
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    return { projectId: currentProjectId, snapshotId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const listUserProjects = async (userId) => {
  const res = await db.query('SELECT id, name, updated_at, created_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
  return res.rows;
};

const loadLatestProject = async (userId) => {
  const res = await db.query('SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1', [userId]);
  if (res.rows.length === 0) return null;
  
  const project = res.rows[0];
  const featuresRes = await db.query('SELECT feature_data FROM project_features WHERE project_id = $1', [project.id]);
  
  return {
    id: project.id,
    name: project.name,
    nextId: project.next_id,
    mapView: {
      center: [project.map_center_lng, project.map_center_lat],
      zoom: project.map_zoom,
      pitch: project.map_pitch,
      bearing: project.map_bearing
    },
    features: featuresRes.rows.map(row => row.feature_data)
  };
};

const loadProjectById = async (projectId, userId) => {
  const res = await db.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
  if (res.rows.length === 0) {
    throw new HttpError(404, MESSAGES.PROJECTS.NOT_FOUND);
  }
  
  const project = res.rows[0];
  const featuresRes = await db.query('SELECT feature_data FROM project_features WHERE project_id = $1', [project.id]);
  
  return {
    id: project.id,
    name: project.name,
    nextId: project.next_id,
    mapView: {
      center: [project.map_center_lng, project.map_center_lat],
      zoom: project.map_zoom,
      pitch: project.map_pitch,
      bearing: project.map_bearing
    },
    features: featuresRes.rows.map(row => row.feature_data)
  };
};

const addAuditLog = async (userId, projectId, actionType, details) => {
  await db.query(
    'INSERT INTO audit_logs (user_id, project_id, action_type, details) VALUES ($1, $2, $3, $4)',
    [userId, projectId, actionType, details ? JSON.stringify(details) : null]
  );
  return true;
};

module.exports = {
  saveProject,
  listUserProjects,
  loadLatestProject,
  loadProjectById,
  addAuditLog
};
