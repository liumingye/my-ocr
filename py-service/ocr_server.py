import json
import re
import os
import base64
import numpy as np
import cv2
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer
from thrift_ocr_py.ocr import OcrService
import paddleocr
from tbpu import getParser
import gc
from utils.timer import Timer

# 内存回收时间
gc_time = 60
RUN_PATH = os.path.split(os.path.realpath(__file__))[0]


def gc_collect():
    print("进行内存回收")
    global ppocr
    # 重启ocr，来进行回收内存
    if "ppocr" in dir():
        del ppocr
        initOcr()
    gc.collect()


def initOcr():
    global ppocr
    if "ppocr" in dir():
        return
    print("init ocr")
    ppocr = paddleocr.PaddleOCR(
        # 语言支持
        lang="ch",
        # 是否使用GPU进行预测
        use_gpu=False,
        # 是否显示预测中的日志信息
        show_log=False,
        # 识别inference模型路径
        rec_model_dir=os.path.join(RUN_PATH, "paddle_model", "rec-ch"),
        # 检测inference模型路径
        det_model_dir=os.path.join(RUN_PATH, "paddle_model", "det"),
        # 方向分类器inference模型路径
        cls_model_dir=os.path.join(RUN_PATH, "paddle_model", "cls"),
        # 是否使用方向分类器
        use_angle_cls=True,
        ocr_version="PP-OCRv4",
        enable_mkldnn=True,
    )


class Ocr_handler:
    def ocr(self, nid, img_path, config):
        timer.cancel()
        initOcr()
        # 设置config默认值
        default_config = {"tbpu": "none"}
        config = {**default_config, **config}
        res = {}
        print(f"start ocr {nid} {img_path}")
        print(f"{nid} start ocr")
        try:
            if img_path.startswith("data:"):
                img_data = re.sub("^data:image/.+;base64,", "", img_path)
                im = cv2.imdecode(
                    np.frombuffer(base64.b64decode(img_data), np.uint8), -1
                )
                if im.shape[2] == 4:
                    im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
                result = ppocr.ocr(im, cls=True)
            else:
                result = ppocr.ocr(img_path, cls=True)

            if result:
                tbs = result[0]
                res["code"] = 100

                # 处理数据
                res["data"] = transform_data(tbs)

                # 计算平均置信度
                score, num = 0, 0
                for r in res["data"]:
                    score += r["score"]
                    num += 1
                if num > 0:
                    score /= num
                res["score"] = score

                # 执行 tbpu
                res["data"] = getParser(config["tbpu"]).run(res["data"])
                # 如果忽略区域等处理将所有文本删除，则结束tbpu
                if not res["data"]:
                    res["code"] = 101
                    res["data"] = ""
            else:
                res["code"] = 901
                res["data"] = f"{nid} ocr error"
        except Exception as e:
            print(f"{nid} ocr error {e}")
            res["code"] = 901
            res["data"] = f"{nid} ocr error {e}"
        print("done")
        timer.reset()
        return json.dumps(res)


def transform_data(data):
    transformed_list = []
    for item in data:
        # 对于每一个内部列表，提取 box 和其他信息
        box = item[0]
        text_info = item[1]
        # 创建新的字典并填充数据
        new_item = {"box": box, "score": text_info[1], "text": text_info[0]}
        transformed_list.append(new_item)
    return transformed_list


if __name__ == "__main__":
    # 初始化ocr
    initOcr()
    # 开启内存回收
    gc.enable()
    timer = Timer(gc_time, gc_collect)  # 60 seconds = 1 minute
    # timer.start()
    # ocr服务器
    port = 8265
    host = "127.0.0.1"
    # 创建服务端
    handler = Ocr_handler()  # 自定义类
    processor = OcrService.Processor(handler)  # userService为python接口文件自动生成
    # 监听端口
    transport = TSocket.TServerSocket(host, port)  # host与port位置不可交换
    # 选择传输层
    tfactory = TTransport.TBufferedTransportFactory()
    # 选择传输协议
    pfactory = TBinaryProtocol.TBinaryProtocolFactory()
    # 创建服务端
    server = TServer.TThreadedServer(processor, transport, tfactory, pfactory)
    print(f"start server on {port}")
    server.serve()
    print("Done")
