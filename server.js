const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = require('http').createServer(app);

const port = 3007;

/* Middleware */
app.use(helmet());
app.use(bodyParser.json({ limit: '4mb' }));
app.use(bodyParser.urlencoded({ limit: '4mb', extended: true }));
app.use(cors({ origin: '*' /* , credentials: true */ }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  next();
});

app.use('*', (req, res, next) => {
  res.set('Server', 'CrmToPdf');
  next();
});

app.use('/status', (req, res) => {
  res.status(200).send({ success: true, error: false, message: 'OK' });
});

app.get('/favicon.ico', (req, res) => res.status(204));
app.get('/sw.js', (req, res) => res.status(204));

server.listen(port, () => {
  console.log(`Crm to Pdf is running on ${port}`);
});

const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(sig => {
  process.on(sig, () => {
    server.close((error) => {
      if (error) {
        console.log({ filename: __filename, methodName: 'signals', message: error.message });
        process.exit(1);
      }
    });
  });
});
