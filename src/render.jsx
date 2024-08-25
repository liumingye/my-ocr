// render.js
import * as OcrService from "./thrift_ocr_ts/OcrService";
const thrift = require("thrift");

var thriftConnection = null;
window.thriftClient = null;

const init_thrift = () => {
  thriftConnection = thrift.createConnection("127.0.0.1", 8265, {
    timeout: 3000,
  });

  thriftConnection.on("error", function (e) {
    console.error("connect error", e);
    setTimeout(() => {
      console.log("reconnect");
      init_thrift();
    }, 1000);
  });
  // thriftConnection.on("complete", function (e) {
  //   console.log("oncomplete");
  //   thriftClient = thrift.createClient(OcrService, thriftConnection);
  // });
  thriftConnection.on("connect", function (e) {
    console.log("onconnect");
    thriftClient = thrift.createClient(OcrService, thriftConnection);
    console.log(thriftClient);
  });
  thriftConnection.on("close", function (e) {
    console.log("close");
  });
  thriftConnection.on("timeout", function (e) {
    console.log("ontimeout");
  });
};
init_thrift();
