export PY_VERSION=`python3 -V 2>&1|awk '{print $2}'|awk -F '.' '{print $1"."$2}'`
export SITE_PACKAGES_PATH=$(pwd)/myocr-env/lib/python${PY_VERSION}/site-packages
export CODE_PATH=$(pwd)/py-service


myocr-env/bin/pyinstaller --workpath release/build --distpath release --clean -y -D --clean \
    --exclude-module matplotlib \
	--exclude-module pytz \
	./py-service/ocr_server.py \
	-p ${SITE_PACKAGES_PATH}/paddle/libs \
	-p ${SITE_PACKAGES_PATH}/paddleocr \
	-p ${SITE_PACKAGES_PATH}/paddleocr/ppocr/utils/e2e_utils \
	-p ${SITE_PACKAGES_PATH}/paddleocr/ppocr/postprocess \
	-p ${SITE_PACKAGES_PATH}/paddleocr/ppstructure \
	-p ${SITE_PACKAGES_PATH}/paddleocr/ppstructure/layout \
	-p ${SITE_PACKAGES_PATH}/paddle/fluid/proto \
	--add-binary ${SITE_PACKAGES_PATH}/paddle/libs:. \
	--add-data ${CODE_PATH}/paddle_model:./paddle_model \
	--add-data ${CODE_PATH}/thrift_ocr_py:./thrift_ocr_py \
	--additional-hooks-dir=. \
	--hidden-import extract_textpoint_slow \
	--hidden-import framework_pb2 \
	--hidden-import tablepyxl \
	--hidden-import tablepyxl.style \
	--hidden-import skimage.filters.edges \
	--hidden-import picodet_postprocess \
	--add-data ${SITE_PACKAGES_PATH}/onnxruntime/capi/libonnxruntime_providers_shared.so:./onnxruntime/capi \
	--add-data ${SITE_PACKAGES_PATH}/paddleocr/tools:./tools \
	--add-data ${SITE_PACKAGES_PATH}/paddleocr/ppocr/utils/ppocr_keys_v1.txt:./ppocr/utils \
	--add-data ${SITE_PACKAGES_PATH}/paddleocr/ppocr/utils/dict/table_structure_dict.txt:./ppocr/utils/dict
