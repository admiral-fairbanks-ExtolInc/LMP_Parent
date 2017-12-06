
#include <Wire.h>
#include <stdbool.h>

const byte SLAVE_ADDRESS = 0x04;

const int LOOP_DELAY = 10;

const int BLINK_DELAY = 50;

const int NO_CMD = 0;
const int MIN_CMD = 1;
const int MAX_CMD = 4;

const int MAX_REQ_DATA = 15;
const int MAX_RES_DATA = 15;

const int MAX_REQ_QUEUE_SIZE = 5;
const int MAX_RES_QUEUE_SIZE = 5;

typedef struct {
  uint8_t cmd; // number representing some command
  byte data[MAX_REQ_DATA];  // a ten character buffer for optional data relating to the command
  size_t len;
} SvcReq;

typedef struct {
  uint8_t cmd; // number representing some command
  //byte data[MAX_RES_DATA];  // buffer for optional data relating to the command
  byte *data;  // buffer for optional data relating to the command
  size_t len;
} SvcRes;

const SvcReq NULL_SvcReq = {NO_CMD, { 0x00 }, 0};
const SvcRes NULL_SvcRes = {NO_CMD, NULL, 0};

typedef struct {
  char *name;
  int head;
  int tail;
  int count;
  int max;
} QueueControl;

QueueControl qcReq = {"Request Queue", 0, -1, 0, MAX_REQ_QUEUE_SIZE};
QueueControl qcRes = {"Response Queue", 0, -1, 0, MAX_RES_QUEUE_SIZE};

SvcReq reqQueue[MAX_REQ_QUEUE_SIZE];
SvcRes resQueue[MAX_REQ_QUEUE_SIZE];

/*
 * BEGIN queue functions
 */

void printQueueStatus(QueueControl *qp) {
  //Serial.print("Queue status: ");
  //Serial.print(qp->name);
  //Serial.print(", head=");
  //Serial.print(qp->head);
  //Serial.print(", tail=");
  //Serial.print(qp->tail);
  //Serial.print(", count=");
  //Serial.print(qp->count);
  //Serial.print(", max=");
  //Serial.println(qp->max);
}

bool isEmpty(QueueControl *qp) {
  return qp->count == 0;
}

bool isFull(QueueControl *qp) {
  return qp->count == qp->max;
}

int size(QueueControl *qp) {
  return qp->count;
}

void insertSvcReq(SvcReq svcReq) {

  if (!isFull(&qcReq)) {

    if (qcReq.tail == MAX_REQ_QUEUE_SIZE-1) {
      qcReq.tail = -1;
    }

    reqQueue[++qcReq.tail] = svcReq;
    qcReq.count++;

  } else {
    //Serial.println("Request Queue at max size!");
  }
}

SvcReq removeSvcReq() {

  if (qcReq.count > 0) {

    SvcReq svcReq = reqQueue[qcReq.head++];

    if (qcReq.head == MAX_REQ_QUEUE_SIZE) {
      qcReq.head = 0;
    }

    qcReq.count--;
    return svcReq;

  } else {
    return NULL_SvcReq;
  }

}

void insertSvcRes(SvcRes svcRes) {

  if (!isFull(&qcRes)) {

    if (qcRes.tail == MAX_RES_QUEUE_SIZE-1) {
      qcRes.tail = -1;
    }

    resQueue[++qcRes.tail] = svcRes;
    qcRes.count++;

  } else {
    //Serial.println("Response Queue at max size!");
  }
}

SvcRes removeSvcRes() {

  if (qcRes.count > 0) {

    SvcRes svcRes = resQueue[qcRes.head++];

    if (qcRes.head == MAX_RES_QUEUE_SIZE) {
      qcRes.head = 0;
    }

    qcRes.count--;
    return svcRes;

  } else {
    return NULL_SvcRes;
  }

}

/*
 * END queue functions
 */

typedef void (* ReqServiceFP)(byte data[], size_t len);
typedef void (* ResServiceFP)(byte data[], size_t len);

void doBlink(byte data[], size_t len) {

  // turn the LED on (HIGH is the voltage level)
  digitalWrite(LED_BUILTIN, HIGH);
  // wait for BLINK_DELAY milliseconds
  delay(BLINK_DELAY);
  // turn the LED off (LOW is the voltage level)
  digitalWrite(LED_BUILTIN, LOW);

  //Serial.println("\nFinished service doBlink!");
}

void healthCheckReq(byte data[], size_t len) {
  String msg = "Slave0x04";
  int msgLen = msg.length();
  byte buff[msgLen];
  msg.getBytes(buff, msgLen);
  SvcRes svcRes = {1, buff, msgLen};
  //svcRes.data = "Slave0x04";
  insertSvcRes(svcRes);
  printQueueStatus(&qcRes);
  //Serial.println("\nFinished service healthCheckReq!");
}

void healthCheckRes(byte data[], size_t len) {
  Wire.write("Slave0x04");
  //Wire.write(data, len);
}

volatile ReqServiceFP reqServices[2] = {
  &doBlink,
  &healthCheckReq
};

volatile ResServiceFP resServices[1] = {
  &healthCheckRes
};

bool isValidCommand(int cmd) {
  if (cmd >= MIN_CMD && cmd <= MAX_CMD) {
    return true;
  } else {
    return false;
  }
}

SvcReq readSvcReq(int numBytes) {

  byte data;
  SvcReq svcReq;

  // first byte is the command
  data = Wire.read();
  if (isValidCommand(data)) {
    svcReq.cmd = data;
    //Serial.print("Received valid command=");
    //Serial.println(data);
    // check if command includes data
    if (numBytes > 1) {
      //Serial.println("Reading command data:");
      int cmdDataIdx = 0;
      while (Wire.available()) {
        data = Wire.read();
        if (cmdDataIdx < MAX_REQ_DATA) {
          svcReq.data[cmdDataIdx++] = data;
        }
        //Serial.print("\tbyte #");
        //Serial.print(cmdDataIdx);
        //Serial.print("=");
        //Serial.println(data);
      }
      svcReq.len = cmdDataIdx;
    }

  } else {
    //Serial.println("Received invalid command");
    svcReq = NULL_SvcReq;
  }

  return svcReq;
}

void handleReceive(int numBytes) {
  SvcReq svcReq;
  if (numBytes > 0) {
    svcReq = readSvcReq(numBytes);
    insertSvcReq(svcReq);
    //Serial.println("Inserted svcReq");
    printQueueStatus(&qcReq);
  }
}

void processSvcReq(SvcReq svcReq) {
  int idx = svcReq.cmd - 1;
  reqServices[idx](svcReq.data, svcReq.len);
}

void execQueuedSvcReq() {

  if (!isEmpty(&qcReq)) {
    SvcReq svcReq = removeSvcReq();
    processSvcReq(svcReq);
    //Serial.println("Removed svcReq");
    printQueueStatus(&qcReq);
  }

}

void processSvcRes(SvcRes svcRes) {
  int idx = svcRes.cmd - 1;
  resServices[idx](svcRes.data, svcRes.len);
}

void handleRequest() {

  if (!isEmpty(&qcRes)) {
    SvcRes svcRes = removeSvcRes();
    processSvcRes(svcRes);
    //Serial.println("Removed svcRes");
    printQueueStatus(&qcRes);
  } else {
    //Serial.println("Response Queue is empty!");
  }
}

void setup() {

  Wire.begin(SLAVE_ADDRESS);    // join i2c bus with slave address
  Wire.onReceive(handleReceive); // register event
  Wire.onRequest(handleRequest); // register event

  //Serial.begin(9600);           // start serial for output

  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  delay(LOOP_DELAY);
  execQueuedSvcReq();
}
