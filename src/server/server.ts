import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/api/data', (req, res) => {
  console.log('Received data:', req.body);
  res.json({ message: 'Data received successfully', data: req.body });
});

if (import.meta.env.PROD) {
  app.use(express.static('dist/client'));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});