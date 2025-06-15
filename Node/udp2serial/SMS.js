//Use the SerialPort package
const { SerialPort } = require('serialport')
let incomingString = ""; //Declare incomming string from serialport message
let serialPortPath='/dev/cu.usbserial-DA013LCA';  //The path of the serial2usb XBee module on the hosting system 

//Use the UDP/datagram sockets package 
const dgram = require('dgram');

//const ip = '127.0.0.1';  //Localhost
const ip = '0.0.0.0';  //All interfaces

const port_rx = 8006; // RX socket port
const port_tx = 8008; //TX socket port

const tx_socket = dgram.createSocket('udp4'); //Create TX socket
const rx_socket = dgram.createSocket('udp4'); //Create RX socket

rx_socket.bind(port_rx,ip); //Start listening on RX socket port


//Error handling TX port
tx_socket.on('error', (err) => {
  console.error(`tx_socket error:\n${err.stack}`);
  tx_socket.close();
});

//Error handling RX port
rx_socket.on('error', (err) => {
  console.error(`rx_socket error:\n${err.stack}`);
  rx_socket.close();
});

//Report listening on RX port
rx_socket.on('listening', () => {
  const address = rx_socket.address();
  console.log(`rx_socket listening ${address.address}:${address.port}`);
});

//When message received on RX socket duplicate it to SerialPort
rx_socket.on('message', (data) => {
    console.log(data);
    //console.log(data.toString());
    //let string = data.toString();
    serialport.write(data);
})

//Test
//udpServer.send('test', port, ip);

//Open the serial
const serialport = new SerialPort({ path: serialPortPath, baudRate: 57600 }, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
})

serialport.on('open', () => {
    console.log("Opened serialport of XBee module");
    //setTimeout(function(){ serialport.write("5050505050505050;"); }, 500);  
});


serialport.on('data', (data) => {
    data.forEach(byte => {
      console.log(byte);
        switch(byte)
        { 
            case 0x0d: // CR: Carriage return
            case 0x0a: // LF: Line Feed //If received send the complete string 
                if(incomingString != "") //If not an empty string 
                {
                    console.log(incomingString); //Log the incomming string
                    tx_socket.send(incomingString,port_tx,ip); //Send the string to TX socket port 
                    incomingString = ""; //Clear the incomming string
                }
                break;
            default:
                let char = String.fromCharCode(byte); //Builtup the string from receiving characters
                incomingString += char;
                break;
        }
    });
});
