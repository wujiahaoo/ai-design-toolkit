// LayerMind - PS AI图层智能命名/分类脚本（完整版）
// 修复：支持图层组递归遍历、ExtendScript语法兼容、return报错
var API_KEY = "0P65UW0i8kMJVr3M84hyQD3l"; // 替换成自己的
var SECRET_KEY = "KMMLxHwIgR38hNFVlIHB0PWh85sqsUk5"; // 替换成自己的

// 全局变量：存储所有可见图层、临时文件夹路径
var allVisibleLayers = [];
var tempFolder = Folder.desktop + "/PS_Layer_Temp/";

// ====================== 核心工具函数 ======================
// 递归遍历所有图层（包括图层组内的子图层）
function traverseLayers(layers) {
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer.visible) {
            if (layer.typename === "LayerSet") {
                traverseLayers(layer.layers); // 递归处理图层组
            } else {
                allVisibleLayers.push(layer); // 普通图层加入列表
            }
        }
    }
}

// 隐藏所有图层
function hideAllLayers() {
    function hideRecursive(layers) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            layer.visible = false;
            if (layer.typename === "LayerSet") {
                hideRecursive(layer.layers);
            }
        }
    }
    hideRecursive(app.activeDocument.layers);
}

// 显示所有图层
function showAllLayers() {
    function showRecursive(layers) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            layer.visible = true;
            if (layer.typename === "LayerSet") {
                showRecursive(layer.layers);
            }
        }
    }
    showRecursive(app.activeDocument.layers);
}

// Base64编码（PS脚本兼容版）
function encode64(input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = unescape(encodeURIComponent(input));
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) { enc3 = enc4 = 64; }
        else if (isNaN(chr3)) { enc4 = 64; }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

// ====================== 核心业务逻辑 ======================
// 步骤1：导出所有可见图层为临时PNG
function exportLayers() {
    var doc = app.activeDocument;
    allVisibleLayers = []; // 清空全局图层列表
    
    // 递归遍历所有可见图层
    traverseLayers(doc.layers);
    if (allVisibleLayers.length === 0) {
        return 0;
    }

    // 创建临时文件夹
    if (!Folder(tempFolder).exists) {
        Folder(tempFolder).create();
    }

    // 导出每个图层
    var exportCount = 0;
    for (var i = 0; i < allVisibleLayers.length; i++) {
        var layer = allVisibleLayers[i];
        // 仅显示当前图层
        hideAllLayers();
        layer.visible = true;

        // 导出为PNG（透明背景）
        var exportFile = new File(tempFolder + i + "_" + layer.name + ".png");
        var exportOpts = new ExportOptionsSaveForWeb();
        exportOpts.format = SaveDocumentType.PNG;
        exportOpts.PNG8 = false;
        exportOpts.transparency = true;
        exportOpts.quality = 100;
        
        try {
            doc.exportDocument(exportFile, ExportType.SAVEFORWEB, exportOpts);
            exportCount++;
        } catch (e) {
            alert("导出图层[" + layer.name + "]失败：" + e.message);
        }
    }

    showAllLayers(); // 恢复所有图层可见性
    alert("导出完成！共导出 " + exportCount + " 个可见图层");
    return exportCount;
}

// 步骤2：获取百度AI接口Token
function getAccessToken() {
    try {
        var tokenUrl = "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=" + API_KEY + "&client_secret=" + SECRET_KEY;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", tokenUrl, false);
        xhr.send();
        
        var response = JSON.parse(xhr.responseText);
        if (response.access_token) {
            return response.access_token;
        } else {
            throw new Error("获取Token失败：" + response.error_description);
        }
    } catch (e) {
        throw new Error("Token获取异常：" + e.message);
    }
}

// 步骤3：调用百度AI识别图层内容
function recognizeImage(imagePath, token) {
    try {
        // 读取图片文件并转Base64
        var file = new File(imagePath);
        if (!file.exists) {
            return "未知图层";
        }
        
        file.open("r");
        file.encoding = "binary";
        var fileContent = file.read();
        file.close();
        var base64Str = encode64(fileContent);

        // 调用百度通用物体识别API
        var recognizeUrl = "https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=" + token;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", recognizeUrl, false);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        
        var postData = "image=" + encodeURIComponent(base64Str) + "&baike_num=0";
        xhr.send(postData);
        
        var response = JSON.parse(xhr.responseText);
        if (response.result && response.result.length > 0) {
            return response.result[0].keyword; // 返回最相关的识别结果
        } else {
            return "未知图层";
        }
    } catch (e) {
        return "识别失败";
    }
}

// 步骤4：自动重命名图层+分组
function renameAndGroupLayers(token) {
    var doc = app.activeDocument;
    // 分类规则（扩展关键词，提升识别准确率）
    var categoryRules = {
        "文字": ["文字", "标题", "字体", "数字", "字母", "文本", "汉字"],
        "背景": ["背景", "纹理", "底色", "渐变", "地图", "纯色"],
        "形状": ["矩形", "圆形", "形状", "线条", "边框", "椭圆", "多边形"],
        "素材": ["人物", "风景", "产品", "图标", "图片", "图案"],
        "路径": ["路径", "钢笔", "描边", "轮廓"]
    };

    // 创建分类图层组
    var groups = {};
    for (var cate in categoryRules) {
        var group = doc.layerSets.add();
        group.name = "【" + cate + "】";
        groups[cate] = group;
    }
    // 未分类组
    var unCateGroup = doc.layerSets.add();
    unCateGroup.name = "【未分类】";
    groups["未知"] = unCateGroup;

    // 遍历图层进行重命名和分组
    for (var i = 0; i < allVisibleLayers.length; i++) {
        var layer = allVisibleLayers[i];
        var imageFile = new File(tempFolder + i + "_" + layer.name + ".png");
        
        // AI识别内容
        var recognizeResult = recognizeImage(imageFile.fsName, token);
        // 匹配分类
        var category = "未知";
        for (var cate in categoryRules) {
            var keywords = categoryRules[cate];
            for (var j = 0; j < keywords.length; j++) {
                if (recognizeResult.indexOf(keywords[j]) !== -1) {
                    category = cate;
                    break;
                }
            }
            if (category !== "未知") break;
        }

        // 重命名图层 + 移动到对应分组
        try {
            layer.name = "【" + category + "】" + recognizeResult;
            layer.moveToEnd(groups[category]);
        } catch (e) {
            alert("处理图层[" + layer.name + "]失败：" + e.message);
        }
    }

    // 清理临时文件
    if (Folder(tempFolder).exists) {
        var files = Folder(tempFolder).getFiles();
        for (var f = 0; f < files.length; f++) {
            files[f].remove();
        }
        Folder(tempFolder).remove();
    }
    
    alert("图层整理完成！\n共处理 " + allVisibleLayers.length + " 个图层，已自动重命名并分组～");
}

// ====================== 主执行流程 ======================
try {
    // 检查是否打开PSD文件
    if (app.documents.length === 0) {
        alert("请先打开一个PSD文件后再运行脚本！");
    } else {
        // 1. 导出图层
        var exportCount = exportLayers();
        if (exportCount === 0) {
            alert("没有可导出的可见图层！\n请确保图层左侧的「眼睛」图标处于打开状态。");
        } else {
            // 2. 获取AI Token
            alert("正在连接百度AI接口...");
            var token = getAccessToken();
            
            // 3. 识别并整理图层
            alert("正在AI识别图层内容（共" + exportCount + "个）...");
            renameAndGroupLayers(token);
        }
    }
} catch (error) {
    alert("脚本运行出错：" + error.message + "\n请检查：\n1. API Key/Secret Key是否正确\n2. 网络是否正常\n3. PS是否为2020及以上完整版");
    // 异常时清理临时文件
    if (Folder(tempFolder).exists) {
        var files = Folder(tempFolder).getFiles();
        for (var f = 0; f < files.length; f++) {
            files[f].remove();
        }
        Folder(tempFolder).remove();
    }
}