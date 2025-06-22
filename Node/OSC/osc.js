// OSC server voor motorbesturing via XBee
// Dit script maakt gebruik van de 'osc' en 'serialport' modules
// Zorg ervoor dat deze modules zijn geïnstalleerd:
// npm install osc serialport express socket.io   
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const osc = require('osc');
const { SerialPort } = require('serialport');
// === Configuratie ===
// Pas het pad aan naar de seriële poort van je XBee module
// Op macOS kan dit iets zijn als '/dev/cu.usbserial-DA013LCA'
// Op Windows kan dit iets zijn als 'COM3' of 'COM4'
// Op Linux kan dit iets zijn als '/dev/ttyUSB0' of '/dev/ttyACM0'
// Zorg ervoor dat je de juiste poort gebruikt die overeenkomt met jouw systeem
// Voorbeeld: als je een XBee module hebt aangesloten op /dev/cu.usbserial-DA013LCA, gebruik dan dat pad

let serialPortPath = '/dev/cu.usbserial-DA013LCA';

const NUM_MOTORS = 15;
let PWM = new Array(NUM_MOTORS).fill(0);
const fadeIntervals = new Array(NUM_MOTORS).fill(null);
const lastTargetPWM = new Array(NUM_MOTORS).fill(0);
let easingProfiles = {};
let feedbackEnabled = true;
let heartbeatEnabled = false;
let tempoBPM = 120;

console.log('Connect OSC on port 8000 ');
console.log('Connect XBee on port:', serialPortPath); 


// === Seriële poort (XBee) ===
const port = new SerialPort({ path: serialPortPath, baudRate: 57600 }, err => {
  if (err) return console.log('Error: ', err.message);
});

// Wacht tot de seriële poort open is
port.on('open', () => console.log('XBee-seriële poort geopend:', serialPortPath));
// Luister naar inkomende data van de XBee module 
port.on('data', data => {
  console.log('Inkomende data van XBee:', data.toString());
});
// Luister naar de status van de seriële poort
port.on('ready', () => console.log('XBee-seriële poort is klaar voor gebruik'));


port.on('close', () => console.log('XBee-seriële poort gesloten'));

port.on('error', err => {
  console.error('Fout bij de XBee-seriële poort:', err);
  process.exit(1);
});

port.on('drain', () => console.log('XBee-seriële poort is leeg'));

port.on('disconnect', () => {
  console.log('XBee-seriële poort is losgekoppeld');
  process.exit(1);
});



// === OSC Setup (v2.4.5 compatible) ===
const oscServer = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 8000,
  metadata: true
});
oscServer.open();

const oscClient = new osc.UDPPort({
  remoteAddress: '127.0.0.1',
  remotePort: 8001,
  metadata: true
});
oscClient.open();
oscClient.on('ready', () => {
  console.log('OSC client klaar en verbonden met port 8001');
});
oscClient.on('error', err => {
  console.error('Fout bij OSC client:', err);
  process.exit(1);
});
oscClient.on('close', () => {
  console.log('OSC client gesloten');
  process.exit(1);
});
oscClient.on('disconnect', () => {
  console.log('OSC client is losgekoppeld');
  process.exit(1);
});
oscClient.on('drain', () => console.log('OSC client is leeg'));

// === Websocket + frontend server ===
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Webinterface beschikbaar op http://localhost:3000');
});

// === Heartbeat interval ===
setInterval(() => {
  if (heartbeatEnabled) sendPWMToXbee();
}, 2000);

// === PWM-commando naar XBee sturen ===
function sendPWMToXbee() {
  const buffer = Buffer.alloc(21);
  buffer[0] = 0xFF;
  buffer[1] = 0x01;
  buffer[2] = 0x10;
  buffer[3] = 0x10;
  for (let i = 0; i < NUM_MOTORS; i++) buffer[6 + i] = PWM[i];
  buffer[20] = 0xFE;
  port.write(buffer);
  console.log('PWM-commando verzonden naar XBee:', PWM);
  if (feedbackEnabled) {
    for (let i = 0; i < NUM_MOTORS; i++) {
      sendOSCFeedback(i, PWM[i]);
    }
  }
  io.emit('pwmUpdate', PWM); // Stuur de PWM-waarden naar de frontend
  console.log('PWM-waarden naar frontend gestuurd:', PWM);
  if (heartbeatEnabled) {
    oscClient.send({
      address: '/heartbeat',
      args: [{ type: 'i', value: Date.now() }]
    });
  }
  console.log('Heartbeat verzonden via OSC');
  // Stuur de huidige BPM via OSC
  oscClient.send({
    address: '/tempo',
    args: [{ type: 'i', value: tempoBPM }]
  });
  console.log('BPM verzonden via OSC:', tempoBPM);
  // Stuur de feedback status via OSC
  oscClient.send({
    address: '/feedback',
    args: [{ type: 'i', value: feedbackEnabled ? 1 : 0 }]
  });
  console.log('Feedback status verzonden via OSC:', feedbackEnabled);
  // Stuur de heartbeat status via OSC
  oscClient.send({
    address: '/heartbeat', 
    args: [{ type: 'i', value: heartbeatEnabled ? 1 : 0 }]
  });
  console.log('Heartbeat status verzonden via OSC:', heartbeatEnabled);
  // Stuur de huidige PWM-waarden naar de OSC client
  for (let i = 0; i < NUM_MOTORS; i++) {
    oscClient.send({
      address: `/motor/${i + 1}/status`,
      args: [
        { type: 's', value: 'pwm' },
        { type: 'i', value: PWM[i] }
      ]
    });
    console.log(`PWM-waarde voor motor ${i + 1} verzonden via OSC:`, PWM[i]);
  }
  // Stuur de laatste target PWM-waarden via OSC
  oscClient.send({
    address: '/motors/lastTarget',
    args: lastTargetPWM.map(val => ({ type: 'i', value: val }))
  });
  // Log de laatste target PWM-waarden
  lastTargetPWM.forEach((val, i) => {
    console.log(`Laatste target PWM-waarde voor motor ${i + 1}:`, val);
  });

  console.log('Laatste target PWM-waarden verzonden via OSC:', lastTargetPWM);
  // Stuur de geregistreerde easing-profielen via OSC
  for (const [name, values] of Object.entries(easingProfiles)) {
    oscClient.send({
      address: '/easing/profile',
      args: [
        { type: 's', value: name },
        ...values.map(v => ({ type: 'f', value: v }))
      ]
    });
    console.log(`Easing-profiel "${name}" verzonden via OSC:`, values);
  }
  // Log de geregistreerde easing-profielen
  console.log('Geregistreerde easing-profielen:', easingProfiles);
  // Stuur een bevestiging dat de PWM-commando's zijn verzonden
  oscClient.send({
    address: '/motors/commandSent',
    args: [{ type: 'i', value: 1 }]
  });
  console.log('Bevestiging van PWM-commando\'s verzonden via OSC');
  // Stuur de huidige status van de motoren via OSC
  for (let i = 0; i < NUM_MOTORS; i++) {
    oscClient.send({
      address: `/motor/${i + 1}/status`,
      args: [
        { type: 's', value: 'pwm' },
        { type: 'i', value: PWM[i] }
      ]
    });
    console.log(`Status voor motor ${i + 1} verzonden via OSC:`, PWM[i]);
  }
  // Log de status van de motoren
  console.log('Status van alle motoren verzonden via OSC:', PWM);
  // Stuur een algemene status update via OSC
  oscClient.send({
    address: '/motors/status',
    args: [
      { type: 'i', value: 1 }, // 1 betekent actief
      ...PWM.map(val => ({ type: 'i', value: val }))
    ]
  });
  console.log('Algemene status update verzonden via OSC:', PWM);

}

// === OSC Feedback sturen ===
function sendOSCFeedback(i, val) {
  if (!feedbackEnabled) return;
  oscClient.send({
    address: `/motor/${i + 1}/status`,
    args: [
      { type: 's', value: 'pwm' },
      { type: 'i', value: val }
    ]
  });
}

// === Easing functies ===
const EASING = {
  linear: t => t,
  easein: t => t * t,
  easeout: t => t * (2 - t),
  easeinout: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
};

// === Fade ===
function startFade(index, target, duration, easingName = 'linear') {
  stopFade(index);
  const start = PWM[index];
  const steps = 50;
  const stepMs = duration / steps;
  const easing = easingProfiles[easingName] || EASING[easingName] || EASING.linear;
  lastTargetPWM[index] = target;

  fadeIntervals[index] = setInterval(() => {
    const count = (PWM[index] - start) / (target - start || 1);
    const t = Math.min(Math.max(count, 0), 1);
    const eased = typeof easing === 'function' ? easing(t) : interpolateProfile(easing, t);
    PWM[index] = Math.round(start + (target - start) * eased);
    sendPWMToXbee();
    sendOSCFeedback(index, PWM[index]);

    if ((target > start && PWM[index] >= target) || (target < start && PWM[index] <= target)) {
      PWM[index] = target;
      stopFade(index);
    }
  }, stepMs);
}

function stopFade(i) {
  if (fadeIntervals[i]) {
    clearInterval(fadeIntervals[i]);
    fadeIntervals[i] = null;
  }
}

function interpolateProfile(array, t) {
  if (!Array.isArray(array) || array.length < 2) return t;
  const idx = t * (array.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  return (1 - f) * array[i] + f * (array[i + 1] || array[i]);
}

// === OSC Event Handling ===
oscServer.on('message', msg => {
  const { address, args } = msg;

  if (/^\/motor\/\d+$/.test(address)) {
    const index = parseInt(address.split('/')[2], 10) - 1;
    const values = args.map(a => a.value);

    switch (values[0]) {
      case 'pwm':
        stopFade(index);
        PWM[index] = Math.max(0, Math.min(100, Math.round(values[1])));
        sendPWMToXbee();
        sendOSCFeedback(index, PWM[index]);
        break;

      case 'fade':
        if (values[2] === 'over') {
          const duration = values[3];
          const easing = values[5] || 'linear';
          startFade(index, values[1], duration, easing);
        } else if (values[2] === 'inbeats') {
          const ms = (values[3] * 60000) / tempoBPM;
          const easing = values[5] || 'linear';
          startFade(index, values[1], ms, easing);
        }
        break;

      case 'stop':
        stopFade(index);
        PWM[index] = 0;
        sendPWMToXbee();
        sendOSCFeedback(index, 0);
        break;

      case 'start':
        startFade(index, lastTargetPWM[index], 1000, 'linear');
        break;
    }
  }





  if (address === '/motors/set') {
    const vals = args.slice(1).map(a => Math.max(0, Math.min(100, Math.round(a.value))));
    for (let i = 0; i < NUM_MOTORS; i++) {
      PWM[i] = vals[i] || 0;
      stopFade(i);
      sendOSCFeedback(i, PWM[i]);
    }
    sendPWMToXbee();
  }

  if (address === '/tempo') {
    const bpm = args[0].value;
    if (typeof bpm === 'number') tempoBPM = bpm;
  }

  if (address === '/feedback') {
    feedbackEnabled = !!args[0]?.value;
  }

  if (address === '/heartbeat') {
    heartbeatEnabled = !!args[0]?.value;
  }

  if (address === '/easing/register') {
    const name = args[0]?.value;
    const values = args.slice(1).map(a => a.value);
    if (typeof name === 'string' && values.length >= 2) {
      easingProfiles[name] = values;
      console.log(`Easing-profiel "${name}" geregistreerd`);
    }
  }
});

// === Websocket input vanuit frontend ===
io.on('connection', socket => {
  socket.emit('init', PWM);
  socket.on('setPWM', ({ index, value }) => {
    PWM[index] = Math.max(0, Math.min(100, value));
    sendPWMToXbee();
    sendOSCFeedback(index, PWM[index]);
  });
});
