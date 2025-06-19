// // Please read the ready-to-localize tuturial together with this example.
// // https://www.pozyx.io/Documentation/Tutorials/ready_to_localize
// /**
//   The Pozyx ready to localize tutorial (c) Pozyx Labs

//   Please read the tutorial that accompanies this sketch: https://www.pozyx.io/Documentation/Tutorials/ready_to_localize/Arduino

//   This tutorial requires at least the contents of the Pozyx Ready to Localize kit. It demonstrates the positioning capabilities
//   of the Pozyx device both locally and remotely. Follow the steps to correctly set up your environment in the link, change the
//   parameters and upload this sketch. Watch the coordinates change as you move your device around!
// */

// #include <Pozyx.h>
// #include <Pozyx_definitions.h>
// #include <Wire.h>
// #include <SoftwareSerial.h>

// ////////////////////////////////////////////////
// ////////////////// PARAMETERS //////////////////
// ////////////////////////////////////////////////

// uint16_t remote_id = 0x6928; // set this to the ID of the remote device
// bool remote = false;         // set this to true to use the remote ID

// boolean use_processing = false; // set this to true to output data for the processing sketch

// const uint8_t num_anchors = 4;                                    // the number of anchors
// uint16_t anchors[num_anchors] = {0x6942, 0x695B, 0x6E49, 0x6E4C}; // the network id of the anchors: change these to the network ids of your anchors.
// int32_t anchors_x[num_anchors] = {0, 7229, 7958, 563};            // anchor x-coorindates in mm
// int32_t anchors_y[num_anchors] = {0, -234, 6850, 7036};           // anchor y-coordinates in mm
// int32_t heights[num_anchors] = {2855, 2357, 2626, 2314};          // anchor z-coordinates in mm

// uint8_t algorithm = POZYX_POS_ALG_UWB_ONLY; // positioning algorithm to use. try POZYX_POS_ALG_TRACKING for fast moving objects.
// uint8_t dimension = POZYX_3D;               // positioning dimension
// int32_t height = 1000;                      // height of device, required in 2.5D positioning

// ////////////////////////////////////////////////

// SoftwareSerial XBee(2, 3);

// void setup()
// {
//   Serial.begin(115200);
//   XBee.begin(57600);

//   if (Pozyx.begin() == POZYX_FAILURE)
//   {
//     Serial.println(F("ERROR: Unable to connect to POZYX shield"));
//     Serial.println(F("Reset required"));
//     delay(100);
//     abort();
//   }

//   if (Pozyx.begin(false, MODE_INTERRUPT, POZYX_INT_MASK_IMU) == POZYX_FAILURE)
//   {
//     Serial.println("ERROR: Unable to connect to POZYX shield");
//     Serial.println("Reset required");
//     delay(100);
//     abort();
//   }

//   if (!remote)
//   {
//     remote_id = NULL;
//   }

//   Serial.println(F("----------POZYX POSITIONING V1.1----------"));
//   Serial.println(F("NOTES:"));
//   Serial.println(F("- No parameters required."));
//   Serial.println();
//   Serial.println(F("- System will auto start anchor configuration"));
//   Serial.println();
//   Serial.println(F("- System will auto start positioning"));
//   Serial.println(F("----------POZYX POSITIONING V1.1----------"));
//   Serial.println();
//   Serial.println(F("Performing manual anchor configuration:"));

//   // clear all previous devices in the device list
//   Pozyx.clearDevices(remote_id);
//   // sets the anchor manually
//   setAnchorsManual();
//   // sets the positioning algorithm
//   Pozyx.setPositionAlgorithm(algorithm, dimension, remote_id);

//   printCalibrationResult();
//   delay(2000);

//   Serial.println(F("Starting positioning: "));
// }

// const long interval = 1000;
// unsigned long previousMillis = 0;
// unsigned long previousMillis40 = 0;

// int posCounter = 0;
// int imuCounter = 0;
// int HzCounter = 0;

// void loop()
// {
//   //sensor_raw_t sensor_raw;
//   euler_angles_t euler_angles;
//   uint8_t calibration_status = 0;
//   coordinates_t position;
//   int status;

//   if (Pozyx.waitForFlag(POZYX_INT_STATUS_IMU, 10) == POZYX_SUCCESS)
//   {
//     Pozyx.getEulerAngles_deg(&euler_angles);
//     // Serial.print(euler_angles.heading);
//     // Serial.print(euler_angles.roll);
//     // Serial.print(euler_angles.pitch);
//     //Pozyx.getCalibrationStatus(&calibration_status);
//     // imuCounter++;
//   }
//   // else
//   // {
//   //   uint8_t interrupt_status = 0;
//   //   Pozyx.getInterruptStatus(&interrupt_status);
//   //   return;
//   // }

//   status = Pozyx.doPositioning(&position, dimension, height, algorithm);

//   // if (status == POZYX_SUCCESS)
//   // {
//   //   // prints out the result
//   //   // printCoordinates(position);
//   //   // posCounter++;
//   // }
//   // else
//   // {
//   //   // prints out the error code
//   //   // printErrorCode("asd");
//   // }

//   // unsigned long currentMillis = millis();
//   // if (currentMillis - previousMillis40 >= 25)
//   // {
//   //   previousMillis40 = currentMillis;
//   //   HzCounter++;
//   // }

//   String message;
//   message += position.x;
//   message += ",";
//   message += position.y;
//   message += ",";
//   message += position.z;
//   message += ",";

//   message += euler_angles.heading;
//   message += ",";
//   message += euler_angles.pitch;
//   message += ",";
//   message += euler_angles.roll;
//   message += ",";

//   //XBee.println(message);
//   //HzCounter++;
//   XBee.println(message);

//   // if (currentMillis - previousMillis >= interval)
//   // {
//   //   // save the last time you blinked the LED
//   //   previousMillis = currentMillis;
//   //   //Serial.print(imuCounter);
//   //   //Serial.print("   ");
//   //   //Serial.print(posCounter);
//   //   //Serial.print("   ");
//   //   XBee.println(HzCounter);
//   //   imuCounter = 0;
//   //   posCounter = 0;
//   //   HzCounter = 0;
//   // }
// }

// // prints the coordinates for either humans or for processing
// void printCoordinates(coordinates_t coor)
// {
//   uint16_t network_id = remote_id;
//   if (network_id == NULL)
//   {
//     network_id = 0;
//   }
//   if (!use_processing)
//   {
//     Serial.print("POS ID 0x");
//     Serial.print(network_id, HEX);
//     Serial.print(", x(mm): ");
//     Serial.print(coor.x);
//     Serial.print(", y(mm): ");
//     Serial.print(coor.y);
//     Serial.print(", z(mm): ");
//     Serial.println(coor.z);
//   }
//   else
//   {
//     Serial.print("POS,0x");
//     Serial.print(network_id, HEX);
//     Serial.print(",");
//     Serial.print(coor.x);
//     Serial.print(",");
//     Serial.print(coor.y);
//     Serial.print(",");
//     Serial.println(coor.z);
//   }
// }

// // error printing function for debugging
// void printErrorCode(String operation)
// {
//   uint8_t error_code;
//   if (remote_id == NULL)
//   {
//     Pozyx.getErrorCode(&error_code);
//     Serial.print("ERROR ");
//     Serial.print(operation);
//     Serial.print(", local error code: 0x");
//     Serial.println(error_code, HEX);
//     return;
//   }
//   int status = Pozyx.getErrorCode(&error_code, remote_id);
//   if (status == POZYX_SUCCESS)
//   {
//     Serial.print("ERROR ");
//     Serial.print(operation);
//     Serial.print(" on ID 0x");
//     Serial.print(remote_id, HEX);
//     Serial.print(", error code: 0x");
//     Serial.println(error_code, HEX);
//   }
//   else
//   {
//     Pozyx.getErrorCode(&error_code);
//     Serial.print("ERROR ");
//     Serial.print(operation);
//     Serial.print(", couldn't retrieve remote error code, local error: 0x");
//     Serial.println(error_code, HEX);
//   }
// }

// // print out the anchor coordinates (also required for the processing sketch)
// void printCalibrationResult()
// {
//   uint8_t list_size;
//   int status;

//   status = Pozyx.getDeviceListSize(&list_size, remote_id);
//   Serial.print("list size: ");
//   Serial.println(status * list_size);

//   if (list_size == 0)
//   {
//     printErrorCode("configuration");
//     return;
//   }

//   uint16_t device_ids[list_size];
//   status &= Pozyx.getDeviceIds(device_ids, list_size, remote_id);

//   Serial.println(F("Calibration result:"));
//   Serial.print(F("Anchors found: "));
//   Serial.println(list_size);

//   coordinates_t anchor_coor;
//   for (int i = 0; i < list_size; i++)
//   {
//     Serial.print("ANCHOR,");
//     Serial.print("0x");
//     Serial.print(device_ids[i], HEX);
//     Serial.print(",");
//     Pozyx.getDeviceCoordinates(device_ids[i], &anchor_coor, remote_id);
//     Serial.print(anchor_coor.x);
//     Serial.print(",");
//     Serial.print(anchor_coor.y);
//     Serial.print(",");
//     Serial.println(anchor_coor.z);
//   }
// }

// // function to manually set the anchor coordinates
// void setAnchorsManual()
// {
//   for (int i = 0; i < num_anchors; i++)
//   {
//     device_coordinates_t anchor;
//     anchor.network_id = anchors[i];
//     anchor.flag = 0x1;
//     anchor.pos.x = anchors_x[i];
//     anchor.pos.y = anchors_y[i];
//     anchor.pos.z = heights[i];
//     Pozyx.addDevice(anchor, remote_id);
//   }
//   if (num_anchors > 4)
//   {
//     Pozyx.setSelectionOfAnchors(POZYX_ANCHOR_SEL_AUTO, num_anchors, remote_id);
//   }
// }
