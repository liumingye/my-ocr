import json
import re
import os
import base64
import numpy as np
import cv2
import time
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TCompactProtocol
from thrift.server import TServer
from thrift_ocr_py.ocr import OcrService
import paddleocr
from tbpu import getParser
import gc
from utils.timer import Timer
from rectify.rectify import correct_image_base64
import argparse

# 内存回收时间
gc_time = 60
RUN_PATH = os.path.split(os.path.realpath(__file__))[0]


def gc_collect():
    print("进行内存回收")
    global ppocr
    # 重启ocr，来进行回收内存
    if "ppocr" in globals():
        del ppocr
        initOcr()
        print("重启ocr")
    gc.collect()


def initOcr():
    global ppocr
    if "ppocr" in globals():
        return
    print("init ocr")

    folderName = ""
    use_onnx = False

    # 判断onnx文件夹是否存在，如果存在就用onnx
    if os.path.exists(os.path.join(RUN_PATH, "paddle_model", "onnx")):
        folderName = "onnx"
        use_onnx = True

    rec_model_dir = os.path.join(RUN_PATH, "paddle_model", folderName, "rec-ch")
    # 检测inference模型路径
    det_model_dir = os.path.join(RUN_PATH, "paddle_model", folderName, "det")
    # 方向分类器inference模型路径
    cls_model_dir = os.path.join(RUN_PATH, "paddle_model", folderName, "cls")

    ppocr = paddleocr.PaddleOCR(
        # 语言支持
        lang="ch",
        # 是否使用GPU进行预测
        use_gpu=False,
        # 是否显示预测中的日志信息
        show_log=False,
        # 识别inference模型路径
        rec_model_dir=rec_model_dir,
        # 检测inference模型路径
        det_model_dir=det_model_dir,
        # 方向分类器inference模型路径
        cls_model_dir=cls_model_dir,
        # 是否使用方向分类器
        use_angle_cls=True,
        # 模型版本
        ocr_version="PP-OCRv4",
        # 是否使用onnx
        use_onnx=use_onnx,
        # 是否使用mkldnn
        # enable_mkldnn=True,
    )


def readBase64Image(b64):
    img_data = re.sub("^data:image/.+;base64,", "", b64)
    im = cv2.imdecode(np.frombuffer(base64.b64decode(img_data), np.uint8), -1)
    if im.shape[2] == 4:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2BGR)
    return im


class Ocr_handler:
    # def four_point_transform(self, img_path):
    #     res = {
    #         "code": 100
    #     }
    #     im = readBase64Image(img_path)
    #     screenCnt, ratio = preProcess(im)
    #     print('four_point_transform', screenCnt)
    #     res["data"] = screenCnt
    #     return json.dumps(res)

    def rectify(self, img_path):
        res = {"code": 100}
        im = readBase64Image(img_path)
        result = correct_image_base64(im)
        print("rectify", result[0:999])
        res["data"] = result
        return json.dumps(res)

    def ocr(self, nid, img_path, config):
        timer.cancel()
        initOcr()
        # 计算开始时间
        start_time_recognition = time.time()
        # 设置config默认值
        default_config = {"tbpu": "none"}
        config = {**default_config, **config}
        # 初始化返回值
        res = {"code": 100, "data": {"score": 1}}
        # print(f"start ocr {nid} {img_path}")
        print(f"start ocr {nid}")
        print(f"{nid} start ocr")
        try:
            if img_path.startswith("data:"):
                im = readBase64Image(img_path)
                result = ppocr.ocr(im)
                # cls = ppocr.ocr(im, False, False, True)
            else:
                result = ppocr.ocr(img_path)
                # cls = ppocr.ocr(img_path, False, False, True)

            # angle = 0
            # if len(cls) > 0:
            #     angle = cls[0][0][0]
            # res["data"]["angle"] = angle

            # 处理数据
            tdata, score = transform_data(result)

            res["data"]["score"] = score

            res["data"]["result"] = []

            # 执行 tbpu
            if len(tdata) > 0:
                res["data"]["result"] = getParser(config["tbpu"]).run(tdata)

        except Exception as e:
            print(e)
            print(f"{nid} ocr error {e}")
            res["code"] = 901
            res["msg"] = f"{nid} ocr error {e}"

        recognition_time = time.time() - start_time_recognition
        res["data"]["time"] = recognition_time

        print("done")
        timer.reset()
        return json.dumps(res)


def transform_data(result):
    total_score = 0
    num_words = 0
    transformed_list = []
    if len(result) > 0:
        for data in result:
            if data is None:
                continue
            for item in data:
                # 对于每一个内部列表，提取 box 和其他信息
                box = item[0]
                text_info = item[1]
                # 创建新的字典并填充数据
                new_item = {"box": box, "score": text_info[1], "text": text_info[0]}
                # 更新总分和词数
                total_score += text_info[1]
                num_words += 1
                # 将新字典添加到列表
                transformed_list.append(new_item)
    average_score = total_score / num_words if num_words > 0 else 0
    return transformed_list, average_score


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MY-OCR Server (Liumingye)")
    parser.add_argument("--port", help="port", required=False)
    args = parser.parse_args()
    if not args.port:
        exit(0)

    # 初始化ocr
    initOcr()
    # 开启内存回收
    gc.enable()
    timer = Timer(gc_time, gc_collect)  # 60 seconds = 1 minute
    # timer.start()
    # ocr服务器
    port = args.port  # 8265
    host = "127.0.0.1"
    # 创建服务端
    handler = Ocr_handler()  # 自定义类
    processor = OcrService.Processor(handler)  # userService为python接口文件自动生成
    # 监听端口
    transport = TSocket.TServerSocket(host, port)  # host与port位置不可交换
    # 选择传输层
    tfactory = TTransport.TBufferedTransportFactory()
    # 选择传输协议
    pfactory = TCompactProtocol.TCompactProtocolFactory()
    # 创建服务端
    server = TServer.TThreadPoolServer(processor, transport, tfactory, pfactory)
    print(f"start server on {port}")
    server.serve()
    print("Done")
