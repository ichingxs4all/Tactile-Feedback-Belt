// Please read the ready-to-localize tuturial together with this example.
// https://www.pozyx.io/Documentation/Tutorials/ready_to_localize
/**
  The Pozyx ready to localize tutorial (c) Pozyx Labs

  Please read the tutorial that accompanies this sketch: https://www.pozyx.io/Documentation/Tutorials/ready_to_localize/Arduino

  This tutorial requires at least the contents of the Pozyx Ready to Localize kit. It demonstrates the positioning capabilities
  of the Pozyx device both locally and remotely. Follow the steps to correctly set up your environment in the link, change the
  parameters and upload this sketch. Watch the coordinates change as you move your device around!
*/

#include <Pozyx.h>
#include <Pozyx_definitions.h>
#include <Wire.h>
#include <SoftwareSerial.h>

////////////////////////////////////////////////
////////////////// PARAMETERS //////////////////
////////////////////////////////////////////////

uint16_t remote_id = 0x6928; // set this to the ID of the remote device
bool remote = false;         // set this to true to use the remote ID

boolean use_processing = false; // set this to true to output data for the processing sketch

const uint8_t num_anchors = 4;                                    // the number of anchors
uint16_t anchors[num_anchors] = {0x6942, 0x695B, 0x6E49, 0x6E4C}; // the network id of the anchors: change these to the network ids of your anchors.
int32_t anchors_x[num_anchors] = {0, 1320, 1320, 0};            // anchor x-coorindates in mm
int32_t anchors_y[num_anchors] = {1320, 1320, 0, 0};           // anchor y-coordinates in mm
int32_t heights[num_anchors] = {767, 767, 767, 767};          // anchor z-coordinates in mm

uint8_t algorithm = POZYX_POS_ALG_UWB_ONLY; // positioning algorithm to use. try POZYX_POS_ALG_TRACKING for fast moving objects.
uint8_t dimension = POZYX_3D;               // positioning dimension
int32_t height = 1000;                      // height of device, required in 2.5D positioning

////////////////////////////////////////////////

//SoftwareSerial XBee(2, 3);

void setup()
{
  Serial.begin(57600);
  //XBee.begin(57600);

  if (Pozyx.begin() == POZYX_FAILURE)
  {
    Serial.println(F("ERROR: Unable to connect to POZYX shield"));
    Serial.println(F("Reset required"));
    delay(100);
    abort();
  }

  if (Pozyx.begin(false, MODE_INTERRUPT, POZYX_INT_MASK_IMU) == POZYX_FAILURE)
  {
    Serial.println("ERROR: Unable to connect to POZYX shield");
    Serial.println("Reset required");
    delay(100);
    abort();
  }

  if (!remote)
  {
    remote_id = NULL;
  }

  Serial.println(F("----------POZYX POSITIONING V1.1----------"));
  Serial.println(F("NOTES:"));
  Serial.println(F("- No parameters required."));
  Serial.println();
  Serial.println(F("- System will auto start anchor configuration"));
  Serial.println();
  Serial.println(F("- System will auto start positioning"));
  Serial.println(F("----------POZYX POSITIONING V1.1----------"));
  Serial.println();
  Serial.println(F("Performing manual anchor configuration:"));

  // clear all previous devices in the device list
  Pozyx.clearDevices(remote_id);
  // sets the anchor manually
  setAnchorsManual();
  // sets the positioning algorithm
  Pozyx.setPositionAlgorithm(algorithm, dimension, remote_id);

  printCalibrationResult();
  delay(2000);

  Serial.println(F("Starting positioning: "));
}

void loop()
{
  euler_angles_t euler_angles;
  uint8_t calibration_status = 0;
  coordinates_t position;
  int status;

  if (Pozyx.waitForFlag(POZYX_INT_STATUS_IMU, 10) == POZYX_SUCCESS)
  {
    Pozyx.getEulerAngles_deg(&euler_angles);
  }

  status = Pozyx.doPositioning(&position, dimension, height, algorithm);

  if (status == POZYX_SUCCESS)
  {
    //sendMessage(position, euler_angles);    
  }

    sendMessage(position, euler_angles);  
}

void sendMessage(coordinates_t p, euler_angles_t e_a){    
  String message;
  message += p.x;
  message += ",";
  message += p.y;
  message += ",";
  message += p.z;
  message += ",";

  message += e_a.heading;
  message += ",";
  message += e_a.pitch;
  message += ",";
  message += e_a.roll;
  message += ",";

  Serial.println(message);
}
