type Client = import("@/thrift_ocr_ts/OcrService").Client;

interface Window {
  // 双连接，防止阻塞
  thriftClientA: Client | null;
  thriftClientB: Client | null;
}

type OcrData = {
  result: {
    text: string;
    end: string;
    score: number;
    box: number[][];
  }[];
  score: number;
  time: number;
};
