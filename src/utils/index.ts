export const isAcceptFile = (file: File, accept: string) => {
  if (accept && file) {
    const accepts = Array.isArray(accept)
      ? accept
      : accept
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x);
    const fileExtension =
      file.name.indexOf(".") > -1 ? file.name.split(".").pop() : "";
    return accepts.some((type) => {
      const text = type && type.toLowerCase();
      const fileType = (file.type || "").toLowerCase();
      // console.log(fileType, text);
      if (text === fileType) {
        // 类似excel文件这种
        // 比如application/vnd.ms-excel和application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        // 本身就带有.字符的，不能走下面的.jpg等文件扩展名判断处理
        // 所以优先对比input的accept类型和文件对象的type值
        return true;
      }
      if (/\*/.test(text)) {
        // image/* 这种通配的形式处理
        // console.log(
        //   "fileType.replace(//.*$/, '') === text.replace(//.*$/, '')",
        //   fileType.replace(/\/.*$/, "") === text.replace(/\/.*$/, "")
        // );
        return fileType.replace(/\/.*$/, "") === text.replace(/\/.*$/, "");
      }
      if (/..*/.test(text)) {
        // .jpg 等后缀名
        // console.log(
        //   "fileExtension === text.replace(/./, '')",
        //   fileExtension === text.replace(/\./, "")
        // );
        return text === `.${fileExtension && fileExtension.toLowerCase()}`;
      }
      return false;
    });
  }
  return !!file;
};
