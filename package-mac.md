# MY-OCR编译和打包过程（mac版）

## 编译和打包的系统环境

操作系统：macOS 13.6.3

python版本：3.12.5 64bit（miniconda）

nodejs版本：20.12.2

yarn版本：1.22.19


### 基本环境准备

- 安装python3，为了打包python程序更干净推荐使用virtualenv安装虚拟环境

`pip install virtualenv`

- 安装nodejs，推荐使用nvm方便安装不同版本，我使用的是node v20

### 拉取代码

`git clone https://github.com/liumingye/my-ocr.git`
进入项目目录（后面执行命令都是在项目根目录内执行）
`cd my-ocr`

## python部分的调试和打包

### 安装python虚拟环境

`virtualenv myocr-env` or `python3 -m venv myocr-env`

### 安装python依赖库

`myocr-env\bin\python -m pip install -r py-service\requirements.txt --index-url=http://mirrors.aliyun.com/pypi/simple/`

### 打包后无法运行ocr-server报错File "paddle/fluid/core.py", line 418, in set_paddle_lib_path

修改paddle/fluid/core.py文件

```if hasattr(site, 'USER_SITE'):```

替换为

```if hasattr(site, 'USER_SITE') and site.USER_SITE:```


### 测试ocr-server运行和安装ppocr模型

`myocr-env\Scripts\python.exe py-service\ocr_server.py`
不出意外会自动下载ppocr相关模型文件到 py-service\paddle_model 目录下，然后显示`start server on 8265` 就说明python端ocr服务可以正常运行，运行正常就可以退出了

### 使用pyinstaller对py-service打包成exe文件

使用pyinstaller打包py-service，具体命令已经写好shell脚本，在项目根目录下直接执行即可
`yarn build-py-mac`
打包过程大概需要几分钟，全部执行完成之后，会在项目目录的 release 目录下生成 ocr_server 的目录，就是打包生成的最终文件，执行`/release/ocr_server/ocr_server.exe` 不出意外可以看到输出`start server on 8265` 就说明一切正常。

## 运行和打包 elactron 程序部分

本项目界面基于字节跳动的 arco design 的 react 开发，执行下面的命令打包
`yarn build`
不出意外会在目录`out\MY-OCR-darwin-x64`下生成最终的app程序，双击执行`out\MY-OCR-darwin-x64\MY-OCR.app`即可启动，打包后生成文件总共1.52GB。
