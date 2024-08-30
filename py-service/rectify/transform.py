# -*- coding: utf-8 -*-
import numpy as np
import cv2


def order_rect(points):
    # initialize result -> rectangle coordinates (4 corners, 2 coordinates (x,y))
    res = np.zeros((4, 2), dtype=np.float32)

    left_to_right = points[points[:, 0].argsort()] # Sorted by x

    left_points = left_to_right[:2,:]
    left_points = left_points[left_points[:, 1].argsort()] # Sorted by y
    right_points = left_to_right[2:,:]
    right_points = right_points[right_points[:, 1].argsort()] # Sorted by y

    res[0] = left_points[0]
    res[1] = right_points[0]
    res[2] = right_points[1]
    res[3] = left_points[1]

    return res


def four_point_transform(img, points):
    # copied from: https://www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
    # obtain a consistent order of the points and unpack them
    # individually
    rect = order_rect(points)
    (tl, tr, br, bl) = rect

    # compute the width of the new image, which will be the
    # maximum distance between bottom-right and bottom-left
    # x-coordiates or the top-right and top-left x-coordinates
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # compute the height of the new image, which will be the
    # maximum distance between the top-right and bottom-right
    # y-coordinates or the top-left and bottom-left y-coordinates
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array(
        [[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]],
        dtype=np.float32,
    )

    # compute the perspective transform matrix and then apply it
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

    # return the warped image
    return warped
