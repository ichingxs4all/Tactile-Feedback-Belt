import themidibus.*; //Import the library
import javax.sound.midi.MidiMessage; //Import the MidiMessage classes http://java.sun.com/j2se/1.5.0/docs/api/javax/sound/midi/MidiMessage.html
import javax.sound.midi.SysexMessage;
import javax.sound.midi.ShortMessage;

MidiBus myBus; // The MidiBus


//Tactile Feedback Belt Motor Test using the USB serial port XBee adapter

import processing.serial.*;

Serial XBeePort;  // Create object from Serial class

String portName = "/dev/tty.usbserial-DA013LCA";

byte [] Motors = new byte[21];

int motorNo = 0;

String command = "";

color bg = 0;

void setup() {
  size(640, 360);
  textSize(25);
  textAlign(CENTER);
  
  MidiBus.list(); // List all available Midi devices on STDOUT. This will show each device's index and name.
  myBus = new MidiBus(this, 1, 2); // Create a new MidiBus object
  myBus.sendTimestamps(false);
  
  try {
    XBeePort = new Serial(this, portName, 57600);
    command = ("Serial port opened successfully: " + portName);
    println("Serial port opened successfully: " + portName);
    //bg = color(0,255,0);
  } catch (Exception e) {
    command =("Failed to open serial port: " + portName);
    bg = color (255,0,0);
    println("Failed to open serial port: " + portName);
    println("Error: " + e.getMessage());
    printArray(Serial.list());
  }
 
  Motors[0] = (byte) 255;  //Start byte of motor command
  Motors[1] = (byte) 01;   // Addres
  Motors[2] = (byte) 16;   // Mode
  Motors[3] = (byte) 16;   // Packet size
  Motors[20] = (byte) 254; //Stop byte of motor command 
}

void draw() {
  showMenu();
}

void keyPressed() {
  if (key == 's')  stopAllMotors();
  if (key == 'p')  startAllMotors();
  if (key == 't')  testMotors();
  if (key == 'y') testMotors2();
  if (key == 'q')  quit();
}


void stopAllMotors() {
  for (int i = 4; i < 20; i = i+1) {
    Motors[i] = (byte) 0;
  }
  sendMotors();
  command= "All motors stopped";
  bg = color(0, 0, 0);
  //motorNo = 0;
}

void startAllMotors() {
  for (int i = 4; i < 20; i = i+1) {
    Motors[i] = (byte) 128;
  }
  sendMotors();
  command = "All motors running";
  bg = color(0, 204, 0);
}


void sendMotors() {
  for (byte b : Motors) {
    int val = b & 0xFF;
  }
  XBeePort.write(Motors);
}


void testMotors() {
  stopAllMotors();
  delay(100);
  Motors[motorNo+4] = (byte) 128;
  sendMotors();
  command = "Motor " + motorNo + " running";
  bg = color(255, 204, 0);
  motorNo++;
  if ( motorNo > 14 ) motorNo = 0;
}

void testMotors2() {
  stopAllMotors();
  delay(100);
  Motors[motorNo+4] = (byte) 128;
  sendMotors();
  command = "Motor " + motorNo + " running";
  bg = color(255, 204, 0);
  motorNo--;
  if ( motorNo < 0 ) motorNo = 14;
}

void showMenu(){
  background(bg);
  textSize(40);
  text("Press S to stop",320,75);
  text("Press P to start all motors",320,125);
  text("Press T to cycle motors CW ",320,175);
  text("Press Y to cycle motors CCW ",320,225);
  text("Press Q to quit",320,275);
  textSize(25);
  text(command, 320,320);
}

void quit(){
stopAllMotors();
myBus.clearAll();
myBus.dispose();
delay(1000);
exit();
}


// Notice all bytes below are converted to integeres using the following system:
// int i = (int)(byte & 0xFF) 
// This properly convertes an unsigned byte (MIDI uses unsigned bytes) to a signed int
// Because java only supports signed bytes, you will get incorrect values if you don't do so

void rawMidi(byte[] data) { // You can also use rawMidi(byte[] data, String bus_name)
  // Receive some raw data
  // data[0] will be the status byte
  // data[1] and data[2] will contain the parameter of the message (e.g. pitch and volume for noteOn noteOff)
  println();
  println("Raw Midi Data:");
  println("--------");
  println("Status Byte/MIDI Command:"+(int)(data[0] & 0xFF));
  // N.B. In some cases (noteOn, noteOff, controllerChange, etc) the first half of the status byte is the command and the second half if the channel
  // In these cases (data[0] & 0xF0) gives you the command and (data[0] & 0x0F) gives you the channel
  for (int i = 1;i < data.length;i++) {
    println("Param "+(i+1)+": "+(int)(data[i] & 0xFF));
  }
}

void midiMessage(MidiMessage message) { // You can also use midiMessage(MidiMessage message, long timestamp, String bus_name)
  // Receive a MidiMessage
  // MidiMessage is an abstract class, the actual passed object will be either javax.sound.midi.MetaMessage, javax.sound.midi.ShortMessage, javax.sound.midi.SysexMessage.
  // Check it out here http://java.sun.com/j2se/1.5.0/docs/api/javax/sound/midi/package-summary.html
  println();
  println("MidiMessage Data:");
  println("--------");
  println("Status Byte/MIDI Command:"+message.getStatus());
  for (int i = 1;i < message.getMessage().length;i++) {
    println("Param "+(i+1)+": "+(int)(message.getMessage()[i] & 0xFF));
  }
}

//void delay(int time) {
//  int current = millis();
//  while (millis () < current+time) Thread.yield();
//}
