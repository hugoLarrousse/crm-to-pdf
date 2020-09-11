const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = require('http').createServer(app);

const hubspot = require('./hubspot');
const pdf = require('./pdf');

const port = 3007;

const info = {
  appName: 'Crm-to-Pdf',
  description: 'Give me your API KEY and I will print a pdf with your KPI (deals, meetings, calls...)',
  important: `For every routes you have to provide your API KEY (https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key)
  2 possibilities:
    - inside the header: Authorization: {API_KEY}
    - as part of the query string: ...?api_key={API_KEY}`,
  routes: {
    '/coworkers': {
      description: 'get your coworkers info',
    },
    '/pdf': {
      description: 'get your pdf for all your coworkers',
    },
    '/pdf/:email': {
      description: 'get your pdf for a specific coworker',
      params: 'email --> ex: /pdf/test@gmail.com',
    },
  },
};

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

app.get('/info', (req, res) => {
  res.status(200).send(info);
});

app.use('*', (req, res, next) => {
  req.token = req.headers.Authorization || req.query.api_key;
  return req.token ? next() : res.status(403).send({ error: true, message: 'API KEY is missing', info });
});

app.get('/coworkers', async (req, res) => {
  try {
    res.send({ data: await hubspot.getUsers(req.token, null, true) });
  } catch (e) {
    res.status(400).send({ error: true, message: e.message });
  }
});

app.get('/pdf', async (req, res) => {
  try {
    const data = await hubspot.getDataForPdf(req.token);
    const toSend = {
      team: data.team,
      period: `${data.startWeek} - ${Date.now()}`,
      previousPeriod: `${data.startLastWeek} - ${data.startWeek}`,
      data: data.count,
    };
    await pdf.generatePdf(toSend);
    // transform to pdf
    res.send(toSend);
  } catch (e) {
    res.status(400).send({ error: true, message: e.message });
  }
});

// for one coworker
// app.get('/pdf/:email', async (req, res) => {
//   try {
//     // const { calls, meetings } = hubspot.getEngagements(req.token, user.id);
//     // get deals
//     // get call
//     // get meeting
//     // transform to pdf
//     res.send('OK');
//   } catch (e) {
//     res.status(400).send({ error: true, message: e.message });
//   }
// });

// app.use('*', (req, res, next) => {
//   return req.query.email ? next() : res.status(403).send({ error: true, message: 'Email is missing', info });
// });

app.all('*', (req, res) => {
  res.status(400).send(info);
});

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
