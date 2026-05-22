const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IkFkbWluaXN0cmFkb3IgU2lzdGVtYSIsImlhdCI6MTc3OTQ4OTc3NCwiZXhwIjoxNzc5NDkzMzc0fQ.Eiopkd4fYT2bsykcMhqWLdv2RRqWiAOYR_N0WYu4R0s";
const secret = "poeqr_irgps_ajdjf_12345";

try {
  const decoded = jwt.verify(token, secret);
  console.log("Success:", decoded);
} catch (e) {
  console.error("Error:", e.message);
}
