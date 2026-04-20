const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json());

let nextId = 1;
const businessUnits = [ { id: nextId++, name: 'QA-T1' }, { id: nextId++, name: 'HQ' } ];

app.get('/api/master-data/business-units', (req, res) => {
  res.json(businessUnits);
});

app.post('/api/master-data/business-units', (req, res) => {
  const { name } = req.body;
  const item = { id: nextId++, name };
  businessUnits.push(item);
  res.status(201).json(item);
});

app.put('/api/master-data/business-units/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = businessUnits.find(b => b.id === id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  item.name = req.body.name || item.name;
  res.json(item);
});

app.delete('/api/master-data/business-units/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = businessUnits.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  businessUnits.splice(idx,1);
  res.status(204).end();
});

const port = 8080;
app.listen(port, () => console.log(`Mock API listening on http://localhost:${port}`));
