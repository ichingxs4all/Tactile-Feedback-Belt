
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
delay(500);
exit();
}
