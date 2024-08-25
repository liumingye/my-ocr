// struct Image{  
//     1: string nanoid,  
//     2: string path,    
// } 

// service userService {
//     string test1(1:string name)
// }

service OcrService {
    string ocr(1: string id, 2: string path, 3: map<string, string> config)
}

// thrift -o thrift_ocr_ts --gen js:node,ts ocr.thrift
// thrift -o thrift_ocr_py --gen py ocr.thrift
