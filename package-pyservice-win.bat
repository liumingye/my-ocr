set SITE_PACKAGES_PATH=%cd%\myocr-env\Lib\site-packages
set CODE_PATH=%cd%\py-service


myocr-env\Scripts\pyinstaller --workpath release\build --distpath release --clean -y -D --clean ^
-i build\logo.ico ^
--exclude-module matplotlib ^
--exclude-module pytz ^
.\py-service\ocr_server.py ^
-p %SITE_PACKAGES_PATH%\paddle\libs ^
-p %SITE_PACKAGES_PATH%\paddle\fluid\proto ^
-p %SITE_PACKAGES_PATH%\paddleocr ^
-p %SITE_PACKAGES_PATH%\paddleocr\ppocr\utils\e2e_utils ^
-p %SITE_PACKAGES_PATH%\paddleocr\ppocr\postprocess ^
-p %SITE_PACKAGES_PATH%\paddleocr\ppstructure ^
-p %SITE_PACKAGES_PATH%\paddleocr\ppstructure\layout ^
--add-binary %SITE_PACKAGES_PATH%\paddle\libs;.\paddle\libs ^
--add-data %CODE_PATH%\paddle_model;.\paddle_model ^
--additional-hooks-dir=. ^
--hidden-import framework_pb2 ^
--hidden-import extract_textpoint_slow ^
--hidden-import tablepyxl ^
--hidden-import tablepyxl.style ^
--hidden-import skimage.filters.edges ^
--hidden-import picodet_postprocess ^
--add-data %SITE_PACKAGES_PATH%\onnxruntime\capi\onnxruntime_providers_shared.dll;.\onnxruntime\capi ^
--add-data %SITE_PACKAGES_PATH%\paddleocr\tools;.\tools ^
--add-data %SITE_PACKAGES_PATH%\paddleocr\ppocr\utils\ppocr_keys_v1.txt;.\ppocr\utils ^
--add-data %SITE_PACKAGES_PATH%\paddleocr\ppocr\utils\dict\table_structure_dict.txt;.\ppocr\utils\dict
