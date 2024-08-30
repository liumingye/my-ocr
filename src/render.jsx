// render.js
import * as OcrService from "./thrift_ocr_ts/OcrService";
const thrift = require("thrift");

var thriftConnectionA = null;
var thriftConnectionB = null;
window.thriftClientA = null;
window.thriftClientB = null;

const init_thrift_A = () => {
  thriftConnectionA = thrift.createConnection("127.0.0.1", 8265, {
    protocol: thrift.TCompactProtocol,
  });
  thriftConnectionA.on("error", function (e) {
    console.error("connect A error", e);
  });
  thriftConnectionA.on("connect", function (e) {
    console.log("onconnect A");
    thriftClientA = thrift.createClient(OcrService, thriftConnectionA);
  });
  thriftConnectionA.on("close", function (e) {
    console.log("onclose A");
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
  thriftConnectionB = thrift.createConnection("127.0.0.1", 8265, {
    protocol: thrift.TCompactProtocol,
  });

  thriftConnectionB.on("error", function (e) {
    console.error("connect B error", e);
  });
  thriftConnectionB.on("connect", function (e) {
    console.log("onconnect B");
    thriftClientB = thrift.createClient(OcrService, thriftConnectionB);
  });
  thriftConnectionB.on("close", function (e) {
    console.log("onclose B");
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
