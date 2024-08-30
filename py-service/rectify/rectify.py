from .transform import four_point_transform
import cv2, imutils
# from .imgEnhance import Enhancer
import numpy
import base64
# import re
# from io import BytesIO


def preProcess(image):
    # ratio = image.shape[0] / 2000
    ratio = 1

    # image = imutils.resize(image, height=2000)

    grayImage = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gaussImage = cv2.GaussianBlur(grayImage, (5, 5), 0)
    edgedImage = cv2.dilate(gaussImage, numpy.ones((3, 3), numpy.uint8), iterations=2)
    edgedImage = cv2.erode(edgedImage, numpy.ones((2, 2), numpy.uint8), iterations=3)
    edgedImage = cv2.threshold(edgedImage, 90, 255, cv2.THRESH_BINARY)[1]
    # edgedImage = cv2.Canny(edgedImage, 70, 200)

    cnts = cv2.findContours(edgedImage.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = cnts[1] if imutils.is_cv3() else cnts[0]
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    screenCnt = {}
    for c in cnts:
        peri = cv2.arcLength(c, True)  # Calculating contour circumference
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            if (
                abs(round((approx[0][0][0] - approx[1][0][0]) / image.shape[0])) == 1
                or abs(round((approx[2][0][1] - approx[0][0][1]) / image.shape[1])) == 1
            ):
                screenCnt = approx
                break
    # print(screenCnt)
    return screenCnt, ratio


def _correct_image(image):
    screenCnt, ratio = preProcess(image)
    if len(screenCnt) > 0:
        warped = four_point_transform(image, screenCnt.reshape(4, 2) * ratio)
        return warped
        # enhancer = Enhancer()
        # return enhancer.gamma(warped, 1.63)
    return {}

def correct_image_base64(image):

    # # 获取图像的大小
    # height, width, _ = image.shape

    # # 设置白边的大小
    # border_size = 20

    # # 创建一个白色背景的图像
    # new_height = height + border_size * 2
    # new_width = width + border_size * 2
    # enhancedImg = numpy.full((new_height, new_width, 3), 0, numpy.uint8)

    # # 将原图像复制到新图像中央位置
    # x_offset = border_size
    # y_offset = border_size
    # enhancedImg[y_offset : y_offset + height, x_offset : x_offset + width] = image

    enhancedImg = _correct_image(image)
    if len(enhancedImg) == 0:
        enhancedImg = image
    # return enhancedImg
    content = cv2.imencode('.jpg', enhancedImg)[1]
    base64_str = str(base64.b64encode(content))[2:-1]
    return base64_str


# if __name__ == "__main__":
    # image = cv2.imread("image.jpg", cv2.IMREAD_COLOR)

    # imagedata = base64.b64decode(b64data)
    # image_tmp = cv2.imdecode(numpy.fromstring(imagedata, numpy.uint8), cv2.IMREAD_COLOR)

    # 获取图像的大小
    # height, width, _ = image.shape

    # # 设置白边的大小
    # border_size = 20

    # # 创建一个白色背景的图像
    # new_height = height + border_size * 2
    # new_width = width + border_size * 2
    # new_image = numpy.full((new_height, new_width, 3), 0, numpy.uint8)

    # # 将原图像复制到新图像中央位置
    # x_offset = border_size
    # y_offset = border_size
    # new_image[y_offset : y_offset + height, x_offset : x_offset + width] = image

    # enhancedImg = correct_image(image)
    # if len(enhancedImg) == 0:
    #     enhancedImg = image

    # cv2.imshow("org", image)
    # cv2.imshow("gamma", enhancedImg)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
