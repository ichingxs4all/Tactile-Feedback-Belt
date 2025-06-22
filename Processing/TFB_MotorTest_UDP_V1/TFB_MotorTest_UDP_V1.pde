
//Tactile Feedback Belt Motor Test

import hypermedia.net.*;

UDP udp;  // Create a UDP object

byte [] Motors = new byte[21];

int motorNo = 0;

String ip       = "127.0.0.1";  // the remote IP address
int port        = 8006;    // the destination port

String command = "";

color bg = 0;

void setup() {
  size(640, 360);
  textAlign(CENTER);

  Motors[0] = (byte) 255;  //Start byte of motor command
  Motors[1] = (byte) 01;   // Addres
  Motors[2] = (byte) 16;   // Mode
  Motors[3] = (byte) 16;   // Packet size
  Motors[20] = (byte) 254; //Stop byte of motor command

  try {
    udp = new UDP(this, port);  // Try binding to the port
    udp.log(true);
    udp.listen(false);
    println("UDP port " + port + " is available and listening.");
    command = ("UDP port " + port + " is available and listening.");
  }
  catch (Exception e) {
    println("Failed to open UDP port " + port);
    println("Error: " + e.getMessage());
    command = ("Failed to open UDP port " + port);
    bg = color (255, 0, 0);
  }
}

void draw() {
  showMenu();
}

void keyPressed() {
  if (key == 's')  stopAllMotors();
  if (key == 'p')  startAllMotors();
  if (key == 't')  testMotors();
  if (key == 'q')  quit();
}


void stopAllMotors() {
  for (int i = 4; i < 20; i = i+1) {
    Motors[i] = (byte) 0;
  }
  sendMotors();
  command= "All motors stopped";
  bg = color(0, 0, 0);

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
  udp.send(Motors, ip, port);
}


void testMotors() {
  stopAllMotors();
  delay(100);
  Motors[motorNo+4] = (byte) 128;
  sendMotors();
  command = "Motor " + motorNo + " running";
  bg = color(255, 204, 0);
  motorNo++;
  if ( motorNo > 15 ) motorNo = 0;
}


void showMenu() {
  background(bg);
  textSize(40);
  text("Press S to stop", 320, 100);
  text("Press P to start all motors", 320, 150);
  text("Press T to cycle motors ", 320, 200);
  text("Press Q to quit", 320, 250);
  textSize(20);
  text(command, 320, 320);
}

void quit() {
  stopAllMotors();
  exit();
}
