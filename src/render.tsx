import * as OcrService from "./thrift_ocr_ts/OcrService";
import {
  createConnection,
  createClient,
  Connection,
  TCompactProtocol,
} from "thrift";

var thriftConnectionA: Connection | null = null;
var thriftConnectionB: Connection | null = null;
window.thriftClientA = null;
window.thriftClientB = null;

const init_thrift_A = () => {
  thriftConnectionA = createConnection("127.0.0.1", 8265, {
    protocol: TCompactProtocol,
  });
  thriftConnectionA.on("error", function (e) {
    console.error("connect A error", e);
  });
  thriftConnectionA.on("connect", function (e) {
    console.log("onconnect A");
    if (!thriftConnectionA) return;
    window.thriftClientA = createClient(OcrService, thriftConnectionA);
  });
  thriftConnectionA.on("close", function (e) {
    console.log("onclose A");
    window.thriftClientA = null;
    setTimeout(() => {
      console.log("reconnect");
      init_thrift_A();
    }, 1000);
  });
  thriftConnectionA.on("timeout", function (e) {
    console.log("ontimeout A");
  });
};

const init_thrift_B = () => {
  thriftConnectionB = createConnection("127.0.0.1", 8265, {
    protocol: TCompactProtocol,
  });

  thriftConnectionB.on("error", function (e) {
    console.error("connect B error", e);
  });
  thriftConnectionB.on("connect", function (e) {
    console.log("onconnect B");
    if (!thriftConnectionB) return;
    window.thriftClientB = createClient(OcrService, thriftConnectionB);
  });
  thriftConnectionB.on("close", function (e) {
    console.log("onclose B");
    window.thriftClientB = null;
    setTimeout(() => {
      console.log("reconnect");
      init_thrift_B();
    }, 1000);
  });
  thriftConnectionB.on("timeout", function (e) {
    console.log("ontimeout B");
  });
};

const init_thrift = () => {
  init_thrift_A();
  init_thrift_B();
};

init_thrift();
