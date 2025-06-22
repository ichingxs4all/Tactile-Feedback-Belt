//MIDI to XBee motor controller
//Deze code leest MIDI-berichten en stuurt PWM-waarden naar een XBee-module
//De XBee-module is verbonden met een microcontroller die de motoren aanstuurt
//De microcontroller ontvangt de PWM-waarden via seriële communicatie en stuurt deze door naar
//de motoren via een geschikte interface (bijv. PWM, I2C, SPI, etc.)
//Deze code gebruikt de 'midi' en 'serialport' modules om MIDI-berichten te lezen en
//seriële communicatie te beheren. Zorg ervoor dat deze modules zijn geïnstalleerd:
//npm install midi serialport

'use strict';
const midi = require('midi');
const { SerialPort } = require('serialport')
let serialPortPath='/dev/cu.usbserial-DA013LCA';  //The path of the serial2usb XBee module on the hosting system 

// ==== Instellingen ====
const NUM_MOTORS = 15;
const NOTE_START = 60;
const CC_PWM_START = 30;     // CC#30 t/m CC#44 → PWM-waarde voor motor 1–15
const CC_MODE_SELECT = 20;   // CC#20 = Toggle control mode van motor X

console.log('Gebruik CC 20 om te switchen tussen NoteOn en CC modus');
console.log('Gebruik CC 30 t/m 44 de PWM-waarde voor motor 1 - 15 te sturen');  
console.log('Gebruik noten 60 t/m 74 om de motoren aan te sturen via NoteOn/Off berichten');  
console.log(`XBee-seriële poort: ${serialPortPath}`);

// ==== XBee-seriële poort ====
//Pas dit aan naar de juiste poort voor jouw systeem
//Op Windows kan dit iets zijn als 'COM3', op Linux iets als '/dev/ttyUSB0' of '/dev/ttyACM0'
//Op macOS kan het iets zijn als '/dev/cu.usbserial-DA013LCA' of '/dev/tty.usbserial-DA013LCA'
//Controleer de poort met een terminal of via de systeeminstellingen
//Voorbeeld: ls /dev/tty* of ls /dev/cu.* op mac
//Zorg ervoor dat de XBee correct is verbonden en de juiste baudrate gebruikt (57600)
//Voorbeeld: /dev/ttyUSB0, /dev/ttyACM0, /dev/cu.usbserial-DA013LCA, etc.
//Open the serialport to the XBee module
const port = new SerialPort({ path: serialPortPath, baudRate: 57600 }, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
})
// Luister naar open events
port.on('open', () => {
  console.log('XBee-seriële poort geopend:', serialPortPath);
}); 
// Luister naar close events
port.on('close', () => {
  console.log('XBee-seriële poort gesloten');
});
// Luister naar error events
port.on('error', (err) => {
  console.error('Fout bij de XBee-seriële poort:', err);
  process.exit(1);
}); 
// Luister naar drain events
port.on('drain', () => {
  console.log('XBee-seriële poort is leeg');
});
// Luister naar disconnect events
port.on('disconnect', () => {
  console.log('XBee-seriële poort is losgekoppeld');
  process.exit(1);
});

// Luister naar data events
port.on('data', (data) => {
  // console.log('Data ontvangen van XBee:', data);
  // Hier kun je de ontvangen data verwerken als dat nodig is
}); 
// Luister naar open events
port.on('error', (err) => {
  console.error('Fout bij het openen van de XBee-seriële poort:', err);
  process.exit(1);
}); 


// === Huidige PWM en controlemodus ===
const motorPWM = new Array(NUM_MOTORS).fill(0);
const motorControlMode = new Array(NUM_MOTORS).fill(0); // 0 = note, 1 = cc

// === MIDI Mapping: noten 60–74 → motor 0–14
const noteToMotorMap = new Map();
for (let i = 0; i < NUM_MOTORS; i++) {
  noteToMotorMap.set(NOTE_START + i, i);
}

// MIDI Setup
const input = new midi.Input();
for (let i = 0; i < input.getPortCount(); i++) {
  console.log(`MIDI-poort ${i}: ${input.getPortName(i)}`);
}


// Kies de eerste poort (0) om naar te luisteren
// Pas dit aan als je een specifieke poort wilt gebruiken
if (input.getPortCount() === 0) {
  console.error('Geen MIDI-poorten gevonden. Zorg ervoor dat een MIDI-apparaat is aangesloten.');
  process.exit(1);
} 

input.openPort(0);

// Zet de MIDI-invoer in de juiste modus
// We willen alleen luisteren naar Note On/Off en Control Change berichten
const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;
const MIDI_CONTROL_CHANGE = 0xB0;  
// Zet de MIDI-invoer in de juiste modus
// We willen alleen luisteren naar Note On/Off en Control Change berichten 
input.ignoreTypes(false, false, false);


// Start luisteren naar MIDI-berichten
console.log(`MIDI-poort ${input.getPortName(0)} geopend`);
input.on('error', (err) => {
  console.error('MIDI-fout:', err);
  process.exit(1);
}); 
// Luister naar MIDI-berichten
console.log('Luisteren naar MIDI-berichten...');  
input.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message;
  const type = status & 0xf0;

  // console.log(`MIDI-bericht ontvangen: ${message} (type: ${type}, data1: ${data1}, data2: ${data2})`); 
  if (type === MIDI_NOTE_ON || type === MIDI_NOTE_OFF) {
    // Note On/Off
    const note = data1;
    const velocity = data2;

    const isNoteOn = type === MIDI_NOTE_ON && velocity > 0;
    const isNoteOff = (type === MIDI_NOTE_OFF) || (type === MIDI_NOTE_ON && velocity === 0);

    if (!noteToMotorMap.has(note)) return;
    const motorIndex = noteToMotorMap.get(note);

    if (motorControlMode[motorIndex] === 0) {
      // Alleen reageren als motor in "note" mode is
      const pwm = isNoteOn ? Math.round((velocity / 127) * 100) : 0;
      motorPWM[motorIndex] = pwm;

      console.log(`Note ${note} → Motor ${motorIndex + 1}, PWM ${pwm}, via NOTE`);
      sendMotorPacket();
    }
  }

  if (type === MIDI_CONTROL_CHANGE) {
    // Control Change
    const ccNum = data1;
    const ccVal = data2;

    if (ccNum === CC_MODE_SELECT) {
      // Verwacht dat waarde 0–14 is om motorindex te kiezen
      if (ccVal < 0 || ccVal >= NUM_MOTORS) {
        console.error(`Ongeldige CC-waarde voor modusselectie: ${ccVal}`);
        return;
      }
      // Toggle controlemodus voor de geselecteerde motor
      // ccVal moet een waarde zijn tussen 0 en 14 (voor motoren 1–15)
      // ccVal = 0 → Motor 1, ccVal = 1 → Motor 2, ..., ccVal = 14 → Motor 15
      if (ccVal < 0 || ccVal >= NUM_MOTORS) {
        console.error(`Ongeldige CC-waarde voor modusselectie: ${ccVal}`);
        return;
      }
      // Toggle de controlemodus voor de motor
      // ccVal = 0 → Motor 1, ccVal = 1 → Motor 2, ..., ccVal = 14 → Motor 15
      // motorControlMode[ccVal] = 1 - motorControlMode[ccVal]; // toggle
      // ccVal moet een waarde zijn tussen 0 en 14 (voor motoren 1–15)
      // ccVal = 0 → Motor 1, ccVal = 1 → Motor 2, ..., ccVal = 14 → Motor 15
      
      const motorIndex = Math.min(ccVal, NUM_MOTORS - 1);
      motorControlMode[motorIndex] = 1 - motorControlMode[motorIndex]; // toggle
      console.log(`Motor ${motorIndex + 1} controlemodus: ${motorControlMode[motorIndex] === 0 ? 'NOTE' : 'CC'}`);
    }

    // PWM via CC
    // CC#30 t/m CC#44 → PWM-waarde voor motor 1–15
    // CC#30 → Motor 1, CC#31 → Motor 2, ..., CC#44 → Motor 15
    // Verwacht dat ccVal een waarde is tussen 0 en 127
    // ccVal = 0 → 0% PWM, ccVal = 127 → 100% PWM
    // ccNum = CC#30 → Motor 1, ccNum = CC#31 → Motor 2, ..., ccNum = CC#44 → Motor 15
    // ccNum moet een waarde zijn tussen 30 en 44 (voor motoren 1–15)
    // ccNum = 30 → Motor 1, ccNum = 31 → Motor 2, ..., ccNum = 44 → Motor 15
    //
    if (ccNum >= CC_PWM_START && ccNum < CC_PWM_START + NUM_MOTORS) {
      const motorIndex = ccNum - CC_PWM_START;
      if (motorControlMode[motorIndex] === 1) {
        // Alleen reageren als motor in "cc" mode is
        if (ccVal < 0 || ccVal > 127) {
          console.error(`Ongeldige CC-waarde voor motor ${motorIndex + 1}: ${ccVal}`);
          return;
        }
        // Bereken de PWM-waarde (0–100) op basis van ccVal (0–127)
        // ccVal = 0 → 0% PWM, ccVal = 127 → 100% PWM
        // ccVal moet een waarde zijn tussen 0 en 127 (voor motoren 1–15)
        
        const pwm = Math.round((ccVal / 127) * 100);
        motorPWM[motorIndex] = pwm;
        console.log(`Motor ${motorIndex + 1} PWM via CC#${ccNum}: ${pwm}`);
        sendMotorPacket();
      }
    }
  }
});

// Verzend motorstatus als 21-byte pakket
// Eerste byte is 0xFF, laatste byte is 0xFE
// Bytes 1-5 zijn gereserveerd voor andere doeleinden (bijv. statusinformatie)
// Bytes 6-20 zijn PWM-waarden voor motoren 1–15
// Motor 1 → byte 6, Motor 2 → byte 7, ..., Motor 15 → byte 20
// PWM-waarden zijn 0–100, dus elke byte moet een waarde zijn tussen 0 en 100
// De XBee-module ontvangt dit pakket en stuurt de PWM-waarden door naar de microcontroller
// De microcontroller ontvangt de PWM-waarden en stuurt deze door naar de motoren
// De microcontroller moet de PWM-waarden verwerken en de motoren aansturen
// De microcontroller moet de PWM-waarden omzetten

function sendMotorPacket() {
  const buffer = Buffer.alloc(21);
  buffer[0] = 0xFF;
  buffer[1] = 0x01;
  buffer[2] = 0x10;
  buffer[3] = 0x10;

  for (let i = 0; i < NUM_MOTORS; i++) {
    buffer[6 + i] = motorPWM[i];
  }

  buffer[20] = 0xFE;
  port.write(buffer);
  port.drain(); // Zorg ervoor dat de buffer wordt geleegd voordat we verder gaan
  // console.log('Motorpakket verzonden:', buffer.toString('hex'));
  // Log de verzonden pakket in hexadecimale notatie voor debugging
  // Dit is handig om te controleren of de juiste PWM-waarden worden verzonden
  console.log('Motorpakket verzonden:', buffer.toString('hex'));

}
