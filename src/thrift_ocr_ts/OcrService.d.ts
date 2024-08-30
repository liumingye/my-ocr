//
// Autogenerated by Thrift Compiler (0.20.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import thrift = require('thrift');
import Thrift = thrift.Thrift;
import Q = thrift.Q;
import Int64 = require('node-int64');

import ttypes = require('./ocr_types');

declare class Client {
  private output: thrift.TTransport;
  private pClass: thrift.TProtocol;
  private _seqid: number;

  constructor(output: thrift.TTransport, pClass: { new(trans: thrift.TTransport): thrift.TProtocol });

  ocr(id: string, path: string, config: { [k: string]: string; }): string;

  ocr(id: string, path: string, config: { [k: string]: string; }, callback: (error: Error, response: string)=>void): void;

  rectify(base64: string): string;

  rectify(base64: string, callback: (error: Error, response: string)=>void): void;
}

declare class Processor {
  private _handler: object;

  constructor(handler: object);
  process(input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_ocr(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_rectify(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
}
